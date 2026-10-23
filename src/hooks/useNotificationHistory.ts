import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  construireLignes,
  type EntreeHistorique,
  type LigneHistorique,
  type SourcesNotifications,
} from '../lib/notificationHistory';

/**
 * L'HISTORIQUE DES NOTIFICATIONS — le cote reseau.
 *
 * Ce hook ne decide rien : ce qui fait une notification, un doublon ou un episode est
 * dans src/lib/notificationHistory.ts, teste sans navigateur. Ici, il n'y a que des
 * allers-retours avec la base, et le soin de ne jamais croire un succes muet.
 *
 * ---------- POURQUOI CHAQUE ECRITURE SE COMPTE ----------
 *
 * Un UPDATE refuse par la RLS ne leve pas d'erreur cote supabase-js : il rend
 * { error: null } et ZERO ligne. Croire ce silence, c'est retirer une notification de
 * l'ecran et la voir revenir au rechargement. Toutes les ecritures d'ici font donc
 * .select() et comparent le nombre de lignes rendues.
 *
 * ---------- LE SEUL GARDE QUI NE SOIT PAS STRUCTUREL ----------
 *
 * Partout ailleurs le cloisonnement est tenu par la base. Ici il y a UNE exception, et
 * il faut la nommer : en Visu, Talvex porte le role super_admin, dont la politique est
 * FOR ALL sur toute la table. La base LAISSERAIT donc Talvex marquer lu, archiver ou
 * supprimer les notifications de l'admin qu'il regarde — et faire baisser son compteur.
 *
 * C'est la regle tranchee pour le Groupe, appliquee a Visu : consulter ne doit jamais
 * ecrire a la place de quelqu'un. Comme la RLS ne peut pas la porter, `lectureSeule` la
 * porte ici, et refuse chaque ecriture a la source.
 */

interface Options {
  companyId: string | null;
  /** Le destinataire des notifications : l'entite REGARDEE, pas forcement le compte connecte. */
  userId: string | null;
  /** Vrai en Visu et pour le Groupe : on consulte, on n'ecrit pas. */
  lectureSeule?: boolean;
}

/** Le libelle qui remplace le contenu purge. Non vide : la base refuse le blanc. */
export const TITRE_SUPPRIMEE = 'Notification supprimee';

export function useNotificationHistory({ companyId, userId, lectureSeule = false }: Options) {
  const [entrees, setEntrees] = useState<EntreeHistorique[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  /*
   * L'alimentation ne doit pas se rejouer a chaque rendu.
   *
   * Les sources changent d'identite a chaque rendu de React (nouveaux tableaux), donc
   * un useEffect sur elles tournerait en boucle. On compare la SIGNATURE des lignes a
   * ecrire : tant qu'elle ne change pas, il n'y a rien a ecrire.
   */
  const derniereSignature = useRef<string>('');

  const charger = useCallback(async () => {
    if (!companyId || !userId) { setEntrees([]); setChargement(false); return; }
    setChargement(true);

    /*
     * `deleted_at is null` est demande explicitement, en plus du filtre de la page.
     * Une ligne purgee n'a plus de contenu : la laisser traverser le reseau pour la
     * cacher ensuite serait du gaspillage, et une occasion de l'afficher par erreur.
     */
    const { data, error } = await supabase
      .from('notification_history')
      /* Liste ecrite en UN seul littereal : supabase-js type le resultat en analysant
         cette chaine. Une constante concatenee le lui rend impossible — il rend alors
         GenericStringError[], qu'il faudrait forcer par un cast, et on perdrait tout
         controle sur la forme reellement renvoyee. */
      .select('id, company_id, recipient_user_id, category, source_type, source_id, occurrence, title, message, occurred_at, read_at, treated_at, archived_at, deleted_at, created_at')
      .eq('company_id', companyId)
      .eq('recipient_user_id', userId)
      .is('deleted_at', null)
      .order('occurred_at', { ascending: false })
      .limit(500);

    if (error) {
      setErreur(error.message);
      setEntrees([]);
    } else {
      setErreur(null);
      setEntrees((data ?? []) as EntreeHistorique[]);
    }
    setChargement(false);
  }, [companyId, userId]);

  useEffect(() => { void charger(); }, [charger]);

  /*
   * La page doit se mettre a jour quand l'alimentation ecrit depuis un autre onglet, ou
   * quand la cloche marque lu. Le filtre porte sur la Societe ; le destinataire est
   * revalide par le rechargement, qui passe par la RLS.
   */
  useEffect(() => {
    if (!companyId) return;
    const ch = supabase
      .channel('admin-notification-history')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notification_history', filter: `company_id=eq.${companyId}` },
        () => { void charger(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [companyId, charger]);

  /**
   * L'ALIMENTATION : inscrit l'etat courant de la cloche dans l'historique.
   *
   * Idempotente par construction. La cle (company, destinataire, categorie, source,
   * occurrence) fait qu'un rejeu retombe sur les memes lignes, et le declencheur en
   * base fait qu'une ligne supprimee reste supprimee. On peut donc l'appeler a chaque
   * chargement de page sans rien abimer.
   */
  const alimenter = useCallback(async (sources: SourcesNotifications) => {
    if (lectureSeule || !companyId || !userId) return;

    const lignes = construireLignes(sources, { companyId, userId });
    if (lignes.length === 0) return;

    const signature = lignes.map(l => `${l.category}|${l.source_id}|${l.occurrence}`).sort().join('\n');
    if (signature === derniereSignature.current) return;
    derniereSignature.current = signature;

    /*
     * DEUX LOTS, ET C'EST INDISPENSABLE.
     *
     * PostgREST prend l'UNION des clefs d'un lot et met null pour celles qu'une ligne
     * n'a pas. Envoyer ensemble des lignes qui portent `read_at` et d'autres qui ne le
     * portent pas remettrait donc a NULL le marquage de toutes ces autres — un message
     * lu dans l'historique redeviendrait non lu au passage suivant.
     *
     * On separe donc sur la PRESENCE de la clef, pas sur la categorie : le module pur
     * decide quelles sources portent un etat, et ce hook n'a pas a le redire. Seul CRM
     * Immo en porte un aujourd'hui, parce que crm_immo_etats est sa verite ; pour les
     * autres, `read_at` appartient a l'historique seul et l'alimentation n'y touche pas.
     *
     * `ignoreDuplicates: false` dans les deux cas : on veut bien que le titre et
     * l'apercu se rafraichissent (« 2 messages non lus » devient « 3 »). C'est la pierre
     * tombale, en base, qui decide de ce qui ne doit PAS etre rafraichi — pas le client.
     */
    const avecEtat = lignes.filter(l => 'read_at' in l);
    const sansEtat = lignes.filter(l => !('read_at' in l));

    let ecrites = 0;
    for (const lot of [sansEtat, avecEtat]) {
      if (lot.length === 0) continue;
      const { data, error } = await supabase
        .from('notification_history')
        .upsert(lot as LigneHistorique[], {
          onConflict: 'company_id,recipient_user_id,category,source_id,occurrence',
          ignoreDuplicates: false,
        })
        .select('id');

      if (error) {
        /* Signale sans casser : une notification non archivee reste visible dans la cloche. */
        console.error('historique des notifications : alimentation refusee', error.message);
        /* La signature est remise a zero pour que le prochain passage retente. */
        derniereSignature.current = '';
        return;
      }
      ecrites += data?.length ?? 0;
    }
    if (ecrites > 0) await charger();
  }, [companyId, userId, lectureSeule, charger]);

  /** Ecrit un champ d'etat sur une entree, et dit si l'ecriture a vraiment eu lieu. */
  const ecrire = useCallback(async (id: string, champs: Record<string, string | null>): Promise<boolean> => {
    if (lectureSeule) {
      console.warn('historique des notifications : ecriture refusee, consultation en lecture seule');
      return false;
    }
    const { data, error } = await supabase
      .from('notification_history')
      .update(champs)
      .eq('id', id)
      .select('id');

    if (error) { setErreur(error.message); return false; }
    if (!data || data.length === 0) {
      /*
       * Zero ligne et aucune erreur : soit la RLS a refuse, soit la ligne est une pierre
       * tombale que le declencheur protege. Dans les deux cas l'ecran ne doit PAS
       * pretendre le contraire.
       */
      setErreur("Cette notification n'a pas pu etre modifiee.");
      return false;
    }
    setErreur(null);
    return true;
  }, [lectureSeule]);

  /** Marque lu. Appele par le clic, jamais par la simple ouverture de la cloche. */
  const marquerLue = useCallback(async (id: string) => {
    const e = entrees.find(x => x.id === id);
    if (!e || e.read_at !== null) return true;
    const ok = await ecrire(id, { read_at: new Date().toISOString() });
    if (ok) await charger();
    return ok;
  }, [entrees, ecrire, charger]);

  const marquerTraitee = useCallback(async (id: string) => {
    const quand = new Date().toISOString();
    /* Traiter implique avoir lu : on ne laisse pas un etat incoherent s'installer. */
    const e = entrees.find(x => x.id === id);
    const ok = await ecrire(id, { treated_at: quand, read_at: e?.read_at ?? quand });
    if (ok) await charger();
    return ok;
  }, [entrees, ecrire, charger]);

  const archiver = useCallback(async (id: string, archiver: boolean) => {
    const ok = await ecrire(id, { archived_at: archiver ? new Date().toISOString() : null });
    if (ok) await charger();
    return ok;
  }, [ecrire, charger]);

  /**
   * SUPPRIMER : pose la pierre tombale et purge le contenu.
   *
   * Jamais un DELETE. La ligne doit survivre pour que la contrainte d'unicite empeche
   * l'alimentation de recreer la notification au prochain chargement ; un DELETE la
   * ferait revenir. Le declencheur en base refuse d'ailleurs le DELETE a l'utilisateur.
   *
   * Ce qui compose la cle (categorie, source, occurrence) reste INTACT : sans lui, la
   * cle serait liberee et la pierre tombale ne garderait plus rien.
   *
   * Et cela ne touche a aucune donnee metier. Ce n'est pas une promesse : `source_id` ne
   * porte aucune cle etrangere, il n'existe donc aucun chemin d'ici vers un dossier, un
   * contrat, un rendez-vous ou une conversation.
   */
  const supprimer = useCallback(async (id: string) => {
    const ok = await ecrire(id, {
      deleted_at: new Date().toISOString(),
      title: TITRE_SUPPRIMEE,
      message: null,
    });
    if (ok) setEntrees(prev => prev.filter(e => e.id !== id));
    return ok;
  }, [ecrire]);

  return {
    entrees, chargement, erreur,
    recharger: charger,
    alimenter,
    marquerLue, marquerTraitee, archiver, supprimer,
  };
}
