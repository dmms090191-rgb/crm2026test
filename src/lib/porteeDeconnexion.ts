/**
 * LA PORTEE DE LA DECONNEXION, isolee de tout.
 *
 * Decision de David du 25/10/2026 : se deconnecter du logiciel Windows ne doit PAS fermer
 * la session du telephone ni celle des autres appareils.
 *
 *   desktop Tauri -> { scope: 'local' } : seule cette session est fermee
 *   web et pwa    -> undefined : auth-js applique son defaut 'global', comme aujourd'hui
 *
 * POURQUOI CE FICHIER EST SEPARE DE deconnexion.ts. Ce dernier importe le client Supabase,
 * et src/lib/supabase.ts lit `import.meta.env.VITE_SUPABASE_URL` des son chargement — ce
 * qui leve sous Node, ou `import.meta.env` n'existe pas. Un releve ne pourrait donc pas
 * importer la fonction pour verifier son COMPORTEMENT : il devrait se contenter de relire
 * le texte du fichier, ce qui est bien plus faible. La regle est donc la meme que pour
 * src/lib/runtime.ts : la decision vit dans un module sans aucune dependance, et
 * l'adaptateur qui touche Supabase vit a cote.
 *
 * POURQUOI undefined, ET NON UN OBJET VIDE. Mesure faite dans auth-js, puis corrigee :
 * contrairement a ce que j'avais d'abord ecrit, passer `{}` ne change PAS le resultat
 * observable. La methode interne est declaree `_signOut({ scope } = { scope: 'global' })`,
 * dont le defaut ne s'applique qu'a undefined ; avec `{}`, `scope` vaut donc undefined et
 * part tel quel vers `admin.signOut(jwt, scope = SIGN_OUT_SCOPES[0])`, dont le defaut est
 * 'global' (SIGN_OUT_SCOPES vaut ['global', 'local', 'others']). Les deux formes aboutissent
 * aujourd'hui a la meme requete.
 *
 * La regle tient quand meme, pour une autre raison : `{}` ne marche que par une CASCADE de
 * deux valeurs par defaut situees dans une dependance externe. Il suffirait qu'auth-js
 * valide strictement le scope recu, ou reordonne SIGN_OUT_SCOPES, pour que `{}` diverge en
 * silence. `undefined` n'emprunte qu'un seul de ces defauts, celui qui est ecrit noir sur
 * blanc `{ scope: 'global' }`. On exprime donc l'intention, au lieu de parier sur deux
 * defauts successifs.
 *
 * 'others' SERAIT L'EXACT INVERSE DU BUT : cette portee ferme les AUTRES sessions en
 * gardant celle-ci. auth-js precise au passage qu'aucun evenement SIGNED_OUT n'est alors
 * emis, ce qui laisserait l'interface croire l'utilisateur encore connecte.
 */
export function porteeDeconnexion(desktop: boolean): { scope: 'local' } | undefined {
  return desktop ? { scope: 'local' } : undefined;
}
