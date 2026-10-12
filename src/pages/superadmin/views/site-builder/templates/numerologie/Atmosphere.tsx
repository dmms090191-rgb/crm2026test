import { useState, type ReactElement } from 'react';
import * as THREE from 'three';
import { EffectComposer, Bloom, GodRays, Vignette, DepthOfField } from '@react-three/postprocessing';
import { SOLEIL_DIR, SOLEIL_DISTANCE } from './soleil';
import type { Reglages } from './qualite';

interface Props {
  reglages: Reglages;
}

/**
 * LUMIERE ET ATMOSPHERE.
 *
 * Quatre lumieres, chacune avec un role nommable :
 *   - la directionnelle DOREE vient exactement de la direction du soleil du fond. C'est elle
 *     qui pose les ombres des colonnes ; si sa direction divergeait de celle du shader, les
 *     ombres tomberaient du mauvais cote et l'oeil le verrait aussitot.
 *   - l'APPOINT froid, cote spectateur, revele la pierre. Le soleil etant derriere le
 *     sanctuaire, sans lui les colonnes ne recoivent que du contre-jour et lisent gris
 *     ardoise au lieu de pierre claire. Il ne projette pas d'ombre : il montre la matiere,
 *     il ne redessine pas l'eclairage.
 *   - l'hemispherique porte le ciel bleu dans les hautes lumieres et le reflet chaud des
 *     nuages dans les basses.
 *   - l'ambiante, tres faible, empeche seulement le noir pur dans les creux.
 *
 * Le disque solaire est un vrai objet de la scene, et non un effet : les rayons ont besoin
 * d'une source a occulter pour savoir ou projeter leurs faisceaux.
 *
 * LE SOLEIL EST TENU PAR UN ETAT, PAS PAR UNE REF. Avec une ref, `soleil.current` vaut null au
 * premier rendu et rien ne redeclenche le rendu quand le maillage arrive : l'effet de rayons ne
 * serait jamais monte. Un etat provoque le second rendu qui les monte.
 */
export default function Atmosphere({ reglages }: Props) {
  const [soleil, setSoleil] = useState<THREE.Mesh | null>(null);
  const position = SOLEIL_DIR.clone().multiplyScalar(SOLEIL_DISTANCE);
  const hauteQualite = reglages.niveau === 'haut';

  const lumieres = (
    <>
      <hemisphereLight args={['#9fc0ff', '#3a2f22', 0.85]} />
      <ambientLight intensity={0.16} color="#8ea8d8" />
      <directionalLight position={[7, 11, 30]} intensity={1.05} color="#c3d6f5" />
      <directionalLight
        position={position}
        intensity={2.6}
        color="#ffd79a"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={SOLEIL_DISTANCE - 60}
        shadow-camera-far={SOLEIL_DISTANCE + 60}
        shadow-bias={-0.0008}
      />
    </>
  );

  const disqueSolaire = (
    <mesh ref={setSoleil} position={position} frustumCulled={false}>
      <sphereGeometry args={[26, 24, 24]} />
      <meshBasicMaterial color="#fff3d6" toneMapped={false} />
    </mesh>
  );

  /*
   * EN QUALITE BASSE, AUCUN POST-TRAITEMENT — choix de performance, pas correctif de bug.
   *
   * Sur un telephone, le post-traitement est ce qu'il faut sacrifier en premier : il fait
   * passer toute l'image par des cibles de rendu supplementaires, a chaque trame, pour un
   * gain que personne ne remarque sur un ecran de cinq pouces. La scene y gagne en fluidite
   * et en autonomie, et c'est l'autonomie qui decide si un visiteur reste.
   *
   * Ce qu'on perd : la lueur sur les marqueurs dores et le vignettage. Les marqueurs restent
   * lumineux par leur materiau emissif, qui ne depend d'aucun effet.
   */
  if (reglages.niveau === 'bas') {
    return (
      <>
        {lumieres}
        {disqueSolaire}
      </>
    );
  }

  /*
   * Les effets sont assembles dans un TABLEAU, et non ecrits comme des enfants conditionnels :
   * `EffectComposer` type ses enfants strictement et refuse `null`, donc un
   * `{condition ? x : null}` ne compile pas. Un tableau passe, et chaque effet y porte sa cle.
   */
  const effets: ReactElement[] = [];

  if (reglages.rayons && soleil) {
    effets.push(
      <GodRays
        key="rayons"
        sun={soleil}
        density={0.93}
        decay={0.93}
        weight={0.42}
        exposure={0.42}
        samples={hauteQualite ? 60 : 36}
        clampMax={1}
      />,
    );
  }

  effets.push(
    <Bloom key="lueur" intensity={0.78} luminanceThreshold={0.62} luminanceSmoothing={0.26} mipmapBlur />,
  );

  if (reglages.profondeurChamp) {
    effets.push(
      <DepthOfField key="profondeur" focusDistance={0.012} focalLength={0.055} bokehScale={2.6} />,
    );
  }

  effets.push(<Vignette key="vignette" offset={0.26} darkness={0.62} eskil={false} />);

  return (
    <>
      {lumieres}
      {disqueSolaire}
      <EffectComposer multisampling={hauteQualite ? 2 : 0}>{effets}</EffectComposer>
    </>
  );
}
