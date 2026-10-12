import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * LE SANCTUAIRE — architecture circulaire de pierre claire, posee sur la mer de nuages.
 *
 * Neuf colonnes, parce que la numerologie travaille sur neuf nombres : la forme PORTE le sujet
 * au lieu de le decorer. Chaque colonne marque une position, et c'est a ces positions que les
 * chiffres viendront se poser a l'etape suivante.
 *
 * Pas d'environnement HDR : il faudrait le telecharger, et une pierre mate n'en a pas besoin.
 * La pierre est rendue par un materiau rugueux eclaire en direct ; les elements dores sont
 * EMISSIFS plutot que metalliques, parce qu'un metal sans carte d'environnement est noir. Cela
 * tombe bien : dans cette scene, l'or doit paraitre lumineux, pas reflechissant.
 *
 * L'anneau tourne tres lentement — un tour en environ dix minutes. Assez pour que la scene ne
 * soit jamais figee, trop lent pour qu'on y pense.
 */

const NOMBRES = 9;
const RAYON = 7.2;

interface Props {
  /** La rotation lente est-elle active ? */
  anime: boolean;
}

export default function SanctuaireCirculaire({ anime }: Props) {
  const anneau = useRef<THREE.Group>(null);

  const positions = useMemo(
    () =>
      Array.from({ length: NOMBRES }, (_, i) => {
        const angle = (i / NOMBRES) * Math.PI * 2 - Math.PI / 2;
        return { angle, x: Math.cos(angle) * RAYON, z: Math.sin(angle) * RAYON, index: i };
      }),
    [],
  );

  useFrame((_etat, delta) => {
    if (anime && anneau.current) anneau.current.rotation.y += delta * 0.0105;
  });

  return (
    <group position={[0, -1.4, 0]}>
      {/* Socle : large, bas, legerement conique — il doit sembler reposer sur les nuages. */}
      <mesh position={[0, -0.55, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[RAYON + 2.3, RAYON + 3.1, 1.1, 72]} />
        <meshStandardMaterial color="#d9d2c4" roughness={0.88} metalness={0} />
      </mesh>

      {/* Dalle superieure, plus claire : c'est elle qui attrape la lumiere rasante. */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[RAYON + 1.6, RAYON + 1.9, 0.22, 72]} />
        <meshStandardMaterial color="#efe9dc" roughness={0.72} metalness={0} />
      </mesh>

      {/* Cercle grave dans la dalle : un repere, pas un ornement. */}
      <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[RAYON - 1.5, RAYON - 1.34, 96]} />
        <meshStandardMaterial
          color="#c8a35a" roughness={0.5} metalness={0}
          emissive="#8a6a2a" emissiveIntensity={0.55} side={THREE.DoubleSide}
        />
      </mesh>

      <group ref={anneau}>
        {positions.map(p => (
          <group key={p.index} position={[p.x, 0, p.z]} rotation={[0, -p.angle, 0]}>
            {/* Base */}
            <mesh position={[0, 0.3, 0]} castShadow>
              <cylinderGeometry args={[0.52, 0.6, 0.3, 24]} />
              <meshStandardMaterial color="#e2dbcc" roughness={0.85} metalness={0} />
            </mesh>
            {/* Fut cannele : le leger retrecissement vers le haut est ce qui fait l'antique. */}
            <mesh position={[0, 1.95, 0]} castShadow>
              <cylinderGeometry args={[0.34, 0.42, 3.0, 20, 1]} />
              <meshStandardMaterial color="#eae3d4" roughness={0.78} metalness={0} />
            </mesh>
            {/* Chapiteau */}
            <mesh position={[0, 3.56, 0]} castShadow>
              <cylinderGeometry args={[0.58, 0.4, 0.26, 24]} />
              <meshStandardMaterial color="#f2ece0" roughness={0.68} metalness={0} />
            </mesh>
            {/* Marqueur dore : la place reservee au chiffre. */}
            <mesh position={[0, 4.02, 0]}>
              <sphereGeometry args={[0.14, 20, 20]} />
              <meshStandardMaterial
                color="#ffd98a" roughness={0.35} metalness={0}
                emissive="#ffb347" emissiveIntensity={2.4} toneMapped={false}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Lueur basse posee au centre : ancre la structure dans la lumiere, sans eclairer. */}
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[RAYON - 1.9, 64]} />
        <meshBasicMaterial color="#1a2744" transparent opacity={0.55} toneMapped={false} />
      </mesh>
    </group>
  );
}
