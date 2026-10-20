import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Fermer une modale du module : la touche Echap, et le clic sur le fond.
 *
 * ---------- POURQUOI UN UTILITAIRE, ET POURQUOI ICI ----------
 *
 * Les quatre modales du module doivent se fermer de la meme facon. Ecrire la meme
 * douzaine de lignes quatre fois, c'est se garantir qu'une des quatre divergera. Et cet
 * utilitaire vit DANS le dossier du module : le depot a deja plusieurs facons de fermer
 * une modale (NotifHubShell pour Echap, AgendaAddModal pour le fond), et en unifier une
 * cinquieme toucherait des ecrans que ce chantier n'a pas a toucher.
 *
 * ---------- LE PIEGE DU CLIC SUR LE FOND ----------
 *
 * `onClick` avec `e.target === e.currentTarget` est la forme employee ailleurs dans le
 * depot. Elle a un defaut connu : un clic est emis sur l'ANCETRE COMMUN du mousedown et
 * du mouseup. Selectionner du texte dans un champ, puis relacher la souris en dehors de
 * la modale, emet donc un clic dont la cible EST le fond — et le formulaire se ferme,
 * alors que l'utilisateur voulait juste selectionner du texte.
 *
 * On exige donc que le geste COMMENCE aussi sur le fond : on note la cible du mousedown,
 * et le clic ne ferme que si les deux se sont produits sur le fond.
 *
 * ---------- CE QUI NE DOIT PAS SE PERDRE ----------
 *
 * Une modale qui porte une saisie en cours ne doit pas partir sur un geste approximatif.
 * Sur telephone, la feuille occupe presque tout l'ecran : le fond se reduit a une bande
 * de soixante pixels en haut, exactement la ou le pouce passe. Quand l'appelant signale
 * qu'il y a quelque chose a perdre, le premier geste ARME et le second ferme — c'est deja
 * la convention du module, celle du bouton Supprimer d'une colonne.
 *
 * ---------- UNE SEULE MODALE A LA FOIS ----------
 *
 * Pas de pile de modales a gerer : des qu'une modale est ouverte, son fond en
 * `fixed inset-0` couvre le tableau, donc plus rien ne peut en ouvrir une seconde. Chaque
 * modale ecoute donc le clavier pour son propre compte.
 */

export interface FermetureModale {
  /** Vrai quand un premier geste a ete fait et qu'il en faut un second pour fermer. */
  confirmationDemandee: boolean;
  /** A poser sur l'element de fond (celui qui porte `fixed inset-0`). */
  proprietesDuFond: {
    onMouseDown: (e: { target: EventTarget | null; currentTarget: EventTarget | null }) => void;
    onClick: (e: { target: EventTarget | null; currentTarget: EventTarget | null }) => void;
  };
  /** A appeler des que l'utilisateur reprend sa saisie : le geste arme est oublie. */
  reinitialiser: () => void;
}

export function useFermetureModale(options: {
  /** Ce qu'il faut appeler pour fermer. Pour une modale de suppression, c'est ANNULER. */
  onFermer: () => void;
  /** Vrai pendant qu'une ecriture est en vol : aucun geste ne ferme. */
  bloquee?: boolean;
  /** Vrai s'il y a quelque chose a perdre : il faudra alors deux gestes. */
  aPerdre?: boolean;
}): FermetureModale {
  const { onFermer, bloquee = false, aPerdre = false } = options;
  const [confirmationDemandee, setConfirmation] = useState(false);

  /* Les valeurs vivantes, pour que l'ecouteur clavier n'ait pas a se reabonner a chaque
     frappe — se reabonner a chaque caractere saisi ferait manquer des touches. */
  const vif = useRef({ onFermer, bloquee, aPerdre, confirmationDemandee });
  vif.current = { onFermer, bloquee, aPerdre, confirmationDemandee };

  const demander = useCallback(() => {
    const { onFermer: fermer, bloquee: bl, aPerdre: perdre, confirmationDemandee: deja } = vif.current;
    if (bl) return;                       // une ecriture est en vol
    if (perdre && !deja) { setConfirmation(true); return; }
    fermer();
  }, []);

  const reinitialiser = useCallback(() => setConfirmation(false), []);

  /* Plus rien a perdre : le geste arme n'a plus lieu d'etre. */
  useEffect(() => { if (!aPerdre) setConfirmation(false); }, [aPerdre]);

  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => { if (e.key === 'Escape') demander(); };
    document.addEventListener('keydown', auClavier);
    return () => document.removeEventListener('keydown', auClavier);
  }, [demander]);

  /* La cible du mousedown, pour refuser un clic qui a commence DANS la modale. */
  const departSurLeFond = useRef(false);

  return {
    confirmationDemandee,
    reinitialiser,
    proprietesDuFond: {
      onMouseDown: (e) => { departSurLeFond.current = e.target === e.currentTarget; },
      onClick: (e) => {
        if (e.target !== e.currentTarget) return;   // le clic vient de l'interieur
        if (!departSurLeFond.current) return;       // le geste a commence a l'interieur
        departSurLeFond.current = false;
        demander();
      },
    },
  };
}
