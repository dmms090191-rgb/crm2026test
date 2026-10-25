/**
 * LES EMAILS D'ACCES RAPIDE — le stockage, et rien d'autre.
 *
 * CE QUI EST STOCKE, ET CE QUI NE L'EST PAS. La cle ne contient QU'UN TABLEAU D'ADRESSES
 * EMAIL. Jamais de mot de passe, jamais le code a six chiffres, jamais de jeton. Le code a
 * six chiffres ne quitte pas l'etat React : usePinInput le garde, il est concatene au
 * moment de l'appel et remis directement a signInWithPassword. Rien ici n'a donc besoin
 * du coffre securise de bureau — et c'est heureux, car il n'existe pas encore.
 *
 * POURQUOI CE FICHIER EXISTE. Au 25/10/2026, quatre fichiers de src/ definissent CHACUN
 * leur propre copie de ces trois fonctions, sur la meme cle et le meme format :
 *   - src/components/login/QuickEmailSelector.tsx:5            (monte par LoginModal)
 *   - src/components/PwaLoginPage.tsx:16                       (implementation en ligne)
 *   - src/components/SimulatedPhoneLoginScreen.tsx:6           (implementation en ligne)
 *   - .../site-builder/templates/TalvexQuickEmailShell.tsx:6   (la landing centrale)
 * Le launcher de bureau serait le cinquieme. Plutot que d'ajouter une cinquieme copie, on
 * pose ici la source unique. Les quatre autres ne sont PAS touches : les modifier
 * reviendrait a toucher au chemin de connexion du web et de la PWA pour un chantier qui ne
 * les concerne pas. Ils pourront y venir un jour, sans urgence — le format est identique,
 * donc les listes restent interoperables entre-temps.
 *
 * CE QUE LE PARTAGE DE CLE NE DONNE PAS. Le launcher Tauri sert ses pages depuis
 * l'origine `tauri.localhost`, et WebView2 lui alloue son PROPRE magasin, sous
 * %LOCALAPPDATA%\fr.talvex.app\EBWebView\. Les emails enregistres dans un navigateur ne
 * remontent donc PAS dans l'application installee, et inversement. Meme cle, meme format,
 * mais deux magasins : c'est une consequence de l'isolation par origine, pas un defaut.
 */

const CLE = 'crm_quick_login_emails';

/** Le format partage par les cinq implementations : un tableau JSON d'adresses. */
export function getQuickEmails(): string[] {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) || '[]');
    // Defensif : un tiers a deja pu ecrire autre chose sous cette cle. On ne rend que des
    // chaines, pour qu'aucun appelant n'ait a se demander ce qu'il recoit.
    return Array.isArray(brut) ? brut.filter((e): e is string => typeof e === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Rend `false` si le stockage a refuse l'ecriture (quota, navigation privee, magasin
 * verrouille). Les quatre implementations existantes laissent cette exception remonter ;
 * ici on la rend visible, pour que l'interface puisse le dire au lieu d'afficher un succes
 * qui n'a pas eu lieu.
 */
export function setQuickEmails(emails: string[]): boolean {
  try {
    localStorage.setItem(CLE, JSON.stringify(emails));
    return true;
  } catch {
    return false;
  }
}

/** La meme expression que les quatre autres implementations, au caractere pres. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Exporte pour les releves : ils verifient que la cle n'a pas derive. */
export const CLE_EMAILS_RAPIDES = CLE;
