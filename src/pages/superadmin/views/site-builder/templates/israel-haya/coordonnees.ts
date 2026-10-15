/**
 * LES COORDONNEES — TOUTES PROVISOIRES, ET TOUTES ICI.
 *
 * ============================================================================
 *   A REMPLACER PAR LES VRAIES COORDONNEES DE LA PRATICIENNE.
 *   Tout ce qui suit est une demonstration. Rien de ces valeurs n'est reel :
 *   ni l'adresse, ni le numero, ni le courriel. Ce fichier est le SEUL endroit
 *   a modifier le jour ou les vraies informations seront connues.
 * ============================================================================
 *
 * Pourquoi un fichier a part plutot que des valeurs dans les composants : parce qu'une adresse
 * inventee qui traine dans trois fichiers finit toujours par survivre quelque part. Un seul
 * point de verite, et le remplacement est total ou il n'est pas.
 *
 * Module PUR : aucune dependance, verifiable sans navigateur.
 */

export interface Coordonnees {
  nom: string;
  email: string;
  /** Tel qu'on l'ecrit a l'ecran, lisible par un humain. */
  telephoneAffiche: string;
  /** Au format international, pour les liens tel: et WhatsApp. */
  telephoneInternational: string;
  adresse: string;
  ville: string;
  pays: string;
}

/** DEMONSTRATION — aucune de ces valeurs n'est reelle. */
export const COORDONNEES: Coordonnees = {
  nom: 'Israel Haya',
  /*
   * Le domaine est en `.example`, un suffixe RESERVE par l'IANA qui ne pourra jamais etre
   * enregistre par personne. Une premiere version portait un `.co.il` d'apparence reelle : une
   * adresse de demonstration qui ressemble a une vraie adresse finit par recevoir du vrai
   * courrier, chez quelqu un qui n a jamais entendu parler de ce site.
   */
  email: 'contact@israelhaya.example',
  /*
   * Israel n'a aucune plage reservee aux fictions, contrairement au 555 nord-americain : un
   * 050-555-2846 est un mobile parfaitement attribuable, et il peut sonner chez quelqu un
   * aujourd'hui. On prend donc une suite nulle, qui ne s'attribue pas — et les liens restent
   * de toute facon inertes tant que les coordonnees sont provisoires (voir plus bas).
   */
  telephoneAffiche: '050-000-0000',
  // Le 0 initial tombe a l'international : 050-000-0000 devient +972 50 000 0000.
  telephoneInternational: '+972500000000',
  adresse: '12 HaShaked Street',
  ville: 'Netanya',
  pays: 'Israel',
};

/** Vrai tant que les coordonnees sont celles de la demonstration. */
export const COORDONNEES_PROVISOIRES = true;

/**
 * LES COORDONNEES SONT-ELLES CLIQUABLES ?
 *
 * Non tant qu elles sont provisoires. Un bandeau qui previent en texte ne desarme rien : le
 * bouton WhatsApp reste le plus gros element tactile de la page, et un visiteur qui appuie
 * dessus ouvre une conversation avec le titulaire du numero, quel qu il soit. Le jour ou les
 * vraies coordonnees arrivent, COORDONNEES_PROVISOIRES passe a false et les trois canaux
 * deviennent actifs d'un seul coup, sans toucher a la page.
 *
 * Les trois fonctions ci-dessous restent de pures mises en forme : elles disent ce que SERA le
 * lien, et leurs tests continuent de verifier ce format. C est la page qui decide de le poser.
 */
export function coordonneesActives(): boolean {
  return !COORDONNEES_PROVISOIRES;
}

export function lienCourriel(c: Coordonnees = COORDONNEES): string {
  return `mailto:${c.email}`;
}

export function lienTelephone(c: Coordonnees = COORDONNEES): string {
  return `tel:${c.telephoneInternational}`;
}

/**
 * WhatsApp attend le numero international SANS le plus ni les separateurs.
 * On n'y joint aucun message pre-rempli : un texte impose a la place du visiteur se remarque,
 * et il serait de toute facon dans la mauvaise langue une fois sur deux.
 */
export function lienWhatsApp(c: Coordonnees = COORDONNEES): string {
  return `https://wa.me/${c.telephoneInternational.replace(/[^0-9]/g, '')}`;
}

/** L'adresse en une ligne, pour l'affichage. */
export function adresseComplete(c: Coordonnees = COORDONNEES): string {
  return `${c.adresse}, ${c.ville}, ${c.pays}`;
}

/** Les horaires. Provisoires eux aussi : les libelles vivent dans le dictionnaire. */
export interface Creneau {
  /** Cle du jour dans le dictionnaire. */
  cle: 'dimancheJeudi' | 'vendredi' | 'samedi';
  /** Null quand c'est ferme. */
  heures: string | null;
}

export const HORAIRES: readonly Creneau[] = [
  { cle: 'dimancheJeudi', heures: '09:00 – 18:00' },
  { cle: 'vendredi', heures: '09:00 – 13:00' },
  { cle: 'samedi', heures: null },
];
