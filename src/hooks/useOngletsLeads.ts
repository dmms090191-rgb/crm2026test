import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  chargerStructureOnglets, chargerAppartenances, creerOnglet, renommerOnglet, archiverOnglet,
  enregistrerColonnesOnglet, rattacherLeads, retirerLeads, type StructureOnglets,
} from '../lib/ongletsDepot';
import { ONGLET_PRINCIPAL, colonnesDeLOnglet, type ColonneAffichee, type ColonneRegistre, type Onglet } from '../lib/ongletsLeads';
import { useOngletActif } from './useOngletActif';

/**
 * LES ONGLETS DE COLONNES D'UNE SOCIETE, pour le CRM Leads (Societe et Commercial).
 *
 * Charge en DEUX lectures paralleles la structure (onglets, registre, colonnes d'onglet) et
 * les appartenances (quel lead est dans quel onglet), et garde l'onglet actif — un choix
 * personnel, voir useOngletActif. Un onglet retenu qui n'existe plus (archive depuis un
 * autre poste) retombe sur Principal au lieu d'afficher une liste vide inexpliquee.
 *
 * Les ecritures (creer, renommer, archiver, colonnes, rattacher, retirer) ne sont offertes
 * qu'a la Societe et au Super Admin : la RLS refuse les autres, l'interface ne les montre pas.
 */
export function useOngletsLeads(companyId: string | null | undefined) {
  const { ongletId: choisi, choisir } = useOngletActif(companyId);
  const [structure, setStructure] = useState<StructureOnglets | null>(null);
  const [appartenances, setAppartenances] = useState<Map<string, string[]>>(() => new Map());
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  /* Le Super Admin passe d'une societe a l'autre : la reponse de la PRECEDENTE peut arriver
     apres celle de la nouvelle. Seule la derniere demande a le droit d'ecrire l'etat. */
  const derniere = useRef(0);

  const recharger = useCallback(async () => {
    const numero = ++derniere.current;
    if (!companyId) return;
    const [s, a] = await Promise.all([chargerStructureOnglets(companyId), chargerAppartenances(companyId)]);
    if (numero !== derniere.current) return;
    if (s.error || a.error) {
      setErreur(s.error ?? a.error ?? '');
    } else {
      setErreur('');
      setStructure(s.data);
      setAppartenances(a.data ?? new Map());
    }
    setChargement(false);
  }, [companyId]);

  /* Une autre societe : on ne garde RIEN de la precedente le temps de la lecture. */
  useEffect(() => {
    setChargement(true);
    setStructure(null);
    setAppartenances(new Map());
    recharger();
  }, [recharger]);

  const onglets: Onglet[] = useMemo(() => structure?.onglets ?? [], [structure]);
  const registre = useMemo(() => new Map<string, ColonneRegistre>((structure?.registre ?? []).map(r => [r.id, r])), [structure]);
  const nomParId = useMemo(() => new Map(onglets.map(o => [o.id, o.nom])), [onglets]);

  const ongletActif = !structure ? choisi : (nomParId.has(choisi) ? choisi : ONGLET_PRINCIPAL);
  const ongletActifNom = ongletActif === ONGLET_PRINCIPAL ? 'Principal' : nomParId.get(ongletActif) ?? '…';

  const colonnesParOnglet = useMemo(() => {
    const m = new Map<string, ColonneAffichee[]>();
    for (const o of onglets) {
      m.set(o.id, colonnesDeLOnglet((structure?.colonnes ?? []).filter(c => c.onglet_id === o.id), registre));
    }
    return m;
  }, [onglets, structure, registre]);

  const comptes = useMemo(() => {
    const m = new Map<string, number>();
    for (const ids of appartenances.values()) for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [appartenances]);

  /** Les noms des onglets (non archives) d'un lead, dans l'ordre des onglets. */
  const nomsOngletsDuLead = useCallback((leadId: string): string[] => {
    const ids = appartenances.get(leadId);
    if (!ids) return [];
    return onglets.filter(o => ids.includes(o.id)).map(o => o.nom);
  }, [appartenances, onglets]);

  const dansOnglet = useCallback((leadId: string, ongletId: string) =>
    appartenances.get(leadId)?.includes(ongletId) ?? false, [appartenances]);

  const creer = async (nom: string) => {
    if (!companyId) return { error: 'Societe inconnue' };
    const { data, error } = await creerOnglet(companyId, nom);
    if (error) return { error: messageNom(error) };
    await recharger();
    if (typeof data === 'string') choisir(data);
    return { error: null };
  };

  const renommer = async (ongletId: string, nom: string) => {
    if (!companyId) return { error: 'Societe inconnue' };
    const { error } = await renommerOnglet(companyId, ongletId, nom);
    if (error) return { error: messageNom(error) };
    await recharger();
    return { error: null };
  };

  const archiver = async (ongletId: string) => {
    if (!companyId) return { error: 'Societe inconnue' };
    const { error } = await archiverOnglet(companyId, ongletId);
    if (error) return { error: error.message };
    if (ongletActif === ongletId) choisir(ONGLET_PRINCIPAL);
    await recharger();
    return { error: null };
  };

  const enregistrerColonnes = async (
    ongletId: string,
    colonnes: { id: string; position: number; visible: boolean; libelle: string | null }[],
    ajouts: ({ colonne_id: string } | { cle_systeme: string })[],
  ) => {
    const { error } = await enregistrerColonnesOnglet(ongletId, colonnes, ajouts);
    if (error) return { error: error.message };
    await recharger();
    return { error: null };
  };

  const rattacher = async (ongletId: string, leadIds: string[]) => {
    if (!companyId || leadIds.length === 0) return { error: null };
    const { error } = await rattacherLeads(companyId, ongletId, leadIds);
    if (error) return { error: error.message };
    setAppartenances(prev => {
      const n = new Map(prev);
      for (const id of leadIds) {
        const l = n.get(id) ?? [];
        if (!l.includes(ongletId)) n.set(id, [...l, ongletId]);
      }
      return n;
    });
    return { error: null };
  };

  const retirer = async (ongletId: string, leadIds: string[]) => {
    if (!companyId || leadIds.length === 0) return { error: null };
    const { error } = await retirerLeads(companyId, ongletId, leadIds);
    if (error) return { error: error.message };
    setAppartenances(prev => {
      const n = new Map(prev);
      for (const id of leadIds) {
        const l = (n.get(id) ?? []).filter(o => o !== ongletId);
        if (l.length) n.set(id, l); else n.delete(id);
      }
      return n;
    });
    return { error: null };
  };

  return {
    onglets, registre, colonnesParOnglet, appartenances, comptes, chargement, erreur,
    ongletActif, ongletActifNom, choisir, recharger, nomsOngletsDuLead, dansOnglet,
    creer, renommer, archiver, enregistrerColonnes, rattacher, retirer,
  };
}

export type OngletsLeads = ReturnType<typeof useOngletsLeads>;

/** Le refus d'un nom d'onglet, dit simplement. */
function messageNom(e: { code?: string; message: string }): string {
  if (e.code === '23505') return 'Un onglet ouvert porte déjà ce nom.';
  if (/principal/i.test(e.message)) return '« Principal » est réservé.';
  if (e.code === '23514') return 'Ce nom n\'est pas accepté (vide ou plus de 80 caractères).';
  return e.message;
}
