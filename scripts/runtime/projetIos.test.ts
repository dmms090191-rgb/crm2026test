// Le projet iOS : ce que le gabarit Capacitor posait, et qu'il ne doit pas reposer.
//   node --import tsx --test scripts/runtime/projetIos.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

/*
 * ============== POURQUOI CE FICHIER EXISTE ==============
 *
 * `npx cap sync ios` et `npx cap add ios` REECRIVENT le projet natif a partir du gabarit.
 * Tout ce qui a ete corrige a la main y est reversible par une commande de routine, sans
 * bruit : le projet s'ouvre, l'application compile, et seul un releve peut dire que la
 * correction a saute. C'est le meme raisonnement que pour scripts/runtime/projetAndroid.test.ts.
 *
 * CE QUE LE GABARIT POSE, ET QUI EST FAUX POUR TALVEX :
 *
 *   - MARKETING_VERSION = 1.0 et CURRENT_PROJECT_VERSION = 1, sans rapport avec la version du
 *     produit. CFBundleVersion doit STRICTEMENT croitre a chaque televersement : Apple refuse
 *     un numero deja vu, et le refus arrive APRES le televersement.
 *   - une icone generique.
 *
 * CE QUI EST PROPRE A iOS, ET QUE L'ON VERIFIE ICI :
 *
 *   - L'ICONE NE DOIT PAS AVOIR DE CANAL ALPHA. L'App Store refuse une icone transparente, et
 *     une icone avec alpha s'affiche en noir sur l'ecran d'accueil. Le refus arrive a la
 *     soumission, donc tard.
 *   - LE COFFRE passe par le Keychain d'Apple, via KeychainSwift. Le reglage d'accessibilite
 *     « afterFirstUnlockThisDeviceOnly » est le pendant exact d'allowBackup=false sur
 *     Android : l'element NE MIGRE PAS vers un nouvel appareil lors d'une restauration.
 *   - LE PROJET EST RESOLU PAR SWIFT PACKAGE MANAGER, pas par CocoaPods. Package.swift
 *     reference le plugin par un chemin relatif vers node_modules : une compilation distante
 *     doit donc disposer de node_modules a cote du projet, et pas seulement du dossier ios/.
 */

const lire = (f: string) => readFileSync(f, "utf8");

const PBXPROJ = "ios/App/App.xcodeproj/project.pbxproj";
const INFO = "ios/App/App/Info.plist";
const PACKAGE = "ios/App/CapApp-SPM/Package.swift";
const ICONE = "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png";
const SPLASH = "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png";

/** Les valeurs d'un reglage Xcode, dedoublonnees : le pbxproj les repete par configuration. */
function reglage(nom: string): string[] {
  const motif = new RegExp(`${nom} = ([^;]+);`, "g");
  return [...new Set([...lire(PBXPROJ).matchAll(motif)].map((m) => m[1].trim()))];
}

/** Lit la largeur, la hauteur et le type de couleur d'un PNG, sans le decompresser. */
function enTetePng(fichier: string) {
  const b = readFileSync(fichier);
  assert.equal(b.subarray(1, 4).toString("ascii"), "PNG", `${fichier} n'est pas un PNG`);
  return { largeur: b.readUInt32BE(16), hauteur: b.readUInt32BE(20), typeCouleur: b[25] };
}

// ------------------------------------------------- A. UNE SEULE IDENTITE, UNE SEULE VERSION

test("A1 le projet iOS existe et porte l'identite de Talvex", () => {
  assert.ok(existsSync(PBXPROJ), "le projet Xcode a disparu : relancer `npx cap add ios`");
  assert.deepEqual(
    reglage("PRODUCT_BUNDLE_IDENTIFIER"),
    ["fr.talvex.app"],
    "l'identifiant d'application differe de celui d'Android et du bureau",
  );
  assert.match(lire(INFO), /<string>Talvex<\/string>/, "le nom affiche n'est plus Talvex");
});

test("A2 la version iOS suit celle du produit", () => {
  const tauri = JSON.parse(lire("src-tauri/tauri.conf.json")) as { version?: string };
  assert.ok(tauri.version, "src-tauri/tauri.conf.json n'a plus de version");
  assert.deepEqual(
    reglage("MARKETING_VERSION"),
    [tauri.version],
    "iOS annonce une version differente du reste du produit : lancer scripts/ios/synchroniserVersion.mjs",
  );
});

test("A3 CFBundleVersion suit la meme formule qu'Android", () => {
  // Android derive 0.1.0 en 100 ; iOS doit donner le meme nombre, sinon un numero de build
  // ne designerait pas la meme version d'une plateforme a l'autre. Et il doit CROITRE :
  // Apple refuse un numero deja televerse.
  const version = (JSON.parse(lire("src-tauri/tauri.conf.json")) as { version: string }).version;
  const [maj = 0, min = 0, cor = 0] = version
    .replace(/[^0-9.].*/, "")
    .split(".")
    .map((n) => Number.parseInt(n, 10) || 0);
  const attendu = String(maj * 10000 + min * 100 + cor);
  assert.deepEqual(
    reglage("CURRENT_PROJECT_VERSION"),
    [attendu],
    `CFBundleVersion devrait valoir ${attendu} pour la version ${version}`,
  );
});

test("A4 la cible iOS minimale reste celle qu'exigent les plugins", () => {
  // Le coffre (@aparajita/capacitor-secure-storage) et @capacitor/ios declarent tous deux
  // ios.deployment_target = 15.0 dans leur podspec. Descendre plus bas ferait echouer la
  // resolution des dependances, et le message ne designerait pas la cause.
  for (const valeur of reglage("IPHONEOS_DEPLOYMENT_TARGET")) {
    assert.ok(
      Number.parseFloat(valeur) >= 15,
      `cible iOS ${valeur} : les plugins exigent 15.0 au minimum`,
    );
  }
});

// ----------------------------------------------------------------- B. L'ICONE ET LE LANCEMENT

test("B1 l'icone n'a AUCUN canal alpha", () => {
  // C'est le refus le plus courant a la soumission, et il arrive tard. Type 2 = RVB,
  // type 6 = RVBA : seul le premier est accepte.
  const { largeur, hauteur, typeCouleur } = enTetePng(ICONE);
  assert.equal(largeur, 1024, "l'icone doit faire 1024x1024");
  assert.equal(hauteur, 1024, "l'icone doit faire 1024x1024");
  assert.equal(
    typeCouleur,
    2,
    "l'icone porte un canal alpha : l'App Store la refuserait, et elle s'afficherait en noir",
  );
});

test("B2 le catalogue declare bien cette icone", () => {
  const contenu = JSON.parse(
    lire("ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json"),
  ) as { images: Array<{ filename?: string; size?: string }> };
  const declaree = contenu.images.find((i) => i.filename === "AppIcon-512@2x.png");
  assert.ok(declaree, "AppIcon-512@2x.png n'est plus declaree dans le catalogue");
  assert.equal(declaree.size, "1024x1024");
});

test("B3 l'ecran de lancement est pose, et sans alpha lui non plus", () => {
  const { largeur, typeCouleur } = enTetePng(SPLASH);
  assert.equal(largeur, 2732, "l'image de lancement doit rester carree et large");
  assert.equal(typeCouleur, 2, "l'image de lancement porte un canal alpha");
  assert.match(lire(INFO), /<string>LaunchScreen<\/string>/, "le storyboard de lancement n'est plus declare");
});

// ----------------------------------------------------------- C. LE COFFRE ET SES DEPENDANCES

test("C1 le coffre securise est bien lie au projet iOS", () => {
  const pkg = lire(PACKAGE);
  assert.match(
    pkg,
    /AparajitaCapacitorSecureStorage/,
    "le plugin de coffre n'est plus declare : la session mobile retomberait sur la memoire",
  );
  assert.match(pkg, /platforms:\s*\[\.iOS\(\.v15\)\]/, "la plateforme declaree n'est plus iOS 15");
});

test("C2 le reglage d'accessibilite du Keychain est toujours pose", () => {
  // Valeur 3 = afterFirstUnlockThisDeviceOnly, verifie dans l'enumeration du plugin :
  //   0 whenUnlocked | 1 whenUnlockedThisDeviceOnly | 2 afterFirstUnlock
  //   3 afterFirstUnlockThisDeviceOnly | 4 whenPasscodeSetThisDeviceOnly
  // « ThisDeviceOnly » est ce qui empeche l'element de migrer vers un autre iPhone lors
  // d'une restauration de sauvegarde — le pendant d'allowBackup=false sur Android.
  // « afterFirstUnlock » et non « whenUnlocked » : sinon le jeton serait illisible ecran
  // verrouille, et le rafraichissement en arriere-plan casserait.
  const source = lire("src/lib/stockageSession.ts");
  assert.match(
    source,
    /setDefaultKeychainAccess\?\.\(3\)/,
    "le reglage d'accessibilite du Keychain a change : verifier qu'il reste ThisDeviceOnly",
  );
});

test("C3 la resolution passe par Swift Package Manager, pas par CocoaPods", () => {
  // Capacitor 8 est passe a SPM. Cela change la compilation distante : il n'y a pas de
  // `pod install` a lancer, mais Package.swift reference le plugin par un chemin relatif
  // vers node_modules. Une machine qui ne recevrait que le dossier ios/ ne compilerait pas.
  assert.ok(existsSync(PACKAGE), "Package.swift a disparu");
  assert.ok(
    !existsSync("ios/App/Podfile"),
    "un Podfile est reapparu : le projet melangerait CocoaPods et SPM",
  );
  assert.match(
    lire(PACKAGE),
    /path:\s*"\.\.\/\.\.\/\.\.\/node_modules/,
    "le plugin n'est plus resolu depuis node_modules : la compilation distante devra etre revue",
  );
});

// --------------------------------------------------------------------- D. LES SECRETS

test("D1 .gitignore couvre les secrets de signature iOS", () => {
  // Un .p12 contient la CLE PRIVEE du certificat : publie dans un depot PUBLIC, il
  // permettrait a un tiers de signer une application au nom de Talvex.
  const lignes = lire(".gitignore").split(/\r?\n/).map((l) => l.trim());
  for (const motif of ["*.mobileprovision", "*.p12", "*.cer", "*.certSigningRequest"]) {
    assert.ok(lignes.includes(motif), `.gitignore ne couvre pas ${motif}`);
  }
});

test("D1bis aucun secret n'est ecrit dans la configuration de compilation", () => {
  // codemagic.yaml part sur GitHub, dans un depot PUBLIC. Les variables sensibles se posent
  // dans l'interface du service, jamais ici.
  const yaml = lire("codemagic.yaml");
  const fautifs: string[] = [];
  for (const [quoi, motif] of [
    ["un JWT", /eyJ[A-Za-z0-9_-]{10,}\./],
    ["une URL de projet Supabase", /https:\/\/[a-z0-9]{20}\.supabase\.co/],
    ["une cle privee", /BEGIN [A-Z ]*PRIVATE KEY/],
    ["un mot de passe litteral", /password\s*:\s*["']?[^\s"'#]{6,}/i],
  ] as Array<[string, RegExp]>) {
    if (motif.test(yaml)) fautifs.push(quoi);
  }
  assert.deepEqual(fautifs, [], `codemagic.yaml contient ${fautifs.join(", ")}`);
});

// ------------------------------------------------- E. LA COMPILATION DISTANTE

/** Le YAML sans ses commentaires : un commentaire qui NOMME un piege n'est pas le piege. */
const yamlNet = () =>
  lire("codemagic.yaml")
    .split(/\r?\n/)
    .filter((l) => !l.trim().startsWith("#"))
    .join("\n");

test("E1 la compilation distante ne lance PAS pod install", () => {
  // Le modele officiel de Codemagic pour Capacitor en contient un. Capacitor 8 est passe a
  // Swift Package Manager et `cap add ios` ne produit aucun Podfile : la commande echouerait.
  assert.doesNotMatch(
    yamlNet(),
    /pod install/,
    "pod install est revenu : Capacitor 8 est en SPM, la commande echouerait",
  );
});

test("E2 les dependances npm sont installees AVANT la synchronisation iOS", () => {
  // Package.swift declare le plugin de coffre par un chemin relatif vers node_modules. Si la
  // resolution Swift tourne avant `npm ci`, ce chemin n'existe pas et l'erreur ne designe
  // pas sa cause.
  const net = yamlNet();
  const iNpm = net.indexOf("npm ci");
  const iSync = net.indexOf("npx cap sync ios");
  assert.ok(iNpm >= 0, "npm ci a disparu de la configuration de compilation");
  assert.ok(iSync >= 0, "npx cap sync ios a disparu de la configuration de compilation");
  assert.ok(
    iNpm < iSync,
    "npm ci doit preceder cap sync : sinon node_modules manque a la resolution Swift",
  );
});

test("E3 rien ne part vers l'App Store sans decision explicite", () => {
  const net = yamlNet();
  assert.match(net, /submit_to_testflight:\s*true/, "l'envoi vers TestFlight a ete retire");
  assert.match(
    net,
    /submit_to_app_store:\s*false/,
    "la soumission a l'App Store n'est plus explicitement desactivee",
  );
});

test("D2 le paquet web embarque n'entre pas dans le depot", () => {
  // ios/App/App/public est une copie de dist : 40 Mo de fichiers reconstructibles, et le
  // depot est public.
  const ignore = lire("ios/.gitignore");
  assert.match(ignore, /App\/App\/public/, "la copie du paquet web n'est plus exclue");
});

/* ==================================================================================
 * F. CE QU'APPLE RECLAME, ET QUE RIEN NE GARDAIT
 *
 * Ajoute le 29/10/2026 apres une mesure genante : ce fichier portait SEIZE releves sur le
 * projet iOS, et ZERO sur les chaines d'usage de l'Info.plist comme sur la declaration de
 * conformite a l'export. Un balayage de mutation l'a confirme en retirant la cle : tout
 * restait vert.
 * ================================================================================== */

test("F1 les trois chaines d'usage sont presentes, SOUS leur cle, et redigees", () => {
  /*
   * Apple REFUSE un envoi qui emploie une permission sans sa chaine d'usage. Et la chaine
   * est ce que l'utilisateur LIRA dans la demande d'autorisation : une phrase vide ou qui
   * repete le nom de la permission fait refuser l'acces, ce qui casse la fonction.
   *
   * ON VERIFIE LA VALEUR SOUS SA CLE, pas sa presence n'importe ou dans le fichier : un
   * motif qui cherche seulement la chaine resterait vert si la cle etait renommee et la
   * phrase laissee ailleurs. C'est le defaut que portent A1 et B3 de ce fichier.
   */
  const plist = lire(INFO);
  const CLES = [
    ["NSMicrophoneUsageDescription", "micro"],
    ["NSPhotoLibraryUsageDescription", "photo"],
    ["NSCameraUsageDescription", "appareil photo"],
  ] as const;
  for (const [cle] of CLES) {
    const m = new RegExp("<key>" + cle + "</key>\\s*<string>([^<]*)</string>").exec(plist);
    assert.ok(m, `${cle} est absente ou n'est pas suivie de sa valeur : Apple refusera l'envoi`);
    assert.ok(
      m[1].trim().length > 30,
      `${cle} porte une phrase trop courte pour expliquer l'usage : « ${m[1]} »`,
    );
    assert.ok(
      !m[1].includes(cle),
      `${cle} se contente de repeter son propre nom au lieu de dire a quoi ca sert`,
    );
  }
});

test("F2 la conformite a l'export est declaree, et c'est une DECLARATION", () => {
  /*
   * ITSAppUsesNonExemptEncryption repond d'avance a la question qu'Apple pose a chaque
   * televersement. Sans elle, la question revient a la main a chaque envoi — et une case
   * cochee de travers un jour de hate est une fausse declaration.
   *
   * La valeur false a ete declaree par David le 29/10/2026 : Talvex ne chiffre rien
   * lui-meme, il n'emploie que TLS et le coffre du systeme, tous deux exemptes.
   *
   * CE RELEVE NE SE << CORRIGE >> PAS A LA LEGERE. S'il rougit parce que la valeur est
   * passee a true, c'est qu'un chiffrement a ete ajoute : il faut alors revoir la
   * declaration auprès d'Apple, pas ajuster le releve.
   */
  const plist = lire(INFO);
  const m = /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<(true|false)\/>/.exec(plist);
  assert.ok(m, "la declaration de conformite a l'export a disparu : Apple reposera la question a chaque envoi");
  assert.equal(
    m[1],
    "false",
    "la conformite a l'export est passee a true : un chiffrement non exempte a-t-il ete ajoute ? "
    + "Si oui, Apple reclame des documents, et ce n'est pas au releve de ceder.",
  );
});

/* ==================================================================================
 * G. LA CHAINE GRATUITE : un .ipa non signe, pour l iPhone de David et lui seul
 *
 * Ajoutee le 29/10/2026. Son interet tient a UNE chose : elle ne signe pas, donc elle
 * n'exige aucune adhesion Apple Developer. Un reglage de signature qui reviendrait la
 * dedans la rendrait payante EN SILENCE — la compilation echouerait en reclamant un
 * certificat, et rien ne dirait pourquoi.
 * ================================================================================== */

test("G1 les deux chaines existent, et celle de l'iPhone personnel ne signe RIEN", () => {
  const net = yamlNet();
  assert.match(net, /^ {2}talvex-ios-perso:$/m, "la chaine gratuite a disparu");
  assert.match(net, /^ {2}talvex-ios:$/m, "la chaine TestFlight a disparu");

  /* On isole la chaine gratuite : tout ce qui suit sa declaration jusqu'a la suivante. */
  const debut = net.indexOf("  talvex-ios-perso:");
  const fin = net.indexOf("  talvex-ios:", debut);
  assert.ok(debut >= 0 && fin > debut, "l'ordre des deux chaines a change : ce releve doit etre relu");
  const perso = net.slice(debut, fin);

  assert.doesNotMatch(
    perso,
    /ios_signing/,
    "un bloc ios_signing est revenu dans la chaine gratuite : Codemagic chercherait un "
    + "certificat chez Apple, donc une adhesion a 99 $/an",
  );
  assert.doesNotMatch(
    perso,
    /app_store_connect|submit_to_testflight|use-profiles/,
    "la chaine gratuite s'est remise a parler a App Store Connect",
  );
  /* LES TROIS REGLAGES, et les trois sont necessaires : desarmer le seul CODE_SIGNING_ALLOWED
     laisse encore la cible exiger une identite de signature. */
  for (const reglage of ["CODE_SIGNING_ALLOWED=NO", "CODE_SIGNING_REQUIRED=NO", 'CODE_SIGN_IDENTITY=""']) {
    assert.ok(
      perso.includes(reglage),
      `${reglage} a disparu : l'archive redemanderait une signature, donc une adhesion payante`,
    );
  }
  assert.match(perso, /zip -qry/, "l'emballage en .ipa a disparu : il n'y aurait rien a telecharger");
});

test("G2 la chaine gratuite garde les memes garde-fous que la payante", () => {
  /*
   * Ne pas signer ne veut pas dire ne pas verifier. Les deux pieges mesures du projet
   * (npm ci avant la resolution Swift, aucun pod install) valent pour les deux chaines, et
   * les relevés de non-regression aussi : on ne pose pas sur son telephone une version dont
   * les garde-fous sont rouges.
   */
  const net = yamlNet();
  const debut = net.indexOf("  talvex-ios-perso:");
  const fin = net.indexOf("  talvex-ios:", debut);
  const perso = net.slice(debut, fin);
  for (const etape of ["npm ci", "npm run build", "npx cap sync ios", "npm test"]) {
    assert.ok(perso.includes(etape), `${etape} manque a la chaine gratuite`);
  }
  const iNpm = perso.indexOf("npm ci");
  const iSync = perso.indexOf("npx cap sync ios");
  assert.ok(iNpm < iSync, "npm ci doit preceder cap sync dans la chaine gratuite aussi");
  assert.doesNotMatch(perso, /pod install/, "pod install est revenu dans la chaine gratuite");
});
