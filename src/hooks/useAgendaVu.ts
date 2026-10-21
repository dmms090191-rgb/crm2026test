import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { construireLignes } from '../lib/notificationHistory';
import {
  cleLocale, cleBase, cleBaseDepuisLigne, purgerParAge,
  type CategorieAgenda, type GenreAgenda, type Persistance,
} from '../lib/agendaVu';

/**
 * L'ADAPTATEUR DE PERSISTANCE DU « DEJA VU » D'AGENDA.
 *
 * Il applique la decision prise par `deciderPersistance`, et rien de plus : soit la
 * base — et le « vu » suit l'utilisateur d'un appareil a l'autre, definitivement — soit
 * le localStorage, exactement comme avant.
 *
 * ---------- CE QUI NE DOIT RIEN CHANGER ----------
 *
 * Pour le Vendeur et le Client, le chemin localStorage doit se comporter a l'identique.
 * D'ou deux details qui comptent :
 *
 *   - `estVu` est SYNCHRONE dans les deux cas. Si la lecture devenait asynchrone pour
 *     tout le monde, le premier rendu du panel Vendeur montrerait brievement comme
 *     neuves des notifications deja vues ;
 *   - l'identite de `estVu` ne change JAMAIS sur le chemin local. Elle ne change que
 *     lorsque l'ensemble charge depuis la base change, pour que l'appelant sache quand
 *     reevaluer — et seulement alors.
 *
 * ---------- POURQUOI UN UPSERT ET NON UN UPDATE ----------
 *
 * Marquer vu doit fonctionner meme si l'alimentation de l'historique n'a pas encore
 * ecrit la ligne. C'est un vrai cas : une alerte « starting » n'existe que soixante
 * secondes avant et apres l'heure du rendez-vous, et l'utilisateur peut cliquer avant
 * que l'alimentation soit passee. Un UPDATE ne toucherait alors aucune ligne, et le
 * marquage serait perdu en silence.
 *
 * La ligne est construite par `construireLignes` — la MEME fabrique que l'alimentation,
 * et non une copie. Deux fabriques divergeraient, et l'upsert ecraserait le titre de
 * l'autre a chaque passage.
 */

export interface InfosAgenda {
  leadName: string;
  /** Present pour l'agenda d'equipe seulement. */
  vendorName?: string;
  appointmentUtc: string;
}

export interface SourceVu {
  /** D'ou vient le « vu ». Lisible par les tests, et par qui debogue. */
  source: 'base' | 'local';
  /** La raison du repli, quand il y en a un. */
  raison?: string;
  /** Vrai quand la lecture est fiable. Toujours vrai en local. */
  prete: boolean;
  /** Lecture SYNCHRONE. */
  estVu: (rdvId: string, type?: GenreAgenda) => boolean;
  /** Ecriture VERIFIEE : rend faux si rien n'a ete ecrit. */
  marquer: (rdvId: string, type: GenreAgenda | undefined, infos: InfosAgenda) => Promise<boolean>;
}

/* ---------------------------------------------------------------------------
   LE CHEMIN LOCAL — inchange, aux deux details pres expliques plus haut
   --------------------------------------------------------------------------- */

function lireLocal(cleStockage: string): Record<string, number> {
  try {
    const brut = localStorage.getItem(cleStockage);
    if (!brut) return {};
    const v = JSON.parse(brut);
    return v && typeof v === 'object' ? v as Record<string, number> : {};
  } catch { return {}; }
}

function ecrireLocal(cleStockage: string, map: Record<string, number>) {
  try {
    /* Purge a l'identique de celle d'avant : meme duree, meme moment. Le Vendeur et le
       Client passent par ici, et leur comportement ne doit pas bouger d'un cheveu. */
    localStorage.setItem(cleStockage, JSON.stringify(purgerParAge(map, Date.now())));
  } catch {
    /* Navigation privee, stockage plein, site bloque : on n'empeche pas l'ecran de
       fonctionner pour autant. L'appelant verra que l'ecriture n'a pas eu lieu. */
  }
}

/* ---------------------------------------------------------------------------
   LE HOOK
   --------------------------------------------------------------------------- */

export function useAgendaVu(
  persistance: Persistance,
  categorie: CategorieAgenda,
  cleStockage: string,
): SourceVu {
  /* L'ensemble des cles deja vues, quand la persistance est en base. */
  const [vuesEnBase, setVuesEnBase] = useState<Set<string> | null>(null);

  const enBase = persistance.ou === 'base';
  const companyId = persistance.ou === 'base' ? persistance.companyId : null;
  const userId = persistance.ou === 'base' ? persistance.userId : null;

  const charger = useCallback(async () => {
    if (!companyId || !userId) { setVuesEnBase(null); return; }

    /*
     * « Vu » ne veut pas dire seulement « lu ».
     *
     * Une entree SUPPRIMEE de l'historique compte aussi comme vue : l'utilisateur l'a
     * forcement regardee pour la supprimer, et la pierre tombale a purge son contenu.
     * Sans cette clause, supprimer une notification d'agenda depuis l'historique la
     * rendrait impossible a faire disparaitre de la cloche — le declencheur refuse de
     * reecrire une ligne supprimee, donc le marquage echouerait indefiniment.
     */
    const { data, error } = await supabase
      .from('notification_history')
      .select('source_id, occurrence, read_at, deleted_at')
      .eq('company_id', companyId)
      .eq('recipient_user_id', userId)
      .eq('category', categorie)
      .or('read_at.not.is.null,deleted_at.not.is.null');

    if (error) {
      /* On ne rend PAS un ensemble vide : un ensemble vide dirait « rien n'a ete vu »,
         et toutes les alertes passees remonteraient. `null` dit « on ne sait pas
         encore », et l'appelant attend. */
      console.error('agenda : lecture du « deja vu » refusee', error.message);
      return;
    }

    const neuf = new Set((data ?? []).map(r => cleBaseDepuisLigne(r.source_id, r.occurrence)));

    /*
     * On ne change l'etat QUE si le contenu a vraiment change.
     *
     * L'abonnement temps reel ne peut filtrer que sur une colonne : il porte donc sur la
     * Societe, et se reveille pour TOUTE ecriture dans l'historique — y compris une
     * notification de chat, qui ne concerne pas l'agenda. Sans cette comparaison, chaque
     * passage de l'alimentation rendrait un Set neuf au contenu identique, et la
     * nouvelle identite ferait reevaluer puis rerendre toute la barre du haut pour rien.
     */
    setVuesEnBase(prev => {
      if (prev && prev.size === neuf.size && [...neuf].every(c => prev.has(c))) return prev;
      return neuf;
    });
  }, [companyId, userId, categorie]);

  useEffect(() => { void charger(); }, [charger]);

  /* Un autre appareil, ou la page Historique, peut marquer lu de son cote. */
  useEffect(() => {
    if (!enBase || !companyId) return;
    const ch = supabase
      .channel(`agenda-vu-${categorie}-${companyId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notification_history', filter: `company_id=eq.${companyId}` },
        () => { void charger(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [enBase, companyId, categorie, charger]);

  /* Les valeurs vivantes, pour que `marquer` garde une identite stable. */
  const vif = useRef({ persistance, categorie, cleStockage });
  vif.current = { persistance, categorie, cleStockage };

  const marquer = useCallback(async (
    rdvId: string, type: GenreAgenda | undefined, infos: InfosAgenda,
  ): Promise<boolean> => {
    const { persistance: p, categorie: cat, cleStockage: cle } = vif.current;

    if (p.ou === 'local') {
      const map = lireLocal(cle);
      map[cleLocale(rdvId, type)] = Date.now();
      ecrireLocal(cle, map);
      /* Relecture : en navigation privee l'ecriture peut avoir ete refusee sans lever. */
      return lireLocal(cle)[cleLocale(rdvId, type)] !== undefined;
    }

    /*
     * La MEME fabrique que l'alimentation de l'historique, pas une copie : la cle, le
     * titre et l'horodatage doivent etre identiques au caractere, sinon les deux
     * chemins s'ecraseraient mutuellement a chaque passage.
     */
    const entree = {
      rdvId, leadName: infos.leadName, vendorName: infos.vendorName,
      appointmentUtc: infos.appointmentUtc, type: type ?? 'starting' as GenreAgenda,
    };
    const lignes = construireLignes(
      cat === 'agenda' ? { agenda: [entree] } : { equipe: [entree] },
      { companyId: p.companyId, userId: p.userId },
    );
    if (lignes.length === 0) return false;

    const { data, error } = await supabase
      .from('notification_history')
      .upsert([{ ...lignes[0], read_at: new Date().toISOString() }], {
        onConflict: 'company_id,recipient_user_id,category,source_id,occurrence',
        ignoreDuplicates: false,
      })
      .select('id');

    if (error) {
      console.error('agenda : marquage vu refuse', error.message);
      return false;
    }
    if (!data || data.length === 0) {
      /* Zero ligne sans erreur : la RLS a refuse, ou la ligne est une pierre tombale
         que le declencheur protege. Dans le second cas elle compte deja comme vue, et
         le prochain chargement le confirmera. */
      console.error('agenda : marquage vu sans effet (0 ligne) pour', rdvId, type);
      return false;
    }

    /* On n'attend pas le rechargement pour que l'ecran suive. */
    setVuesEnBase(prev => new Set(prev ?? []).add(cleBase(rdvId, type)));
    return true;
  }, []);

  /*
   * `estVu` ne change d'identite que lorsque l'ensemble charge change.
   *
   * Sur le chemin local, `vuesEnBase` reste `null` pour toujours et `cleStockage` ne
   * bouge pas : l'identite est donc stable d'un bout a l'autre de la vie du composant,
   * exactement comme la fonction libre qu'elle remplace.
   */
  const estVu = useCallback((rdvId: string, type?: GenreAgenda): boolean => {
    if (enBase) return (vuesEnBase ?? new Set<string>()).has(cleBase(rdvId, type));
    return lireLocal(cleStockage)[cleLocale(rdvId, type)] !== undefined;
  }, [enBase, vuesEnBase, cleStockage]);

  return useMemo<SourceVu>(() => ({
    source: enBase ? 'base' : 'local',
    raison: persistance.ou === 'local' ? persistance.raison : undefined,
    /* En base, on n'est pret qu'une fois l'ensemble charge : evaluer avant ferait
       remonter comme neuves des alertes deja vues, le temps d'un aller-retour. */
    prete: enBase ? vuesEnBase !== null : true,
    estVu,
    marquer,
  }), [enBase, persistance, vuesEnBase, estVu, marquer]);
}
