import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NEUF, peindreChiffre, peindreGraduations } from './anneauxTexture';

/**
 * LE MECANISME CELESTE — trois anneaux d'or qui tournent independamment.
 *
 * C'est le seul moment du site ou le visiteur agit sur la matiere : il attrape les anneaux et
 * les fait tourner. Tout le reste du voyage est conduit par le defilement ; ici, un instant,
 * c'est lui qui conduit. Un site n'a besoin que d'un seul moment pareil, et c'est celui-la.
 *
 * ---------- DEUX CHOIX DE RENDU QUI ONT UNE RAISON ----------
 *
 * L'or est EMISSIF, pas metallique. Un metal sans carte d'environnement rend noir : il ne fait
 * que refleter un monde qui n'existe pas. On pourrait charger une carte HDR, mais elle pese et
 * elle se telecharge. Un or qui emet sa propre lumiere tient le role, et il colle au sujet :
 * dans cette scene, l'or doit paraitre lumineux, pas poli.
 *
 * Les chiffres sont peints sur une texture, pas extrudes en geometrie. La raison est dans
 * anneauxTexture.ts : aucune police a telecharger, donc aucune scene sans ses chiffres.
 *
 * La rotation combine DEUX sources : la progression du defilement, qui donne le mouvement de
 * fond, et le geste du visiteur, qui s'y ajoute et s'amortit. Elles ne se disputent jamais la
 * main, elles s'additionnent.
 */

interface Props {
  /** Progression du chapitre, de 0 a 1. */
  progression: number;
  /** Nombre a mettre en avant une fois le calcul fait, ou null. */
  nombre: number | null;
  mouvementReduit: boolean;
}

const OR_CLAIR = '#f0dfae';
const OR_PROFOND = '#b8893c';

export default function AnneauxCelestes({ progression, nombre, mouvementReduit }: Props) {
  const groupe = useRef<THREE.Group>(null);
  const a1 = useRef<THREE.Group>(null);
  const a2 = useRef<THREE.Group>(null);
  const a3 = useRef<THREE.Group>(null);
  const gChiffres = useRef<THREE.Group>(null);

  // Geste du visiteur : vitesse ajoutee, qui retombe toute seule.
  const elan = useRef(0);
  const dernierX = useRef<number | null>(null);
  const { gl } = useThree();

  const textures = useMemo(() => {
    const chiffres = NEUF.map(s => new THREE.CanvasTexture(peindreChiffre(s)));
    const fines = new THREE.CanvasTexture(peindreGraduations(72));
    const larges = new THREE.CanvasTexture(peindreGraduations(36));
    for (const t of [...chiffres, fines, larges]) {
      t.anisotropy = 4;
      t.needsUpdate = true;
    }
    return { chiffres, fines, larges };
  }, []);

  // Liberation : une texture de canvas garde sa memoire GPU tant qu'on ne la rend pas.
  useEffect(() => () => {
    for (const t of textures.chiffres) t.dispose();
    textures.fines.dispose();
    textures.larges.dispose();
  }, [textures]);

  // Le geste. On ecoute sur la toile entiere : attraper un anneau fin au pixel pres serait
  // injouable au doigt.
  useEffect(() => {
    const toile = gl.domElement;
    const debut = (e: PointerEvent) => { dernierX.current = e.clientX; };
    const bouge = (e: PointerEvent) => {
      if (dernierX.current === null) return;
      const d = e.clientX - dernierX.current;
      dernierX.current = e.clientX;
      elan.current += d * 0.00035;
    };
    const fin = () => { dernierX.current = null; };
    toile.addEventListener('pointerdown', debut);
    toile.addEventListener('pointermove', bouge, { passive: true });
    window.addEventListener('pointerup', fin);
    window.addEventListener('pointercancel', fin);
    return () => {
      toile.removeEventListener('pointerdown', debut);
      toile.removeEventListener('pointermove', bouge);
      window.removeEventListener('pointerup', fin);
      window.removeEventListener('pointercancel', fin);
    };
  }, [gl]);

  useFrame((_etat, delta) => {
    const pas = Math.min(delta, 0.05);
    // L'elan retombe : sans cela le mecanisme tournerait pour toujours apres un geste.
    elan.current *= Math.pow(0.04, pas);

    const p = progression;
    const base = mouvementReduit ? 0 : p;
    if (a1.current) a1.current.rotation.z = base * 2.2 + elan.current * 3;
    /*
     * Les chiffres VOYAGENT avec l anneau mais restent DROITS. Sans cette contre-rotation,
     * ceux du bas se presentent la tete en bas : un cadran grave peut se le permettre, un
     * chiffre qu on doit lire, non.
     */
    if (gChiffres.current && a1.current) {
      const inverse = -a1.current.rotation.z;
      for (const c of gChiffres.current.children) c.rotation.z = inverse;
    }
    if (a2.current) a2.current.rotation.z = -base * 1.5 - elan.current * 2;
    if (a3.current) a3.current.rotation.z = base * 0.9 + elan.current;

    // Le mecanisme s'incline doucement vers le spectateur a mesure qu'on avance.
    if (groupe.current) {
      groupe.current.rotation.x = -0.42 + p * 0.3;
      groupe.current.position.y = -0.4 + p * 0.5;
    }
  });

  /**
   * Un anneau : un tore pour la matiere, un cylindre ouvert pour les symboles.
   *
   * ATTENTION A L ORIENTATION, c'est elle qui decide si l'objet lit comme un mecanisme ou
   * comme un gribouillis. Un tore est deja dans le plan XY, son trou regardant Z : il fait
   * donc face a la camera sans qu'on le tourne, et une rotation sur Z le fait tourner DANS son
   * plan, comme une roue. Lui appliquer d'abord un quart de tour sur X le couche a plat, et la
   * rotation sur Z le bascule alors en diagonale — trois anneaux ainsi traites se croisent en
   * ellipses et l'objet n'a plus aucun sens. Mesure a l'appui : c'est exactement ce que la
   * premiere version produisait.
   *
   * Le cylindre des chiffres, lui, a son axe sur Y par defaut : il faut ce quart de tour sur X
   * pour que sa surface coincide avec le tore.
   */
  const anneau = (rayon: number, epaisseur: number, texture: THREE.Texture, hauteur: number) => (
    <>
      <mesh>
        <torusGeometry args={[rayon, epaisseur, 18, 160]} />
        <meshStandardMaterial
          color={OR_PROFOND}
          roughness={0.38}
          metalness={0}
          emissive={OR_CLAIR}
          emissiveIntensity={0.55}
        />
      </mesh>
      {/* Les graduations, posees a plat dans le plan de l anneau, donc toujours visibles. */}
      <mesh rotation={[0, 0, 0]} position={[0, 0, 0.001]}>
        <ringGeometry args={[rayon - hauteur / 2, rayon + hauteur / 2, 96]} />
        <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} toneMapped={false} depthWrite={false} opacity={0.5} />
      </mesh>
    </>
  );

  /** Les neuf chiffres, poses sur le cercle, tournes vers l exterieur comme des gravures. */
  const chiffres = (rayon: number) =>
    NEUF.map((_, i) => {
      const angle = (i / NEUF.length) * Math.PI * 2 + Math.PI / 2;
      return (
        <mesh key={i} position={[Math.cos(angle) * rayon, Math.sin(angle) * rayon, 0.02]}>
          <planeGeometry args={[0.46, 0.46]} />
          <meshBasicMaterial map={textures.chiffres[i]} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      );
    });

  return (
    <group ref={groupe}>
      {/* Rayons ramenes dans le champ : a z 9,4 et 42 degres, le cadre ne porte qu un rayon
          d environ 3,6 — l anneau exterieur a 3,9 sortait de l image par le haut et le bas. */}
      <group ref={a1}>
        {anneau(1.65, 0.032, textures.fines, 0.2)}
        <group ref={gChiffres}>{chiffres(1.65)}</group>
      </group>
      <group ref={a2}>{anneau(2.35, 0.026, textures.fines, 0.26)}</group>
      <group ref={a3}>{anneau(3.05, 0.02, textures.larges, 0.2)}</group>

      {/* Le nombre obtenu, pose au centre : une sphere de lumiere, pas un chiffre de plus.
          Le chiffre lui-meme est ecrit en HTML par-dessus, ou il reste net et lisible. */}
      {nombre !== null && (
        <mesh>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial
            color={OR_CLAIR}
            emissive={OR_CLAIR}
            emissiveIntensity={2.6}
            roughness={0.2}
            metalness={0}
            toneMapped={false}
          />
        </mesh>
      )}

      <pointLight position={[0, 0, 2.4]} intensity={6} distance={14} color="#ffe2ad" />
    </group>
  );
}
