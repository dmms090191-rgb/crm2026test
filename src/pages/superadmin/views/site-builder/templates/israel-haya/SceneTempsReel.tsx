import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import AnneauxCelestes from './AnneauxCelestes';
import ArbreDeVie from './ArbreDeVie';

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
}

export default function SceneTempsReel({ chapitre, progression, nombre, mouvementReduit, dpr }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 9.4], fov: 42, near: 0.1, far: 120 }}
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
          se decouper net sur le fond. */}
      <fog attach="fog" args={['#070a16', 12, 34]} />

      <ambientLight intensity={0.22} color="#9fb6e8" />

      {chapitre === 3 ? (
        <AnneauxCelestes progression={progression} nombre={nombre} mouvementReduit={mouvementReduit} />
      ) : (
        <ArbreDeVie progression={progression} mouvementReduit={mouvementReduit} />
      )}
    </Canvas>
  );
}
