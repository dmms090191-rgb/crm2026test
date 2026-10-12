import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  nombre: number;
  /** Les particules montent-elles, ou restent-elles immobiles ? */
  anime: boolean;
}

/**
 * PARTICULES DOREES — la poussiere de lumiere qui flotte autour du sanctuaire.
 *
 * Dessinees en un seul appel (un `Points`), avec une forme calculee dans le shader plutot
 * qu'une texture : pas un octet a telecharger, et un bord net a n'importe quelle taille.
 *
 * Chaque particule porte sa phase et sa vitesse propres, posees une fois a la creation. Le
 * shader n'a donc qu'a faire avancer un temps commun : aucune boucle JavaScript par image,
 * meme a neuf cents particules.
 *
 * Elles montent lentement et reviennent en bas quand elles sortent du volume. Le modulo se
 * fait dans le shader, ce qui evite toute derive numerique sur une page laissee ouverte
 * longtemps.
 */
export default function ParticulesDorees({ nombre, anime }: Props) {
  const materiau = useRef<THREE.ShaderMaterial>(null);

  const geometrie = useMemo(() => {
    const positions = new Float32Array(nombre * 3);
    const graines = new Float32Array(nombre * 3); // phase, vitesse, taille

    for (let i = 0; i < nombre; i++) {
      // Reparties dans un disque plutot qu'un cube : le volume suit le sanctuaire, et les
      // coins vides d'un cube se voient quand la camera tourne.
      const rayon = 6 + Math.sqrt(Math.random()) * 46;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * rayon;
      positions[i * 3 + 1] = Math.random() * 34 - 6;
      positions[i * 3 + 2] = Math.sin(angle) * rayon;

      graines[i * 3] = Math.random() * Math.PI * 2;
      graines[i * 3 + 1] = 0.25 + Math.random() * 0.75;
      graines[i * 3 + 2] = 0.55 + Math.random() * 1.45;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('graine', new THREE.BufferAttribute(graines, 3));
    return g;
  }, [nombre]);

  const uniforms = useMemo(() => ({ uTemps: { value: 0 }, uTaille: { value: 1 } }), []);

  useFrame((_etat, delta) => {
    if (anime && materiau.current) materiau.current.uniforms.uTemps.value += delta;
  });

  return (
    <points geometry={geometrie} frustumCulled={false}>
      <shaderMaterial
        ref={materiau}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        vertexShader={/* glsl */ `
          attribute vec3 graine;
          uniform float uTemps;
          varying float vEclat;

          void main() {
            vec3 p = position;
            // Montee lente, rebouclee sur 40 unites de hauteur.
            p.y = mod(p.y + 6.0 + uTemps * graine.y * 0.9, 40.0) - 6.0;
            // Oscillation laterale : evite la colonne verticale rigide.
            p.x += sin(uTemps * 0.35 + graine.x) * 0.8;
            p.z += cos(uTemps * 0.28 + graine.x * 1.3) * 0.8;

            vec4 vue = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * vue;
            // Taille attenuee par la distance, bornee pour ne pas exploser de pres.
            gl_PointSize = clamp(graine.z * 140.0 / -vue.z, 1.0, 9.0);

            float pulsation = 0.55 + 0.45 * sin(uTemps * 1.6 + graine.x * 3.0);
            // Les plus hautes s'effacent : la poussiere se perd dans le ciel.
            float fondu = 1.0 - smoothstep(16.0, 33.0, p.y);
            vEclat = pulsation * fondu;
          }
        `}
        fragmentShader={/* glsl */ `
          varying float vEclat;
          void main() {
            // Disque a bord doux, calcule plutot que texture.
            float d = length(gl_PointCoord - vec2(0.5));
            float masque = smoothstep(0.5, 0.06, d);
            vec3 or = mix(vec3(1.0, 0.82, 0.48), vec3(1.0, 0.96, 0.86), vEclat);
            gl_FragColor = vec4(or, masque * vEclat * 0.85);
          }
        `}
      />
    </points>
  );
}
