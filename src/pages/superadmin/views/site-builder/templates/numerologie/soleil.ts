import * as THREE from 'three';

/**
 * LE SOLEIL — une seule source de verite, partagee par le fond, l'eclairage et les rayons.
 *
 * Ces constantes vivent dans leur propre fichier, et non a cote d'un composant, pour deux
 * raisons. La premiere est technique : un module qui exporte a la fois un composant et des
 * constantes casse le rechargement a chaud de Vite. La seconde est plus importante — si la
 * direction du soleil du shader de fond et celle de la lumiere directionnelle divergeaient,
 * meme d'un degre, les ombres des colonnes tomberaient du mauvais cote et l'oeil le verrait
 * immediatement. Un seul endroit a changer, donc aucune divergence possible.
 *
 * Soleil bas sur l'horizon et legerement a droite : c'est l'inclinaison qui donne les rayons
 * les plus longs et la lumiere rasante la plus chaude sur la pierre.
 */
export const SOLEIL_DIR = new THREE.Vector3(0.3, 0.085, -1).normalize();

/** Distance a laquelle on pose le disque solaire : assez loin pour rester a l'infini visuel. */
export const SOLEIL_DISTANCE = 700;
