import { randomInt } from 'node:crypto';

/**
 * UN CODE A SIX CHIFFRES TIRE AU SORT, POUR LES VALEURS QUI N'ONT PAS A ETRE CONNUES.
 *
 * Deux usages, et deux raisons distinctes :
 *
 *   - e2e/helpers/createTestAdmin.ts creait ses comptes ADMIN avec un PIN litteral. Le depot
 *     etant PUBLIC, chaque compte ainsi cree naissait avec un mot de passe connu de tous — et
 *     son appelant ne le supprime jamais. Mesure du 25/10/2026 (role postgres, qui ignore la
 *     RLS) : 3 des 5 comptes admin de la base ne s'etaient jamais connectes.
 *
 *   - e2e/admin/info-admin.spec.ts bascule le compte sur un PIN temporaire pendant le test,
 *     puis le restaure. Ce PIN temporaire etait lui aussi ecrit en clair : pendant toute la
 *     duree du test, le compte portait donc un mot de passe publie.
 *
 * randomInt vient de node:crypto et non de Math.random : on veut un tirage imprevisible, pas
 * seulement varie. padStart garde les six chiffres quand le tirage commence par un zero —
 * l'interface attend exactement six caracteres.
 */
export function pinAleatoire(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * Un PIN tire au sort, garanti different de celui passe en parametre.
 *
 * Le test qui bascule un compte sur un PIN temporaire doit pouvoir distinguer les deux : si
 * le tirage rendait la meme valeur que le PIN courant — une chance sur un million, mais une
 * suite de tests tourne des milliers de fois — le test verifierait un changement qui n'a pas
 * eu lieu, et passerait au vert sans rien prouver.
 */
export function pinAleatoireDifferentDe(autre: string): string {
  let pin = pinAleatoire();
  while (pin === autre) pin = pinAleatoire();
  return pin;
}
