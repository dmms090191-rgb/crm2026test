import type { LayoutDefaultSection } from './sidebarLayout';

/*
 * Ou l'entree CRM Immo apparait dans la barre laterale — module PUR, pour que le
 * choix de conception soit EPROUVABLE et pas seulement commente.
 * Voir scripts/crm-immo/sidebarCrmImmo.test.ts.
 *
 * ---------- LE DROIT N'EST PAS UN REGLAGE D'ORGANISATION ----------
 *
 * Declarer { id: 'crm-immo', hidden: true } dans les sections par defaut, puis
 * laisser Talvex le demasquer, parait plus simple et c'est un piege. Trois
 * lignes du depot, verifiees :
 *
 *   - le bouton « Par defaut » de la reorganisation n'est garde par rien, alors
 *     que l'oeil de chaque ligne l'est (canHide) ;
 *   - resetToDefault remplace le brouillon par la DECLARATION du code, drapeaux
 *     `hidden` compris ;
 *   - confirmReorder enregistre le brouillon tel quel — « const next = draft » —
 *     sans fusionner les drapeaux precedents.
 *
 * Une Societe qui clique « Par defaut » puis « Valider » se retirerait donc son
 * propre module, EN BASE. Et le meme clic remettrait au passage tous les autres
 * drapeaux `hidden` aux valeurs du code.
 *
 * Donc : sans droit, l'entree n'est pas MASQUEE, elle n'est pas EMISE. Avec
 * droit, elle est emise VISIBLE — et `hidden` reste disponible pour ce a quoi il
 * sert vraiment : ranger un onglet que l'on possede.
 *
 * ---------- POURQUOI DANS « PRINCIPAL » ----------
 *
 * A cote de Boutique et Cabinet, les autres modules metier. Le ranger sous
 * « Gestion des leads » contredirait a l'oeil la regle fondatrice du module :
 * CRM Immo ne se melange pas aux leads.
 */

/** Le compartiment qui accueille l'entree, et l'onglet apres lequel elle se place. */
const COMPARTIMENT = 'Principal';
const APRES = 'cabinet';

export const ENTREE_CRM_IMMO = { id: 'crm-immo', label: 'CRM Immo' } as const;

/**
 * Rend les sections a servir au moteur de layout.
 *
 * Sans droit, rend le tableau d'entree TEL QUEL — meme identite, pour que le
 * useMemo appelant reste stable et que l'effet de chargement de
 * useSidebarLayout ne se relance pas en boucle.
 */
export function sectionsAvecCrmImmo(
  sections: LayoutDefaultSection[],
  ouvert: boolean,
): LayoutDefaultSection[] {
  if (!ouvert) return sections;
  return sections.map(section => (section.title !== COMPARTIMENT ? section : {
    ...section,
    items: section.items.flatMap(item => (item.id === APRES
      ? [item, { ...ENTREE_CRM_IMMO }]
      : [item])),
  }));
}
