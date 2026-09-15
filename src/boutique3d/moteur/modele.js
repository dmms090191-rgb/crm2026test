// LE MODELE D'UNE BOUTIQUE — ce qui change d'une boutique a l'autre sans que le moteur change.
//
// Trois choses seulement vivent ici, et c'est voulu :
//   `boutiqueId`  a qui appartiennent les reglages : cle du cache local et de la ligne en base ;
//   `baseAssets`  ou vivent le GLB, les textures et les musiques ;
//   `manifeste`   la description de la scene, aujourd'hui `boutique.json` ;
//   `acces`       d'ou viennent et ou vont les reglages, quand l'hote en fournit un.
//
// VALEURS PAR DEFAUT : elles reproduisent EXACTEMENT ce que le code faisait avant ce module.
// `baseAssets` vaut la chaine vide, donc `asset('/boutique.glb')` rend `/boutique.glb`, au
// caractere pres — la boutique autonome ne change pas de comportement, par construction et non
// par verification. `boutiqueId` vaut null, et le moteur retombe alors sur son identifiant
// historique : aucun visiteur ne perd ses reglages. `acces` vaut null, et le moteur construit
// alors sa propre couche de persistance, comme il l'a toujours fait.
import { createContext, useContext } from 'react'

export const MODELE_DEFAUT = { boutiqueId: null, baseAssets: '', manifeste: null, acces: null }

export const ModeleContexte = createContext(MODELE_DEFAUT)
export const useModele = () => useContext(ModeleContexte)

// ---------------------------------------------------------------------------
// La base des assets est AUSSI gardee au niveau du module, et pas seulement dans le contexte.
// Raison : trois consommateurs ne sont pas des composants React — le chargeur de textures, le
// lecteur audio et le chargeur de GLB. Les faire passer par un contexte demanderait de changer
// leurs signatures et celles de tous leurs appelants, pour une valeur qui ne change jamais
// pendant la vie d'une page.
//
// LIMITE ASSUMEE, dite ici plutot que decouverte plus tard : une seule boutique par page. C'est
// deja le cas pour le contexte Web Audio et pour les sondes `window.__*`. Monter deux boutiques
// dans le meme onglet demanderait de lever ces trois points ensemble.
let base = ''

/** Pose la base des assets. Appelee par `monterBoutique`, avant le premier rendu. */
export function definirBaseAssets(b) { base = typeof b === 'string' ? b.replace(/\/+$/, '') : '' }

/** La base courante. Chaine vide = la racine du domaine, comme avant. */
export function baseAssets() { return base }

/** Chemin complet d'un asset du modele. Base vide : le chemin ressort tel quel. */
export function asset(chemin) { return `${base}${chemin}` }
