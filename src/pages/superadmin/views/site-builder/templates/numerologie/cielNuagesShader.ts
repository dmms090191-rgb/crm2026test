/**
 * CIEL PROFOND ET MER DE NUAGES — le fond de l'experience, en un seul shader.
 *
 * Pourquoi un shader plutot que des images de nuages : une mer de nuages en billboards se
 * trahit des que la camera bouge (les cartes pivotent, les bords se croisent). Ici les nuages
 * sont VOLUMETRIQUES : on traverse reellement une couche de densite, donc la parallaxe, les
 * silhouettes et la lumiere qui les traverse sont justes sous n'importe quel angle. Et ils ne
 * coutent AUCUN octet de telechargement — tout est procedural.
 *
 * Le fond est rendu sur un quad plein ecran, sans projection : on reconstruit soi-meme le rayon
 * de vue depuis la matrice monde de la camera. C'est ce qui permet au fond de rester coherent
 * avec la scene 3D posee devant lui, sans jamais ecrire dans le tampon de profondeur.
 *
 * La couche de nuages est un SLAB horizontal, infini en x et z, entre NUAGE_BAS et NUAGE_HAUT.
 * La camera est au-dessus : les rayons qui plongent la traversent peu (on voit le dessus des
 * nuages), les rayons rasants la traversent longuement (l'horizon se bouche). C'est ce qui
 * donne naturellement l'impression d'une mer sans fin.
 *
 * Le nombre de pas est un UNIFORME, pas une constante : la qualite s'adapte a l'appareil
 * (voir qualite.ts) sans recompiler le programme.
 */

export const VERTEX_FOND = /* glsl */ `
  varying vec2 vNdc;
  void main() {
    vNdc = position.xy;
    // Profondeur 1.0 : toujours au fond, quelle que soit la camera.
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

export const FRAGMENT_FOND = /* glsl */ `
  precision highp float;

  varying vec2 vNdc;

  uniform float uTemps;
  uniform float uAspect;
  uniform float uTanDemiFov;
  uniform mat4  uCamMonde;
  uniform vec3  uSoleilDir;
  uniform int   uPas;
  uniform int   uPasLumiere;
  uniform float uCouverture;
  uniform float uEtoiles;

  const float NUAGE_BAS  = -58.0;
  const float NUAGE_HAUT = -9.0;
  const int   PAS_MAX    = 32;
  const int   PAS_LUM_MAX = 6;

  // Palette : nuit profonde en haut, bleu dense a l'horizon, or chaud autour du soleil.
  // Bleus volontairement SATURES : un halo solaire large lave tres vite un ciel, et un ciel
  // lave donne l'image grisatre et plate qu'on cherche justement a eviter.
  const vec3 ZENITH   = vec3(0.009, 0.024, 0.082);
  const vec3 HORIZON  = vec3(0.052, 0.102, 0.223);
  const vec3 OR_CHAUD = vec3(1.000, 0.776, 0.408);
  const vec3 OR_PALE  = vec3(1.000, 0.902, 0.714);

  float alea(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float bruit(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(alea(i + vec3(0.0, 0.0, 0.0)), alea(i + vec3(1.0, 0.0, 0.0)), f.x),
          mix(alea(i + vec3(0.0, 1.0, 0.0)), alea(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
      mix(mix(alea(i + vec3(0.0, 0.0, 1.0)), alea(i + vec3(1.0, 0.0, 1.0)), f.x),
          mix(alea(i + vec3(0.0, 1.0, 1.0)), alea(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float somme = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      somme += amp * bruit(p);
      p *= 2.03;
      amp *= 0.5;
    }
    return somme;
  }

  /** Densite de nuage en un point. Zero hors de la couche. */
  float densite(vec3 p) {
    float h = (p.y - NUAGE_BAS) / (NUAGE_HAUT - NUAGE_BAS);
    if (h < 0.0 || h > 1.0) return 0.0;
    // Bords adoucis : la couche s'efface vers le bas et vers le haut, jamais de tranche nette.
    float forme = smoothstep(0.0, 0.32, h) * smoothstep(1.0, 0.55, h);
    vec3 derive = vec3(uTemps * 0.9, 0.0, uTemps * 0.45);
    float d = fbm((p + derive) * 0.0135) - (1.0 - uCouverture);
    return max(0.0, d) * forme * 1.9;
  }

  /** Transmittance vers le soleil : ce qui reste de lumiere apres la traversee du nuage. */
  float lumiereVers(vec3 p) {
    float densiteCumul = 0.0;
    float pas = 7.0;
    for (int i = 0; i < PAS_LUM_MAX; i++) {
      if (i >= uPasLumiere) break;
      p += uSoleilDir * pas;
      densiteCumul += densite(p) * pas;
      pas *= 1.45;
    }
    return exp(-densiteCumul * 0.85);
  }

  vec3 ciel(vec3 dir) {
    float haut = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 base = mix(HORIZON, ZENITH, pow(haut, 0.75));

    // Halo solaire : SERRE autour du disque, plus un coeur tres serre.
    // Un exposant faible (6) etalait la chaleur sur un tiers du ciel et effacait le bleu
    // partout : l'image entiere virait au gris beige. A 16, le halo reste un halo.
    float cos0 = max(0.0, dot(dir, uSoleilDir));
    base += OR_CHAUD * pow(cos0, 16.0) * 0.34;
    base += OR_PALE  * pow(cos0, 240.0) * 1.35;

    // Etoiles : seulement en hauteur, et seulement loin du soleil.
    if (uEtoiles > 0.0 && dir.y > 0.05) {
      vec3 g = floor(dir * 320.0);
      float s = alea(g);
      float eclat = smoothstep(0.9972, 1.0, s);
      float scintil = 0.65 + 0.35 * sin(uTemps * 2.2 + s * 48.0);
      base += vec3(0.85, 0.90, 1.0) * eclat * scintil * uEtoiles
            * smoothstep(0.05, 0.45, dir.y) * (1.0 - pow(cos0, 3.0));
    }
    return base;
  }

  void main() {
    vec3 origine = uCamMonde[3].xyz;
    vec3 vue = vec3(vNdc.x * uTanDemiFov * uAspect, vNdc.y * uTanDemiFov, -1.0);
    vec3 dir = normalize((uCamMonde * vec4(vue, 0.0)).xyz);

    vec3 couleur = ciel(dir);

    // Intersection du rayon avec le slab de nuages.
    float tEntree = 1e9;
    float tSortie = -1e9;
    if (abs(dir.y) > 1e-4) {
      float t1 = (NUAGE_BAS - origine.y) / dir.y;
      float t2 = (NUAGE_HAUT - origine.y) / dir.y;
      tEntree = min(t1, t2);
      tSortie = max(t1, t2);
    } else if (origine.y > NUAGE_BAS && origine.y < NUAGE_HAUT) {
      tEntree = 0.0;
      tSortie = 900.0;
    }

    tEntree = max(tEntree, 0.0);
    tSortie = min(tSortie, 900.0);

    if (tSortie > tEntree) {
      float longueur = tSortie - tEntree;
      float pas = longueur / float(uPas);
      // Decalage par pixel : casse les anneaux de l'echantillonnage regulier.
      float gigue = alea(vec3(gl_FragCoord.xy, uTemps * 0.05)) * pas;
      vec3 p = origine + dir * (tEntree + gigue);

      vec3 accum = vec3(0.0);
      float transmittance = 1.0;

      for (int i = 0; i < PAS_MAX; i++) {
        if (i >= uPas || transmittance < 0.02) break;
        float d = densite(p);
        if (d > 0.001) {
          float lum = lumiereVers(p);
          // Base froide a l'ombre, or sur les faces eclairees : c'est ce contraste qui
          // donne le relief, pas la densite seule. L'ombre est franchement bleue et sombre,
          // sinon les nuages s'aplatissent en une masse beige uniforme.
          vec3 teinte = mix(vec3(0.085, 0.125, 0.245), OR_PALE, lum);
          teinte += OR_CHAUD * pow(max(0.0, dot(dir, uSoleilDir)), 8.0) * lum * 0.55;
          float absorbe = exp(-d * pas * 0.95);
          accum += teinte * d * pas * transmittance;
          transmittance *= absorbe;
        }
        p += dir * pas;
      }

      couleur = couleur * transmittance + accum;
    }

    // Vignettage doux, puis compression douce des hautes lumieres.
    float r = length(vNdc);
    couleur *= 1.0 - 0.28 * smoothstep(0.55, 1.45, r);
    // Le gamma final eclaircit : a 0.88 il remontait les ombres et effacait le bleu nuit.
    couleur = couleur / (couleur + 0.92);
    couleur = pow(couleur, vec3(0.96));

    gl_FragColor = vec4(couleur, 1.0);
  }
`;
