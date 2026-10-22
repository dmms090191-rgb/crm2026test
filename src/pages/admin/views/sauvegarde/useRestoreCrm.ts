import { useState, useCallback, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import {
  RESTORE_ORDER,
  TABLE_PRIMARY_KEYS,
  FK_RULES,
  BATCH_SIZE,
} from './restoreConstants';
import { ecarterOrphelins, valeursAVerifier } from '../../../../lib/restaureOrphelins';
import type { ImportedBackup } from './types';

const TABLES_WITH_COMPANY_ID = new Set([
  'leads', 'vendors', 'import_history', 'statuts', 'registrations',
  'rdv_proposals', 'client_messages', 'vendor_admin_messages', 'conversations',
  'crm_notes', 'crm_tasks', 'crm_documentation', 'doc_tab_labels',
  'crm_custom_pages', 'crm_page_checklist_items', 'sidebar_order', 'vendor_comments',
  /* CRM Immo : les trois portent company_id NOT NULL. Les oublier ici ferait
     remonter leurs lignes avec le company_id d'origine, que la RLS refuserait en
     42501 — bruyant, donc pas le pire. Le pire serait de restaurer les dossiers
     SANS les colonnes : le tableau perdrait ses colonnes personnalisees alors que
     leurs valeurs seraient toujours dans le jsonb, inertes. */
  'crm_immo_dossiers', 'crm_immo_colonnes', 'crm_immo_etats', 'crm_immo_commentaires',
  /* Les deux tables du 22 octobre 2026 portent elles aussi company_id NOT NULL. Et pour
     crm_immo_contrats l oubli serait pire qu un 42501 : la table porte un declencheur
     qui REECRIT les dates du dossier depuis la periode en cours. Une periode restauree
     avec le mauvais company_id ne retrouverait pas son dossier, donc le declencheur ne
     synchroniserait rien, et le dossier resterait sur des dates sans periode. */
  'crm_immo_contrats', 'crm_immo_loyers',
  /*
   * Les deux tables de DOCUMENTS, du 22 octobre 2026. Elles portent company_id NOT NULL,
   * et leur presence ici a une seconde consequence, plus importante que la premiere :
   * c'est ce qui les fait entrer dans TABLES_CRM_IMMO juste en dessous, donc passer par
   * le RPC qui ANONYMISE les identites lors d'une restauration croisee. Les oublier ici
   * leur ferait prendre l'upsert direct : le created_by de la Societe source arriverait
   * intact chez la destination.
   */
  'crm_immo_classeurs', 'crm_immo_documents',
]);

/**
 * LES HUIT TABLES QUI PASSENT PAR crm_immo_restaurer_lot.
 *
 * Elles ne peuvent pas etre upsertees directement depuis le navigateur :
 *   - restaurer un dossier complet fait CREER une periode avec un id neuf, qui entre
 *     ensuite en conflit avec celle du fichier (23505, lot de 500 perdu) ;
 *   - crm_immo_contrats et crm_immo_loyers portent des index PARTIELS, que le
 *     parametre on_conflict de PostgREST ne sait pas designer ;
 *   - une ligne fautive emportait ses 499 voisines.
 *
 * La liste est la MEME que celle des tables a company_id ci-dessus, et ce n'est pas
 * une coincidence : ce sont les tables du module. On la derive donc d'elle, pour qu'une
 * table ajoutee a l'une entre automatiquement dans l'autre — ce qui a servi des
 * l'ajout des deux tables de documents.
 *
 * ATTENTION : cette appartenance ne fait que CHOISIR la branche d'ecriture. Elle ne
 * declenche rien par elle-meme. La visite d'une table vient de RESTORE_ORDER seul : une
 * table absente de RESTORE_ORDER n'est jamais restauree, et le rapport ne la mentionne
 * meme pas.
 */
export const TABLES_CRM_IMMO = new Set(
  [...TABLES_WITH_COMPANY_ID].filter(t => t.startsWith('crm_immo_')),
);

export type RestoreStatus = 'idle' | 'simulating' | 'restoring' | 'done' | 'error';

export interface TableResult {
  table: string;
  rows: number;
  inserted: number;
  errors: string[];
  skipped: boolean;
  /**
   * Les lignes ECARTEES parce que leur parent n'existe pas a destination.
   *
   * Facultatif : les resultats fabriques ailleurs (table vide, table absente, simulation)
   * n'ont rien a ecarter, et leur imposer un zero explicite n'apprendrait rien.
   */
  ignored?: number;
  /**
   * Les lignes dont l'ATTRIBUTION a ete retiree : elles venaient d'une autre Societe.
   *
   * `auth.users` etant global, les colonnes qui designent une personne —
   * created_by, cloture_par, encaisse_par, annule_par — traversaient les cloisons
   * sans que rien ne le signale. Elles sont desormais videes sur une restauration
   * CROISEE, et le rapport le dit : une identite retiree est une information, pas un
   * detail d'implementation.
   *
   * Les FAITS, eux, sont conserves : une annulation garde sa date et son motif, seul
   * son auteur disparait.
   */
  anonymized?: number;
  /** Les identifiants parents introuvables, pour que l'ecart s'explique. */
  missingParents?: string[];
}

export interface FkWarning {
  table: string;
  column: string;
  referencedTable: string;
  missingCount: number;
  sampleValues: string[];
}

export interface RestoreReport {
  mode: 'simulation' | 'live';
  startedAt: string;
  finishedAt: string;
  tablesInFile: number;
  tablesWithData: number;
  tablesEmpty: string[];
  tablesAbsent: string[];
  totalTables: number;
  totalRows: number;
  totalInserted: number;
  totalErrors: number;
  tables: TableResult[];
  fkWarnings: FkWarning[];
  /**
   * Pourquoi la restauration n'a PAS ete lancee, quand elle ne l'a pas ete.
   *
   * Un rapport a zero ligne et zero erreur se lit comme << il n'y avait rien a
   * faire >>. Quand on a refuse de partir, il faut le DIRE — et dire quoi faire.
   */
  blocage?: string;
}

export function useRestoreCrm() {
  const companyId = useCompanyId();
  const [status, setStatus] = useState<RestoreStatus>('idle');
  const [currentTable, setCurrentTable] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<RestoreReport | null>(null);
  const abortRef = useRef(false);

  const validateFkCoherence = useCallback((backup: ImportedBackup): FkWarning[] => {
    const warnings: FkWarning[] = [];

    for (const [table, rules] of Object.entries(FK_RULES)) {
      const rows = backup.data[table] as Record<string, unknown>[] | undefined;
      if (!rows || rows.length === 0) continue;

      for (const rule of rules) {
        const refRows = backup.data[rule.referencedTable] as Record<string, unknown>[] | undefined;
        if (!refRows) {
          if (!rule.optional) {
            warnings.push({
              table,
              column: rule.column,
              referencedTable: rule.referencedTable,
              missingCount: rows.length,
              sampleValues: [],
            });
          }
          continue;
        }

        const refIds = new Set(refRows.map((r) => String(r[rule.referencedColumn])));
        const missing: string[] = [];

        for (const row of rows) {
          const val = row[rule.column];
          if (val == null && rule.optional) continue;
          if (val == null) continue;
          if (!refIds.has(String(val))) {
            missing.push(String(val));
          }
        }

        if (missing.length > 0) {
          const uniqueMissing = [...new Set(missing)];
          warnings.push({
            table,
            column: rule.column,
            referencedTable: rule.referencedTable,
            missingCount: missing.length,
            sampleValues: uniqueMissing.slice(0, 5),
          });
        }
      }
    }

    return warnings;
  }, []);

  const simulate = useCallback(async (backup: ImportedBackup) => {
    setStatus('simulating');
    setReport(null);
    setProgress(0);
    abortRef.current = false;

    await new Promise((r) => setTimeout(r, 0));

    const startedAt = new Date().toISOString();
    const tableResults: TableResult[] = [];
    const tablesToRestore = RESTORE_ORDER.filter(
      (t) => backup.data[t] && (backup.data[t] as unknown[]).length > 0
    );
    const totalTables = tablesToRestore.length;

    for (let i = 0; i < tablesToRestore.length; i++) {
      if (abortRef.current) break;
      const table = tablesToRestore[i];
      setCurrentTable(table);
      setProgress(Math.round(((i + 1) / totalTables) * 100));

      if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));

      const rows = backup.data[table] as unknown[];
      tableResults.push({
        table,
        rows: rows.length,
        inserted: rows.length,
        errors: [],
        skipped: false,
      });
    }

    const tablesEmpty: string[] = [];
    const tablesAbsent: string[] = [];

    for (const table of RESTORE_ORDER) {
      if (tablesToRestore.includes(table)) continue;
      const fileData = backup.data[table];
      if (fileData && Array.isArray(fileData) && fileData.length === 0) {
        tablesEmpty.push(table);
        tableResults.push({ table, rows: 0, inserted: 0, errors: [], skipped: false });
      } else if (!fileData) {
        tablesAbsent.push(table);
        tableResults.push({ table, rows: 0, inserted: 0, errors: [], skipped: true });
      } else {
        tablesEmpty.push(table);
        tableResults.push({ table, rows: 0, inserted: 0, errors: [], skipped: false });
      }
    }

    const fkWarnings = validateFkCoherence(backup);
    const totalRows = tableResults.reduce((s, r) => s + r.rows, 0);
    const tablesInFile = RESTORE_ORDER.filter((t) => backup.data[t] !== undefined).length;

    const finalReport: RestoreReport = {
      mode: 'simulation',
      startedAt,
      finishedAt: new Date().toISOString(),
      tablesInFile,
      tablesWithData: totalTables,
      tablesEmpty,
      tablesAbsent,
      totalTables: totalTables,
      totalRows,
      totalInserted: totalRows,
      totalErrors: 0,
      tables: tableResults,
      fkWarnings,
    };

    setReport(finalReport);
    setCurrentTable(null);
    setStatus('done');
    return finalReport;
  }, [validateFkCoherence]);

  const restore = useCallback(async (backup: ImportedBackup) => {
    setStatus('restoring');
    setReport(null);
    setProgress(0);
    abortRef.current = false;

    const startedAt = new Date().toISOString();
    const tableResults: TableResult[] = [];
    const tablesToRestore = RESTORE_ORDER.filter(
      (t) => backup.data[t] && (backup.data[t] as unknown[]).length > 0
    );
    const totalTables = tablesToRestore.length;

    /*
     * LE MODULE EST-IL ACCORDE A LA SOCIETE DE DESTINATION ?
     *
     * Les douze policies des six tables CRM Immo exigent toutes has_crm_immo_access.
     * Sans le module, chaque ligne part en 42501 — c'est correct cote securite, mais
     * l'utilisateur ne decouvrait le probleme qu'au bout d'une liste d'erreurs
     * incomprehensibles, apres avoir attendu la fin d'une restauration qui n'a rien
     * ecrit.
     *
     * On demande donc AVANT, et on ne lance pas. La question est posee a la base, pas
     * deduite : has_crm_immo_access est la MEME fonction que les policies appellent,
     * donc sa reponse ne peut pas diverger de ce que la RLS fera.
     *
     * Et uniquement si le fichier contient reellement des lignes CRM Immo : une
     * sauvegarde qui n'en a pas n'a aucune raison d'etre bloquee.
     */
    const immoARestaurer = tablesToRestore.filter((t) => TABLES_CRM_IMMO.has(t));
    if (immoARestaurer.length > 0) {
      const { data: accorde, error: erreurAcces } = await supabase
        .rpc('has_crm_immo_access', { p_company_id: companyId });

      if (erreurAcces || accorde !== true) {
        const blocage = erreurAcces
          ? `Impossible de vérifier l'accès CRM Immo de cette société : ${erreurAcces.message}`
          : "Cette société n'a pas accès au module CRM Immo. La sauvegarde contient "
            + `${immoARestaurer.length} table${immoARestaurer.length > 1 ? 's' : ''} CRM Immo `
            + `(${immoARestaurer.join(', ')}), qui seraient toutes refusées. `
            + 'Activez le module pour cette société depuis le panel Talvex, puis relancez.';
        const arret: RestoreReport = {
          mode: 'live',
          startedAt,
          finishedAt: new Date().toISOString(),
          tablesInFile: RESTORE_ORDER.filter((t) => backup.data[t] !== undefined).length,
          tablesWithData: totalTables,
          tablesEmpty: [],
          tablesAbsent: [],
          totalTables,
          totalRows: 0,
          totalInserted: 0,
          totalErrors: 1,
          tables: [],
          fkWarnings: [],
          blocage,
        };
        setReport(arret);
        setCurrentTable(null);
        setStatus('error');
        return arret;
      }
    }

    for (let i = 0; i < tablesToRestore.length; i++) {
      if (abortRef.current) break;
      const table = tablesToRestore[i];
      setCurrentTable(table);
      setProgress(Math.round(((i + 1) / totalTables) * 100));

      const toutes = backup.data[table] as Record<string, unknown>[];
      const pk = TABLE_PRIMARY_KEYS[table] ?? 'id';

      /*
       * ECARTER LES ORPHELINES AVANT D'ENVOYER.
       *
       * On interroge la DESTINATION, pas le fichier : une restauration partielle pose des
       * etats sur des dossiers deja en place, et les juger sur le contenu de la sauvegarde
       * les declarerait orphelins a tort. Les dossiers restaures dans ce meme passage sont
       * deja en base quand leur tour arrive — RESTORE_ORDER le garantit.
       */
      const regles = FK_RULES[table] ?? [];
      let rows = toutes;
      let ignorees = 0;
      let parentsManquants: string[] = [];
      if (regles.length > 0 && toutes.length > 0) {
        const aVerifier = valeursAVerifier(toutes, regles);
        const presents: Record<string, Set<string>> = {};
        for (const [tableParente, ids] of Object.entries(aVerifier)) {
          const colonne = regles.find(r => r.referencedTable === tableParente)?.referencedColumn ?? 'id';
          const trouves = new Set<string>();
          /* Par tranches : une clause IN de plusieurs milliers d'identifiants depasse la
             longueur d'URL que PostgREST accepte. */
          for (let i = 0; i < ids.length; i += 200) {
            const tranche = ids.slice(i, i + 200);
            const { data, error } = await supabase.from(tableParente).select(colonne).in(colonne, tranche);
            /* Une lecture qui echoue ne doit pas faire jeter des lignes valides : on
               renonce a trier plutot que de trier a l'aveugle. */
            if (error) { trouves.clear(); break; }
            /* `as unknown` d'abord : PostgREST type un select dynamique en GenericStringError
               quand la colonne n'est pas connue statiquement. */
            for (const l of (data ?? []) as unknown as Record<string, unknown>[]) trouves.add(String(l[colonne]));
          }
          if (trouves.size > 0 || ids.length === 0) presents[tableParente] = trouves;
        }
        const tri = ecarterOrphelins(toutes, regles, presents);
        rows = tri.gardees;
        ignorees = tri.ignorees.length;
        parentsManquants = tri.parentsManquants;
      }

      const result: TableResult = {
        table, rows: toutes.length, inserted: 0, errors: [], skipped: false,
        ignored: ignorees, missingParents: parentsManquants,
      };

      for (let batch = 0; batch < rows.length; batch += BATCH_SIZE) {
        if (abortRef.current) break;
        const rawChunk = rows.slice(batch, batch + BATCH_SIZE);
        /*
         * LES SIX TABLES CRM IMMO PARTENT AVEC LE company_id DU FICHIER.
         *
         * C'est volontaire, et c'est ce qui rend la regle d'identite verifiable : la
         * fonction compare la Societe d'origine a la destination pour savoir si la
         * restauration est CROISEE, et vide alors les colonnes qui designent une
         * personne. Reecrire company_id ici lui retirerait le seul moyen de le savoir.
         *
         * Les autres tables gardent la reecriture cote client, inchangee.
         */
        const chunk = (companyId && TABLES_WITH_COMPANY_ID.has(table) && !TABLES_CRM_IMMO.has(table))
          ? rawChunk.map(row => ({ ...row, company_id: companyId }))
          : rawChunk;

        /*
         * LES SIX TABLES CRM IMMO PASSENT PAR UNE FONCTION, PAS PAR L'UPSERT DIRECT.
         *
         * Trois raisons, toutes mesurees le 22 octobre 2026 :
         *
         *   1. LA PERIODE FANTOME. Restaurer un dossier complet declenche la creation
         *      automatique d'une periode AVEC UN ID NEUF. La periode du fichier arrive
         *      ensuite, heurte l'index partiel unique, et le lot entier est perdu en
         *      23505. La fonction pose un drapeau de restauration, dans la MEME
         *      transaction, qui fait taire cette auto-creation — et elle seule.
         *
         *   2. LES INDEX PARTIELS. `on_conflict=` de PostgREST n'emet qu'une liste de
         *      colonnes, jamais le predicat WHERE qu'un index partiel exige pour etre
         *      infere. crm_immo_contrats et crm_immo_loyers sont donc inupsertables sur
         *      leur cle metier depuis le navigateur, quoi qu'on fasse ici.
         *
         *   3. LE LOT TOUT ENTIER. Une seule ligne fautive faisait perdre ses 499
         *      voisines. La fonction ecrit ligne a ligne et RAPPORTE les refus avec leur
         *      code, au lieu de les confondre avec une panne generale.
         *
         * Elle est SECURITY INVOKER : la RLS des six tables s'applique entierement, et
         * le company_id porte par les lignes est verifie par le WITH CHECK des policies.
         */
        if (TABLES_CRM_IMMO.has(table)) {
          const { data, error } = await supabase.rpc('crm_immo_restaurer_lot', {
            p_table: table,
            p_lignes: chunk,
            p_company_cible: companyId,
          });
          if (error) {
            result.errors.push(`Batch ${Math.floor(batch / BATCH_SIZE) + 1}: ${error.message}`);
          } else {
            const bilan = data as {
              ecrites?: number;
              anonymisees?: number;
              refusees?: { id?: string; code?: string; message?: string }[];
            } | null;
            result.inserted += bilan?.ecrites ?? 0;
            result.anonymized = (result.anonymized ?? 0) + (bilan?.anonymisees ?? 0);
            /* Les refus sont NOMMES. Les taire ferait lire une restauration partielle
               comme une reussite — c'est exactement le defaut qu'on corrige. */
            for (const r of bilan?.refusees ?? []) {
              result.errors.push(`Ligne ${r.id ?? '?'} refusée (${r.code ?? '?'}) : ${r.message ?? ''}`);
            }
          }
          continue;
        }

        const { error, data } = await supabase
          .from(table)
          .upsert(chunk as never[], { onConflict: pk, ignoreDuplicates: false })
          .select('*');

        if (error) {
          result.errors.push(`Batch ${Math.floor(batch / BATCH_SIZE) + 1}: ${error.message}`);
        } else {
          result.inserted += data?.length ?? chunk.length;
        }
      }

      tableResults.push(result);
    }

    const tablesEmpty: string[] = [];
    const tablesAbsent: string[] = [];

    for (const table of RESTORE_ORDER) {
      if (tablesToRestore.includes(table)) continue;
      const fileData = backup.data[table];
      if (fileData && Array.isArray(fileData) && fileData.length === 0) {
        tablesEmpty.push(table);
        tableResults.push({ table, rows: 0, inserted: 0, errors: [], skipped: false });
      } else if (!fileData) {
        tablesAbsent.push(table);
        tableResults.push({ table, rows: 0, inserted: 0, errors: [], skipped: true });
      } else {
        tablesEmpty.push(table);
        tableResults.push({ table, rows: 0, inserted: 0, errors: [], skipped: false });
      }
    }

    const fkWarnings = validateFkCoherence(backup);
    const totalRows = tableResults.reduce((s, r) => s + r.rows, 0);
    const totalInserted = tableResults.reduce((s, r) => s + r.inserted, 0);
    const totalErrors = tableResults.reduce((s, r) => s + r.errors.length, 0);
    const tablesInFile = RESTORE_ORDER.filter((t) => backup.data[t] !== undefined).length;

    const finalReport: RestoreReport = {
      mode: 'live',
      startedAt,
      finishedAt: new Date().toISOString(),
      tablesInFile,
      tablesWithData: totalTables,
      tablesEmpty,
      tablesAbsent,
      totalTables,
      totalRows,
      totalInserted,
      totalErrors,
      tables: tableResults,
      fkWarnings,
    };

    setReport(finalReport);
    setCurrentTable(null);
    setStatus(totalErrors > 0 ? 'error' : 'done');
    return finalReport;
  }, [validateFkCoherence]);

  const reset = useCallback(() => {
    setStatus('idle');
    setCurrentTable(null);
    setProgress(0);
    setReport(null);
    abortRef.current = false;
  }, []);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { status, currentTable, progress, report, simulate, restore, reset, abort };
}
