import React from 'react'
import { TELEVISIONS, GRANDE, estAllumee, nombreAllumees, CLES } from './televisions.js'
import { LIBELLES_DIFFUSION } from './musique.js'

/**
 * Televisions de la boutique : une ligne par ecran, allumee ou eteinte.
 *
 * Eteindre ne fait pas disparaitre le televiseur : le chassis reste dans la piece, seule la
 * dalle s'eteint. C'est la difference entre une tele eteinte et une tele absente, et c'est ce
 * que le client a demande.
 *
 * La source de contenu (Articles, YouTube, Image, Promo...) est deja portee par le modele mais
 * n'a qu'une valeur aujourd'hui : la place est prise, l'ajout se fera ici.
 */
export default function Televisions({ televisions, diffusion, onBasculer, onToutes }) {
  const allumees = nombreAllumees(televisions)
  const grandeEteinte = !estAllumee(televisions, GRANDE.cle)
  const diffuseSurLaGrande = diffusion === 'tele'

  return (
    <div className="televisions">
      <div className="tv-entete">
        <span className="tv-compte" data-test="tv-compte">
          {allumees} allumée{allumees > 1 ? 's' : ''} sur {CLES.length}
        </span>
        <span className="tv-groupe">
          <button type="button" className="lumiere-lien" data-test="tv-toutes-on"
                  onClick={() => onToutes(true)}>Tout allumer</button>
          <button type="button" className="lumiere-lien" data-test="tv-toutes-off"
                  onClick={() => onToutes(false)}>Tout éteindre</button>
        </span>
      </div>

      <ul className="tv-liste">
        {TELEVISIONS.map((t) => {
          const on = estAllumee(televisions, t.cle)
          return (
            <li className="tv-ligne" key={t.cle} data-test={`tv-ligne-${t.cle}`} data-on={on}>
              <span className="tv-nom">
                {t.libelle}
                {t.detail && <span className="tv-detail">{t.detail}</span>}
              </span>
              <button type="button" className="tv-bascule" data-test={`tv-bascule-${t.cle}`}
                      role="switch" aria-checked={on}
                      aria-label={`${t.libelle} : ${on ? 'allumée' : 'éteinte'}`}
                      onClick={() => onBasculer(t.cle)}>
                <span className="tv-pastille" aria-hidden="true" />
                <span className="tv-etat">{on ? 'Allumée' : 'Éteinte'}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {grandeEteinte && diffuseSurLaGrande && (
        <p className="tv-avis" data-test="tv-avis-diffusion">
          La grande télé est éteinte : la vidéo YouTube ne s’y affiche pas. Le son continue.
        </p>
      )}

      <p className="lumiere-note" data-test="tv-note">
        Éteindre une télé noircit sa dalle ; le téléviseur reste en place dans la boutique.
        Seule la grande télé du fond sait diffuser une vidéo, par Réglages → Musique
        ({LIBELLES_DIFFUSION.tele}).
      </p>
    </div>
  )
}
