import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';
import {
  refineTelephoneMapping, processRows, applyDuplicateMatches, countByStatus, generateErrorCSV,
  MAX_FILE_SIZE_MB, MAX_ROWS, BATCH_SIZE,
  type ProcessedRow, type ColumnMapping,
} from '../../../../lib/csvImportPipeline';
import { decodeCsvFile } from '../../../../lib/csvEncoding';
import { lireExcelBrut } from '../../../../lib/excelImport';
import { lireCsv, type AvertissementCsv } from '../../../../lib/csvLecture';
import {
  entetesPourImport, correspondancesSysteme, detecterType, cleCanonique, sansAccents, estCleReservee,
  LONGUEUR_ENTETE_MAX, type CleSysteme, type TypeColonne,
} from '../../../../lib/entetesImport';
import { importerDansOnglet, type ModeImport, type PlanColonne, type ResultatImport } from '../../../../lib/importOnglet';
import { chargerStructureOnglets, type StructureOnglets } from '../../../../lib/ongletsDepot';
import type { ColonneRegistre } from '../../../../lib/ongletsLeads';
import { choisirOngletActif } from '../../../../hooks/useOngletActif';
import { useSimulation } from '../../../../contexts/SimulationContext';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import type { ImportRecord, Phase, ImportResultState } from './importLeadsTypes';

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

/** Ce que l'apercu annonce pour une colonne du fichier. */
export type StatutColonne = 'standard' | 'existante' | 'proposee' | 'nouvelle' | 'reservee';

export interface ApercuColonne {
  entete: string;
  statut: StatutColonne;
  cleSysteme?: CleSysteme;
  type: TypeColonne;
  vide: boolean;
  /** Cellules non vides dans le fichier. */
  remplies: number;
  /** Colonne du registre retrouvee (existante) ou proposee (accents seuls differents). */
  registre?: ColonneRegistre;
  /** Deja rattachee a l'onglet choisi ; `masquee` si elle y est cachee. */
  dansOnglet: boolean;
  masquee: boolean;
}

export type ChoixOngletUi = { type: 'existant'; ongletId: string } | { type: 'nouveau' } | null;

const LIBELLE_SYSTEME: Record<CleSysteme, string> = { prenom: 'Prénom', nom: 'Nom', email: 'Email', telephone: 'Téléphone' };
export const libelleSysteme = (c: CleSysteme) => LIBELLE_SYSTEME[c];

export function useImportLeads(activeTab: 'import' | 'history') {
  const { isSimulating } = useSimulation();
  const companyId = useCompanyId();
  const [phase, setPhase] = useState<Phase>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [allColumns, setAllColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([]);
  const [lignesFichier, setLignesFichier] = useState<number[]>([]);
  const [avertissements, setAvertissements] = useState<{ lignes: AvertissementCsv[]; guillemet: boolean; colonnesAjoutees: number; entetesCoupes: number }>({ lignes: [], guillemet: false, colonnesAjoutees: 0, entetesCoupes: 0 });
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [importMode, setImportMode] = useState<ModeImport>('ignorer');
  const [importResult, setImportResult] = useState<ImportResultState | null>(null);
  const [history, setHistory] = useState<ImportRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<ImportRecord | null>(null);
  const [structure, setStructure] = useState<StructureOnglets | null>(null);
  const [structureErreur, setStructureErreur] = useState('');
  const [choixOnglet, setChoixOnglet] = useState<ChoixOngletUi>(null);
  const [nomNouvelOnglet, setNomNouvelOnglet] = useState('');
  const [propositionsRefusees, setPropositionsRefusees] = useState<Set<string>>(new Set());
  const [progression, setProgression] = useState({ faites: 0, total: 0 });

  const loadHistory = useCallback(async () => {
    if (!companyId) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from('import_history')
      .select('*')
      .eq('company_id', companyId)
      .order('imported_at', { ascending: false });
    setHistory((data ?? []).map((d: ImportRecord & { columns: unknown }) => ({
      ...d,
      columns: Array.isArray(d.columns) ? d.columns : [],
      new_leads_count: d.new_leads_count ?? 0,
      duplicates_count: d.duplicates_count ?? 0,
      errors_count: d.errors_count ?? 0,
      import_mode: d.import_mode ?? '',
    })));
    setHistoryLoading(false);
  }, [companyId]);

  const chargerStructure = useCallback(async () => {
    if (!companyId) return;
    const { data, error } = await chargerStructureOnglets(companyId);
    if (error) { setStructureErreur(error); return; }
    setStructureErreur('');
    setStructure(data);
  }, [companyId]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, loadHistory]);

  useEffect(() => { chargerStructure(); }, [chargerStructure]);

  const resetImport = () => {
    setPhase('upload');
    setFile(null);
    setParseError('');
    setProcessedRows([]);
    setLignesFichier([]);
    setAvertissements({ lignes: [], guillemet: false, colonnesAjoutees: 0, entetesCoupes: 0 });
    setAllColumns([]);
    setMapping({});
    setAnalyzeProgress(0);
    setImportMode('ignorer');
    setImportResult(null);
    setChoixOnglet(null);
    setNomNouvelOnglet('');
    setPropositionsRefusees(new Set());
    setProgression({ faites: 0, total: 0 });
  };

  const handleFile = async (f: File) => {
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) { setParseError('Format non supporte. Utilisez un fichier CSV, XLSX ou XLS.'); return; }
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) { setParseError(`Le fichier depasse la limite de ${MAX_FILE_SIZE_MB} Mo.`); return; }
    setParseError('');
    setFile(f);
    setPhase('analyzing');
    setAnalyzeProgress(0);
    setChoixOnglet(null);
    setPropositionsRefusees(new Set());
    setNomNouvelOnglet(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 80));

    let brutes: string[];
    let enregistrements: { ligne: number; cellules: string[] }[];
    let alertes: AvertissementCsv[] = [];
    let guillemet = false;
    let ligneGuillemet: number | null = null;
    let ligneSuspecte: number | null = null;
    try {
      if (ext === '.xlsx' || ext === '.xls') {
        const x = await lireExcelBrut(f);
        brutes = x.entetes;
        enregistrements = x.lignes;
      } else {
        const lecture = lireCsv(await decodeCsvFile(f));
        brutes = lecture.entetes;
        enregistrements = lecture.enregistrements;
        alertes = lecture.avertissements;
        guillemet = lecture.guillemetNonFerme;
        ligneGuillemet = lecture.ligneGuillemetOuvert;
        ligneSuspecte = lecture.ligneGuillemetSuspect;
      }
    } catch {
      setParseError('Le fichier est illisible.'); setPhase('upload'); return;
    }

    if (brutes.length === 0) { setParseError('Le fichier est vide ou invalide.'); setPhase('upload'); return; }
    /* UN GUILLEMET JAMAIS REFERME avale tout ce qui le suit dans une seule cellule : importer
       ce fichier rangerait des dizaines de lignes dans un seul lead. On s'arrete, et on dit ou. */
    if (guillemet) {
      setParseError(`Ligne ${ligneGuillemet ?? '?'} du fichier : un guillemet (") est ouvert et jamais refermé, toute la suite serait lue comme une seule cellule. Corrigez cette ligne puis recommencez.`);
      setPhase('upload');
      return;
    }
    /* Un guillemet ouvert par erreur peut aussi se « refermer » bien plus bas, sur le guillemet
       d'une autre cellule : les lignes entre les deux sont avalees, en silence. Le signe : un
       guillemet fermant colle a du texte (« "abc"de »). On s'arrete aussi. */
    if (ligneSuspecte !== null) {
      setParseError(`Ligne ${ligneSuspecte} du fichier : un guillemet (") semble mal placé — les lignes qui suivent seraient fusionnées dans une seule cellule. Corrigez cette ligne puis recommencez.`);
      setPhase('upload');
      return;
    }
    if (enregistrements.length > MAX_ROWS) { setParseError(`Le fichier contient ${enregistrements.length} lignes, la limite est de ${MAX_ROWS} lignes par import.`); setPhase('upload'); return; }

    /* RIEN NE SE PERD : une ligne qui porte plus de cellules que d'en-tetes ajoute des
       colonnes « Colonne N » au lieu de voir ses dernieres valeurs jetees. */
    let largeur = brutes.length;
    for (const e of enregistrements) {
      for (let j = e.cellules.length - 1; j >= largeur; j--) {
        if (e.cellules[j].trim() !== '') { largeur = j + 1; break; }
      }
    }
    const colonnesAjoutees = largeur - brutes.length;
    const entetes = entetesPourImport([...brutes, ...Array.from({ length: colonnesAjoutees }, () => '')]);
    const rows: Record<string, string>[] = enregistrements.map(e => {
      const r: Record<string, string> = {};
      entetes.forEach((h, j) => { r[h] = (e.cellules[j] ?? '').trim(); });
      return r;
    });

    const systeme = correspondancesSysteme(entetes);
    const rawMapping: ColumnMapping = {};
    for (const [entete, cle] of systeme) rawMapping[cle] = entete;
    const detectedMapping = refineTelephoneMapping(rawMapping, rows);
    setAllColumns(entetes);
    setMapping(detectedMapping);
    setLignesFichier(enregistrements.map(e => e.ligne));
    setAvertissements({ lignes: alertes, guillemet, colonnesAjoutees, entetesCoupes: brutes.filter(b => b.trim().length > LONGUEUR_ENTETE_MAX).length });

    const allRows: ProcessedRow[] = [];
    const total = rows.length;
    const emailMap = new Map<string, number>();
    const telMap = new Map<string, number>();

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = rows.slice(i, Math.min(i + BATCH_SIZE, total));
      const processed = processRows(batch, detectedMapping, emailMap, telMap);
      processed.forEach((r, j) => { r.index = i + j; });
      allRows.push(...processed);
      setAnalyzeProgress(Math.round(((i + batch.length) / Math.max(total, 1)) * 70));
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const validEmails = allRows.filter(r => r.status === 'valid' && r.email).map(r => r.email as string);
    const validTels = allRows.filter(r => r.status === 'valid' && r.telephone).map(r => r.telephone as string);
    let finalRows = allRows;

    if (validEmails.length > 0 || validTels.length > 0) {
      setAnalyzeProgress(80);
      const { data: matches } = await supabase.rpc('find_duplicate_leads', {
        p_emails: validEmails.length > 0 ? validEmails : ['__no_match__'],
        p_telephones: validTels.length > 0 ? validTels : ['__no_match__'],
        p_company_id: companyId,
      });
      if (matches && matches.length > 0) finalRows = applyDuplicateMatches(allRows, matches);
    }

    await chargerStructure();
    setAnalyzeProgress(100);
    setProcessedRows(finalRows);
    await new Promise(resolve => setTimeout(resolve, 200));
    setPhase('preview');
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };

  /* ─────────── L'APERCU DES COLONNES ─────────── */

  const onglets = useMemo(() => structure?.onglets ?? [], [structure]);
  const ongletChoisiId = choixOnglet?.type === 'existant' ? choixOnglet.ongletId : null;

  const colonnes: ApercuColonne[] = useMemo(() => {
    const registre = structure?.registre ?? [];
    const parCanon = new Map(registre.map(r => [r.cle_canonique, r]));
    const parSansAccent = new Map<string, ColonneRegistre>();
    for (const r of registre) {
      const k = sansAccents(r.cle_canonique);
      if (!parSansAccent.has(k)) parSansAccent.set(k, r);
    }
    const dansOnglet = new Map<string, boolean>(); // colonne_id -> visible
    for (const c of structure?.colonnes ?? []) {
      if (c.onglet_id === ongletChoisiId && c.colonne_id) dansOnglet.set(c.colonne_id, c.visible);
    }
    const systemeParEntete = new Map<string, CleSysteme>();
    for (const [cle, entete] of Object.entries(mapping) as [CleSysteme, string | undefined][]) {
      if (entete) systemeParEntete.set(entete, cle);
    }
    /* UNE colonne du registre ne recoit qu'UN en-tete du fichier : si le fichier contient
       « Catégorie » (connue) ET « Categorie », la seconde ne peut pas etre rapprochee de la
       premiere — leurs valeurs s'ecraseraient. Les correspondances exactes passent d'abord. */
    const prises = new Set<string>();
    /* Une colonne STANDARD garde son en-tete comme cle de data : une colonne du registre qui
       porte cette cle est donc prise aussi (« Téléphone » standard + « Telephone » rapproche
       ecriraient au meme endroit). */
    const canonsStandard = new Set(allColumns.filter(e => systemeParEntete.has(e)).map(e => cleCanonique(e) ?? ''));
    for (const r of registre) if (canonsStandard.has(r.cle_canonique)) prises.add(r.id);
    for (const entete of allColumns) {
      if (systemeParEntete.has(entete) || estCleReservee(entete)) continue;
      const exacte = parCanon.get(cleCanonique(entete) ?? '');
      if (exacte) prises.add(exacte.id);
    }

    return allColumns.map(entete => {
      const valeurs = processedRows.map(r => r.raw[entete] ?? '');
      const remplies = valeurs.filter(v => v.trim() !== '').length;
      const base = { entete, type: detecterType(entete, valeurs), vide: remplies === 0, remplies, dansOnglet: false, masquee: false };
      const cleSysteme = systemeParEntete.get(entete);
      if (cleSysteme) return { ...base, statut: 'standard' as const, cleSysteme };
      if (estCleReservee(entete)) return { ...base, statut: 'reservee' as const };
      const canon = cleCanonique(entete) ?? '';
      const exacte = parCanon.get(canon);
      const candidate = exacte ? undefined : parSansAccent.get(sansAccents(canon));
      const proche = candidate && !prises.has(candidate.id) ? candidate : undefined;
      if (proche) prises.add(proche.id);
      const reg = exacte ?? (proche && !propositionsRefusees.has(entete) ? proche : undefined);
      const visible = reg ? dansOnglet.get(reg.id) : undefined;
      return {
        ...base,
        statut: exacte ? 'existante' as const : proche ? 'proposee' as const : 'nouvelle' as const,
        registre: exacte ?? proche,
        /* Une colonne deja connue garde son type : c'est lui qui regle l'affichage en base. */
        type: reg?.type ?? base.type,
        dansOnglet: visible !== undefined,
        masquee: visible === false,
      };
    });
  }, [allColumns, mapping, processedRows, structure, ongletChoisiId, propositionsRefusees]);

  const basculerProposition = (entete: string) => setPropositionsRefusees(prev => {
    const n = new Set(prev);
    if (n.has(entete)) n.delete(entete); else n.add(entete);
    return n;
  });

  const plan: PlanColonne[] = useMemo(() => colonnes
    .filter(c => c.statut !== 'reservee')
    .map(c => ({
      entete: c.entete,
      ...(c.cleSysteme ? { cleSysteme: c.cleSysteme } : {}),
      ...(c.statut === 'proposee' && c.registre && !propositionsRefusees.has(c.entete) ? { colonneId: c.registre.id } : {}),
      type: c.type,
      vide: c.vide,
    })), [colonnes, propositionsRefusees]);

  /** Le nom du nouvel onglet est-il libre ? null = oui, sinon la raison. */
  const erreurNomOnglet = useMemo(() => {
    const canon = cleCanonique(nomNouvelOnglet);
    if (!canon) return 'Donnez un nom au nouvel onglet.';
    if (canon === 'principal') return '« Principal » est réservé.';
    if (nomNouvelOnglet.trim().length > 80) return '80 caractères au maximum.';
    if (onglets.some(o => cleCanonique(o.nom) === canon)) return 'Un onglet porte déjà ce nom : choisissez « Ajouter à un onglet existant » ou un autre nom.';
    return null;
  }, [nomNouvelOnglet, onglets]);

  const choixValide = choixOnglet !== null && (
    choixOnglet.type === 'existant' ? onglets.some(o => o.id === choixOnglet.ongletId) : erreurNomOnglet === null
  );

  const handleImport = async () => {
    if (isSimulating) return;
    if (!file || !companyId || processedRows.length === 0 || !choixValide || !choixOnglet) return;
    const lignes = processedRows.filter(r => r.status !== 'error').map(r => ({
      index: r.index, raw: r.raw, prenom: r.prenom, nom: r.nom, email: r.email, telephone: r.telephone,
    }));
    if (lignes.length === 0) return;
    setPhase('importing');
    setParseError('');
    const counts = countByStatus(processedRows);

    const res: ResultatImport = await importerDansOnglet({
      rpc: (fn, args) => supabase.rpc(fn, args),
      companyId,
      choix: choixOnglet.type === 'existant' ? { ongletId: choixOnglet.ongletId } : { nouveauNom: nomNouvelOnglet },
      mode: importMode,
      plan,
      lignes,
      fichier: { nom: file.name, entetes: allColumns, totalLignes: processedRows.length, erreursAvant: counts.error },
      onProgression: (faites, total) => setProgression({ faites, total }),
    });

    if (!res.ongletId) {
      setParseError(res.interrompu ?? "L'import n'a pas pu démarrer.");
      setPhase('preview');
      return;
    }

    /* Le fichier d'erreurs reunit les lignes refusees a l'apercu ET celles que la base a
       refusees, avec leur motif et leur numero de ligne dans le fichier d'origine. */
    const motifs = new Map(res.erreurs.map(e => [e.index, e.message]));
    /* Les CONFLITS d'email (doublon trouve par le telephone, email different) ne sont pas
       fusionnes : leurs lignes vont aussi dans le fichier a telecharger, pour qu'aucune
       valeur du fichier ne disparaisse sans trace. */
    for (const c of res.conflits) {
      if (!motifs.has(c.index)) motifs.set(c.index, 'Conflit d\'email : un lead existant a le même téléphone et un autre email. Il a été ajouté à l\'onglet sans être modifié ; cette ligne n\'a pas été fusionnée.');
    }
    const enErreur = processedRows
      .filter(r => r.status === 'error' || motifs.has(r.index))
      .map(r => ({ ...r, status: 'error' as const, errorReason: `Ligne ${lignesFichier[r.index] ?? r.index + 2} : ${motifs.get(r.index) ?? r.errorReason ?? 'Erreur'}` }));
    const errorCsvData = enErreur.length > 0 ? generateErrorCSV(enErreur, mapping, allColumns) : null;

    const nomOnglet = choixOnglet.type === 'existant'
      ? onglets.find(o => o.id === choixOnglet.ongletId)?.nom ?? ''
      : nomNouvelOnglet.trim();
    setImportResult({
      inserted: res.crees,
      updated: res.completes,
      ignored: res.inchanges,
      errors: enErreur.length - res.conflits.filter(c => !res.erreurs.some(e => e.index === c.index)).length,
      lies: res.lies,
      conflits: res.conflits.length,
      reaffichees: res.reaffichees,
      interrompu: res.interrompu,
      mode: importMode,
      errorCsvData,
      fileName: file.name,
      ongletId: res.ongletId,
      ongletNom: nomOnglet,
    });
    setPhase('done');
    chargerStructure();
    if (activeTab === 'history') loadHistory();
  };

  /** Ouvre le CRM directement sur l'onglet que l'import vient de remplir. */
  const ouvrirOnglet = (ongletId: string) => choisirOngletActif(companyId, ongletId);

  const counts = countByStatus(processedRows);
  const importableCount = counts.valid + counts.dup_file + counts.dup_crm;

  return {
    phase, dragOver, parseError, file, allColumns, mapping,
    processedRows, setProcessedRows, analyzeProgress, importMode, importResult,
    history, historyLoading, previewRecord, counts, importableCount,
    setDragOver, setImportMode, setPreviewRecord,
    resetImport, handleFile, handleDrop, handleImport,
    colonnes, basculerProposition, propositionsRefusees, avertissements, lignesFichier,
    onglets, structureErreur, choixOnglet, setChoixOnglet, nomNouvelOnglet, setNomNouvelOnglet,
    erreurNomOnglet, choixValide, progression, ouvrirOnglet,
  };
}
