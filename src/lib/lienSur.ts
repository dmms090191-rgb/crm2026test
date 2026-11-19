/**
 * UN LIEN CLIQUABLE, OU RIEN.
 *
 * Les colonnes « Site web », « Facebook », « Instagram », « LinkedIn », « Lien carte » d'un
 * fichier importe deviennent des liens. Mais la valeur vient d'un fichier : elle peut
 * contenir n'importe quoi, y compris `javascript:alert(1)` ou `data:text/html,...`, qui
 * EXECUTENT du code au clic. Un lien n'est donc rendu que s'il est en http(s) — toute autre
 * valeur reste du texte.
 *
 * `www.exemple.fr` et `exemple.fr/page` (sans protocole) sont completes en `https://` :
 * c'est ainsi que les exports de fiches d'etablissements les ecrivent. Le libelle affiche
 * est l'HOTE (`encre-fictive.fr`), plus court et plus lisible que l'adresse complete ; pour
 * un reseau social, le premier segment du chemin (le nom du compte) y est ajoute.
 */

export interface LienSur {
  href: string;
  libelle: string;
}

const RESEAUX = /(^|\.)(facebook|instagram|linkedin|twitter|x|tiktok|youtube|pinterest)\.com$/i;
const DOMAINE_NU = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}(:\d+)?([/?#]\S*)?$/i;

export function lienSur(valeur: string | null | undefined): LienSur | null {
  const brut = (valeur ?? '').trim();
  if (brut === '' || /\s/.test(brut)) return null;

  let candidat: string;
  if (/^https?:\/\//i.test(brut)) candidat = brut;
  else if (/^[a-z][a-z0-9+.-]*:/i.test(brut) && !/^[a-z0-9.-]+:\d/i.test(brut)) return null; // autre protocole
  else if (/^www\./i.test(brut) || DOMAINE_NU.test(brut)) candidat = 'https://' + brut;
  else return null;

  let url: URL;
  try { url = new URL(candidat); } catch { return null; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!url.hostname || !url.hostname.includes('.')) return null;
  /* Un identifiant dans l'adresse (`https://moi:secret@site.fr`) n'a rien a faire dans un CRM
     partage, et sert a deguiser la vraie destination. */
  if (url.username || url.password) return null;

  const hote = url.hostname.replace(/^www\./i, '');
  let libelle = hote;
  if (RESEAUX.test(url.hostname)) {
    const segment = url.pathname.split('/').filter(Boolean)[0];
    if (segment) libelle = `${hote}/${decodeURIComponentSur(segment)}`;
  }
  return { href: url.href, libelle };
}

function decodeURIComponentSur(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}
