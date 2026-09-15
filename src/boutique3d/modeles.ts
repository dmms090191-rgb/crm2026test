/**
 * Catalogue des MODELES de boutique 3D disponibles dans Talvex.
 *
 * Un modele, c'est une scene et ses assets : la geometrie, les textures, les musiques, la
 * disposition de depart. Il est PARTAGE par toutes les boutiques qui le choisissent — il n'est
 * jamais duplique. Ce qui appartient a une boutique en particulier, ce sont ses donnees, rangees
 * par `boutique_id`.
 *
 * A 1 000 boutiques sur « Johanna — Mode Luxe », les 9,4 Mo d'assets restent servis depuis une
 * seule URL, donc mis en cache une fois pour toutes par le CDN. Le cout par boutique est une
 * ligne de table.
 *
 * LA VERSION N'EST PAS DECORATIVE. Le jour ou le modele evoluera, sa v2 se publiera A COTE de la
 * v1, dans un autre dossier. Une boutique n'y passera que si sa colonne `template_version`
 * change. Sans cela, publier une v2 modifierait la scene de toutes les boutiques deja creees,
 * d'un coup et sans retour arriere.
 *
 * `BOUTIQUE_TEMPLATES` (boutiqueTypes.ts) reste le catalogue COMMERCIAL, celui que la Societe
 * voit au moment de creer sa boutique. Ce fichier-ci est le catalogue TECHNIQUE : quels modeles
 * savent reellement s'ouvrir en 3D, et ou vivent leurs assets. Les deux se rejoignent par
 * `template_key`.
 */

export interface Modele3D {
  /** Doit correspondre a `boutiques.template_key`. */
  templateKey: string;
  /** Nom affiche, quand la vue 3D annonce ce qu'elle ouvre. */
  nom: string;
  /** Version livree aujourd'hui. Sert de repli quand la boutique n'en precise pas. */
  versionParDefaut: number;
  /** Racine des assets pour une version donnee, sans barre oblique finale. */
  baseAssets(version: number): string;
}

const RACINE_MODELES = '/boutique3d/modeles';

export const MODELES_3D: Record<string, Modele3D> = {
  'johanna-mode-luxe': {
    templateKey: 'johanna-mode-luxe',
    nom: 'Johanna — Mode Luxe',
    versionParDefaut: 1,
    baseAssets: (version: number) => `${RACINE_MODELES}/johanna-mode-luxe/v${version}`,
  },
};

/** Le modele 3D d'une `template_key`, ou null si cette cle n'ouvre pas de boutique 3D. */
export function modele3DPour(templateKey: string | null | undefined): Modele3D | null {
  if (!templateKey) return null;
  return MODELES_3D[templateKey] ?? null;
}

/** Cette boutique peut-elle s'ouvrir en 3D ? */
export function aUneBoutique3D(templateKey: string | null | undefined): boolean {
  return modele3DPour(templateKey) !== null;
}
