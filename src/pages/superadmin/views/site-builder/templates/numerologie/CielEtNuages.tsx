import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { VERTEX_FOND, FRAGMENT_FOND } from './cielNuagesShader';
import { SOLEIL_DIR } from './soleil';
import type { Reglages } from './qualite';

interface Props {
  reglages: Reglages;
}

/**
 * La signature d'index est exigee par `ShaderMaterial`, qui attend un dictionnaire
 * d'uniformes. Les membres nommes restent declares : c'est eux qui donnent l'autocompletion
 * et attrapent une faute de frappe sur un nom d'uniforme, faute qui sinon ne se verrait
 * qu'a l'ecran, sous la forme d'un effet silencieusement absent.
 */
interface Uniformes {
  [cle: string]: THREE.IUniform;
  uTemps: THREE.IUniform<number>;
  uAspect: THREE.IUniform<number>;
  uTanDemiFov: THREE.IUniform<number>;
  uCamMonde: THREE.IUniform<THREE.Matrix4>;
  uSoleilDir: THREE.IUniform<THREE.Vector3>;
  uPas: THREE.IUniform<number>;
  uPasLumiere: THREE.IUniform<number>;
  uCouverture: THREE.IUniform<number>;
  uEtoiles: THREE.IUniform<number>;
}

/**
 * LE FOND : ciel profond et mer de nuages volumetriques.
 *
 * Rendu sur un quad plein ecran, hors projection, avec `depthTest` et `depthWrite` desactives
 * et un `renderOrder` negatif : il se dessine en premier et n'empeche jamais la geometrie de la
 * scene de s'afficher par-dessus. `frustumCulled` est coupe parce que ce quad n'a pas de place
 * dans le monde — il EST l'ecran.
 *
 * Les uniformes sont crees UNE fois, dans une ref, et ensuite mis a jour en place. C'est
 * volontaire : reconstruire l'objet d'uniformes fait recompiler le programme GLSL, ce qui
 * provoquerait un gel d'une demi-seconde a chaque redimensionnement de la fenetre.
 *
 * Les uniformes de camera sont rafraichis a chaque image : c'est ce qui fait que le fond suit
 * exactement le regard, y compris pendant un mouvement de camera.
 */
export default function CielEtNuages({ reglages }: Props) {
  const materiau = useRef<THREE.ShaderMaterial>(null);
  const { size, camera } = useThree();

  const uniformes = useRef<Uniformes | null>(null);
  if (!uniformes.current) {
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 50;
    uniformes.current = {
      uTemps: { value: 0 },
      uAspect: { value: size.width / Math.max(1, size.height) },
      uTanDemiFov: { value: Math.tan((fov * Math.PI) / 360) },
      uCamMonde: { value: camera.matrixWorld.clone() },
      uSoleilDir: { value: SOLEIL_DIR.clone() },
      uPas: { value: reglages.pas },
      uPasLumiere: { value: reglages.pasLumiere },
      uCouverture: { value: 0.52 },
      uEtoiles: { value: reglages.etoiles },
    };
  }

  useFrame((etat, delta) => {
    const u = uniformes.current;
    if (!u) return;
    // Le temps n'avance pas si le mouvement est reduit : les nuages se figent, l'image reste.
    if (reglages.deriveCamera) u.uTemps.value += delta;
    u.uAspect.value = size.width / Math.max(1, size.height);
    const persp = etat.camera as THREE.PerspectiveCamera;
    u.uTanDemiFov.value = Math.tan(((persp.fov ?? 50) * Math.PI) / 360);
    u.uCamMonde.value.copy(etat.camera.matrixWorld);
    u.uPas.value = reglages.pas;
    u.uPasLumiere.value = reglages.pasLumiere;
    u.uEtoiles.value = reglages.etoiles;
  });

  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materiau}
        vertexShader={VERTEX_FOND}
        fragmentShader={FRAGMENT_FOND}
        uniforms={uniformes.current}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
