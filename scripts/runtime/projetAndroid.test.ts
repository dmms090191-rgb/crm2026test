// Le projet Android : ce que le gabarit Capacitor posait, et qu'il ne doit pas reposer.
//   node --import tsx --test scripts/runtime/projetAndroid.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

/*
 * ============== POURQUOI CE FICHIER EXISTE ==============
 *
 * `npx cap sync android` et `npx cap add android` REECRIVENT le projet natif a partir du
 * gabarit Capacitor. Tout ce qui a ete corrige a la main y est donc reversible par une
 * commande de routine, et sans bruit : le build reste vert, l'APK s'installe, et seul un
 * relevé peut dire que la protection a saute.
 *
 * Ce que le gabarit pose, et qui est faux pour Talvex :
 *
 *   - android:allowBackup="true" SANS regle d'extraction. Les SharedPreferences et les
 *     bases partent alors dans la sauvegarde Google Drive ET dans le transfert d'appareil
 *     a appareil, puis se restaurent sur un telephone neuf. C'est le seul vecteur qui fait
 *     SORTIR un secret de l'appareil, et c'est lui qui a impose le coffre securise plutot
 *     que @capacitor/preferences (voir src/lib/stockageSession.ts).
 *   - versionCode 1 / versionName "1.0", sans rapport avec la version du produit.
 *   - un fond d'icone BLANC et l'icone par defaut de Capacitor.
 *   - aucune configuration de signature : `assembleRelease` rend un APK non signe,
 *     qu'Android refuse d'installer, ce qui pousse a publier l'APK de DEBOGAGE — lequel
 *     porte android:debuggable="true" et la cle generique « CN=Android Debug ».
 *
 * Les releves ci-dessous lisent les fichiers du projet natif, pas le code applicatif :
 * ils tiennent meme quand le projet android/ est regenere.
 */

const lire = (f: string) => readFileSync(f, "utf8");
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

const RES = "android/app/src/main/res";
const MANIFESTE = lire("android/app/src/main/AndroidManifest.xml");
const GRADLE = lire("android/app/build.gradle");
const CAPACITOR = lire("capacitor.config.ts");
const GITIGNORE = lire(".gitignore");

/*
 * LES COMMENTAIRES SONT DEPOUILLES D'ABORD, et la mutation a montre pourquoi : les deux
 * fichiers de regles EXPLIQUENT leur contenu en prose, donc data_extraction_rules.xml
 * contient le texte « <device-transfer> » dans son en-tete et backup_rules.xml le texte
 * « <exclude domain="root" /> ». Sans ce depouillage, extraire le bloc <device-transfer>
 * partait du COMMENTAIRE et englobait tout le bloc <cloud-backup> : le canal du transfert
 * d'appareil pouvait etre vide, le releve restait vert. Deux protections sur quatre ne
 * mordaient pas.
 */
const sansCommentairesXml = (s: string) => s.replace(/<!--[\s\S]*?-->/g, " ");

/** Le contenu entre <balise> et </balise>, sans regex construite a la volee. */
function bloc(source: string, balise: string): string | null {
  const net = sansCommentairesXml(source);
  const d = net.indexOf("<" + balise + ">");
  const f = net.indexOf("</" + balise + ">");
  return d >= 0 && f > d ? net.slice(d, f) : null;
}

const DOMAINES = ["sharedpref", "database", "file", "root"];

// ------------------------------------------- A. LES SAUVEGARDES, LE VECTEUR DE SORTIE

test("A1 la sauvegarde est refusee, sans exception", () => {
  assert.match(MANIFESTE, /android:allowBackup="false"/);
  assert.doesNotMatch(
    MANIFESTE,
    /android:allowBackup="true"/,
    "le gabarit Capacitor a repose allowBackup=true : la session repartirait sur un telephone neuf",
  );
});

test("A2 les DEUX fichiers de regles sont declares", () => {
  // Android 12 et au-dela lit dataExtractionRules ; avant, fullBackupContent. Ne declarer
  // que l'un des deux laisse l'autre moitie du parc sans protection.
  assert.match(MANIFESTE, /android:dataExtractionRules="@xml\/data_extraction_rules"/);
  assert.match(MANIFESTE, /android:fullBackupContent="@xml\/backup_rules"/);
});

test("A3 Android 12+ : les DEUX canaux excluent TOUT", () => {
  const regles = lire(`${RES}/xml/data_extraction_rules.xml`);
  // <cloud-backup> couvre Google Drive ; <device-transfer> le transfert direct vers un
  // telephone neuf. Ne fermer que le premier est l'erreur facile : rien ne la signale.
  for (const canal of ["cloud-backup", "device-transfer"]) {
    const corps = bloc(regles, canal);
    assert.ok(corps, `le canal <${canal}> a disparu des regles d'extraction`);
    for (const domaine of DOMAINES) {
      assert.ok(
        corps.includes(`<exclude domain="${domaine}"`),
        `<${canal}> n'exclut plus le domaine ${domaine}`,
      );
    }
  }
});

test("A4 Android 11 et avant : la sauvegarde complete exclut TOUT", () => {
  const regles = sansCommentairesXml(lire(`${RES}/xml/backup_rules.xml`));
  for (const domaine of DOMAINES) {
    assert.ok(
      regles.includes(`<exclude domain="${domaine}"`),
      `backup_rules.xml n'exclut plus le domaine ${domaine}`,
    );
  }
});

// ------------------------------------------------- B. UNE SEULE IDENTITE, UNE SEULE VERSION

test("B1 la version Android est DERIVEE du produit, pas recopiee", () => {
  // Comparer deux litteraux ne protegeait que tant que quelqu'un pensait a reporter le
  // numero aux deux endroits. On exige desormais que build.gradle LISE la source.
  const net = sansCommentaires(GRADLE);
  const tauri = JSON.parse(lire("src-tauri/tauri.conf.json")) as { version?: string };
  assert.ok(tauri.version, "src-tauri/tauri.conf.json n'a plus de version");
  // On vise l'APPEL DE LECTURE, pas une simple mention : le message du logger.warn contient
  // lui aussi « tauri.conf.json », et une mutation qui faisait lire un autre fichier passait
  // donc inapercue.
  assert.match(
    net,
    /parse\(rootProject\.file\([^)]*tauri\.conf\.json[^)]*\)\)/,
    "build.gradle ne lit plus la version depuis src-tauri/tauri.conf.json",
  );
  assert.match(net, /versionName\s+versionProduit/, "versionName est redevenu un litteral");
  assert.doesNotMatch(net, /versionName\s+["']/, "un numero de version est ecrit en dur");
});

test("B1bis versionCode croit avec la version, sinon aucune mise a jour ne s'installe", () => {
  // Android refuse une mise a jour dont le versionCode n'est pas STRICTEMENT superieur.
  // Le gabarit Capacitor posait 1 en dur : l'application n'aurait jamais pu etre mise a
  // jour, et rien ne l'aurait signale avant l'echec sur le telephone.
  const net = sansCommentaires(GRADLE);
  assert.doesNotMatch(
    net,
    /versionCode\s+\d+/,
    "versionCode est fige a un nombre : aucune mise a jour ne pourrait s'installer",
  );
  assert.match(net, /versionCode\s+codeVersion/, "versionCode n'est plus derive de la version");
  assert.match(
    net,
    /maj \* 10000 \+ min \* 100 \+ cor/,
    "la formule de versionCode a change : verifier qu'elle reste strictement croissante",
  );
});

test("B1ter les schemas de signature permettent mise a jour et rotation de cle", () => {
  // v2 est ce qu'Android 7+ verifie ; sans lui l'APK serait refuse. v3 porte la rotation de
  // cle : sans lui, la cle de signature ne pourra JAMAIS changer sans casser les mises a
  // jour de tous les appareils deja equipes.
  const net = sansCommentaires(GRADLE);
  assert.match(net, /enableV2Signing true/, "sans v2, Android 7 et au-dela refuserait l'APK");
  assert.match(net, /enableV3Signing true/, "sans v3, la cle de signature ne pourra jamais etre changee");
});

test("B2 l'identifiant d'application est le meme partout", () => {
  const ID = "fr.talvex.app";
  assert.ok(CAPACITOR.includes(`appId: '${ID}'`), "capacitor.config.ts a change d'appId");
  assert.ok(GRADLE.includes(`applicationId "${ID}"`), "build.gradle a change d'applicationId");
  assert.ok(GRADLE.includes(`namespace = "${ID}"`), "build.gradle a change de namespace");
});

test("B3 aucun hote personnalise n'est pose dans Capacitor", () => {
  // Mesure du 25/10/2026 : index.html traite `localhost` comme hote connu, mais PAS un
  // hote personnalise — qui ferait ajouter la classe `site-page`, laquelle coupe le moteur
  // de themes et force un fond blanc en !important. Le meme piege a failli casser Tauri.
  assert.doesNotMatch(
    sansCommentaires(CAPACITOR),
    /\bserver\s*:/,
    "un bloc `server` est reapparu dans capacitor.config.ts : le theme sauterait en WebView",
  );
});

// --------------------------------------------- C. LA PUBLICATION, ET LA CLE QUI RESTE DEHORS

test("C1 la release peut etre signee, sans secret dans le depot", () => {
  const net = sansCommentaires(GRADLE);
  assert.ok(net.includes("signingConfigs"), "la configuration de signature a disparu");
  assert.ok(
    net.includes("rootProject.file('key.properties')"),
    "la signature ne lit plus android/key.properties : assembleRelease rendrait un APK non signe",
  );
  // Un mot de passe litteral ici partirait dans un depot PUBLIC.
  assert.doesNotMatch(net, /storePassword\s+["']/, "un mot de passe de magasin est ecrit en dur");
  assert.doesNotMatch(net, /keyPassword\s+["']/, "un mot de passe de cle est ecrit en dur");
});

test("C2 les secrets de signature sont ignores par git", () => {
  const lignes = GITIGNORE.split(/\r?\n/).map((l) => l.trim());
  for (const motif of ["*.jks", "*.keystore", "key.properties", "android/local.properties"]) {
    assert.ok(lignes.includes(motif), `.gitignore ne couvre plus ${motif} — le depot est PUBLIC`);
  }
});

// ------------------------------------------------------- D. L'ICONE ET LE MASQUE ANDROID

/** Decode un PNG RGBA non entrelace. Assez pour mesurer une icone. */
function pngRgba(fichier: string) {
  const b = readFileSync(fichier);
  let p = 8, w = 0, h = 0, type = -1;
  const morceaux: Buffer[] = [];
  while (p + 8 <= b.length) {
    const taille = b.readUInt32BE(p);
    const nom = b.subarray(p + 4, p + 8).toString("ascii");
    if (nom === "IHDR") { w = b.readUInt32BE(p + 8); h = b.readUInt32BE(p + 12); type = b[p + 17]; }
    if (nom === "IDAT") morceaux.push(b.subarray(p + 8, p + 8 + taille));
    p += 12 + taille;
  }
  assert.equal(type, 6, `${fichier} n'est pas un PNG RGBA`);
  const brut = inflateSync(Buffer.concat(morceaux));
  const pas = w * 4;
  const px = Buffer.alloc(h * pas);
  for (let y = 0; y < h; y++) {
    const filtre = brut[y * (pas + 1)];
    for (let x = 0; x < pas; x++) {
      const g = x >= 4 ? px[y * pas + x - 4] : 0;
      const hh = y > 0 ? px[(y - 1) * pas + x] : 0;
      const d = x >= 4 && y > 0 ? px[(y - 1) * pas + x - 4] : 0;
      let v = brut[y * (pas + 1) + 1 + x];
      if (filtre === 1) v += g;
      else if (filtre === 2) v += hh;
      else if (filtre === 3) v += (g + hh) >> 1;
      else if (filtre === 4) {
        const e = g + hh - d;
        const dg = Math.abs(e - g), dh = Math.abs(e - hh), dd = Math.abs(e - d);
        v += dg <= dh && dg <= dd ? g : dh <= dd ? hh : d;
      }
      px[y * pas + x] = v & 255;
    }
  }
  return { w, h, pas, px };
}

const DENSITES = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];

test("D1 les cinq densites portent les trois icones", () => {
  for (const d of DENSITES) {
    for (const nom of ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]) {
      const im = pngRgba(`${RES}/mipmap-${d}/${nom}`);
      assert.equal(im.w, im.h, `${d}/${nom} n'est pas carree`);
    }
  }
});

test("D2 le dessin adaptatif tient dans la zone GARANTIE du masque", () => {
  // Android masque l'icone adaptative : sur 108 dp de toile, seuls les 66 dp centraux sont
  // surement visibles — le reste depend du lanceur (cercle, squircle, goutte, carre). Un
  // dessin genere par un outil tiers, ou le logotype horizontal remis a la place du
  // monogramme, sortirait de cette zone et serait rogne. Ce releve le mesure.
  const im = pngRgba(`${RES}/mipmap-xxxhdpi/ic_launcher_foreground.png`);
  assert.equal(im.w, 432, "la toile adaptative xxxhdpi doit faire 432 px (108 dp)");

  const cx = im.w / 2, cy = im.h / 2;
  let pire = 0;
  for (let y = 0; y < im.h; y++) {
    for (let x = 0; x < im.w; x++) {
      if (im.px[y * im.pas + x * 4 + 3] > 8) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d > pire) pire = d;
      }
    }
  }
  const garanti = (im.w * 66) / 108 / 2;
  assert.ok(
    pire <= garanti,
    `le dessin sort de la zone garantie : ${pire.toFixed(1)} px contre ${garanti.toFixed(1)} px`,
  );
  // Et l'inverse : une icone qui se recroqueville au centre serait perdue dans son fond.
  assert.ok(
    pire > garanti * 0.7,
    `le monogramme est trop petit : ${pire.toFixed(1)} px, soit moins de 70 % de la zone`,
  );
});

test("D3 le fond de l'icone est le gris Talvex, pas le blanc du gabarit", () => {
  const couleur = lire(`${RES}/values/ic_launcher_background.xml`);
  assert.ok(couleur.includes("#AEB8C7"), "le fond adaptatif n'est plus le gris Talvex");
  assert.doesNotMatch(
    couleur,
    /#FFFFFF/i,
    "le blanc du gabarit Capacitor est revenu : l'icone disparait sur un fond clair",
  );
});

test("D4 l'icone n'est plus celle de Capacitor", () => {
  // Le monogramme est fait de trois aplats : gris, encre, cyan. L'icone Capacitor est un
  // degrade bleu-vert — elle n'a aucun de ces pixels au centre.
  const im = pngRgba(`${RES}/mipmap-xxxhdpi/ic_launcher.png`);
  const au = (x: number, y: number) => {
    const o = y * im.pas + x * 4;
    return [im.px[o], im.px[o + 1], im.px[o + 2]].join(",");
  };
  const centre = au(Math.round(im.w / 2), Math.round(im.h * 0.45));
  assert.equal(centre, "31,41,55", "la hampe du T n'est plus en encre Talvex (#1F2937)");
});

// ------------------------------------------------- E. LE RESTE DU PRODUIT N'EST PAS TOUCHE

test("E1 le projet Android n'entre pas dans le paquet web", () => {
  // android/ est un projet natif : aucun fichier de src/ ne doit l'importer, sinon Vite
  // tenterait de le resoudre et le build web casserait.
  const app = lire("src/App.tsx") + lire("src/main.tsx") + lire("src/lib/stockageSession.ts");
  assert.doesNotMatch(app, /from\s+["'][^"']*\bandroid\//, "un fichier de src/ importe le projet natif");
});
