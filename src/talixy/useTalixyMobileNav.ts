import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSidebarLayout } from '../hooks/useSidebarLayout';
import { entryLabel, type LayoutDefaultSection, type LayoutPanel } from '../lib/sidebarLayout';
import {
  mobileItems, ecartCirculaire, filtrerRendables,
  repartirOnglets, corrigerOngletActif, CELLULES_BARRE,
  type MobileNavItem,
} from './mobileNav';

export { mobileItems, ecartCirculaire, filtrerRendables, repartirOnglets, corrigerOngletActif, CELLULES_BARRE };
export type { MobileNavItem };

/*
 * NAVIGATION MOBILE, TIREE DE LA VRAIE NAVIGATION.
 *
 * Regle posee par David : le mobile n'est pas une navigation metier differente, c'est un RENDU
 * different de la meme navigation. Ce crochet ne connait donc aucune liste d'onglets : il lit
 * `layout.visible`, exactement la liste que la barre laterale du bureau affiche, apres masquage,
 * reorganisation, renommage et permissions. Masquer un onglet sur le bureau le retire du mobile ;
 * renommer un compartiment renomme celui du mini arc. Sans une ligne de code de plus.
 *
 * Le compartiment actif n'est pas code en dur non plus : c'est la derniere entree de type
 * `section` situee AVANT l'onglet actif dans la liste. PRINCIPAL, GESTION, COMMUNICATION et
 * MAINTENANCE en sortent naturellement — et n'importe quel autre nom que David choisirait.
 *
 * ---------- LE PANEL EST UN PARAMETRE, ET CE N'EST PAS UN DETAIL ----------
 *
 * Il etait ECRIT EN DUR a 'super_admin'. Ce crochet portait donc la bonne idee et ne servait
 * qu'un seul role : Societe, Commercial et Groupe retombaient sur une liste d'onglets codee a
 * la main dans la coquille telephone, qui ignorait masquages, renommages et reorganisation.
 * Mesure du 26/10/2026 : une Societe voyait 8 onglets sur telephone contre 20 sur son site.
 *
 * Le panel decide de la CLE de configuration (`v2:<panel>`), donc le confondre ferait lire a
 * une Societe la reorganisation de Talvex. Il voyage avec ses sections : les deux doivent
 * toujours venir du meme role, et c'est l'appelant qui en repond.
 */

export interface TalixyMobileNav {
  items: MobileNavItem[];
  activeIndex: number;
  /** Compartiment de l'onglet actif, deja resolu. */
  compartiment: string;
  loaded: boolean;
  /** Onglet precedent / suivant, CIRCULAIRES : aucune fleche ne se bloque jamais. */
  precedent: MobileNavItem | null;
  suivant: MobileNavItem | null;
}

/**
 * @param actif  Faux coupe TOUTE lecture — ni session, ni base. Les regles des crochets
 *   interdisent d'appeler celui-ci sous condition, et le panel Client n'a pas de
 *   `layout.visible` du tout : `LayoutPanel` ne contient pas 'client', sa barre tourne
 *   encore sur l'ancien moteur de masquage. Sans ce drapeau, la coquille telephone d'un
 *   client lirait la cle `v2:admin` de son propre compte — une requete pour rien, et une
 *   confusion de panel ecrite dans le code. `entityUserId: null` rend alors tout le
 *   crochet inerte : `entries` reste aux defauts, aucun effet ne part.
 */
export function useTalixyMobileNav(
  panel: LayoutPanel,
  sections: LayoutDefaultSection[],
  protectedIds: readonly string[],
  activeId: string,
  actif: boolean = true,
  rendables?: readonly string[],
): TalixyMobileNav {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    if (!actif) return;
    let vivant = true;
    supabase.auth.getUser().then(({ data: { user } }) => { if (vivant && user) setUserId(user.id); });
    return () => { vivant = false; };
  }, [actif]);

  // Le crochet attend un tableau mutable ; on lui en donne une copie, sans figer la source.
  const ids = useMemo(() => [...protectedIds], [protectedIds]);
  const layout = useSidebarLayout({ panel, entityUserId: actif ? userId : null, sections, protectedIds: ids });

  /*
   * Le filtre s'applique ICI, et non chez l'appelant, pour une raison precise : activeIndex,
   * compartiment, precedent et suivant sont tous calcules plus bas. Filtrer apres coup les
   * laisserait porter sur une AUTRE liste que celle affichee — les fleches sauteraient des
   * onglets invisibles, et l'arc marquerait le mauvais actif.
   *
   * `rendables` absent = aucun filtre. C'est le cas du tableau de bord Talvex sur le web,
   * dont le routeur de vues (SAViewRouter) sait rendre les 24 onglets : il n'a rien a cacher.
   */
  const items = useMemo(() => {
    const tous = mobileItems(layout.visible, e => entryLabel(e, layout.defaultLabels));
    return rendables ? filtrerRendables(tous, rendables) : tous;
  }, [layout.visible, layout.defaultLabels, rendables]);

  const activeIndex = items.findIndex(i => i.id === activeId);
  const n = items.length;
  /*
   * Navigation CIRCULAIRE : depuis le dernier onglet, « suivant » ramene au premier ; depuis le
   * premier, « precedent » va au dernier. Aucune fleche ne se bloque jamais. C est purement un
   * calcul d index sur la MEME liste — aucun onglet n est duplique cote metier.
   */
  const aLIndice = (i: number) => (n === 0 ? null : items[((i % n) + n) % n]);
  return {
    items,
    activeIndex,
    compartiment: activeIndex >= 0 ? items[activeIndex].compartiment : '',
    loaded: layout.loaded,
    precedent: activeIndex >= 0 ? aLIndice(activeIndex - 1) : null,
    suivant: activeIndex >= 0 ? aLIndice(activeIndex + 1) : null,
  };
}

/** Petit utilitaire : deplacement borne dans la liste, sans rebouclage. */
export function useNavStep(nav: TalixyMobileNav, aller: (id: string) => void) {
  return useCallback((pas: -1 | 1) => {
    const cible = pas === -1 ? nav.precedent : nav.suivant;
    if (cible) aller(cible.id);
  }, [nav.precedent, nav.suivant, aller]);
}
