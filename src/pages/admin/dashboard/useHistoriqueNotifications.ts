import { useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNotificationHistory } from '../../../hooks/useNotificationHistory';
import type { EntreeHistorique, SourcesNotifications } from '../../../lib/notificationHistory';
import type { Destination } from '../views/historique/notificationDestinations';
import type { ActiveView } from '../adminDashboardTypes';
import type { ChatLead } from '../views/Crm';
import type { Vendor } from '../views/ListeVendeurs';
import type { PaquetHistorique } from './AdminViewRenderer';

/**
 * LE BRANCHEMENT de l'historique des notifications sur le panel Societe.
 *
 * Appele UNE SEULE FOIS dans AdminDashboard, comme les alertes CRM Immo et pour la meme
 * raison : deux appels donneraient deux verites. Et surtout, l'alimentation doit tourner
 * meme quand personne n'ouvre l'onglet — sinon l'historique ne contiendrait que ce qui
 * est arrive pendant qu'on le regardait.
 *
 * ---------- LE CLIC MENE AU METIER, PAS A UNE FICHE ----------
 *
 * `ouvrir` fait ce que ferait un clic dans la cloche : il marque lu et il ouvre la
 * donnee. Pour les deux chats il y a une resolution a faire, parce que l'historique
 * garde l'INTERLOCUTEUR (client_auth_id, vendor_id) alors qu'ouvrir la conversation
 * reclame l'objet complet. On ne recopie pas le lead dans l'historique : une archive de
 * notifications n'est pas une copie du metier, et une copie se perime.
 */

interface Options {
  companyId: string | null;
  /** Le destinataire : l'entite REGARDEE. */
  userId: string | null;
  /** Vrai en Visu : on consulte l'historique de quelqu'un d'autre, on n'y ecrit pas. */
  lectureSeule: boolean;

  sources: SourcesNotifications;

  setActiveView: (v: ActiveView) => void;
  setChatLead: (l: ChatLead | null) => void;
  setChatVendor: (v: Vendor | null) => void;
  setChatClientMessageSent: (v: boolean) => void;
  setChatVendorMessageSent: (v: boolean) => void;
  setDossierImmoAOuvrir: (id: string | null) => void;
}

export function useHistoriqueNotifications(o: Options): PaquetHistorique {
  const h = useNotificationHistory({
    companyId: o.companyId,
    userId: o.userId,
    lectureSeule: o.lectureSeule,
  });

  const { alimenter } = h;
  const { sources } = o;

  /*
   * L'alimentation tourne a chaque fois que les sources changent reellement.
   *
   * Le hook compare la signature des lignes a ecrire, donc un rendu de React qui
   * reconstruit les memes tableaux n'ecrit rien. C'est ce qui permet de l'appeler ici
   * sans condition : un upsert idempotent sur des lignes identiques est gratuit.
   */
  useEffect(() => { void alimenter(sources); }, [alimenter, sources]);

  /** Resout le lead derriere un client_auth_id, pour pouvoir ouvrir sa conversation. */
  const trouverLead = useCallback(async (clientAuthId: string): Promise<ChatLead | null> => {
    if (!o.companyId) return null;
    /*
     * L'identifiant Auth d'un client vit soit dans la colonne `id` du lead, soit dans son
     * JSON `data` — c'est la regle de lecture de useUnreadClientMessages, reprise ici
     * telle quelle pour que les deux chemins ouvrent la MEME conversation.
     */
    const { data } = await supabase
      .from('leads')
      .select('id, prenom, nom, email, data')
      .eq('company_id', o.companyId)
      .or(`id.eq.${clientAuthId},data->>AuthId.eq.${clientAuthId},data->>auth_id.eq.${clientAuthId}`)
      .limit(1);

    const l = data?.[0];
    if (!l) return null;
    return {
      id: l.id,
      prenom: l.prenom ?? l.data?.['Prenom'] ?? l.data?.['prenom'] ?? '',
      nom: l.nom ?? l.data?.['Nom'] ?? l.data?.['nom'] ?? '',
      email: l.email ?? l.data?.['Email'] ?? l.data?.['email'] ?? '',
    } as ChatLead;
  }, [o.companyId]);

  const trouverVendeur = useCallback(async (vendorId: string): Promise<Vendor | null> => {
    const { data } = await supabase
      .from('vendors')
      .select('id, first_name, last_name, email, auth_user_id, phone, created_at')
      .eq('id', vendorId)
      .limit(1);
    const v = data?.[0];
    if (!v) return null;
    return { ...v, password: '' } as Vendor;
  }, []);

  const ouvrir = useCallback(async (d: Destination, e: EntreeHistorique) => {
    /*
     * Le clic VAUT lecture, et il la vaut AVANT la navigation : si la resolution du lead
     * echoue, la notification doit quand meme cesser d'etre neuve — l'utilisateur l'a
     * bien vue. En lecture seule, le hook refuse l'ecriture de lui-meme.
     */
    void h.marquerLue(e.id);

    switch (d.quoi) {
      case 'dossier':
        o.setDossierImmoAOuvrir(d.dossierId);
        o.setActiveView('crm-immo');
        return;

      case 'client': {
        const lead = await trouverLead(d.clientAuthId);
        /*
         * Lead introuvable — il a pu etre supprime depuis. On ouvre quand meme le Chat
         * Client, sans conversation preselectionnee : c'est le comportement normal de la
         * vue, et c'est plus honnete qu'un bouton qui ne fait rien.
         */
        if (lead) { o.setChatLead(lead); o.setChatClientMessageSent(false); }
        o.setActiveView('chat-client');
        return;
      }

      case 'vendeur': {
        const v = await trouverVendeur(d.vendorId);
        if (v) { o.setChatVendor(v); o.setChatVendorMessageSent(false); }
        o.setActiveView('chat-vendeur');
        return;
      }

      case 'rien':
        o.setActiveView(d.vue);
        return;
    }
  }, [h, o, trouverLead, trouverVendeur]);

  return useMemo<PaquetHistorique>(() => ({
    entrees: h.entrees,
    chargement: h.chargement,
    erreur: h.erreur,
    lectureSeule: o.lectureSeule,
    onVoir: (d, e) => { void ouvrir(d, e); },
    onTraiter: (id) => { void h.marquerTraitee(id); },
    onArchiver: (id, archiver) => { void h.archiver(id, archiver); },
    onSupprimer: (id) => { void h.supprimer(id); },
  }), [h, o.lectureSeule, ouvrir]);
}
