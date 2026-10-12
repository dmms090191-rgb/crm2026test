import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { construireArbre } from './arbre';

/**
 * L'ARBRE QUI POUSSE.
 *
 * La geometrie est construite UNE fois, entiere, et ne change plus jamais. Ce qui change, c'est
 * seulement l'echelle de chaque segment : zero tant que son heure n'est pas venue, puis sa
 * taille reelle. L'arbre ne pousse donc pas, il se REVELE — et la difference compte, parce
 * qu'elle rend la croissance parfaitement reversible quand on remonte la page, sans qu'aucun
 * etat n'ait a etre defait.
 *
 * Un maillage instancie porte les quelque deux cent cinquante branches en UN seul appel de
 * dessin. Les recalculer toutes a chaque image coute moins cher que le moindre shader sur
 * mesure, et reste lisible : une matrice par branche, rien de plus.
 *
 * Les feuilles sont des points, agites par un vent qui n'est qu'un sinus decale par feuille.
 * Un vrai calcul de vent ne se verrait pas a cette echelle.
 */

interface Props {
  /** Progression du chapitre, de 0 a 1. */
  progression: number;
  mouvementReduit: boolean;
}

const ECORCE = '#6b5a44';
const FEUILLE_CLAIRE = '#9fb37a';

export default function ArbreDeVie({ progression, mouvementReduit }: Props) {
  const branches = useRef<THREE.InstancedMesh>(null);
  const feuilles = useRef<THREE.Points>(null);
  const temps = useRef(0);

  // Taille calee sur le cadre : a z 9,4 et 42 degres, le champ vertical fait environ 7,2
  // unites. Un tronc de 3,1 plus ses branches sortait de l image par le haut.
  const arbre = useMemo(() => construireArbre({ profondeur: 6, tronc: 1.9 }), []);

  // Les donnees fixes de chaque branche : position, orientation, longueur, epaisseur, heure.
  const plan = useMemo(() => {
    const haut = new THREE.Vector3(0, 1, 0);
    return arbre.segments.map(s => {
      const a = new THREE.Vector3(s.x1, s.y1, s.z1);
      const b = new THREE.Vector3(s.x2, s.y2, s.z2);
      const milieu = a.clone().add(b).multiplyScalar(0.5);
      const direction = b.clone().sub(a);
      const longueur = direction.length() || 0.001;
      const quaternion = new THREE.Quaternion().setFromUnitVectors(haut, direction.clone().normalize());
      return { milieu, quaternion, longueur, rayon: 0.055 * s.epaisseur + 0.008, naissance: s.naissance };
    });
  }, [arbre]);

  const geometrieFeuilles = useMemo(() => {
    const n = arbre.feuilles.length;
    const positions = new Float32Array(n * 3);
    const donnees = new Float32Array(n * 2); // naissance, phase
    arbre.feuilles.forEach((f, i) => {
      positions[i * 3] = f.x;
      positions[i * 3 + 1] = f.y;
      positions[i * 3 + 2] = f.z;
      donnees[i * 2] = f.naissance;
      donnees[i * 2 + 1] = f.phase;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('donnees', new THREE.BufferAttribute(donnees, 2));
    return g;
  }, [arbre]);

  useEffect(() => () => { geometrieFeuilles.dispose(); }, [geometrieFeuilles]);

  const uniforms = useMemo(
    () => ({ uProgression: { value: 0 }, uTemps: { value: 0 }, uVent: { value: 1 } }),
    [],
  );

  const objet = useMemo(() => new THREE.Object3D(), []);

  useFrame((_etat, delta) => {
    if (!mouvementReduit) temps.current += Math.min(delta, 0.05);
    uniforms.uTemps.value = temps.current;
    uniforms.uProgression.value = progression;
    uniforms.uVent.value = mouvementReduit ? 0 : 1;

    const maillage = branches.current;
    if (!maillage) return;
    for (let i = 0; i < plan.length; i++) {
      const p = plan[i];
      // Chaque branche sort d'elle-meme sur une courte fenetre, pour que la pousse soit
      // continue au lieu d'apparaitre d'un coup.
      const t = Math.min(1, Math.max(0, (progression - p.naissance) / 0.08));
      objet.position.copy(p.milieu);
      objet.quaternion.copy(p.quaternion);
      objet.scale.set(p.rayon * t, p.longueur * t, p.rayon * t);
      objet.updateMatrix();
      maillage.setMatrixAt(i, objet.matrix);
    }
    maillage.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[0, -2.5, 0]} scale={0.92}>
      <instancedMesh ref={branches} args={[undefined, undefined, plan.length]} castShadow frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 7, 1]} />
        <meshStandardMaterial color={ECORCE} roughness={0.92} metalness={0} />
      </instancedMesh>

      <points ref={feuilles} geometry={geometrieFeuilles} frustumCulled={false}>
        <shaderMaterial
          uniforms={uniforms}
          transparent
          depthWrite={false}
          toneMapped={false}
          vertexShader={/* glsl */ `
            attribute vec2 donnees;
            uniform float uProgression;
            uniform float uTemps;
            uniform float uVent;
            varying float vVie;
            varying float vPhase;

            void main() {
              float naissance = donnees.x;
              float phase = donnees.y;
              vPhase = phase;
              // La feuille s ouvre sur une courte fenetre apres sa branche.
              vVie = clamp((uProgression - naissance) / 0.07, 0.0, 1.0);

              vec3 p = position;
              // Vent : un balancement propre a chaque feuille, d amplitude croissante vers le haut.
              float amplitude = uVent * 0.06 * (0.4 + p.y * 0.12);
              p.x += sin(uTemps * 1.1 + phase) * amplitude;
              p.z += cos(uTemps * 0.85 + phase * 1.3) * amplitude;

              vec4 vue = modelViewMatrix * vec4(p, 1.0);
              gl_Position = projectionMatrix * vue;
              // 110 et un plafond de 7 px donnaient des grains de poussiere : a cette distance
              // de camera, une feuille rendait 7 px sur un canvas de 800, soit rien.
              gl_PointSize = clamp(vVie * 150.0 / -vue.z, 0.0, 9.0);
            }
          `}
          fragmentShader={/* glsl */ `
            varying float vVie;
            varying float vPhase;
            void main() {
              if (vVie <= 0.001) discard;
              vec2 d = gl_PointCoord - vec2(0.5);
              // Un bord plus doux : les feuilles se fondent entre elles en une masse plutot
              // que de se compter une a une comme des baies.
              float masque = smoothstep(0.5, 0.05, length(d));
              // L'olivier n'est pas vert franc : son feuillage tire sur l'argent, et chaque
              // feuille montre tantot sa face claire tantot sa face sombre. La phase sert donc
              // aussi a varier la teinte, sinon la couronne est une tache unie.
              float face = 0.5 + 0.5 * sin(vPhase * 3.1);
              // Teintes TENUES : des verts clairs donnaient une couronne de fleurs blanches,
              // pas un olivier. Le feuillage d un olivier est sombre, poudre d argent sur la
              // face qui prend la lumiere, jamais lumineux.
              vec3 sombre = vec3(0.21, 0.28, 0.20);
              vec3 claire = vec3(0.47, 0.54, 0.41);
              vec3 vert = mix(sombre, claire, mix(0.15, 0.85, face) * vVie);
              // Peu opaques, mais nombreuses : elles s additionnent en une masse continue au lieu
              // de se decouper chacune sur le ciel.
              gl_FragColor = vec4(vert, masque * vVie * 0.55);
            }
          `}
        />
      </points>

      {/* Un arbre de nuit reste un arbre : il lui faut assez de lumiere pour qu on lise son
          ecorce, sinon la pousse ne se voit pas. */}
      <hemisphereLight args={['#cfe0ff', '#4a3b26', 1.15]} />
      <directionalLight position={[6, 9, 5]} intensity={3.1} color="#ffd9a0" castShadow />
      <directionalLight position={[-5, 4, 7]} intensity={1.3} color="#bcd0f5" />
      {/* Une lueur basse, pour que les racines ne tombent pas dans le noir. */}
      <pointLight position={[0, 0.6, 2.6]} intensity={5} distance={11} color={FEUILLE_CLAIRE} />
    </group>
  );
}
