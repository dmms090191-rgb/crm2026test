/* Les colonnes de la Liste des groupes. Partagees par le tableau (SASuperAdminsTable) et par le
   squelette du premier chargement (SASuperAdminsSquelette), pour que les deux peignent les MEMES
   en-tetes. Dans un fichier sans composant : le rechargement a chaud de Vite l'exige. */
export const COLONNES_GROUPES = ['Prenom', 'Nom', 'Email', 'Groupe', 'Statut', 'Telephone', 'Role', 'Cree le', 'Acces', 'Actions'];
