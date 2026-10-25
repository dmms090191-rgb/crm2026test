import { estMobile } from './runtime';

/**
 * OU SUPABASE RANGE LA SESSION, SELON LE RUNTIME.
 *
 *   web et pwa  -> sessionStorage, EXACTEMENT comme aujourd'hui, pas un octet de change
 *   desktop     -> sessionStorage aussi : le bureau Tauri ne change pas
 *   mobile      -> COFFRE SECURISE : Keychain sur iOS, AES-GCM adosse au Keystore sur Android
 *
 * POURQUOI PAS @capacitor/preferences, QUI ETAIT LE PREMIER CHOIX. Audit du 25/10/2026,
 * verifie dans son code source : il appelle `getSharedPreferences(..., MODE_PRIVATE)` puis
 * `putString` sur Android, et `UserDefaults.standard.set` sur iOS. Aucun chiffrement. On
 * lirait donc le JWT, le refresh token ET l'objet utilisateur en clair dans
 * /data/data/<app>/shared_prefs/CapacitorStorage.xml.
 *
 * Le bac a sable protege des autres applications, et le bureau Windows ecrit deja son
 * jeton en clair sur le disque : sur l'appareil lui-meme, ce n'etait donc ni pire ni
 * meilleur que l'existant. CE QUI A TRANCHE EST AILLEURS : le gabarit Android de
 * Capacitor pose `allowBackup="true"` sans regle d'extraction, si bien que ce fichier part
 * dans la sauvegarde Google Drive et dans le transfert d'appareil a appareil — puis se
 * restaure sur un telephone neuf. Session clonee, sans mot de passe. C'est le seul vecteur
 * qui fait SORTIR le secret de l'appareil, et ni le web ni le bureau ne l'ont.
 *
 * Aggravant mesure : les refresh tokens Supabase n'expirent pas par defaut. Une fuite est
 * donc definitive jusqu'a revocation manuelle.
 *
 * POURQUOI PAS EncryptedSharedPreferences, LE REFLEXE HABITUEL SUR ANDROID.
 * androidx.security:security-crypto est DEPRECIE — @Deprecated pose sur
 * EncryptedSharedPreferences et MasterKey, derniere version stable 1.1.0 du 30/07/2025,
 * avec la note « Deprecated all APIs in favour of existing platform APIs and direct use of
 * Android Keystore ». Google ne nomme aucun remplacement. Batir dessus serait batir sur
 * une voie fermee.
 *
 * CE QUI NE CHANGE PAS : la meme authentification Supabase, les memes comptes, les memes
 * roles, les memes politiques RLS. Seul l'ENDROIT ou le jeton est pose change. Il n'y a
 * pas de seconde base d'utilisateurs, et il ne doit jamais y en avoir.
 */

/** Le contrat que Supabase attend. Ses trois methodes peuvent rendre des promesses. */
interface StockageSupabase {
  getItem(cle: string): string | null | Promise<string | null>;
  setItem(cle: string, valeur: string): void | Promise<void>;
  removeItem(cle: string): void | Promise<void>;
}

/** Ce que l'on utilise du plugin : la forme attendue par Supabase, plus l'enumeration. */
interface CoffreSecurise {
  getItem(cle: string): Promise<string | null>;
  setItem(cle: string, valeur: string): Promise<void>;
  removeItem(cle: string): Promise<void>;
  /** Necessaire a la deconnexion : sans elle, on ne saurait pas quoi effacer. */
  keys?(): Promise<string[]>;
}

/**
 * L'IMPORT EST DYNAMIQUE, ET CE N'EST PAS POUR ALLEGER LE PAQUET.
 *
 * Le plugin embarque une implementation NAVIGATEUR (dist/esm/web.js) que son auteur
 * reserve au deboguage : elle ecrit en clair dans localStorage. Un import statique la
 * ferait entrer dans les paquets web, PWA et Tauri, ou son code de premier niveau
 * s'execute — c'est exactement ce qui s'est produit avec @capacitor/core, dont l'import
 * statique a pose `window.Capacitor` jusque dans le navigateur ordinaire (mesure du
 * 25/10/2026). La separation ne doit pas reposer sur la seule discipline d'appel : ici,
 * le code du coffre n'est meme pas TELECHARGE hors du mobile.
 *
 * La promesse est gardee : le plugin n'est charge qu'une fois, a la premiere lecture.
 */
/*
 * LE COFFRE EST ENVELOPPE, ET CE N'EST PAS UN DETAIL DE STYLE.
 *
 * La premiere version retournait l'objet du plugin DIRECTEMENT depuis un `.then()`. Sur un
 * telephone, l'application restait bloquee sur son ecran de chargement, indefiniment.
 *
 * POURQUOI. En resolvant une promesse, JavaScript verifie si la valeur rendue est « thenable » :
 * il LIT la propriete `.then` de cet objet. Or l'objet du plugin est un proxy Capacitor, qui
 * transforme toute lecture de propriete en APPEL DE METHODE NATIVE. Il a donc appele un
 * `SecureStorage.then()` qui n'existe pas :
 *
 *     Uncaught (in promise): "SecureStorage.then()" is not implemented
 *
 * Et comme ce rejet survient DANS le mecanisme de resolution de la promesse, et non dans la
 * chaine, le `.catch()` ci-dessous ne l'attrape pas : la promesse `chargement` n'est jamais
 * reglee. `getItem` ne rend donc jamais, `supabase.auth.getSession()` attend pour toujours,
 * `loading` reste vrai dans App.tsx, et l'utilisateur voit tourner un rond.
 *
 * Mesure du 25/10/2026, reproduite dans un navigateur en simulant window.Capacitor.
 *
 * LA CORRECTION : rendre un objet ordinaire `{ api }`. Un objet simple n'a pas de `.then`,
 * donc rien n'est intercepte, et le proxy n'est touche qu'au moment ou on s'en sert.
 */
interface CoffreCharge {
  api: (CoffreSecurise & { setDefaultKeychainAccess?: (acces: number) => Promise<void> }) | null;
}

let chargement: Promise<CoffreCharge> | null = null;

function coffre(): Promise<CoffreCharge> {
  if (chargement) return chargement;
  chargement = import('@aparajita/capacitor-secure-storage')
    .then(async (module) => {
      const api = module.SecureStorage as unknown as CoffreSecurise & {
        setDefaultKeychainAccess?: (acces: number) => Promise<void>;
      };
      try {
        /*
         * iOS : « apres le premier deverrouillage, CET APPAREIL UNIQUEMENT » (valeur 3).
         * - whenUnlocked rendrait le jeton illisible ecran verrouille, donc casserait le
         *   rafraichissement en arriere-plan ;
         * - sans ThisDeviceOnly, l'element migre vers un nouvel appareil lors d'une
         *   restauration de sauvegarde chiffree — precisement ce qu'on cherche a empecher.
         * CHAINE VERIFIEE LE 25/10/2026, de bout en bout, parce qu un reglage de securite
         * qui echouerait en silence serait pire qu absent :
         *   base.js         setDefaultKeychainAccess(3) pose simplement this.access = 3, cote
         *                   JavaScript : la methode est toujours definie et ne peut pas echouer ;
         *   base.js         chaque setItem joint access: this.access a l appel natif — la
         *                   valeur voyage AVEC CHAQUE ECRITURE, elle n est pas posee une fois ;
         *   Plugin.swift    getAccessParam traduit 3 en accessibleAfterFirstUnlockThisDeviceOnly.
         * Il n y a donc pas de degradation silencieuse possible vers whenUnlocked.
         *
         * Les variantes ThisDeviceOnly figurent bien dans la sauvegarde, mais protegees
         * par l'identifiant materiel : inutilisables ailleurs.
         */
        await api.setDefaultKeychainAccess?.(3);
      } catch { /* reglage indisponible : le defaut du plugin s'applique */ }
      // `{ api }` et NON `api` : voir le commentaire ci-dessus. Rendre le proxy ici ferait
      // lire son `.then` par le moteur, et l'application resterait bloquee au demarrage.
      return { api };
    })
    .catch(() => ({ api: null }));
  return chargement;
}

/**
 * LE FILET, ET SA PRECEDENCE — CORRIGEE.
 *
 * auth-js n'a AUCUN cache interne : il relit le stockage a chaque usage de la session. Si
 * setItem echoue, le jeton est perdu, et au pire moment, puisque l'ancien jeton de
 * rafraichissement vient d'etre consomme par le serveur. D'ou le cache memoire, et d'ou
 * la regle « setItem ne rejette JAMAIS ».
 *
 * MAIS LA PREMIERE VERSION DE CE FILET ETAIT A L'ENVERS, et l'audit l'a montre : getItem
 * relisait le magasin et ECRASAIT la memoire avec ce qu'il y trouvait. Apres une ecriture
 * ratee, il rendait donc l'ANCIEN jeton et detruisait le jeton frais garde en memoire —
 * le filet ne protegeait pas, il nuisait.
 *
 * Avec Preferences ce mode d'echec etait quasi inatteignable : `apply()` n'ecrit qu'en
 * memoire et ne remonte jamais d'erreur. Le coffre, lui, le rend ATTEIGNABLE — cle
 * invalidee apres un changement de code PIN, materiel securise occupe, appareil verrouille.
 * C'est pourquoi la correction devait accompagner le changement de magasin.
 *
 * La regle est desormais : une cle dont l'ecriture native a echoue est servie par la
 * MEMOIRE, et le magasin n'est plus relu pour elle tant qu'une ecriture n'a pas reussi.
 */
const memoire = new Map<string, string>();
const ecrituresEnEchec = new Set<string>();

const adaptateurMobile: StockageSupabase = {
  async getItem(cle) {
    // La memoire fait foi tant que la derniere ecriture n'a pas abouti : relire le coffre
    // rendrait une valeur PERIMEE, et l'ecraserait par-dessus la fraiche.
    if (ecrituresEnEchec.has(cle)) return memoire.get(cle) ?? null;
    try {
      const { api } = await coffre();
      const valeur = api ? await api.getItem(cle) : null;
      if (valeur !== null && valeur !== undefined) {
        memoire.set(cle, valeur);
        return valeur;
      }
    } catch { /* coffre indisponible : on se rabat sur la memoire */ }
    return memoire.get(cle) ?? null;
  },

  async setItem(cle, valeur) {
    // La memoire D'ABORD : si l'ecriture native echoue, la session tient quand meme
    // jusqu'a la fermeture de l'application.
    memoire.set(cle, valeur);
    try {
      const { api } = await coffre();
      if (!api) { ecrituresEnEchec.add(cle); return; }
      await api.setItem(cle, valeur);
      ecrituresEnEchec.delete(cle);
    } catch {
      // On NE REJETTE PAS, mais on retient que le disque est en retard sur la memoire.
      ecrituresEnEchec.add(cle);
    }
  },

  async removeItem(cle) {
    memoire.delete(cle);
    ecrituresEnEchec.delete(cle);
    try {
      const { api } = await coffre();
      await api?.removeItem(cle);
    } catch { /* une suppression qui echoue ne doit pas empecher la deconnexion */ }
  },
};

/**
 * Le choix est fait UNE FOIS, au chargement du client Supabase. runtimeActuel() est
 * memoise et lit des signaux poses avant le premier script de la page : il est donc deja
 * connu a cet instant, et ne changera pas en cours de session.
 */
export function stockageSession(): StockageSupabase {
  return estMobile() ? adaptateurMobile : sessionStorage;
}

/** Une cle de session Supabase, quel que soit le projet : `sb-<ref>-auth-token`. */
const estJetonDeSession = (cle: string) => cle.startsWith('sb-') && cle.endsWith('-auth-token');

/**
 * EFFACE LE JETON DE SESSION, DANS LE MAGASIN DU RUNTIME COURANT.
 *
 * POURQUOI CETTE FONCTION EXISTE. `supabase.auth.signOut()` ne RETIRE la session du stockage
 * qu'apres un aller-retour reseau reussi : lu dans auth-js (GoTrueClient, _signOut), si
 * l'appel echoue autrement que par un 401, 403 ou 404, la fonction rend l'erreur et
 * n'atteint jamais son `_removeSession()`. Hors ligne, le jeton reste donc en place.
 *
 * Le code avait bien un filet pour cela : apres chaque deconnexion, il purgeait les cles
 * `sb-*-auth-token` de sessionStorage. Mais sur MOBILE le jeton n'est pas dans
 * sessionStorage — il est dans le coffre, Keychain sur iOS et Keystore sur Android. Le filet
 * balayait donc un magasin vide, et l'utilisateur qui se deconnectait dans le metro revenait
 * connecte a la reouverture. Mesure du 25/10/2026, a la lecture du code d'auth-js.
 *
 * On n'efface QUE les cles de session : le coffre peut contenir autre chose, et `clear()`
 * emporterait tout.
 */
export async function effacerJetonsSession(): Promise<void> {
  if (!estMobile()) {
    try {
      for (const cle of Object.keys(sessionStorage)) {
        if (estJetonDeSession(cle)) sessionStorage.removeItem(cle);
      }
    } catch { /* stockage indisponible : rien a effacer */ }
    return;
  }

  // Le cache memoire d'abord : il survivrait au coffre, et c'est lui que getItem sert
  // lorsqu'une ecriture a echoue.
  for (const cle of [...memoire.keys()]) {
    if (estJetonDeSession(cle)) memoire.delete(cle);
  }
  ecrituresEnEchec.clear();

  try {
    const { api } = await coffre();
    if (!api?.keys) return;
    for (const cle of await api.keys()) {
      if (estJetonDeSession(cle)) await api.removeItem(cle);
    }
  } catch { /* coffre indisponible : la memoire est deja videe */ }
}

/** Exporte pour les releves : ils verifient le comportement sans simuler Capacitor. */
export const adaptateurMobilePourReleves = adaptateurMobile;
