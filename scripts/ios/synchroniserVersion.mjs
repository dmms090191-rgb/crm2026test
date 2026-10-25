// Aligne la version du projet iOS sur celle du produit.
//   node scripts/ios/synchroniserVersion.mjs
//
// POURQUOI UN SCRIPT PLUTOT QU UNE VALEUR ECRITE A LA MAIN.
//
// Le gabarit Capacitor pose MARKETING_VERSION = 1.0 et CURRENT_PROJECT_VERSION = 1, sans
// rapport avec la version du produit. Android avait le meme defaut, et il y est corrige
// directement dans build.gradle, qui est un script : Gradle peut lire tauri.conf.json au
// moment du build. Le projet Xcode, lui, est un fichier STATIQUE — project.pbxproj ne
// contient aucune logique. La synchronisation doit donc venir du dehors.
//
// CE QUE CELA EVITE. CFBundleVersion (CURRENT_PROJECT_VERSION) doit STRICTEMENT croitre a
// chaque televersement vers TestFlight ou l App Store : Apple refuse un numero deja vu, et le
// refus arrive apres le televersement, pas avant. Un numero fige a 1 bloquerait donc la
// deuxieme soumission, et le message d Apple ne dit pas ou se trouve le numero fautif.
//
// LA MEME FORMULE QUE SUR ANDROID : 0.1.0 donne 100, 0.1.1 donne 101, 0.2.0 donne 200,
// 1.0.0 donne 10000. Les deux plateformes avancent donc du meme pas, et un numero de build
// identifie la meme version partout.
//
// A LANCER quand la version change dans src-tauri/tauri.conf.json, et avant toute compilation
// distante. Le releve scripts/runtime/projetIos.test.ts verifie que cela a bien ete fait.

import { readFileSync, writeFileSync } from 'node:fs'

const SOURCE = 'src-tauri/tauri.conf.json'
const PBXPROJ = 'ios/App/App.xcodeproj/project.pbxproj'

const version = JSON.parse(readFileSync(SOURCE, 'utf8')).version
if (!version) {
  console.error(`${SOURCE} ne porte pas de champ "version".`)
  process.exit(1)
}

// Un suffixe comme « 0.2.0-beta » est ecarte avant le decoupage : CFBundleVersion doit etre
// une suite de nombres, et Apple refuse tout le reste.
const [maj = 0, min = 0, cor = 0] = version
  .replace(/[^0-9.].*/, '')
  .split('.')
  .map((n) => Number.parseInt(n, 10) || 0)
const build = maj * 10000 + min * 100 + cor

const avant = readFileSync(PBXPROJ, 'utf8')
let apres = avant
let remplaces = 0

apres = apres.replace(/MARKETING_VERSION = [^;]+;/g, () => {
  remplaces++
  return `MARKETING_VERSION = ${version};`
})
apres = apres.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, () => {
  remplaces++
  return `CURRENT_PROJECT_VERSION = ${build};`
})

if (remplaces === 0) {
  console.error('Aucun champ de version trouve dans le projet Xcode : le gabarit a change.')
  process.exit(1)
}

if (apres === avant) {
  console.log(`  deja a jour : ${version} (build ${build}), ${remplaces} champ(s) verifie(s)`)
} else {
  writeFileSync(PBXPROJ, apres)
  console.log(`  version posee : ${version}, build ${build}, dans ${remplaces} champ(s)`)
}
