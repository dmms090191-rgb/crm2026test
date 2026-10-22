import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import { journeeDeReference, fuseauLocal } from '../../../../lib/crmImmoAlertes';
import {
  construireEcheancier, statutDe, loyerActuel, compterParStatut,
  type EcheanceLoyer, type StatutLoyer,
} from '../../../../lib/crmImmoEcheancier';

/**
 * L'ECHEANCIER D'UN DOSSIER — le cote reseau.
 *
 * Il ne calcule rien : les echeances, leur numero, leur total et leur statut viennent
 * tous de `crmImmoEcheancier`, la meme fonction que lisent les notifications. Ce hook
 * ne fait que charger les PERIODES et les ENCAISSEMENTS, et ecrire ce qu'on lui demande.
 *
 * ---------- CE QUI EST CHARGE, ET CE QUI NE L'EST PAS ----------
 *
 * Les echeances ne sont pas chargees : elles n'existent pas en base. Un bail de trois
 * ans ne pose aucune ligne, il se recalcule. Seuls deux faits sont stockes, parce que
 * rien ne permet de les deviner : les periodes de contrat, et les encaissements.
 *
 * ---------- CHAQUE ECRITURE SE COMPTE ----------
 *
 * Un UPDATE refuse par la RLS ne leve pas d'erreur cote supabase-js : il rend
 * { error: null } et ZERO ligne. Toutes les ecritures d'ici font donc .select() et
 * comparent le nombre de lignes rendues.
 */

/** Une periode de bail, telle que la porte crm_immo_contrats. */
export interface PeriodeDossier {
  id: string;
  debut: string;
  fin: string;
  jour_encaissement: number;
  cloture_le: string | null;
  created_at: string;
}

/** Un encaissement, annule ou non. */
export interface EncaissementDossier {
  id: string;
  echeance: string;
  encaisse_le: string;
  annule_le: string | null;
  motif_annulation: string | null;
}

/** Une ligne de l'echeancier, prete a afficher. */
export interface LigneEcheancier extends EcheanceLoyer {
  statut: StatutLoyer;
  /** L'encaissement ACTIF de cette echeance, s'il y en a un. */
  encaissement: EncaissementDossier | null;
  /** Vrai pour le loyer du mois en cours — celui qui est surligne. */
  actuel: boolean;
}

export function useCrmImmoEcheancier(dossierId: string | null) {
  const companyId = useCompanyId();
  const [periodes, setPeriodes] = useState<PeriodeDossier[]>([]);
  const [encaissements, setEncaissements] = useState<EncaissementDossier[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const fuseau = useMemo(() => fuseauLocal(), []);
  const aujourdhui = useMemo(() => journeeDeReference(new Date(), fuseau), [fuseau]);

  const charger = useCallback(async () => {
    if (!dossierId || !companyId) { setPeriodes([]); setEncaissements([]); setChargement(false); return; }
    setChargement(true);
    const [p, l] = await Promise.all([
      supabase.from('crm_immo_contrats')
        .select('id,debut,fin,jour_encaissement,cloture_le,created_at')
        .eq('company_id', companyId).eq('dossier_id', dossierId)
        .order('debut', { ascending: false }),
      /* Les ANNULES sont charges aussi : l'historique de correction doit rester lisible. */
      supabase.from('crm_immo_loyers')
        .select('id,echeance,encaisse_le,annule_le,motif_annulation')
        .eq('company_id', companyId).eq('dossier_id', dossierId)
        .order('echeance', { ascending: true }),
    ]);
    if (p.error || l.error) {
      setErreur(p.error?.message ?? l.error?.message ?? '');
    } else {
      setPeriodes((p.data ?? []) as PeriodeDossier[]);
      setEncaissements((l.data ?? []) as EncaissementDossier[]);
      setErreur('');
    }
    setChargement(false);
  }, [dossierId, companyId]);

  useEffect(() => { void charger(); }, [charger]);

  /** La periode EN COURS. Au plus une, la base le garantit par un index partiel. */
  const periodeActive = useMemo(
    () => periodes.find(p => p.cloture_le === null) ?? null,
    [periodes],
  );

  /** Les periodes closes, de la plus recente a la plus ancienne. */
  const historique = useMemo(
    () => periodes.filter(p => p.cloture_le !== null),
    [periodes],
  );

  /** Les encaissements actifs, par echeance. Une annulation rend l'echeance due. */
  const actifsParEcheance = useMemo(() => {
    const m = new Map<string, EncaissementDossier>();
    for (const e of encaissements) if (e.annule_le === null) m.set(e.echeance, e);
    return m;
  }, [encaissements]);

  /**
   * L'ECHEANCIER DE LA PERIODE EN COURS.
   *
   * Si aucune periode n'est en cours — bail termine et non renouvele — on prend la plus
   * recente : son echeancier reste consultable, et ses loyers impayes aussi.
   */
  const periodeAffichee = periodeActive ?? periodes[0] ?? null;

  const echeancier = useMemo<LigneEcheancier[]>(() => {
    if (!periodeAffichee) return [];
    const brut = construireEcheancier({
      debut: periodeAffichee.debut, fin: periodeAffichee.fin, jour: periodeAffichee.jour_encaissement,
    });
    const actuel = loyerActuel(brut, aujourdhui);
    return brut.map(e => {
      const encaissement = actifsParEcheance.get(e.date) ?? null;
      return {
        ...e,
        statut: statutDe(e.date, encaissement !== null, aujourdhui),
        encaissement,
        actuel: actuel !== null && actuel.date === e.date,
      };
    });
  }, [periodeAffichee, actifsParEcheance, aujourdhui]);

  const compteurs = useMemo(
    () => compterParStatut(
      echeancier,
      (d: string) => actifsParEcheance.has(d),
      aujourdhui,
    ),
    [echeancier, actifsParEcheance, aujourdhui],
  );

  /** L'echeancier d'une periode close, pour l'historique. */
  const echeancierDe = useCallback((p: PeriodeDossier) =>
    construireEcheancier({ debut: p.debut, fin: p.fin, jour: p.jour_encaissement }), []);

  /* ---------------------------------------------------------------------
     LES ECRITURES
     --------------------------------------------------------------------- */

  const marquerEncaisse = useCallback(async (echeance: string): Promise<string | null> => {
    if (!dossierId || !companyId) return 'Dossier introuvable.';
    setEnCours(true);
    const { data, error } = await supabase
      .from('crm_immo_loyers')
      .insert({ company_id: companyId, dossier_id: dossierId, echeance })
      .select('id');
    setEnCours(false);
    if (error) return error.message;
    if (!data || data.length === 0) return 'Action refusée : droits insuffisants.';
    await charger();
    return null;
  }, [dossierId, companyId, charger]);

  /**
   * ANNULER un encaissement : on NE supprime pas la ligne.
   *
   * David : << Je ne veux pas supprimer physiquement la ligne comme si elle n'avait
   * jamais existe. >> L'echeance redevient due, et la correction reste lisible. Le
   * declencheur en base refuse d'ailleurs le DELETE, et refuse aussi de defaire une
   * annulation : pour re-encaisser, on cree une NOUVELLE ligne.
   */
  const annulerEncaissement = useCallback(async (id: string, motif: string): Promise<string | null> => {
    if (!companyId) return 'Société introuvable.';
    setEnCours(true);
    const { data: utilisateur } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('crm_immo_loyers')
      .update({
        annule_le: new Date().toISOString(),
        annule_par: utilisateur?.user?.id ?? null,
        motif_annulation: motif.trim() === '' ? null : motif.trim().slice(0, 500),
      })
      .eq('id', id).eq('company_id', companyId)
      .select('id');
    setEnCours(false);
    if (error) return error.message;
    if (!data || data.length === 0) return 'Action refusée : droits insuffisants.';
    await charger();
    return null;
  }, [companyId, charger]);

  /**
   * RENOUVELER : cloturer l'ancienne periode, puis creer la nouvelle.
   *
   * L'ordre n'est pas une discipline, c'est une regle de la base : un index partiel
   * unique interdit deux periodes en cours, donc inserer avant de cloturer echoue.
   *
   * L'ancienne periode est CONSERVEE — c'est tout l'objet du renouvellement — et le
   * dossier est resynchronise par declencheur, sans qu'on ait a l'ecrire ici.
   */
  const renouveler = useCallback(async (
    debut: string, fin: string, jour: number,
  ): Promise<string | null> => {
    if (!dossierId || !companyId) return 'Dossier introuvable.';
    if (!debut || !fin) return 'Les deux dates sont nécessaires.';
    if (fin < debut) return 'La date de fin ne peut pas précéder la date de début.';
    if (!Number.isFinite(jour) || jour < 1 || jour > 31) return "Le jour d'encaissement doit être entre 1 et 31.";

    setEnCours(true);
    const { data: utilisateur } = await supabase.auth.getUser();

    if (periodeActive) {
      const { data, error } = await supabase
        .from('crm_immo_contrats')
        .update({ cloture_le: new Date().toISOString(), cloture_par: utilisateur?.user?.id ?? null })
        .eq('id', periodeActive.id).eq('company_id', companyId)
        .select('id');
      if (error) { setEnCours(false); return error.message; }
      if (!data || data.length === 0) { setEnCours(false); return 'Action refusée : droits insuffisants.'; }
    }

    const { data, error } = await supabase
      .from('crm_immo_contrats')
      .insert({ company_id: companyId, dossier_id: dossierId, debut, fin, jour_encaissement: jour })
      .select('id');
    setEnCours(false);
    if (error) return error.message;
    if (!data || data.length === 0) return 'Action refusée : droits insuffisants.';
    await charger();
    return null;
  }, [dossierId, companyId, periodeActive, charger]);

  return {
    periodes, periodeActive, periodeAffichee, historique,
    encaissements, echeancier, compteurs, aujourdhui,
    chargement, erreur, enCours,
    echeancierDe, recharger: charger,
    marquerEncaisse, annulerEncaissement, renouveler,
  };
}
