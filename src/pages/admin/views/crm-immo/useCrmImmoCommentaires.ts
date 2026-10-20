import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import { COMMENTAIRE_MAX, type CommentaireImmo } from './crmImmoTypes';

/**
 * Les commentaires d'un dossier — SEUL endroit qui parle a `crm_immo_commentaires`.
 *
 * ---------- DEUX LECTURES, DEUX RYTHMES ----------
 *
 * Le tableau a besoin du NOMBRE de commentaires de chaque dossier, pour afficher
 * << Commentaires (3) >> sur chaque ligne : un seul appel, au chargement, qui rapporte
 * les dossier_id et rien d'autre.
 *
 * La modale a besoin de la LISTE d'UN dossier : un appel par dossier ouvert.
 *
 * On ne rapatrie donc jamais tous les contenus de toutes les lignes pour afficher un
 * chiffre. Avec cent dossiers de dix commentaires, ce serait mille textes lus a chaque
 * ouverture du module, pour n'en afficher aucun.
 *
 * ---------- UNE ECRITURE REFUSEE NE LEVE AUCUNE ERREUR ----------
 *
 * Le piege central de supabase-js, deja rencontre trois fois dans ce module : un INSERT
 * ou un DELETE que la RLS refuse rend `{ error: null }` et ZERO ligne. Chaque ecriture
 * finit donc par un `.select()`, et zero ligne est traite comme l'echec que c'est.
 *
 * ---------- company_id N'EST PAS UNE DECISION DU CLIENT ----------
 *
 * On l'envoie parce que la colonne est NOT NULL, mais il ne peut pas mentir : la cle
 * etrangere est COMPOSEE — (dossier_id, company_id) vers crm_immo_dossiers(id,
 * company_id). Un commentaire portant le company_id d'une Societe sur le dossier d'une
 * autre est impossible a ECRIRE, pas seulement impossible a lire. Mesure faite en base :
 * la voisine qui tente l'insertion recoit 42501 dans les deux sens.
 */

/** Ce que rend le hook pour UN dossier ouvert. */
export interface EtatCommentaires {
  liste: CommentaireImmo[];
  chargement: boolean;
  erreur: string;
  ajouter: (contenu: string) => Promise<{ error: string | null }>;
  supprimer: (id: string) => Promise<{ error: string | null }>;
  recharger: () => Promise<void>;
}

/**
 * Les commentaires d'UN dossier.
 *
 * @param dossierId  Null quand aucune modale n'est ouverte : aucun appel reseau n'est
 *                   alors emis. La modale est montee pour un dossier, ou pas du tout.
 */
export function useCrmImmoCommentaires(dossierId: string | null): EtatCommentaires {
  const companyId = useCompanyId();
  const [liste, setListe] = useState<CommentaireImmo[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');

  const recharger = useCallback(async () => {
    if (!dossierId || !companyId) { setListe([]); setChargement(false); return; }
    setChargement(true);
    /* Du plus recent au plus ancien, comme David l'a demande. L'index
       (company_id, dossier_id, created_at DESC) sert exactement cette lecture. */
    const { data, error } = await supabase
      .from('crm_immo_commentaires')
      .select('id,company_id,dossier_id,contenu,created_at,created_by')
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: false });

    if (error) { setErreur(error.message); setListe([]); }
    else { setListe((data ?? []) as CommentaireImmo[]); setErreur(''); }
    setChargement(false);
  }, [dossierId, companyId]);

  useEffect(() => { void recharger(); }, [recharger]);

  const ajouter = useCallback(async (contenu: string) => {
    const texte = contenu.trim();
    /*
     * Les deux memes regles que les CHECK de la base, dans le meme ordre. Valider deux
     * fois n'est pas une redondance : la base refuse de toute facon, mais son refus
     * revient sous la forme d'un message Postgres que personne ne comprend.
     */
    if (texte === '') return { error: 'Un commentaire vide ne s’enregistre pas.' };
    if (texte.length > COMMENTAIRE_MAX) {
      return { error: `Un commentaire ne peut pas dépasser ${COMMENTAIRE_MAX} caractères (${texte.length} saisis).` };
    }
    if (!dossierId || !companyId) return { error: 'Dossier introuvable.' };

    const { data, error } = await supabase
      .from('crm_immo_commentaires')
      .insert({ company_id: companyId, dossier_id: dossierId, contenu: texte })
      .select('id,company_id,dossier_id,contenu,created_at,created_by');

    if (error) return { error: error.message };
    const rendues = (data ?? []) as CommentaireImmo[];
    if (rendues.length === 0) return { error: 'Ajout refusé : droits insuffisants.' };

    /* En tete : la liste va du plus recent au plus ancien, et celui-ci vient de naitre. */
    setListe(prev => [rendues[0], ...prev]);
    return { error: null };
  }, [dossierId, companyId]);

  const supprimer = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('crm_immo_commentaires')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) return { error: error.message };
    if ((data ?? []).length === 0) return { error: 'Suppression refusée : droits insuffisants.' };

    setListe(prev => prev.filter(c => c.id !== id));
    return { error: null };
  }, []);

  return { liste, chargement, erreur, ajouter, supprimer, recharger };
}

/**
 * Le NOMBRE de commentaires par dossier, pour le tableau.
 *
 * Une seule requete pour toute la Societe, qui ne rapporte QUE les dossier_id — jamais
 * les contenus. Compter cote client sur une colonne d'identifiants coute moins qu'un
 * aller-retour par ligne, et PostgREST ne sait pas faire un GROUP BY sans vue dediee.
 *
 * Le compte n'a pas besoin d'etre a la seconde : il se rafraichit quand on ferme la
 * modale, ce qui est le seul moment ou il a pu changer.
 */
export function useCrmImmoNombreCommentaires() {
  const companyId = useCompanyId();
  const [parDossier, setParDossier] = useState<Record<string, number>>({});

  const recharger = useCallback(async () => {
    if (!companyId) { setParDossier({}); return; }
    const { data, error } = await supabase
      .from('crm_immo_commentaires')
      .select('dossier_id')
      .eq('company_id', companyId);

    if (error) { setParDossier({}); return; }
    const compte: Record<string, number> = {};
    for (const l of (data ?? []) as { dossier_id: string }[]) {
      compte[l.dossier_id] = (compte[l.dossier_id] ?? 0) + 1;
    }
    setParDossier(compte);
  }, [companyId]);

  useEffect(() => { void recharger(); }, [recharger]);

  return { parDossier, recharger };
}
