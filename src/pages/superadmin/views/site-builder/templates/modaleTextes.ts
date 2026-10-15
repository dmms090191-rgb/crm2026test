/**
 * LES TEXTES DE LA FENETRE DE CONNEXION, en francais et en hebreu.
 *
 * ---------- RETROCOMPATIBILITE STRICTE ----------
 *
 * Cette fenetre est PARTAGEE par tous les templates de site. Un seul d'entre eux parle hebreu ;
 * les autres doivent continuer a rendre exactement ce qu'ils rendaient avant, au mot pres.
 *
 * D'ou la regle tenue partout : la langue est une propriete OPTIONNELLE, et son absence vaut
 * francais.
 *
 * CE QUI EST VERIFIE, EXACTEMENT : le test << SANS LANGUE, la fenetre de connexion rend
 * exactement ce qu elle rendait avant >> (scripts/site/israelHaya.test.ts) compare les trente
 * CHAINES de ce dictionnaire a une copie figee du francais d'origine, et verifie que la
 * direction par defaut reste ltr. Il ne monte aucun composant et ne mesure aucune boite :
 * les textes et la direction sont garantis, la geometrie ne l'est pas par lui. Ce qui touche
 * a la mise en page des composants partages se verifie par les tests e2e, qui ouvrent la
 * fenetre depuis un autre template, et par le releve responsive qui la mesure a huit tailles.
 *
 * ---------- POURQUOI UN DICTIONNAIRE SEPARE DE CELUI DU SITE ----------
 *
 * `israel-haya/textes.ts` appartient a UN template. Cette fenetre appartient a Talvex. Les
 * faire dependre l'un de l'autre reviendrait a ce qu'un composant partage importe du code
 * specifique a un site — exactement ce qu'on evite. Le type `LangueModale` est volontairement
 * une union de deux chaines : le `Langue` du template lui est structurellement identique, donc
 * il se passe en parametre sans conversion et sans couplage.
 */

export type LangueModale = 'fr' | 'he';

export interface TextesModale {
  titre: string;
  sousTitre: string;
  adresseEmail: string;
  /** L exemple affiche dans le champ vide. */
  exempleEmail: string;
  motDePasse: string;
  masquer: string;
  afficher: string;
  naviguer: string;
  enCours: string;
  valider: string;
  pasDeCompte: string;
  sInscrire: string;

  /** Messages d'echec de la connexion. */
  identifiantsInvalides: string;
  domaineNonAutorise: string;

  /** Le sous-outil d'acces rapides, juste sous le champ d'adresse. */
  rapides: string;
  enregistrer: string;
  gerer: string;
  titreRapides: string;
  titreGerer: string;
  ajouterUnEmail: string;
  toutSupprimer: string;
  aucunEmail: string;
  aucunEmailAide: string;
  aucunEmailAideGerer: string;
  emailInvalide: string;
  dejaEnregistre: string;
  ajouteAuxRapides: string;
  ajoute: string;
  supprime: string;
  listeVidee: string;
  /** Le compteur du bandeau : « 3 emails enregistres ». */
  compteur: (n: number) => string;

  /**
   * Les noms accessibles des deux boutons sans texte : la croix de fermeture et l'effacement
   * du champ. Ils etaient ecrits en francais en dur, donc un visiteur au lecteur d'ecran
   * entendait << Fermer >> au milieu d'une fenetre entierement en hebreu. Les declarer ici les
   * rend obligatoires dans les deux langues : le type refuse un dictionnaire incomplet.
   */
  fermer: string;
  effacer: string;
}

const fr: TextesModale = {
  titre: 'Connexion',
  sousTitre: 'Accedez a votre espace personnel',
  adresseEmail: 'Adresse email',
  // Inchange : c est l exemple que tous les autres templates affichent deja.
  exempleEmail: 'votre@email.com',
  motDePasse: 'Mot de passe (6 chiffres)',
  masquer: 'Masquer',
  afficher: 'Afficher',
  naviguer: 'Fleches gauche/droite pour naviguer',
  enCours: 'Connexion en cours...',
  valider: 'VALIDER',
  pasDeCompte: 'Pas encore de compte ?',
  sInscrire: "S'inscrire",

  identifiantsInvalides: 'Email ou mot de passe incorrect.',
  domaineNonAutorise: "Ce compte n'est pas autorise sur ce domaine.",

  rapides: 'Rapides',
  enregistrer: 'Enregistrer',
  gerer: 'Gerer',
  titreRapides: 'Emails rapides',
  titreGerer: 'Gerer les emails',
  ajouterUnEmail: 'Ajouter un email...',
  toutSupprimer: 'Tout supprimer',
  aucunEmail: 'Aucun email rapide',
  aucunEmailAide: "Cliquez Enregistrer pour ajouter l'email actuel.",
  aucunEmailAideGerer: 'Ajoutez un email ci-dessus.',
  emailInvalide: 'Adresse email invalide.',
  dejaEnregistre: 'Cet email est deja enregistre.',
  ajouteAuxRapides: 'Email ajoute aux acces rapides.',
  ajoute: 'Email ajoute.',
  supprime: 'Email supprime.',
  listeVidee: 'Emails rapides vides.',
  compteur: n => `${n} email${n !== 1 ? 's' : ''} enregistre${n !== 1 ? 's' : ''}`,
  // Inchangees : ce sont les etiquettes que tous les autres templates annoncent deja.
  fermer: 'Fermer',
  effacer: 'Effacer',
};

const he: TextesModale = {
  titre: 'התחברות',
  sousTitre: 'כניסה לאזור האישי',
  adresseEmail: 'כתובת אימייל',
  exempleEmail: 'name@example.com',
  motDePasse: 'סיסמה (6 ספרות)',
  masquer: 'הסתרה',
  afficher: 'הצגה',
  naviguer: 'חיצים ימינה ושמאלה למעבר בין הספרות',
  enCours: 'מתחבר…',
  valider: 'אישור',
  pasDeCompte: 'אין לכם חשבון?',
  sInscrire: 'הרשמה',

  identifiantsInvalides: 'אימייל או סיסמה שגויים.',
  domaineNonAutorise: 'החשבון הזה אינו מורשה בדומיין הזה.',

  rapides: 'מהירים',
  enregistrer: 'שמירה',
  gerer: 'ניהול',
  titreRapides: 'אימיילים מהירים',
  titreGerer: 'ניהול האימיילים',
  ajouterUnEmail: 'הוספת אימייל…',
  toutSupprimer: 'מחיקת הכול',
  aucunEmail: 'אין אימיילים שמורים',
  aucunEmailAide: 'לחצו שמירה כדי להוסיף את האימייל הנוכחי.',
  aucunEmailAideGerer: 'הוסיפו אימייל למעלה.',
  emailInvalide: 'כתובת אימייל לא תקינה.',
  dejaEnregistre: 'האימייל הזה כבר שמור.',
  ajouteAuxRapides: 'האימייל נוסף לגישה המהירה.',
  ajoute: 'האימייל נוסף.',
  supprime: 'האימייל נמחק.',
  listeVidee: 'הרשימה רוקנה.',
  // L'hebreu n'accorde pas le pluriel comme le francais : « 1 אימייל », « 3 אימיילים ».
  compteur: n => (n === 1 ? 'אימייל אחד שמור' : `${n} אימיילים שמורים`),
  fermer: 'סגירה',
  effacer: 'מחיקה',
};

const DICTIONNAIRE: Record<LangueModale, TextesModale> = { fr, he };

/**
 * Les textes de la fenetre. SANS argument, c'est le francais : c'est ce qui garantit que les
 * templates qui ignorent la langue ne changent pas d'un caractere.
 */
export function textesModale(langue?: LangueModale | null): TextesModale {
  return DICTIONNAIRE[langue ?? 'fr'];
}

/** La direction d'ecriture de la fenetre. Sans langue, LTR, comme avant. */
export function directionModale(langue?: LangueModale | null): 'rtl' | 'ltr' {
  return langue === 'he' ? 'rtl' : 'ltr';
}
