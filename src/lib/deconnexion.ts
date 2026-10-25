import { supabase } from './supabase';
import { estDesktop } from './runtime';
import { porteeDeconnexion } from './porteeDeconnexion';

/**
 * LA DECONNEXION, ET SA PORTEE SELON LE RUNTIME.
 *
 * Decision de David du 25/10/2026 : se deconnecter du logiciel Windows ne doit PAS
 * deconnecter le telephone ni les autres appareils.
 *
 *   web  -> portee globale, comportement actuel, inchange
 *   pwa  -> portee globale, comportement actuel, inchange
 *   desktop Tauri -> portee LOCALE : seule cette session est fermee
 *
 * POURQUOI UN POINT DE PASSAGE, et pas une retouche a un seul endroit. Le depot comptait
 * HUIT appels a signOut le 25/10/2026, dont CINQ atteignables depuis l'application
 * installee. Ne corriger que handleLogout aurait rendu la promesse fausse dans les quatre
 * autres cas, sans que rien ne le signale : un utilisateur bloque qui clique
 * « Deconnexion » sur un ecran d'erreur aurait ferme la session de son telephone.
 *
 * LES CINQ CHEMINS DE BUREAU, tous mesures :
 *   1. src/App.tsx                                  handleLogout, le chemin normal
 *   2. src/app/AppStatusScreens.tsx  (AppDomainBlocked)   rendu en App.tsx:184
 *   3. src/app/AppStatusScreens.tsx  (AppAccessBlocked)   rendu en App.tsx:185
 *   4. src/app/AppUnauthorizedPage.tsx                    rendu en App.tsx:186
 *   5. src/pages/company-super-admin/CompanySuperAdminDashboard.tsx  apres connexion
 * Les trois ecrans d'etat sont rendus AVANT la branche estDesktop() (ligne 227) : ils
 * s'affichent donc bel et bien dans la fenetre Tauri.
 *
 * LES TROIS QUI NE SONT PAS TOUCHES, et pourquoi. LoginModal, PwaLoginPage et
 * TalvexLoginModal appellent signOut dans leur FLUX DE CONNEXION, pour refermer une
 * session refusee sur un domaine. Le launcher de bureau ne monte aucun des trois et ne
 * reprend pas cette verification : en desktop, ces lignes ne sont jamais atteintes. Les
 * modifier serait du bruit sans effet sur le but poursuivi.
 *
 * LA PORTEE PART EN QUERY STRING : auth-js emet `POST <url>/auth/v1/logout?scope=<portee>`.
 * C'est le temoin observable d'une deconnexion : `scope=local` sur le bureau, `scope=global`
 * sur le web. La justification du undefined (plutot qu'un objet vide) est detaillee dans
 * src/lib/porteeDeconnexion.ts.
 *
 * CE QUE CETTE FONCTION NE FAIT PAS : elle n'avale aucune erreur et ne nettoie aucun
 * stockage. Chaque appelant garde EXACTEMENT la gestion qu'il avait — certains ont un
 * try/catch, d'autres non, et plusieurs enchainent sur onClear() ou un rechargement. Le
 * seul changement introduit ici est la portee.
 */
export async function deconnecterSupabase(): Promise<void> {
  await supabase.auth.signOut(porteeDeconnexion(estDesktop()));
}
