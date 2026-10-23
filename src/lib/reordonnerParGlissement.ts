/*
 * Reordonner une liste VERTICALE au glissement — geometrie pure, sans DOM ni React.
 * Testable avec node --test (voir scripts/crm-immo/glisserColonnes.test.ts).
 *
 * ---------- UN APERCU PENDANT LE GESTE, UN SEUL ENREGISTREMENT A LA FIN ----------
 *
 * Reordonner pour de vrai a chaque pixel parcouru serait le plus court a ecrire et le
 * plus couteux a l'usage : l'ordre des colonnes personnalisees vit en base, et un
 * deplacement de trois rangs declencherait des dizaines d'upserts. On calcule donc un
 * APERCU — qui s'ecarte, de combien — et on n'enregistre qu'au relachement.
 *
 * Consequence directe, et c'est elle qui rend ce module possible : les bornes sont
 * relevees UNE SEULE FOIS, au debut du geste, sur la disposition reelle. Elles restent
 * justes jusqu'au bout, parce que l'apercu ne deplace les lignes qu'avec un `transform`,
 * qui ne change pas la disposition.
 */

/**
 * Les bords haut et bas d'une ligne.
 *
 * Le repere n'importe pas, pourvu qu'il soit le MEME pour toutes les lignes et pour le
 * `delta` qu'on lui compare. L'appelant releve des coordonnees d'ecran et compense le
 * defilement dans le delta : ces fonctions-ci n'ont pas a savoir qu'une liste defile.
 */
export interface BorneLigne { haut: number; bas: number }

const centre = (b: BorneLigne) => (b.haut + b.bas) / 2;

/**
 * Le deplacement ramene A L'INTERIEUR de la liste.
 *
 * Sans cette borne, la ligne tenue suit le doigt indefiniment et sort de sa liste. Dans
 * la modale des colonnes, elle irait recouvrir le titre << Vos colonnes >> et les lignes
 * d'en dessous — en laissant croire qu'une colonne systeme peut se deposer parmi les
 * colonnes personnalisees, ce que les deux persistances separees interdisent.
 */
export function deltaBorne(bornes: BorneLigne[], source: number, delta: number): number {
  if (source < 0 || source >= bornes.length) return delta;
  const min = bornes[0].haut - bornes[source].haut;
  const max = bornes[bornes.length - 1].bas - bornes[source].bas;
  if (delta < min) return min;
  if (delta > max) return max;
  return delta;
}

/**
 * Le rang ou la ligne tenue tombera si on relache apres avoir parcouru `delta` pixels.
 *
 * Le seuil est le MILIEU de la voisine, compare au BORD de la ligne tenue — et non a son
 * centre. Avec son centre, il fallait parcourir une ligne ENTIERE pour avancer d'un rang
 * et le geste paraissait sourd ; avec son bord, le rang change des que la moitie de la
 * voisine est recouverte, ce qui est le moment ou l'oeil l'attend.
 *
 * Le `break` est un arret anticipe, et rien de plus : les lignes etant empilees, leurs
 * milieux croissent avec leur rang, donc aucune voisine plus loin ne pourrait etre
 * franchie quand celle-ci ne l'est pas. Ce qui rend le calcul juste pour des lignes de
 * HAUTEURS DIFFERENTES — et la modale en rend, puisqu'une ligne grandit des qu'on
 * renomme la colonne — c'est que le seuil est le milieu de CHAQUE voisine, jamais une
 * hauteur supposee commune.
 */
export function cibleApresGlissement(bornes: BorneLigne[], source: number, delta: number): number {
  if (source < 0 || source >= bornes.length) return source;
  let cible = source;
  if (delta > 0) {
    const bas = bornes[source].bas + delta;
    for (let i = source + 1; i < bornes.length; i++) {
      if (bas < centre(bornes[i])) break;
      cible = i;
    }
  } else if (delta < 0) {
    const haut = bornes[source].haut + delta;
    for (let i = source - 1; i >= 0; i--) {
      if (haut > centre(bornes[i])) break;
      cible = i;
    }
  }
  return cible;
}

/**
 * De combien la ligne de rang `index` doit s'ecarter pour laisser passer la ligne tenue.
 *
 * C'est EXACT, et non une approximation : la ligne tenue quitte sa place, donc tout ce
 * qui se trouve entre son depart et son arrivee se decale d'exactement sa hauteur. Des
 * lignes de hauteurs differentes ne font pas mentir l'apercu — ce qui compte ici, ou une
 * ligne grandit des qu'on renomme la colonne.
 *
 * La ligne tenue, elle, rend 0 : elle ne s'ecarte pas, elle SUIT le pointeur, et c'est
 * l'appelant qui lui applique son propre deplacement. C'est STRUCTUREL et non une regle a
 * part : les deux encadrements ci-dessous excluent deja son rang, comme ils excluent une
 * cible egale a la source. Un `if` de plus en tete en aurait eu l'air sans rien proteger —
 * une mutation l'a montre en survivant, et il a ete retire.
 */
export function decalageLigne(index: number, source: number, cible: number, bornes: BorneLigne[]): number {
  if (source < 0 || source >= bornes.length) return 0;
  const hauteur = bornes[source].bas - bornes[source].haut;
  if (cible > source && index > source && index <= cible) return -hauteur;
  if (cible < source && index >= cible && index < source) return hauteur;
  return 0;
}
