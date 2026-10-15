import { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import AnneauxCelestes from './AnneauxCelestes';
import ArbreDeVie from './ArbreDeVie';
import { DISTANCE_MIN, ETENDUE, OUVERTURE, cadrer } from './cadrage';

/**
 * LES DEUX CHAPITRES EN TEMPS REEL, dans UN SEUL contexte WebGL.
 *
 * Monter et demonter un Canvas par chapitre est le chemin le plus court vers la perte de
 * contexte WebGL : le navigateur n'en accorde qu'une poignee, et les anciens ne sont pas
 * liberes a l'instant ou l'on croit. Un seul Canvas vit donc pour les deux chapitres, et c'est
 * la SCENE qui change a l'interieur.
 *
 * Le Canvas n'est monte que lorsqu'un de ces deux chapitres approche, et il est demonte quand
 * on s'en eloigne durablement : une scene 3D qui tourne derriere un film ne sert a rien et
 * mange la batterie.
 *
 * Les anneaux et l'arbre ne coexistent jamais : l'un s'en va quand l'autre arrive. La
 * transition entre eux se joue a la couture des chapitres, par un fondu, pas par un morphing —
 * transformer un objet en un autre est precisement ce que la methode deconseille.
 */

interface Props {
  /** Quel chapitre temps reel afficher : 3 (anneaux) ou 4 (arbre). */
  chapitre: 3 | 4;
  /** Progression du chapitre, de 0 a 1. */
  progression: number;
  /** Nombre revele, ou null. */
  nombre: number | null;
  mouvementReduit: boolean;
  /** Rapport de pixels, decide par le reglage de qualite. */
  dpr: number;
  /** Haut du panneau de saisie, en pixels depuis le haut de la scene. null : aucun panneau. */
  hautPanneau?: number | null;
  /** Largeur de ce panneau, en pixels. */
  largeurPanneau?: number;
  /** Part de l'apparition du panneau, de 0 a 1. */
  monteePanneau?: number;
}

/** Force de l'amortissement de la camera, par pas de 16,667 ms. Meme loi que le scrub des films. */
const K = 0.14;
/** Au-dela, l'ecart ne se voit plus : on se pose et la boucle s'arrete. */
const REPOS = 0.002;

/**
 * LA CAMERA SE PLACE D'APRES LA FORME DE L'ECRAN, ET S'Y REND EN GLISSANT.
 *
 * Voir cadrage.ts pour le raisonnement complet : l'ouverture d'un objectif se mesure
 * verticalement, donc un ecran etroit voit MOINS LARGE a distance egale — et sur un telephone,
 * la moitie des anneaux tombait hors du cadre.
 *
 * Deux details qui ont chacun coute un defaut en revue :
 *
 * 1. La distance et la hauteur viennent d'un SEUL appel, `cadrer()`. Calculees separement,
 *    elles s'ignoraient : la remontee mangeait la marge du haut sans que le recul en tienne
 *    compte, et sur une fenetre presque carree le sommet des anneaux ressortait du cadre.
 *
 * 2. On n'y saute pas, on y glisse. Le panneau de saisie change de hauteur quand il revele le
 *    nombre, quand on deplie le detail du calcul, et quand on change de langue : pose d'un
 *    coup, le cadrage se deplacait alors de 70 px en une image, exactement sur le temps fort
 *    du chapitre. L'amortissement s'efface quand le visiteur demande un mouvement reduit.
 *
 * Le brouillard suit la camera. Il etait regle sur [12, 34] pour une camera a 9,4, c'est-a-dire
 * « il commence 2,6 unites derriere la scene et l'eteint 24,6 unites plus loin ». Fige, un
 * recul a 18 unites aurait noye l'arbre dans la nuit avant meme qu'on le voie.
 */
function CameraCadree({ chapitre, hautPanneau, largeurPanneau, montee, mouvementReduit }: {
  chapitre: 3 | 4;
  hautPanneau: number | null;
  largeurPanneau: number;
  montee: number;
  mouvementReduit: boolean;
}) {
  const camera = useThree(etat => etat.camera);
  const scene = useThree(etat => etat.scene);
  const taille = useThree(etat => etat.size);

  const vise = useMemo(() => cadrer({
    etendue: ETENDUE[chapitre],
    largeurScene: taille.width,
    hauteurScene: taille.height,
    hautPanneau,
    largeurPanneau,
    montee,
  }), [chapitre, taille.width, taille.height, hautPanneau, largeurPanneau, montee]);

  // La position REELLE de la camera, qui rejoint la position visee image apres image.
  const ou = useRef<{ distance: number; hauteur: number } | null>(null);

  const poser = (distance: number, hauteur: number) => {
    camera.position.set(0, hauteur, distance);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = OUVERTURE;
      camera.near = 0.1;
      // Le plan lointain suit le recul : fige a 120, un recul a 18 l'aurait rapproche d'autant.
      camera.far = distance + 110;
    }
    camera.updateProjectionMatrix();

    const brouillard = scene.fog;
    if (brouillard instanceof THREE.Fog) {
      brouillard.near = distance + 2.6;
      brouillard.far = distance + 24.6;
    }
  };

  // La toute premiere pose est seche, et celles qui suivent le sont aussi en mouvement reduit :
  // une camera qui glisse toute seule est exactement ce que ce reglage demande d'eviter.
  useLayoutEffect(() => {
    if (ou.current === null || mouvementReduit) {
      ou.current = { ...vise };
      poser(vise.distance, vise.hauteur);
    }
    // poser depend de camera et scene, qui ne changent pas de leur vie dans ce Canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vise, mouvementReduit, camera, scene]);

  useFrame((_etat, delta) => {
    const actuel = ou.current;
    if (!actuel || mouvementReduit) return;

    const dd = vise.distance - actuel.distance;
    const dh = vise.hauteur - actuel.hauteur;
    if (Math.abs(dd) < REPOS && Math.abs(dh) < REPOS) {
      if (dd !== 0 || dh !== 0) { ou.current = { ...vise }; poser(vise.distance, vise.hauteur); }
      return;
    }

    // Amortissement normalise par le temps ecoule : la meme course a 30 et a 120 images.
    const pas = 1 - Math.pow(1 - K, Math.min(delta, 0.1) * 60);
    actuel.distance += dd * pas;
    actuel.hauteur += dh * pas;
    poser(actuel.distance, actuel.hauteur);
  });

  return null;
}

export default function SceneTempsReel({
  chapitre, progression, nombre, mouvementReduit, dpr,
  hautPanneau = null, largeurPanneau = 0, monteePanneau = 0,
}: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, DISTANCE_MIN], fov: OUVERTURE, near: 0.1, far: 120 }}
      dpr={dpr}
      gl={{ antialias: dpr <= 1, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#070a16']} />
      {/* Un peu de profondeur : les objets lointains se fondent dans la nuit plutot que de
          se decouper net sur le fond. Les bornes sont reglees par CameraCadree, qui les
          recale sur la distance reelle de la camera. */}
      <fog attach="fog" args={['#070a16', DISTANCE_MIN + 2.6, DISTANCE_MIN + 24.6]} />

      <CameraCadree
        chapitre={chapitre}
        hautPanneau={chapitre === 3 ? hautPanneau : null}
        largeurPanneau={largeurPanneau}
        montee={chapitre === 3 ? monteePanneau : 0}
        mouvementReduit={mouvementReduit}
      />

      <ambientLight intensity={0.22} color="#9fb6e8" />

      {chapitre === 3 ? (
        <AnneauxCelestes progression={progression} nombre={nombre} mouvementReduit={mouvementReduit} />
      ) : (
        <ArbreDeVie progression={progression} mouvementReduit={mouvementReduit} />
      )}
    </Canvas>
  );
}
