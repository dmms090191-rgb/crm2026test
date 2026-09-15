import { supabase } from '../lib/supabase';
import type { AccesBoutique } from './moteur/monterBoutique';

/**
 * Persistance des reglages d'une boutique 3D, sur le client Supabase AUTHENTIFIE de Talvex.
 *
 * ┌─ BRANCHE ────────────────────────────────────────────────────────────────────────────────┐
 * │ La migration 20260915120500 est appliquee et `BoutiqueVue3D` passe cet acces au moteur.   │
 * │ Les reglages de la boutique vivent donc en base, partages par tous ses visiteurs. Le      │
 * │ cache du navigateur reste la, suffixe par l'identite de la boutique : il sert de repli     │
 * │ quand la base ne repond pas, et de memoire pour ce qui NE part jamais en base.            │
 * └──────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * POURQUOI IL FAUT CET ADAPTATEUR, ET PAS LA COUCHE DU MOTEUR
 * Le moteur sait fabriquer sa propre couche distante, en `fetch` direct sur PostgREST. Elle
 * convient a Johanna 2, qui n'authentifie personne : elle pose l'en-tete `apikey` et rien
 * d'autre. Les requetes arrivent donc avec le role `anon`. Or les politiques de `boutiques` —
 * et celle de `boutique_reglages` qui en decoule — sont `TO authenticated`. Resultat previsible :
 * lecture vide, ecriture refusee, et aucun message exploitable. Il faut passer par le client de
 * Talvex, qui porte le jeton de session, donc le role et la societe dans `app_metadata`.
 *
 * CE QUI EST ECRIT ICI, ET CE QUI NE L'EST PAS
 * Le moteur a deja fait le tri de son cote : ce qu'il envoie ne contient ni `preferences` ni
 * `volume`. Ce sont des reglages de l'APPAREIL qui regarde — taille et opacite des manches,
 * disposition posee au doigt, vitesse de marche, qualite d'image, volume — et ils restent dans
 * le navigateur du visiteur. Les publier reviendrait a servir a tous les visiteurs les reglages
 * tactiles d'un seul. Cet adaptateur n'a donc rien a filtrer : il transporte ce qu'on lui donne.
 *
 * AUCUNE PANNE NE DOIT BLOQUER LA BOUTIQUE. Table absente, reseau coupe, politique refusee :
 * `lire` rend null et `ecrire` rend false. La boutique s'ouvre alors sur son cache local,
 * exactement comme si rien n'etait branche. C'est le contrat que le moteur attend.
 */

const TABLE = 'boutique_reglages';

/**
 * Y a-t-il un jeton de session ? Sans lui, inutile de partir.
 *
 * Les politiques de `boutique_reglages` sont `TO authenticated`. Une requete sans jeton part
 * avec le role `anon` et se fait refuser — mesure sur le banc de developpement, ou personne
 * n'est connecte : POST /rest/v1/boutique_reglages rend 401, et le navigateur ecrit la ligne
 * rouge « Failed to load resource: 401 » dans la console de qui ouvre la page. On ne gagne
 * rien a poser la question : on la pose donc seulement quand on a de quoi y repondre.
 *
 * `getSession` lit la session en memoire apres le premier appel : ce garde-fou ne coute pas
 * un aller-retour reseau par ecriture.
 */
async function connecte(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch {
    return false;
  }
}

export function creerAccesBoutique(): AccesBoutique {
  return {
    async lire(boutiqueId: string) {
      // Pas de session : on ne peut rien savoir. `undefined`, et non `null` — voir le contrat
      // dans moteur/monterBoutique.d.ts. Repondre `null` ici reviendrait a affirmer que la
      // boutique n a pas de reglages, et le moteur se croirait autorise a en poser.
      if (!(await connecte())) return undefined;
      const { data, error } = await supabase
        .from(TABLE)
        .select('donnees')
        .eq('boutique_id', boutiqueId)
        .maybeSingle();
      if (error) return undefined;
      if (!data) return null;
      const d = (data as { donnees?: unknown }).donnees;
      return d && typeof d === 'object' ? (d as Record<string, unknown>) : null;
    },

    async ecrire(boutiqueId: string, donnees: Record<string, unknown>) {
      if (!(await connecte())) return false;
      const { error } = await supabase
        .from(TABLE)
        .upsert(
          { boutique_id: boutiqueId, donnees, maj: new Date().toISOString() },
          { onConflict: 'boutique_id' },
        );
      return !error;
    },
  };
}
