import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSidebarLayout } from '../hooks/useSidebarLayout';
import { entryLabel, type LayoutDefaultSection } from '../lib/sidebarLayout';
import { mobileItems, ecartCirculaire, type MobileNavItem } from './mobileNav';

export { mobileItems, ecartCirculaire };
export type { MobileNavItem };

/*
 * TALIXY — navigation mobile, tiree de la VRAIE navigation.
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

export function useTalixyMobileNav(sections: LayoutDefaultSection[], protectedIds: readonly string[], activeId: string): TalixyMobileNav {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let vivant = true;
    supabase.auth.getUser().then(({ data: { user } }) => { if (vivant && user) setUserId(user.id); });
    return () => { vivant = false; };
  }, []);

  // Le crochet attend un tableau mutable ; on lui en donne une copie, sans figer la source.
  const ids = useMemo(() => [...protectedIds], [protectedIds]);
  const layout = useSidebarLayout({ panel: 'super_admin', entityUserId: userId, sections, protectedIds: ids });

  const items = useMemo(
    () => mobileItems(layout.visible, e => entryLabel(e, layout.defaultLabels)),
    [layout.visible, layout.defaultLabels],
  );

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
