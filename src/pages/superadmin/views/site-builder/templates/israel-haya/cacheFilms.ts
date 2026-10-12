/**
 * LES FILMS, GARDES UNE SEULE FOIS.
 *
 * ---------- POURQUOI CE MODULE EXISTE ----------
 *
 * Un seul chapitre est monte a la fois : franchir une frontiere DEMONTE le FilmScrub courant et
 * en monte un autre. La premiere version refaisait donc, a chaque traversee, un telechargement
 * complet et un nouveau Blob — qu'elle n'a jamais revoque.
 *
 * Les deux factures, mesurees sur un aller-retour repete autour d'une frontiere :
 *   - 41 Blob crees, 0 revoque, 115 Mio retenus apres 20 allers-retours, pente strictement
 *     lineaire et sans aucune borne ;
 *   - 82 requetes mp4 pour deux fichiers, soit environ 230 Mo de trafic.
 * Une page qu'on parcourt dans les deux sens, ce qui est exactement l'usage que le site invite
 * a faire, finissait donc par ramer puis par manquer de memoire.
 *
 * Le cache vit au niveau du MODULE, pas du composant : il survit aux montages. Il garde au plus
 * une URL d'objet par film, soit quatre pour tout le voyage — borne connue, et egale au poids
 * des films que le visiteur a de toute facon choisi de regarder. `libererFilms` rend le tout
 * quand le voyage entier quitte l'ecran.
 *
 * Module sans dependance : verifiable sans navigateur, a condition de lui fournir un fetch.
 */

const FILMS = new Map<string, string>();
const ATTENTES = new Map<string, Promise<string>>();

/**
 * Rend l'URL d'objet du film, en le telechargeant la premiere fois seulement.
 *
 * `surProgression` n'est appele que pour le telechargement REEL : celui qui s'accroche a une
 * demande deja en cours n'a pas de progression propre a afficher, et c'est sans consequence
 * puisque l'anneau de chargement disparait des que le film est la.
 */
export function obtenirFilm(src: string, surProgression?: (part: number) => void): Promise<string> {
  const deja = FILMS.get(src);
  if (deja) return Promise.resolve(deja);
  // Un telechargement DEJA en cours pour ce film : on s'y accroche au lieu d'en lancer un second.
  const encours = ATTENTES.get(src);
  if (encours) return encours;

  const promesse = (async () => {
    const reponse = await fetch(src);
    if (!reponse.ok) throw new Error(String(reponse.status));
    const total = Number(reponse.headers.get('Content-Length')) || 0;
    const lecteur = reponse.body?.getReader();
    if (!lecteur) throw new Error('flux indisponible');

    const morceaux: Uint8Array[] = [];
    let recu = 0;
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      if (!value) continue;
      morceaux.push(value);
      recu += value.length;
      if (total) surProgression?.(recu / total);
    }
    const url = URL.createObjectURL(new Blob(morceaux as BlobPart[], { type: 'video/mp4' }));
    FILMS.set(src, url);
    return url;
  })();

  ATTENTES.set(src, promesse);
  // On retire la promesse dans les deux cas : reussie, le film est dans FILMS ; echouee, un
  // prochain essai doit pouvoir repartir de zero.
  void promesse.then(() => {}, () => {}).then(() => { ATTENTES.delete(src); });
  return promesse;
}

/**
 * Demande un film SANS l'afficher, pour que le chapitre voisin soit deja la quand on y arrive.
 * Les echecs sont avales : un prechargement qui rate ne doit rien casser, le chapitre refera
 * la demande en arrivant.
 */
export function prechargerFilm(src: string): void {
  if (FILMS.has(src)) return;
  void obtenirFilm(src).catch(() => {});
}

/** Rend la memoire des films. A appeler quand le voyage entier quitte l'ecran. */
export function libererFilms(): void {
  for (const url of FILMS.values()) URL.revokeObjectURL(url);
  FILMS.clear();
}

/** Combien de films sont actuellement gardes. Sert aux tests et aux mesures. */
export function filmsEnMemoire(): number {
  return FILMS.size;
}
