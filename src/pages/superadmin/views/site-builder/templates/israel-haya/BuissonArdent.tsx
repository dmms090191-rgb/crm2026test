import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ardeur, bornesBuisson, construireBuisson } from './buisson';

/**
 * LE BUISSON ARDENT.
 *
 * « Le buisson etait tout en feu, et le buisson ne se consumait point. » — Exode 3:2
 *
 * Tout le rendu decoule de cette phrase. Un feu qui CONSUME noircit son combustible : il le
 * remplace. Celui-ci ne remplace rien — il est pose en melange ADDITIF par-dessus un buisson
 * qui reste entier, bois clair et feuilles vertes. On voit donc la matiere A TRAVERS la flamme,
 * et c'est exactement la ou se joue la difference entre un buisson ardent et un feu de broussailles.
 *
 * ---------- TROIS COUCHES, DANS CET ORDRE ----------
 *
 * 1. LE BOIS. Un maillage instancie porte les trois cents segments en un seul appel de dessin.
 *    Comme pour l'olivier, la geometrie est construite une fois et ne change plus : ce qui change
 *    est l'echelle de chaque segment, zero avant son heure, taille reelle apres. La pousse est
 *    donc une LECTURE, et remonter la page la rejoue a l'envers, exactement.
 *
 * 2. LE FEUILLAGE. Cinq mille points, denses : un buisson qui doit rester lisible sous les
 *    flammes ne peut pas etre une ramure claire. Ils se rechauffent quand le feu prend — c'est
 *    la lumiere du brasier sur des feuilles vertes, pas un debut de calcination.
 *
 * 3. LE FEU. Mille six cents langues, chacune montant depuis SON foyer dans le feuillage, avec
 *    sa vitesse, sa portee et sa phase. Melange additif, profondeur non ecrite : elles
 *    s'additionnent entre elles et laissent voir ce qu'il y a derriere.
 *
 * ---------- CE QUI EST PILOTE PAR LE DEFILEMENT, ET CE QUI NE L'EST PAS ----------
 *
 * L'ETAT du chapitre est une fonction pure de la progression : quelles tiges sont nees, quelles
 * feuilles sont ouvertes, quelle est l'ardeur du feu. Remonter la page defait tout, sans qu'un
 * seul etat n'ait a etre annule.
 *
 * Le BATTEMENT, lui, suit le temps — une flamme figee n'est pas une flamme. C'est la meme regle
 * que pour le vent dans le feuillage de l'olivier : le temps anime, la progression decide.
 * En mouvement reduit, le temps s'arrete et le feu se pose, sans cesser d'eclairer.
 */

interface Props {
  /** Progression du chapitre, de 0 a 1. */
  progression: number;
  mouvementReduit: boolean;
}

/** Bois clair : il doit rester visible sous le feu, et ne jamais virer au charbon. */
const BOIS = '#8a7050';

export default function BuissonArdent({ progression, mouvementReduit }: Props) {
  const branches = useRef<THREE.InstancedMesh>(null);
  const lumiere = useRef<THREE.PointLight>(null);
  const halo = useRef<THREE.Sprite>(null);
  const temps = useRef(0);

  const buisson = useMemo(() => construireBuisson(), []);

  /*
   * LE BUISSON SE POSE SUR SON PROPRE CENTRE.
   *
   * Un objet decentre coute cher au cadrage : le cadre doit tenir son cote le plus large DES
   * DEUX cotes. L'olivier a paye cette lecon — 3,51 unites demandees pour 2,95 de largeur
   * reelle, soit 20 % de recul de camera pour cadrer du vide. On centre donc, en largeur comme
   * en hauteur, et le calcul se refait tout seul si la geometrie change.
   */
  const centre = useMemo(() => {
    const b = bornesBuisson(buisson);
    return {
      x: (b.minX + b.maxX) / 2,
      // On ne centre PAS sur la boite entiere en hauteur : les flammes montent loin au-dessus du
      // bois, et centrer dessus enterrerait le buisson. On vise le milieu de la partie ligneuse,
      // releve d'un cran pour laisser le feu respirer.
      y: (b.minY + b.maxY) / 2 - 0.55,
    };
  }, [buisson]);

  /* ---------- LE BOIS ---------- */

  const plan = useMemo(() => {
    const haut = new THREE.Vector3(0, 1, 0);
    return buisson.segments.map(s => {
      const a = new THREE.Vector3(s.x1, s.y1, s.z1);
      const b = new THREE.Vector3(s.x2, s.y2, s.z2);
      const milieu = a.clone().add(b).multiplyScalar(0.5);
      const direction = b.clone().sub(a);
      const longueur = direction.length() || 0.001;
      const quaternion = new THREE.Quaternion().setFromUnitVectors(haut, direction.clone().normalize());
      return { milieu, quaternion, longueur, rayon: 0.05 * s.epaisseur + 0.007, naissance: s.naissance };
    });
  }, [buisson]);

  /* ---------- LE FEUILLAGE ---------- */

  const geometrieFeuilles = useMemo(() => {
    const n = buisson.feuilles.length;
    const positions = new Float32Array(n * 3);
    const donnees = new Float32Array(n * 2);
    buisson.feuilles.forEach((f, i) => {
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
  }, [buisson]);

  /* ---------- LE FEU ---------- */

  const geometrieFlammes = useMemo(() => {
    const n = buisson.flammes.length;
    const positions = new Float32Array(n * 3);
    /*
     * Les cinq donnees d'une flamme tiennent dans un vec4 et un float, et NON dans un attribut
     * de taille 5 : GLSL n'a pas de vecteur a cinq composantes, et un attribut de cet itemSize
     * ne se lie a rien. Quatre ensemble, une a part.
     */
    const vie = new Float32Array(n * 4); // naissance, phase, vitesse, taille
    const portee = new Float32Array(n);
    buisson.flammes.forEach((f, i) => {
      positions[i * 3] = f.x;
      positions[i * 3 + 1] = f.y;
      positions[i * 3 + 2] = f.z;
      vie[i * 4] = f.naissance;
      vie[i * 4 + 1] = f.phase;
      vie[i * 4 + 2] = f.vitesse;
      vie[i * 4 + 3] = f.taille;
      portee[i] = f.portee;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('vie', new THREE.BufferAttribute(vie, 4));
    g.setAttribute('portee', new THREE.BufferAttribute(portee, 1));
    return g;
  }, [buisson]);

  useEffect(() => () => {
    geometrieFeuilles.dispose();
    geometrieFlammes.dispose();
  }, [geometrieFeuilles, geometrieFlammes]);

  const uFeuilles = useMemo(
    () => ({ uProgression: { value: 0 }, uTemps: { value: 0 }, uVent: { value: 1 }, uArdeur: { value: 0 } }),
    [],
  );
  const uFlammes = useMemo(
    () => ({ uProgression: { value: 0 }, uTemps: { value: 0 }, uArdeur: { value: 0 }, uFige: { value: 0 } }),
    [],
  );

  const objet = useMemo(() => new THREE.Object3D(), []);

  /** Le halo du brasier : un disque degrade, dessine une fois et garde. */
  const textureHalo = useMemo(() => {
    const T = 128;
    const toile = document.createElement('canvas');
    toile.width = T;
    toile.height = T;
    const ctx = toile.getContext('2d');
    if (ctx) {
      const d = ctx.createRadialGradient(T / 2, T / 2, 0, T / 2, T / 2, T / 2);
      d.addColorStop(0, 'rgba(255,196,110,0.85)');
      d.addColorStop(0.32, 'rgba(255,140,48,0.34)');
      d.addColorStop(0.68, 'rgba(188,70,16,0.10)');
      d.addColorStop(1, 'rgba(120,36,8,0)');
      ctx.fillStyle = d;
      ctx.fillRect(0, 0, T, T);
    }
    const tex = new THREE.CanvasTexture(toile);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useEffect(() => () => { textureHalo.dispose(); }, [textureHalo]);

  useFrame((_etat, delta) => {
    if (!mouvementReduit) temps.current += Math.min(delta, 0.05);
    const t = temps.current;
    const a = ardeur(progression);

    uFeuilles.uTemps.value = t;
    uFeuilles.uProgression.value = progression;
    uFeuilles.uVent.value = mouvementReduit ? 0 : 1;
    uFeuilles.uArdeur.value = a;

    uFlammes.uTemps.value = t;
    uFlammes.uProgression.value = progression;
    uFlammes.uArdeur.value = a;
    // Fige : les flammes restent, chacune arretee a un instant different de sa vie.
    uFlammes.uFige.value = mouvementReduit ? 1 : 0;

    /*
     * LE BATTEMENT DU BRASIER.
     *
     * Trois sinus de periodes incommensurables : leur somme ne se repete pas a l'oreille ni a
     * l'oeil. Un seul sinus donnerait une pulsation reguliere, qu'on identifie immediatement
     * comme une animation.
     */
    const battement = mouvementReduit
      ? 1
      : 1 + 0.16 * Math.sin(t * 7.3) + 0.1 * Math.sin(t * 11.9 + 1.7) + 0.06 * Math.sin(t * 19.1 + 0.4);

    if (lumiere.current) lumiere.current.intensity = a * 16 * battement;
    if (halo.current) {
      const e = a * (0.88 + 0.12 * battement);
      halo.current.scale.setScalar(3.4 + a * 3.6);
      (halo.current.material as THREE.SpriteMaterial).opacity = e * 0.62;
    }

    const maillage = branches.current;
    if (!maillage) return;
    for (let i = 0; i < plan.length; i++) {
      const p = plan[i];
      // Chaque segment sort de lui-meme sur une courte fenetre : la pousse est continue.
      const n = Math.min(1, Math.max(0, (progression - p.naissance) / 0.07));
      objet.position.copy(p.milieu);
      objet.quaternion.copy(p.quaternion);
      objet.scale.set(p.rayon * n, p.longueur * n, p.rayon * n);
      objet.updateMatrix();
      maillage.setMatrixAt(i, objet.matrix);
    }
    maillage.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[-centre.x, -centre.y, 0]}>
      {/* Le halo, DERRIERE tout : c'est la nuit qui s'eclaire, pas un voile sur le buisson. */}
      <sprite ref={halo} position={[0, 0.5, -1.6]}>
        <spriteMaterial
          map={textureHalo}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          opacity={0}
        />
      </sprite>

      <instancedMesh ref={branches} args={[undefined, undefined, plan.length]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 6, 1]} />
        <meshStandardMaterial color={BOIS} roughness={0.88} metalness={0} />
      </instancedMesh>

      <points geometry={geometrieFeuilles} frustumCulled={false}>
        <shaderMaterial
          uniforms={uFeuilles}
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
              vVie = clamp((uProgression - naissance) / 0.06, 0.0, 1.0);

              vec3 p = position;
              // Le souffle du brasier agite le feuillage plus qu'un vent : l'air chaud monte.
              float amplitude = uVent * 0.055 * (0.5 + p.y * 0.1);
              p.x += sin(uTemps * 1.6 + phase) * amplitude;
              p.y += abs(sin(uTemps * 2.1 + phase * 1.4)) * amplitude * 0.7;
              p.z += cos(uTemps * 1.3 + phase * 1.3) * amplitude;

              vec4 vue = modelViewMatrix * vec4(p, 1.0);
              gl_Position = projectionMatrix * vue;
              gl_PointSize = clamp(vVie * 190.0 / -vue.z, 0.0, 13.0);
            }
          `}
          fragmentShader={/* glsl */ `
            uniform float uArdeur;
            varying float vVie;
            varying float vPhase;
            void main() {
              if (vVie <= 0.001) discard;
              vec2 d = gl_PointCoord - vec2(0.5);
              float masque = smoothstep(0.5, 0.06, length(d));

              // Un feuillage de buisson du desert : vert sombre, poudre d'argent sur la face
              // qui prend la lumiere. La phase varie la teinte, sinon la masse est unie.
              float face = 0.5 + 0.5 * sin(vPhase * 3.1);
              vec3 sombre = vec3(0.17, 0.25, 0.17);
              vec3 claire = vec3(0.44, 0.52, 0.36);
              vec3 vert = mix(sombre, claire, mix(0.15, 0.85, face) * vVie);

              /*
               * LE FEU ECLAIRE LES FEUILLES, IL NE LES BRULE PAS.
               * On ajoute une chaleur, on ne remplace pas le vert : le buisson ne se consume
               * point, et une feuille qui virerait au brun raconterait le contraire.
               */
              vec3 chaleur = vec3(0.30, 0.13, 0.03) * uArdeur * (0.45 + 0.55 * face);
              gl_FragColor = vec4(vert + chaleur, masque * vVie * 0.72);
            }
          `}
        />
      </points>

      {/* LE FEU, dessine en dernier et en additif : il s'ajoute a ce qui est deja la. */}
      <points geometry={geometrieFlammes} frustumCulled={false}>
        <shaderMaterial
          uniforms={uFlammes}
          transparent
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          vertexShader={/* glsl */ `
            // naissance, phase, vitesse, taille — et la portee a part : GLSL n'a pas de vec5.
            attribute vec4 vie;
            attribute float portee;
            uniform float uProgression;
            uniform float uTemps;
            uniform float uFige;
            varying float vAge;
            varying float vTaille;
            varying float vNe;

            void main() {
              float naissance = vie.x;
              float phase = vie.y;
              float vitesse = vie.z;
              float taille = vie.w;

              // Le foyer n'existe pas encore : la flamme ne part pas.
              float ne = step(naissance, uProgression);
              vNe = ne;

              /*
               * L'AGE de la flamme, de 0 a 1, qui boucle. Fige, chaque flamme s'arrete a un
               * instant different de sa vie — d'ou un brasier immobile mais pas un pochoir.
               */
              float t = mix(uTemps * vitesse * 0.55 + phase, phase * 1.7, uFige);
              float age = fract(t);
              vAge = age;
              vTaille = taille;

              vec3 p = position;
              // Elle monte, en ralentissant : une flamme s'etire puis s'essouffle.
              p.y += portee * (1.0 - pow(1.0 - age, 2.2));
              // Et elle serpente : deux sinus dephases, d'amplitude croissante avec l'age.
              float derive = age * 0.26 * (0.4 + taille);
              p.x += sin(t * 5.1 + phase * 2.3) * derive;
              p.z += cos(t * 4.3 + phase * 1.9) * derive;

              vec4 vue = modelViewMatrix * vec4(p, 1.0);
              gl_Position = projectionMatrix * vue;

              // Elle grossit en naissant, puis s'amenuise en montant.
              float enflure = smoothstep(0.0, 0.12, age) * (1.0 - pow(age, 1.4));
              /*
                1100, et non 420 : a la distance de cette scene, une unite fait environ 115 px.
                Une langue de 0,8 unite doit donc couvrir pres de 90 px. Le facteur precedent
                plafonnait a 26 px et le brasier se lisait comme un poudroiement.
              */
              gl_PointSize = clamp(ne * taille * enflure * 1100.0 / -vue.z, 0.0, 150.0);
            }
          `}
          fragmentShader={/* glsl */ `
            uniform float uArdeur;
            varying float vAge;
            varying float vTaille;
            varying float vNe;

            void main() {
              /*
                UN FOYER PAS ENCORE NE DOIT DISPARAITRE ICI AUSSI, et pas seulement par sa taille.

                Le vertex shader met gl_PointSize a zero pour lui — mais la borne basse de
                ALIASED_POINT_SIZE_RANGE vaut 1 sur ANGLE/D3D et sur la plupart des pilotes de
                bureau : un point de taille nulle y est tout de meme rasterise sur 1 px, a pleine
                luminosite et en melange additif. A mi-chapitre, pres de la moitie des foyers ne
                sont pas nes : cela faisait un poudroiement orange seme dans le feuillage AVANT
                que le feu prenne — exactement le defaut que la chronologie voulait eviter.
              */
              if (vNe < 0.5) discard;
              vec2 d = gl_PointCoord - vec2(0.5);
              /*
               * UNE LANGUE DE FEU, PAS UNE BILLE. On etire le disque vers le haut et on le
               * pince vers le bas : la goutte inversee est la forme d'une flamme.
               */
              d.y *= 0.72 + 0.5 * smoothstep(0.0, 0.5, gl_PointCoord.y);
              float r = length(d) * 2.0;
              if (r > 1.0) discard;

              // Coeur dense, bord fondu : un bord net ferait un confetti.
              float coeur = pow(1.0 - r, 2.1);

              /*
               * LA RAMPE DE TEMPERATURE, lue sur un vrai feu : blanc d'or au coeur, or, orange,
               * puis rouge sombre qui s'eteint. Un feu dont toutes les flammes ont la meme
               * couleur n'a pas de profondeur.
               */
              vec3 blanc  = vec3(1.00, 0.93, 0.74);
              vec3 or     = vec3(1.00, 0.72, 0.26);
              vec3 orange = vec3(0.98, 0.40, 0.08);
              vec3 braise = vec3(0.52, 0.11, 0.02);
              vec3 teinte = mix(blanc, or, smoothstep(0.0, 0.22, vAge));
              teinte = mix(teinte, orange, smoothstep(0.18, 0.56, vAge));
              teinte = mix(teinte, braise, smoothstep(0.52, 1.0, vAge));

              // Elle s'eteint en montant, et les petites s'eteignent plus vite que les grandes.
              float reste = pow(1.0 - vAge, 1.5 + (1.0 - vTaille));
              float force = uArdeur * coeur * reste;
              if (force <= 0.002) discard;
              gl_FragColor = vec4(teinte * force, force * 0.82);
            }
          `}
        />
      </points>

      {/*
        LA LUMIERE DU BRASIER. Elle vit AU COEUR du buisson, pas devant : c'est ce qui fait
        ressortir les branches en contre-jour et donne au feuillage son relief.
      */}
      <pointLight ref={lumiere} position={[0, 0.6, 0.2]} intensity={0} distance={13} decay={2} color="#ff9440" />
      {/* Une seconde lueur, plus basse et plus rouge, pour que le pied du buisson ne tombe pas dans le noir. */}
      <pointLight position={[0, -1.1, 0.9]} intensity={3.2} distance={7} decay={2} color="#c2521a" />

      {/* La nuit garde sa part : assez de lumiere froide pour lire le bois, jamais plus. */}
      <hemisphereLight args={['#9db4e8', '#2a2016', 0.5]} />
      <directionalLight position={[-4, 6, 5]} intensity={0.75} color="#b9cdf2" />
    </group>
  );
}
