import React from 'react'

/**
 * Reglages > Mesures.
 *
 * Le panneau de mesures techniques (images par seconde, temps par image, chargement, carte
 * graphique) n'est plus une commande permanente de la vue : c'est un outil, il vit dans les
 * reglages et reste eteint pour un visiteur normal. Allume, il reprend exactement sa place
 * habituelle, en haut a droite.
 */
export default function MesuresReglage({ actif, onBasculer }) {
  return (
    <div className="mesures-reglage">
      <div className="tv-ligne" data-on={actif}>
        <span className="tv-nom">
          Afficher les statistiques
          <span className="tv-detail">Images par seconde, temps par image, carte graphique</span>
        </span>
        <button type="button" className="tv-bascule" data-test="mesures-bascule"
                role="switch" aria-checked={actif}
                aria-label={`Statistiques : ${actif ? 'affichées' : 'masquées'}`}
                onClick={() => onBasculer(!actif)}>
          <span className="tv-pastille" aria-hidden="true" />
          <span className="tv-etat">{actif ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      <p className="lumiere-note" data-test="mesures-note">
        Ces chiffres servent à régler la boutique, pas à la visiter. Ils restent masqués par
        défaut et n’apparaissent que le temps d’un contrôle.
      </p>
    </div>
  )
}
