import type { Langue } from './langue';

/**
 * TOUS LES TEXTES DU SITE, dans les deux langues.
 *
 * L'interface `Textes` est le contrat. Les deux objets qui la remplissent, `he` et `fr`, sont
 * verifies par le compilateur : une cle oubliee dans l'une des langues ne passe pas le
 * typecheck. C'est pour cela que le dictionnaire est ecrit a la main plutot que charge depuis
 * un JSON — un JSON n'aurait prevenu personne.
 *
 * ---------- CE QUI N'EST PAS ICI ----------
 *
 * Les legendes des six chapitres vivent dans `chapitres.ts`, a cote de leur chronologie, et les
 * themes numerologiques dans `numerologie.ts`, a cote du calcul. Les deplacer ici aurait separe
 * chaque texte de la seule chose qui lui donne son sens. Ils sont bilingues sur place, par le
 * meme type `Paire`.
 *
 * Les coordonnees — courriel, telephone, adresse — ne sont pas des textes mais des DONNEES :
 * elles sont dans `coordonnees.ts`, et elles sont provisoires.
 *
 * ---------- LE FRANCAIS N'EST PAS UNE TRADUCTION AUTOMATIQUE ----------
 *
 * Chaque phrase francaise est ecrite pour etre lue en francais, pas calquee mot a mot sur
 * l'hebreu. Les deux versions disent la meme chose ; elles ne la disent pas dans le meme ordre,
 * parce que les deux langues ne construisent pas leurs phrases pareil.
 */

export interface Textes {
  nav: {
    accueil: string;
    apropos: string;
    contact: string;
    connexion: string;
    /** Nom accessible de la barre de navigation. */
    aria: string;
    /** Nom accessible du selecteur de langue. */
    ariaLangue: string;
    ouvrirMenu: string;
    fermerMenu: string;
  };

  voyage: {
    /** Titre masque, lu par les technologies d'assistance. */
    titreLu: string;
    /** Nom accessible de la zone de defilement. */
    region: string;
    defiler: string;
    chargement: string;
  };

  saisie: {
    prenom: string;
    dateNaissance: string;
    calculer: string;
    dateInvalide: string;
    confidentialite: string;
    demonstration: string;
    detailCalcul: string;
    recommencer: string;
  };

  bas: {
    titreOffre: string;
    offres: readonly { titre: string; texte: string }[];
    reserveTarif: string;
    titreNombres: string;
    texteNombres: string;
    titreRdv: string;
    texteRdv: string;
    boutonRdv: string;
    piedNom: string;
    piedIa: string;
    piedAvis: string;
  };

  apropos: {
    titre: string;
    sousTitre: string;
    paragraphes: readonly string[];
    mentionTitre: string;
    mention: string;
  };

  contact: {
    titre: string;
    chapeau: string;
    email: string;
    telephone: string;
    whatsapp: string;
    boutonWhatsApp: string;
    adresse: string;
    horaires: string;
    dimancheJeudi: string;
    vendredi: string;
    samedi: string;
    ferme: string;
    /** Signale au visiteur que les coordonnees sont celles d'une demonstration. */
    avertissementProvisoire: string;
  };

  formulaire: {
    titre: string;
    prenom: string;
    nom: string;
    telephone: string;
    email: string;
    sujet: string;
    message: string;
    envoyer: string;
    requis: string;
    emailInvalide: string;
    /** Affiche a la place d'un faux envoi, tant qu'aucun envoi n'est branche. */
    pasBranche: string;
  };
}

const he: Textes = {
  nav: {
    accueil: 'בית',
    apropos: 'אודות',
    contact: 'יצירת קשר',
    connexion: 'התחברות',
    aria: 'ניווט ראשי',
    ariaLangue: 'בחירת שפה',
    ouvrirMenu: 'פתיחת התפריט',
    fermerMenu: 'סגירת התפריט',
  },

  voyage: {
    titreLu: 'ישראל חיה — מסע הנשמה',
    region: 'מסע הנשמה',
    defiler: 'גללו',
    chargement: 'טוען',
  },

  saisie: {
    prenom: 'שם פרטי',
    dateNaissance: 'תאריך לידה',
    calculer: 'גלו את המספר',
    dateInvalide: 'תאריך לא תקין',
    confidentialite: 'החישוב מתבצע בדפדפן שלכם בלבד. שום פרט אינו נשמר ואינו נשלח לשום מקום.',
    demonstration: 'הדגמה בלבד. שיטת החישוב הסופית טרם הוגדרה, והמספר כאן אינו ייעוץ.',
    detailCalcul: 'איך מחושב המספר',
    recommencer: 'חישוב נוסף',
  },

  bas: {
    titreOffre: 'מה אפשר לעשות יחד',
    offres: [
      { titre: 'ייעוץ אישי', texte: 'פגישה אחת, לעומק, סביב שאלה שמעסיקה אתכם.' },
      { titre: 'ליווי מתמשך', texte: 'סדרת מפגשים, לאורך תקופה, עם מעקב בין הפגישות.' },
      { titre: 'שאלה אחת', texte: 'תשובה כתובה ומנומקת לשאלה ממוקדת אחת.' },
    ],
    reserveTarif: 'פרטי המחיר, המשך והמקום יתווספו לאחר אישור המטפלת.',
    titreNombres: 'על המספרים',
    texteNombres:
      'המספרים שעל האתר מחושבים בשיטה נומרולוגית מודרנית, מתוך תאריך הלידה. זו אינה גימטריה, '
      + 'ואינה מסורת יהודית עתיקה. ההבחנה הזו חשובה, ולכן היא כתובה כאן ולא מוסתרת.',
    titreRdv: 'לקביעת פגישה',
    texteRdv: 'השאירו פרטים ונחזור אליכם. אפשר גם פשוט לשאול שאלה.',
    boutonRdv: 'אני רוצה לקבוע',
    piedNom: 'ישראל חיה · ייעוץ אישי',
    piedIa: 'התמונות והסרטונים באתר נוצרו באמצעות בינה מלאכותית.',
    piedAvis: 'האתר אינו מהווה ייעוץ רפואי, משפטי או פיננסי.',
  },

  apropos: {
    titre: 'אודות',
    sousTitre: 'עבודה שמתחילה בהקשבה',
    paragraphes: [
      'ישראל חיה מלווה אנשים ברגעי התלבטות: החלטה שצריך לקבל, מעגל שנסגר, כיוון שהתערפל. '
      + 'העבודה מתחילה תמיד באותו דבר — בהקשבה.',
      'הנומרולוגיה משמשת כאן בסיס להתבוננות. היא מציעה שפה — מספרים, מעגלים, נטיות — כדי לתת '
      + 'מילים למה שמחפש את דרכו. היא אינה מנבאת דבר, ואינה מחליטה במקומכם.',
      'כל מפגש הוא אישי ומתנהל בקצב שלכם. מה שנאמר בו נשאר ביניכם לבין המלווה.',
    ],
    mentionTitre: 'הבהרה',
    mention:
      'הנומרולוגיה אינה מדע מדויק. היא אינה מחליפה ייעוץ רפואי, ייעוץ משפטי או טיפול נפשי, '
      + 'ואינה מבטיחה תוצאה. זהו כלי להתבוננות וללווי.',
  },

  contact: {
    titre: 'יצירת קשר',
    chapeau: 'לפנייה ראשונה אפשר לכתוב או להתקשר. תקבלו מענה בשעות הפעילות.',
    email: 'אימייל',
    telephone: 'טלפון',
    whatsapp: 'וואטסאפ',
    boutonWhatsApp: 'לכתוב בוואטסאפ',
    adresse: 'כתובת',
    horaires: 'שעות פעילות',
    dimancheJeudi: 'ראשון עד חמישי',
    vendredi: 'שישי',
    samedi: 'שבת',
    ferme: 'סגור',
    avertissementProvisoire: 'הפרטים שלהלן הם לצורכי הדגמה ויוחלפו בפרטים האמיתיים.',
  },

  formulaire: {
    titre: 'השאירו הודעה',
    prenom: 'שם פרטי',
    nom: 'שם משפחה',
    telephone: 'טלפון',
    email: 'אימייל',
    sujet: 'נושא',
    message: 'הודעה',
    envoyer: 'שליחה',
    requis: 'שדה חובה.',
    emailInvalide: 'כתובת האימייל אינה תקינה.',
    pasBranche:
      'שליחת הטופס עדיין אינה מחוברת. בינתיים אפשר לכתוב לכתובת שלמעלה או להתקשר.',
  },
};

const fr: Textes = {
  nav: {
    accueil: 'Accueil',
    apropos: 'À propos',
    contact: 'Contact',
    connexion: 'Connexion',
    aria: 'Navigation principale',
    ariaLangue: 'Choix de la langue',
    ouvrirMenu: 'Ouvrir le menu',
    fermerMenu: 'Fermer le menu',
  },

  voyage: {
    titreLu: 'Israel Haya — Le voyage de l’âme',
    region: 'Le voyage de l’âme',
    defiler: 'Faites défiler',
    chargement: 'Chargement',
  },

  saisie: {
    prenom: 'Prénom',
    dateNaissance: 'Date de naissance',
    calculer: 'Découvrir le nombre',
    dateInvalide: 'Cette date n’est pas valide.',
    confidentialite:
      'Le calcul se fait uniquement dans votre navigateur. Aucune information n’est enregistrée ni envoyée.',
    demonstration:
      'Démonstration. La méthode de calcul définitive n’est pas encore arrêtée, et ce nombre ne constitue pas un conseil.',
    detailCalcul: 'Comment le nombre est calculé',
    recommencer: 'Refaire un calcul',
  },

  bas: {
    titreOffre: 'Ce que l’on peut faire ensemble',
    offres: [
      { titre: 'Consultation individuelle', texte: 'Une rencontre, en profondeur, autour d’une question qui vous occupe.' },
      { titre: 'Accompagnement suivi', texte: 'Une série de rencontres, sur une période, avec un suivi entre les séances.' },
      { titre: 'Une seule question', texte: 'Une réponse écrite et argumentée à une question précise.' },
    ],
    reserveTarif: 'Le tarif, la durée et le lieu seront ajoutés après validation par la praticienne.',
    titreNombres: 'À propos des nombres',
    texteNombres:
      'Les nombres de ce site sont calculés selon une méthode numérologique moderne, à partir de '
      + 'la date de naissance. Ce n’est pas de la guématria, et ce n’est pas une tradition juive '
      + 'ancienne. La distinction compte, et c’est pourquoi elle est écrite ici plutôt que passée sous silence.',
    titreRdv: 'Prendre rendez-vous',
    texteRdv: 'Laissez vos coordonnées et vous serez recontacté. On peut aussi simplement poser une question.',
    boutonRdv: 'Je veux prendre rendez-vous',
    piedNom: 'Israel Haya · Consultation individuelle',
    piedIa: 'Les images et les vidéos de ce site ont été créées avec une intelligence artificielle.',
    piedAvis: 'Ce site ne constitue ni un avis médical, ni un conseil juridique, ni un conseil financier.',
  },

  apropos: {
    titre: 'À propos',
    sousTitre: 'Une pratique qui commence par l’écoute',
    paragraphes: [
      'Israel Haya accompagne celles et ceux qui traversent un moment de questionnement : un choix '
      + 'à faire, un cycle qui se termine, une direction à retrouver. Le travail commence toujours '
      + 'par la même chose — écouter.',
      'La numérologie sert ici de support à la réflexion. Elle propose un vocabulaire — des nombres, '
      + 'des cycles, des tempéraments — pour mettre des mots sur ce qui se cherche. Elle n’annonce '
      + 'rien et ne décide à votre place de rien.',
      'Chaque rencontre est individuelle et se déroule à votre rythme. Ce qui s’y dit reste entre '
      + 'vous et la praticienne.',
    ],
    mentionTitre: 'Précision',
    mention:
      'La numérologie n’est pas une science exacte. Elle ne remplace ni un avis médical, ni un '
      + 'conseil juridique, ni un accompagnement psychologique, et ne garantit aucun résultat. '
      + 'C’est un outil de réflexion et d’accompagnement.',
  },

  contact: {
    titre: 'Contact',
    chapeau: 'Pour une première prise de contact, écrivez ou appelez. Vous recevrez une réponse pendant les horaires d’ouverture.',
    email: 'E-mail',
    telephone: 'Téléphone',
    whatsapp: 'WhatsApp',
    boutonWhatsApp: 'Écrire sur WhatsApp',
    adresse: 'Adresse',
    horaires: 'Horaires',
    dimancheJeudi: 'Dimanche à jeudi',
    vendredi: 'Vendredi',
    samedi: 'Samedi',
    ferme: 'fermé',
    avertissementProvisoire: 'Les coordonnées ci-dessous servent de démonstration et seront remplacées par les véritables.',
  },

  formulaire: {
    titre: 'Laisser un message',
    prenom: 'Prénom',
    nom: 'Nom',
    telephone: 'Téléphone',
    email: 'E-mail',
    sujet: 'Sujet',
    message: 'Message',
    envoyer: 'Envoyer',
    requis: 'Ce champ est nécessaire.',
    emailInvalide: 'Cette adresse ne semble pas valide.',
    pasBranche:
      'L’envoi n’est pas encore raccordé. En attendant, écrivez directement à l’adresse ci-dessus ou appelez.',
  },
};

const DICTIONNAIRE: Record<Langue, Textes> = { he, fr };

/** Les textes de la langue demandee. */
export function textesDe(langue: Langue): Textes {
  return DICTIONNAIRE[langue];
}
