import { useState, useEffect, useCallback } from 'react';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import { useSimulation } from '../../../../contexts/SimulationContext';
import { supabase } from '../../../../lib/supabase';
import type { LeadProspection, StatutProspection } from '../../../../lib/crmProspectionRecherche';

/**
 * LA COUCHE DONNEES DU CRM DE PROSPECTION. Un seul fichier parle a Supabase pour ce
 * module — contrairement au CRM Leads, ou CINQ fichiers le font, ce qui rend impossible
 * de verifier d'un coup d'oeil que toute requete est bornee a la Societe.
 *
 * ---------- L'ISOLATION TIENT A DEUX CHOSES, ET IL FAUT LES DEUX ----------
 *
 * LA RLS EST L'AUTORITE. Les politiques de crm_prospection_leads lisent le role et le
 * company_id dans app_metadata du JETON verifie par le serveur. Le companyId que ce
 * fichier recoit vient du navigateur : il n'autorise rien, il ne fait que decider CE
 * QU'ON DEMANDE.
 *
 * MAIS LA RLS N'IMPOSE RIEN A TALVEX. La politique « SA manage all prospection leads »
 * est un FOR ALL sans aucune condition de Societe — c'est la convention du schema, les
 * 20 tables isolees par company_id en ont toutes une. Pour un super_admin, la clause
 * `.eq('company_id', …)` ecrite ici est donc la SEULE chose qui borne la requete. Une
 * suppression groupee ecrite `.in('id', ids)` toute seule — ce qu'est exactement le code
 * du CRM Leads (useCrmData.ts:181) — ne serait bornee par rien.
 *
 * D'ou la regle, validee par David et tenue par un relevé : TOUTE ecriture porte
 * `.eq('company_id', companyId)`, y compris quand elle porte deja `.in('id', …)`.
 *
 * ---------- CE QU'IL N'Y A PAS ICI, A DESSEIN ----------
 *
 * PAS D'ABONNEMENT TEMPS REEL. David ne l'a pas demande, et le CRM Leads ouvre deja un
 * canal nomme 'statuts-crm' SANS filtre de Societe (useCrmData.ts:131). Ouvrir un second
 * canal sur la meme table depuis le meme client supabase-js donnerait, au mieux, des
 * rechargements en double ; au pire un removeChannel qui couperait l'abonnement de
 * l'autre vue. On recharge a la main apres chaque ecriture, ce qui suffit.
 */

/** Ce qu'un formulaire envoie. `id` absent = creation. */
export interface SaisieProspection {
  nom: string;
  prenom: string;
  email: string;
  poste: string;
  entreprise: string;
  lien: string;
  statut_id: string | null;
  commentaire: string;
}

export const SAISIE_VIDE: SaisieProspection = {
  nom: '', prenom: '', email: '', poste: '', entreprise: '', lien: '', statut_id: null, commentaire: '',
};

const COLONNES = 'id, nom, prenom, email, poste, entreprise, lien, statut_id, commentaire';

/**
 * Une chaine vide n'est pas une valeur : c'est une absence. L'enregistrer telle quelle
 * ferait apparaitre des cellules vides qui ne sont ni NULL ni remplies, et le tri comme
 * les filtres devraient alors traiter DEUX formes du vide. On n'en garde qu'une.
 */
function videEnNull(v: string): string | null {
  const t = v.trim();
  return t === '' ? null : t;
}

export function useCrmProspectionData() {
  const companyId = useCompanyId();
  const { isSimulating } = useSimulation();

  const [leads, setLeads] = useState<LeadProspection[]>([]);
  const [statuts, setStatuts] = useState<StatutProspection[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    if (!companyId) return;
    setErreur('');
    const [r1, r2] = await Promise.all([
      supabase.from('crm_prospection_leads').select(COLONNES)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }).order('id', { ascending: true }),
      /*
       * LE MEME CATALOGUE QUE LE CRM LEADS, et c'est l'exigence premiere de David : on ne
       * cree pas un second systeme de statuts. La table est public.statuts, pas
       * crm_system_statuses — cette derniere porte le meilleur nom des neuf candidates et
       * n'a AUCUN company_id : ses lignes sont modifiables par l'admin de n'importe quelle
       * autre Societe.
       */
      supabase.from('statuts').select('id, nom, couleur')
        .eq('company_id', companyId)
        .order('nom', { ascending: true }),
    ]);
    if (r1.error) setErreur(r1.error.message);
    setLeads((r1.data ?? []) as LeadProspection[]);
    setStatuts((r2.data ?? []) as StatutProspection[]);
    setChargement(false);
  }, [companyId]);

  useEffect(() => { void charger(); }, [charger]);

  /** Creation. Rend un message d'erreur, ou '' en cas de succes. */
  const creer = useCallback(async (saisie: SaisieProspection): Promise<string> => {
    if (!companyId || isSimulating) return '';
    const { error } = await supabase.from('crm_prospection_leads').insert({
      company_id: companyId,
      nom: saisie.nom.trim(),
      prenom: videEnNull(saisie.prenom),
      email: videEnNull(saisie.email),
      poste: videEnNull(saisie.poste),
      entreprise: videEnNull(saisie.entreprise),
      lien: videEnNull(saisie.lien),
      statut_id: saisie.statut_id,
      commentaire: videEnNull(saisie.commentaire),
    });
    if (error) return messageLisible(error.message);
    await charger();
    return '';
  }, [companyId, isSimulating, charger]);

  /** Modification. La clause company_id accompagne l'id, pour la raison dite en tete. */
  const modifier = useCallback(async (id: string, saisie: SaisieProspection): Promise<string> => {
    if (!companyId || isSimulating) return '';
    const { error } = await supabase.from('crm_prospection_leads').update({
      nom: saisie.nom.trim(),
      prenom: videEnNull(saisie.prenom),
      email: videEnNull(saisie.email),
      poste: videEnNull(saisie.poste),
      entreprise: videEnNull(saisie.entreprise),
      lien: videEnNull(saisie.lien),
      statut_id: saisie.statut_id,
      commentaire: videEnNull(saisie.commentaire),
    }).eq('id', id).eq('company_id', companyId);
    if (error) return messageLisible(error.message);
    await charger();
    return '';
  }, [companyId, isSimulating, charger]);

  /**
   * SUPPRESSION, SIMPLE OU GROUPEE — la MEME fonction, et c'est voulu.
   *
   * Deux chemins de suppression, c'est deux endroits ou oublier le `.eq('company_id', …)`.
   * Un seul chemin, c'est un seul endroit a verifier — et le relevé n'a qu'un motif a
   * surveiller. La suppression simple n'est qu'un lot d'un element.
   *
   * La liste recue a DEJA ete intersectee avec les lignes affichees par idsASupprimer :
   * c'est la premiere des trois protections, celle qui empeche qu'un `Set` survivant a un
   * changement de filtre emporte des lignes que l'utilisateur ne voit plus.
   */
  const supprimer = useCallback(async (ids: readonly string[]): Promise<string> => {
    if (!companyId || isSimulating || ids.length === 0) return '';
    const { error } = await supabase.from('crm_prospection_leads')
      .delete()
      .in('id', ids as string[])
      .eq('company_id', companyId);
    if (error) return messageLisible(error.message);
    await charger();
    return '';
  }, [companyId, isSimulating, charger]);

  return { leads, statuts, chargement, erreur, charger, creer, modifier, supprimer, isSimulating };
}

/**
 * LES REFUS DE LA BASE, DITS EN FRANCAIS.
 *
 * Un message brut de PostgreSQL devant un utilisateur est un cul-de-sac : il ne dit ni ce
 * qui ne va pas, ni quoi faire. Les trois contraintes de la table sont nommees justement
 * pour pouvoir etre reconnues ici.
 */
function messageLisible(brut: string): string {
  if (brut.includes('crm_prospection_leads_lien_http')) {
    return "Le lien doit commencer par http:// ou https://.";
  }
  if (brut.includes('crm_prospection_leads_nom_non_vide')) {
    return 'Le nom est obligatoire.';
  }
  if (brut.includes('crm_prospection_leads_commentaire_borne')) {
    return 'Le commentaire est limité à 5 000 caractères.';
  }
  if (brut.includes('crm_prospection_leads_statut_fkey')) {
    /* Arrive si le statut a ete supprime depuis l'onglet Statuts pendant la saisie. */
    return "Ce statut n'existe plus. Rechargez la page pour voir la liste à jour.";
  }
  return brut;
}
