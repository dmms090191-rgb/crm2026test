import { estApplicationInstallee } from './runtime';
import { estTelechargeable, type EntreeTelechargement, type Manifeste } from './plateforme';

/*
 * ============== PREVENIR QU'UNE NOUVELLE VERSION EXISTE ==============
 *
 * POURQUOI SEULEMENT POUR LES APPLICATIONS INSTALLEES. Le site et la PWA se rechargent
 * depuis le serveur : ils SONT toujours la derniere version, il n'y a rien a annoncer. Une
 * application posee sur un appareil, elle, reste figee a la version du jour ou on l'a
 * installee. Sans ce controle, son porteur n'apprend qu'une correction existe qu'en allant
 * de lui-meme sur la page de telechargement — autant dire jamais.
 *
 * POURQUOI UNE URL ABSOLUE, ET C'EST LE PIEGE PRINCIPAL. Dans une WebView Capacitor, la page
 * est servie depuis https://localhost : un fetch('/telechargements.json') lirait donc le
 * fichier EMBARQUE DANS L'APPLICATION, c'est-a-dire l'etat du monde au moment de sa
 * compilation. Il se comparerait a lui-meme et ne trouverait jamais rien. Le manifeste doit
 * etre lu sur le site public, par une adresse complete.
 *
 * CE QUE CE MODULE NE FAIT PAS : telecharger, installer, ou insister. Il repond a une seule
 * question — « y a-t-il mieux que moi en ligne ? » — et laisse l'interface decider quoi en
 * faire. Un echec reseau ne rend rien : hors ligne, on ne derange pas l'utilisateur avec un
 * probleme qui n'est pas le sien.
 */

/** Gravee au build par vite.config.ts, depuis src-tauri/tauri.conf.json. */
export const VERSION_APPLICATION: string =
  typeof __VERSION_TALVEX__ === 'string' ? __VERSION_TALVEX__ : '0.0.0';

/** Le site public : c'est lui qui sait ce qui est publie, pas le paquet embarque. */
export const ADRESSE_MANIFESTE = 'https://crm2026test.vercel.app/telechargements.json';

/**
 * Compare deux versions sous la forme x.y.z, NOMBRE PAR NOMBRE.
 *
 * Une comparaison de chaines dirait que « 0.1.9 » est superieur a « 0.1.10 », parce que '9'
 * vient apres '1'. Le defaut ne se verrait qu'a la dixieme version corrective, longtemps
 * apres avoir ete ecrit, et se manifesterait par une mise a jour qu'on ne propose jamais.
 *
 * Un suffixe eventuel (« 0.2.0-beta ») est ignore : seuls les nombres comptent.
 */
export function versionEstPlusRecente(candidate: string, reference: string): boolean {
  const nombres = (v: string) =>
    v.replace(/[^0-9.].*$/, '').split('.').map((n) => Number.parseInt(n, 10) || 0);
  const a = nombres(candidate);
  const b = nombres(reference);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ga = a[i] ?? 0;
    const gb = b[i] ?? 0;
    if (ga !== gb) return ga > gb;
  }
  return false;
}

/** Quelle entree du manifeste concerne l'application qui pose la question. */
export function cleDeCetteApplication(): 'windows' | 'android' | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/Windows/i.test(ua)) return 'windows';
  // macOS et iOS ne distribuent pas de fichier : rien a annoncer de cette facon.
  return null;
}

export interface MiseAJourDisponible {
  version: string;
  url: string;
  aide?: string;
}

/**
 * Rend la mise a jour disponible, ou null. Ne leve jamais.
 *
 * `recuperer` est injectable pour que les releves puissent verifier le comportement sans
 * reseau — et surtout sans dependre de l'etat reel du site, qui changera.
 */
export async function chercherMiseAJour(
  recuperer: typeof fetch = fetch,
): Promise<MiseAJourDisponible | null> {
  // Le site et la PWA sont deja a jour par construction : la question ne se pose pas.
  if (!estApplicationInstallee()) return null;

  const cle = cleDeCetteApplication();
  if (!cle) return null;

  let manifeste: Manifeste;
  try {
    const reponse = await recuperer(ADRESSE_MANIFESTE, { cache: 'no-cache' });
    if (!reponse.ok) return null;
    manifeste = (await reponse.json()) as Manifeste;
  } catch {
    return null; // hors ligne, ou site injoignable : on se tait
  }

  const entree: EntreeTelechargement | undefined = manifeste[cle];
  // La MEME regle que la page de telechargement : on ne propose que ce qui est reellement
  // publie et complet. Une entree a moitie remplie ne doit pas produire un lien mort.
  if (!estTelechargeable(entree) || !entree?.version || !entree.url) return null;
  if (!versionEstPlusRecente(entree.version, VERSION_APPLICATION)) return null;

  return { version: entree.version, url: entree.url, aide: entree.aide };
}
