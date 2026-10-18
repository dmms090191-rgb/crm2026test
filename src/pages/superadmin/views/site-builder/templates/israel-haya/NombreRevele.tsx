import { CREME, OR } from './stylePages';

/**
 * LE NOMBRE, POSE AU CENTRE DU MECANISME.
 *
 * ---------- CE QUE CE COMPOSANT REMPLACE, ET POURQUOI ----------
 *
 * Quand le chapitre des anneaux etait calcule en temps reel, le nombre revele allumait une
 * sphere emissive au centre de la scene 3D (voir AnneauxCelestes). Le chiffre lui-meme n'a
 * JAMAIS ete dessine en 3D : il etait deja ecrit en HTML, parce qu'un glyphe rendu dans une
 * texture se lit toujours moins bien qu'un glyphe rendu par le navigateur. Seule la LUEUR
 * vivait dans la scene.
 *
 * Le decor est devenu un film : la lueur a donc perdu son moteur. Elle est reconstruite ici,
 * en DOM, par-dessus la video — et le chiffre la rejoint, puisqu'il etait de toute facon du
 * cote HTML. Rien n'est perdu, et le texte reste net a tous les niveaux de zoom.
 *
 * ---------- POURQUOI LE CHIFFRE EST ICI ET AUSSI DANS LE PANNEAU ----------
 *
 * Ce ne sont pas deux fois la meme chose. Le panneau donne le nombre AVEC son calcul, ses
 * etapes et son theme : c'est la lecture. Le centre du mecanisme donne l'INSTANT — le moment
 * ou le nombre parait, a l'endroit ou le visiteur regarde. Ce doublon est voulu ; il etait
 * deja la avec la sphere.
 *
 * Il est donc `aria-hidden` : un lecteur d'ecran l'annoncerait deux fois, et c'est le panneau
 * qui porte la version complete et utile.
 */

interface Props {
  /** Le nombre revele, ou null tant qu'il n'y en a pas. */
  nombre: number | null;
  mouvementReduit: boolean;
  /**
   * Hauteur, en pixels depuis le haut de la scene, du centre de la zone libre.
   *
   * Sur telephone, le panneau de saisie occupe les 44 % du bas : poser le nombre au milieu de
   * la scene le mettrait DERRIERE lui, a l'instant precis ou le visiteur vient de le demander.
   * On reutilise donc la mesure du panneau, deja faite pour le cadrage de la scene 3D qui
   * n'existe plus. null : la scene est libre, on se centre dessus.
   */
  centreY: number | null;
}

export default function NombreRevele({ nombre, mouvementReduit, centreY }: Props) {
  const visible = nombre !== null;

  return (
    <div
      aria-hidden
      data-testid="ih-nombre-revele"
      data-ih-visible={visible ? 'oui' : 'non'}
      style={{
        position: 'absolute',
        insetInline: 0,
        top: centreY === null ? '50%' : centreY,
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'none',
        transform: 'translateY(-50%)',
        opacity: visible ? 1 : 0,
        // Le nombre arrive en se posant, jamais en surgissant. En mouvement reduit il est deja la.
        transition: mouvementReduit ? 'none' : 'opacity 620ms ease',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          // La lueur grandit avec le nombre : c'est elle qui fait l'evenement, pas le chiffre.
          transform: visible || mouvementReduit ? 'scale(1)' : 'scale(0.82)',
          transition: mouvementReduit ? 'none' : 'transform 720ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/*
          LA LUEUR. C'est la DECROISSANCE qui se lit comme une lumiere : un halo degrade, pas un
          disque. La version 3D avait appris la lecon — une sphere emissive sature sur toute sa
          surface et rend une pastille a bord net, qui ressemble a un autocollant.
        */}
        <div
          style={{
            position: 'absolute',
            width: 'clamp(190px, 46vmin, 420px)',
            aspectRatio: '1',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,231,180,0.50) 0%, rgba(243,198,116,0.24) 26%, rgba(214,150,60,0.09) 52%, rgba(120,76,20,0) 74%)',
            filter: 'blur(2px)',
          }}
        />
        <span
          style={{
            position: 'relative',
            fontFamily: '"Frank Ruhl Libre", Georgia, serif',
            fontSize: 'clamp(4.2rem, 13vmin, 9rem)',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            color: CREME,
            // Deux ombres : une proche et chaude qui colle au glyphe, une large et doree qui
            // le fait tenir sur le metal du film sans qu'on ait a poser un voile dessus.
            textShadow: '0 0 10px rgba(255,226,173,0.55), 0 0 44px rgba(232,205,147,0.42)',
            WebkitTextStroke: `0.5px ${OR}`,
          }}
        >
          {nombre ?? ''}
        </span>
      </div>
    </div>
  );
}
