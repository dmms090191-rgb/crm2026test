// Talvex — coquille de bureau Tauri 2.
//
// Elle ne fait RIEN d'autre qu'ouvrir une fenetre sur l'application Talvex : aucune
// commande expose au JavaScript, aucun plugin, aucune permission au-dela du socle.
// C'est deliberе a ce stade : le but de cette etape est de prouver que le branchement de
// runtime fonctionne dans le vrai logiciel, pas d'ajouter des capacites natives.
//
// Le cote web se reconnait desktop par `window.isTauri`, que Tauri pose AVANT le premier
// script de la page — voir src/lib/runtime.ts et le script en ligne d'index.html. Rien
// n'est injecte d'ici, et aucune variable de build n'est necessaire.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("echec au lancement de Talvex");
}
