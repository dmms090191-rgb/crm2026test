/**
 * OU S'ENREGISTRE LE « DEJA VU » DES NOTIFICATIONS D'AGENDA.
 *
 * La decision, et rien d'autre. Pure, sans React et sans base : on peut donc la prouver
 * pour les trois panels et pour la Visu sans monter quoi que ce soit.
 *
 * ---------- POURQUOI CE FICHIER EXISTE ----------
 *
 * Les deux hooks d'Agenda rangeaient leur « vu » dans le localStorage, avec une purge a
 * 24 h. Deux consequences :
 *
 *   - une notification vue redevient neuve le lendemain, sur le MEME appareil ;
 *   - elle est neuve sur tout autre appareil, puisque rien n'est partage.
 *
 * Le defaut est plus etroit qu'il n'y parait : une alerte « starting » ne vit que
 * soixante secondes avant et apres l'heure du rendez-vous, donc la purge a 24 h ne peut
 * pas la faire revenir. C'est « untreated » qui souffre — elle persiste tant que le
 * rendez-vous n'est pas traite, donc elle revient chaque jour.
 *
 * ---------- POURQUOI UNE DECISION, ET PAS UNE MIGRATION ----------
 *
 * `useAgendaNotifications` sert TROIS panels :
 *
 *   Societe   userId = l'identifiant Auth de l'administrateur
 *   Vendeur   userId = l'identifiant du commercial en base
 *   Client    userId = un EMAIL
 *
 * Un email ne peut pas etre un `recipient_user_id` : la colonne est un uuid avec cle
 * etrangere vers auth.users. Basculer les trois panels d'un bloc casserait le panel
 * Client a la premiere ecriture.
 *
 * Et en Visu, le panel Societe passe l'identifiant du compte CONNECTE (Talvex ou le
 * Groupe), pas celui de l'administrateur regarde. Persister la ferait ecrire des
 * notifications au nom du visiteur, dans la Societe visitee. La RLS ne l'arreterait
 * pas : le role super_admin a FOR ALL sur la table.
 *
 * D'ou cette fonction : chaque appelant DIT ce qu'il est, et la decision est nommee,
 * lisible et verifiable. Rien n'est implicite.
 */

export type GenreAgenda = 'starting' | 'untreated';

/** Les deux categories d'agenda de l'historique. */
export type CategorieAgenda = 'agenda' | 'equipe';

/** Quel panel demande. Ce n'est pas un role technique : c'est l'ecran qui appelle. */
export type PanelAgenda = 'societe' | 'vendeur' | 'client';

export type RaisonLocale =
  /** Vendeur ou Client : leur identifiant n'est pas un destinataire valide en base. */
  | 'panel-sans-destinataire'
  /**
   * L'appelant n'a RIEN demande.
   *
   * C'est le defaut, et c'est voulu : un ecran qui oublie de se declarer garde le
   * comportement d'avant. L'oubli degrade vers le localStorage, jamais vers une
   * ecriture au nom du mauvais utilisateur.
   */
  | 'persistance-non-demandee'
  /** Visu : le compte connecte n'est PAS le destinataire des notifications affichees. */
  | 'visu'
  /** Societe ou utilisateur pas encore connu : on n'invente pas un destinataire. */
  | 'identite-incomplete';

/**
 * La decision, explicite.
 *
 * `'base'` porte le destinataire exact ; `'local'` porte la RAISON. Une raison qu'on
 * peut lire dans un test est ce qui fait la difference entre un garde et une habitude.
 */
export type Persistance =
  | { ou: 'base'; companyId: string; userId: string }
  | { ou: 'local'; raison: RaisonLocale };

export interface ContextePersistance {
  panel: PanelAgenda;
  /**
   * L'appelant demande-t-il la persistance en base ?
   *
   * Absent ou faux = non. C'est l'ecran qui doit se declarer, parce que lui seul sait
   * s'il montre ses propres notifications ou celles de quelqu'un d'autre.
   */
  demandee: boolean;
  /** Vrai des que le panel affiche l'ecran de QUELQU'UN D'AUTRE. */
  enVisu: boolean;
  companyId: string | null;
  /** L'identifiant passe au hook : uuid Auth pour la Societe, autre chose ailleurs. */
  userId: string | null;
}

/**
 * Ou ranger le « vu », pour ce contexte-ci.
 *
 * L'ordre des refus est volontaire, du plus structurel au plus circonstanciel : un
 * panel Client ne pourra JAMAIS persister en base, alors qu'une identite incomplete se
 * resout au chargement suivant. Les lire dans cet ordre rend la raison exacte.
 *
 * Le defaut de cette fonction est le REFUS. Il faut reunir quatre conditions pour
 * ecrire en base, et chacune est verifiee ici, une seule fois, pour les trois panels.
 */
export function deciderPersistance(ctx: ContextePersistance): Persistance {
  /* 1. Le panel. Vendeur et Client n'ont pas d'identifiant utilisable comme
        destinataire — celui du Client est un email. Aucune Visu, aucune identite
        complete ne change cela : c'est le refus le plus definitif. */
  if (ctx.panel !== 'societe') return { ou: 'local', raison: 'panel-sans-destinataire' };

  /* 2. La demande. Un ecran qui ne s'est pas declare garde le comportement d'avant. */
  if (!ctx.demandee) return { ou: 'local', raison: 'persistance-non-demandee' };

  /* 3. La Visu. Le panel Societe passe l'identifiant du compte CONNECTE, donc en Visu
        ce n'est pas le destinataire des notifications affichees. Ecrire reviendrait a
        dire que Talvex — ou le Groupe — a recu ces notifications dans une Societe qui
        n'est pas la sienne. */
  if (ctx.enVisu) return { ou: 'local', raison: 'visu' };

  /* 4. L'identite. Tant qu'elle n'est pas chargee, on ne fabrique pas de destinataire. */
  if (!ctx.companyId || !ctx.userId) return { ou: 'local', raison: 'identite-incomplete' };

  return { ou: 'base', companyId: ctx.companyId, userId: ctx.userId };
}

/**
 * La cle du localStorage, telle qu'elle existe depuis l'origine.
 *
 * Elle NE CHANGE PAS. Des « vu » sont deja ranges sous cette forme dans les navigateurs
 * des utilisateurs ; en changer le format les perdrait tous d'un coup, et ferait
 * remonter toutes les alertes passees non traitees le jour de la mise en ligne.
 */
export function cleLocale(rdvId: string, type?: GenreAgenda): string {
  return type === 'untreated' ? `untreated_${rdvId}` : rdvId;
}

/**
 * La meme chose, cote base : le couple (source, occurrence) de notification_history.
 *
 * `source_id` est le rendez-vous, `occurrence` distingue les deux raisons d'alerter sur
 * LE MEME rendez-vous — il commence, ou il est passe sans etre traite. Sans elle, la
 * seconde ecraserait la premiere.
 */
export function cleBase(rdvId: string, type?: GenreAgenda): string {
  return `${rdvId}|${type ?? 'starting'}`;
}

/** La cle de base reconstruite depuis une ligne relue : meme forme, meme ordre. */
export function cleBaseDepuisLigne(sourceId: string, occurrence: string): string {
  return `${sourceId}|${occurrence}`;
}

/**
 * La purge du localStorage — DELIBEREMENT INCHANGEE.
 *
 * C'est elle qui fait revenir une alerte « untreated » apres vingt-quatre heures, et
 * c'est tentant de la corriger ici. On ne le fait pas : David a demande que le
 * comportement du Vendeur et du Client reste identique au caractere, et ce chemin est
 * le leur. Pour eux, rien ne doit bouger — ni le format des cles, ni la duree de vie.
 *
 * La correction, pour le panel Societe hors Visu, ne passe pas par le localStorage :
 * elle passe par `notification_history`, ou le « vu » n'expire jamais et suit
 * l'utilisateur d'un appareil a l'autre.
 *
 * Extraite ici pour une seule raison : les deux hooks d'Agenda en avaient chacun leur
 * copie, et deux copies finissent toujours par diverger.
 */
export const DUREE_VIE_LOCALE_MS = 24 * 60 * 60 * 1000;

export function purgerParAge(
  map: Record<string, number>,
  maintenant: number,
  duree = DUREE_VIE_LOCALE_MS,
): Record<string, number> {
  const garde: Record<string, number> = {};
  for (const [cle, ts] of Object.entries(map)) {
    if (maintenant - ts < duree) garde[cle] = ts;
  }
  return garde;
}
