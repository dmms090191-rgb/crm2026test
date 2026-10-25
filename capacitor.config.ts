import type { CapacitorConfig } from '@capacitor/cli';

/**
 * CONFIGURATION CAPACITOR — Talvex pour Android et iOS.
 *
 * appId : le MEME identifiant que Tauri (src-tauri/tauri.conf.json). C'est voulu : une
 * seule identite produit. Aujourd'hui il n'y a aucune collision parce que Tauri est
 * configure en Windows seul (targets ["nsis"], aucun gen/android ni gen/apple) — mais ce
 * n'est PAS une garantie structurelle : le jour ou Tauri viserait une cible mobile ou
 * macOS, ce champ servirait aux memes identites et il faudrait trancher. A savoir avant
 * d'ajouter une cible a Tauri.
 *
 * webDir : 'dist', la sortie de Vite, partagee avec frontendDist de Tauri. Consequence a
 * connaitre : `tauri build` regenere ce dossier avec emptyOutDir, donc on ne lance pas un
 * build Tauri et un `cap sync` en meme temps. La chaine mobile est toujours
 * `npm run build` puis `npx cap sync android`.
 *
 * AUCUN BLOC `server`, ET C'EST DELIBERE. La documentation Capacitor recommande de poser
 * un `server.hostname` personnalise pour que les gestionnaires de mots de passe
 * remplissent les champs. Mesure faite le 25/10/2026 : index.html:43 traite `localhost`
 * comme hote connu, mais PAS un hote personnalise — qui ferait ajouter la classe
 * `site-page`, laquelle coupe le moteur de themes (ThemeContext) et force un fond blanc
 * en !important (index.css:41), tout en declenchant une resolution de domaine qui
 * echouerait. C'est exactement le piege qui a failli casser le bureau Tauri. On reste donc
 * sur l'hote par defaut `localhost`, et l'autofill attendra une correction d'index.html.
 */
const config: CapacitorConfig = {
  appId: 'fr.talvex.app',
  appName: 'Talvex',
  webDir: 'dist',
};

export default config;
