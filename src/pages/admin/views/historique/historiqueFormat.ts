import type { EntreeHistorique } from '../../../../lib/notificationHistory';

/**
 * L'affichage de l'historique : date, heure, etat. Fonctions pures, aucun composant —
 * un fichier qui exporte a la fois un composant et une fonction declenche
 * react-refresh/only-export-components, et la separation vaut de toute facon mieux.
 */

/*
 * Pourquoi `Intl` ici, alors que `formatDateImmo` decoupe la chaine ISO.
 *
 * Les deux cas ne sont pas les memes. Une fin de bail est une date CALENDAIRE : elle n'a
 * pas d'heure, et la convertir en heure locale la ferait changer de jour pour rien —
 * c'est ce que `formatDateImmo` evite en decoupant la chaine.
 *
 * `occurred_at` est un INSTANT : un message recu a 09:00 UTC a ete recu a 11:00 a Paris
 * en ete. Le decoupage afficherait 09:00 et mentirait. Il faut donc bien convertir.
 *
 * Les alertes CRM Immo, qui sont des dates calendaires, sont inscrites a midi UTC
 * precisement pour cela : midi ne change de jour sous aucun fuseau reellement utilise.
 */
const DATE_HEURE = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
});

const DATE_SEULE = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
});

const HEURE_SEULE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Un horodatage illisible rend un tiret, jamais « Invalid Date » a l'ecran. */
function instant(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateHeure(iso: string | null): string {
  const d = instant(iso);
  return d ? DATE_HEURE.format(d).replace(' ', ' a ') : '—';
}

export function formatDate(iso: string | null): string {
  const d = instant(iso);
  return d ? DATE_SEULE.format(d) : '—';
}

export function formatHeure(iso: string | null): string {
  const d = instant(iso);
  return d ? HEURE_SEULE.format(d) : '—';
}

export type EtatAffiche = 'nouvelle' | 'lue' | 'traitee' | 'archivee';

/**
 * L'etat d'une entree, en un seul mot.
 *
 * L'ordre des tests est le sens de lecture, du plus fort au plus faible : archivee
 * l'emporte sur traitee, qui l'emporte sur lue. Une entree traitee est forcement lue —
 * le hook le garantit en ecrivant les deux ensemble — donc ce classement ne cache rien.
 */
export function etatDe(e: EntreeHistorique): EtatAffiche {
  if (e.archived_at !== null) return 'archivee';
  if (e.treated_at !== null) return 'traitee';
  if (e.read_at !== null) return 'lue';
  return 'nouvelle';
}

export const LIBELLE_ETAT: Record<EtatAffiche, string> = {
  nouvelle: 'Nouvelle',
  lue: 'Lue',
  traitee: 'Traitee',
  archivee: 'Archivee',
};
