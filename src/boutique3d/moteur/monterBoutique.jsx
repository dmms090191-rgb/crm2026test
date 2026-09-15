// LE POINT D'ENTREE DU MOTEUR — celui qu'une autre application appellera.
//
// Avant, l'amorcage vivait dans `main.jsx` : il prenait `#root`, creait la racine React, et en
// cas d'echec de chargement ecrasait le document hote en `innerHTML`. Rien de cela ne peut
// tenir dans une page qui possede deja sa propre racine React et sa barre laterale.
//
// Ici, la boutique devient ce qu'elle aurait toujours du etre : un COMPOSANT qu'on monte dans
// un noeud fourni, avec un modele et une identite de boutique passes en parametres.
//
//   import { monterBoutique } from './monterBoutique.jsx'
//   const demonter = monterBoutique({ noeud, boutiqueId: '…', baseAssets: '/boutique3d/johanna' })
//
// ou, depuis une application React deja en place :
//
//   <Boutique3D boutiqueId="…" baseAssets="…" />
//
// Le mode autonome de Johanna 2 passe par le meme chemin, avec les valeurs par defaut — c'est
// ce qui garantit qu'il n'existe pas deux amorcages a tenir d'accord.
//
// `acces` merite un mot. Le moteur sait construire sa propre couche de persistance distante, en
// `fetch` sur PostgREST, a partir de deux variables d'environnement. Cela suffit a Johanna 2,
// qui n'authentifie personne. Une application qui, elle, connecte ses utilisateurs doit passer
// SON acces deja authentifie : sinon les requetes partent avec le role anonyme et se heurtent
// aux politiques de securite, sans message exploitable. D'ou ce parametre — un objet
// `{ lire(boutique), ecrire(boutique, donnees) }`, la meme forme que `creerAcces` rend.
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ModeleContexte, definirBaseAssets, asset } from './modele.js'
import './styles.css'

const CHEMIN_MANIFESTE = '/boutique.json'

/**
 * La boutique, en composant.
 *
 * Le manifeste est charge ICI et non dans App : le reste du moteur peut alors compter sur sa
 * presence des le premier rendu, exactement comme avant, quand `main.jsx` attendait le `fetch`
 * avant de monter quoi que ce soit.
 */
export function Boutique3D({ boutiqueId = null, baseAssets = '', manifeste = null, acces = null }) {
  // Pose avant le premier rendu : le chargeur de textures, le lecteur audio et le chargeur de
  // GLB la lisent au niveau du module, pas par le contexte (voir modele.js).
  definirBaseAssets(baseAssets)

  const [meta, setMeta] = useState(manifeste)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    if (manifeste) { setMeta(manifeste); return undefined }
    let vivant = true
    fetch(asset(CHEMIN_MANIFESTE))
      .then((r) => r.json())
      .then((m) => {
        if (!vivant) return
        // Sonde conservee : trois tests et deux scripts de verification lisent `window.__meta`.
        if (typeof window !== 'undefined') window.__meta = m
        setMeta(m)
      })
      .catch((e) => { if (vivant) setErreur(e.message) })
    return () => { vivant = false }
  }, [manifeste, baseAssets])

  // L'erreur est un ETAT RENDU, et non plus un `innerHTML` pose sur un noeud qu'on ne possede
  // pas : une application hote ne doit jamais etre effacee parce qu'un fichier manque.
  if (erreur) {
    return (
      <div className="boutique3d">
        <div className="chargement">Erreur de chargement : {erreur}</div>
      </div>
    )
  }
  if (!meta) {
    return (
      <div className="boutique3d">
        <div className="chargement">CHARGEMENT DE LA BOUTIQUE…</div>
      </div>
    )
  }

  return (
    <ModeleContexte.Provider value={{ boutiqueId, baseAssets, manifeste: meta, acces }}>
      <App />
    </ModeleContexte.Provider>
  )
}

/**
 * Monte la boutique dans `noeud` et rend la fonction qui la demonte.
 *
 * `noeud` doit remplir DEUX conditions, et non une seule :
 *   1. etre POSITIONNE (`position: relative` ou equivalent) ;
 *   2. avoir une HAUTEUR DEFINIE. La feuille donne `height: 100%` au cadre, et un pourcentage
 *      contre un parent de hauteur `auto` se resout a `auto` : la boutique ferait 0 px de haut,
 *      canvas compris, et rien ne le signalerait. En autonome, html / body / #root sont deja a
 *      100 % ; chez un hote, la hauteur est a sa charge.
 *
 * Tout le reste — interface, voile de chargement, couche video, modales — se pose sur ce cadre
 * et jamais sur la fenetre.
 */
export function monterBoutique({ noeud, boutiqueId = null, baseAssets = '', manifeste = null,
                                 acces = null } = {}) {
  if (!noeud) throw new Error('monterBoutique : aucun noeud de montage')
  const racine = createRoot(noeud)
  racine.render(
    <Boutique3D boutiqueId={boutiqueId} baseAssets={baseAssets} manifeste={manifeste}
                acces={acces} />)
  return () => racine.unmount()
}

export default monterBoutique
