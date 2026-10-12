import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import CielEtNuages from './CielEtNuages';
import SanctuaireCirculaire from './SanctuaireCirculaire';
import ParticulesDorees from './ParticulesDorees';
import Atmosphere from './Atmosphere';
import NumerologieHero from './NumerologieHero';
import ReplisSansWebgl from './ReplisSansWebgl';
import { detecterAppareil, reglagesPour, webglDisponible } from './qualite';

/**
 * LA SCENE D'ACCUEIL du template de numerologie.
 *
 * Ce fichier n'est JAMAIS atteint par un import statique : le registre des templates passe par
 * un hote paresseux (NumerologieTemplate.tsx). C'est la condition pour que three.js reste hors
 * du paquet d'entree, servi a chaque visiteur de Talvex — la meme regle que la boutique 3D,
 * ecrite noir sur blanc dans BoutiqueVue3D.tsx.
 *
 * Le niveau de qualite est decide UNE fois, avant le premier rendu, et ne change plus : un
 * reglage qui s'ajuste en cours de route fait clignoter la scene a chaque hesitation.
 */

/**
 * Position de depart : EN SURPLOMB du sanctuaire.
 *
 * Au premier essai la camera etait basse (y 4,6) et proche (z 18,5) : les colonnes montaient
 * jusqu'au milieu de l'ecran et traversaient le titre, qui devenait illisible. En reculant et
 * en montant, le sanctuaire descend dans le tiers inferieur et libere le ciel pour le texte.
 * C'est la composition, pas le texte, qu'il fallait corriger.
 */
const CAMERA_DEPART: [number, number, number] = [0, 6.4, 30];

/**
 * Point regarde, AU-DESSUS du sanctuaire.
 *
 * Deuxieme correction : viser le sol (y 0,4) depuis une camera haute donnait une plongee de
 * maquette — le soleil sortait du cadre par le haut et le ciel s'eteignait avec lui. En visant
 * plus haut que le sanctuaire, l'axe de vue se redresse : le soleil et son halo reviennent dans
 * le tiers superieur, et la pierre descend naturellement dans le tiers inferieur.
 */
const REGARD: [number, number, number] = [0, 3.6, 0];

interface Props {
  onDecouvrir?: () => void;
}

/**
 * Derive de camera et parallaxe.
 *
 * La derive est une respiration : une lente figure de Lissajous, assez ample pour que la scene
 * ne soit jamais immobile, assez lente pour qu'on ne la remarque pas. La souris n'y ajoute
 * qu'un decalage amorti — jamais un controle direct, qui donnerait le mal de mer.
 *
 * Tout est amorti vers une cible plutot qu'applique directement : une image perdue ne provoque
 * donc aucun saut.
 */
function CameraVivante({ actif }: { actif: boolean }) {
  const { camera, size } = useThree();
  const souris = useRef({ x: 0, y: 0 });
  const cible = useRef(new THREE.Vector3(...CAMERA_DEPART));
  const regard = useRef(new THREE.Vector3(...REGARD));
  const temps = useRef(0);

  useEffect(() => {
    const surSouris = (e: PointerEvent) => {
      souris.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      souris.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', surSouris, { passive: true });
    return () => window.removeEventListener('pointermove', surSouris);
  }, []);

  useFrame((_etat, delta) => {
    const pas = Math.min(delta, 0.05);
    if (actif) temps.current += pas;
    const t = temps.current;

    // Cadrage un peu plus large sur un ecran etroit, sinon le sanctuaire sort du champ.
    const recul = size.width < 760 ? 7.5 : 0;

    cible.current.set(
      Math.sin(t * 0.11) * 1.5 + souris.current.x * 1.1,
      CAMERA_DEPART[1] + Math.sin(t * 0.085) * 0.55 - souris.current.y * 0.6,
      CAMERA_DEPART[2] + recul + Math.cos(t * 0.07) * 0.9,
    );

    camera.position.lerp(cible.current, 1 - Math.pow(0.001, pas));
    camera.lookAt(regard.current);
  });

  return null;
}

export default function NumerologieSite({ onDecouvrir }: Props) {
  // Mesure une seule fois : le niveau de qualite ne doit pas changer pendant la visite.
  const [appareil] = useState(detecterAppareil);
  const reglages = useMemo(() => reglagesPour(appareil), [appareil]);
  const [webgl] = useState(webglDisponible);

  if (!webgl) {
    return <ReplisSansWebgl onDecouvrir={onDecouvrir} />;
  }

  return (
    <div
      data-testid="numerologie-scene"
      style={{
        position: 'relative',
        width: '100%',
        height: '100svh',
        minHeight: 540,
        background: '#04081a',
        overflow: 'hidden',
      }}
    >
      <Canvas
        camera={{ position: CAMERA_DEPART, fov: 42, near: 0.1, far: 2000 }}
        dpr={reglages.dpr}
        shadows
        gl={{ antialias: reglages.niveau !== 'bas', powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.02;
        }}
      >
        <CameraVivante actif={reglages.deriveCamera} />
        <CielEtNuages reglages={reglages} />
        <SanctuaireCirculaire anime={reglages.deriveCamera} />
        <ParticulesDorees nombre={reglages.particules} anime={reglages.deriveCamera} />
        <Atmosphere reglages={reglages} />
      </Canvas>

      <NumerologieHero
        onDecouvrir={() => onDecouvrir?.()}
        mouvementReduit={appareil.mouvementReduit}
      />

      {/* Repere de qualite, lisible seulement par les outils : sert aux mesures de performance. */}
      <span data-numerologie-qualite={reglages.niveau} hidden />
    </div>
  );
}
