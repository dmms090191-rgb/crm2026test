// Lance TOUS les releves du projet, et rien d'autre.
//   npm test
//
// POURQUOI UN LANCEUR PLUTOT QU'UN GLOB DANS package.json.
//
// Trois facons de faire ont ete essayees le 25/10/2026, et deux sont fausses :
//
//   node --import tsx --test
//       La decouverte automatique de Node ramasse aussi e2e/, soit 16 specifications
//       Playwright qui ne tournent pas sous node:test et feraient echouer la commande.
//
//   node --import tsx --test "scripts/**/*.test.ts"
//       Le glob de Node n'a rendu que 796 tests la ou l'enumeration explicite en trouve 828 :
//       des fichiers etaient silencieusement omis. Un garde-fou qui s'exerce sur une partie
//       du parc sans le dire est pire qu'absent, puisqu'il rassure a tort.
//
//   l'enumeration explicite, ci-dessous
//       Elle parcourt les deux racines qui portent des releves et passe chaque fichier a Node.
//       Le compte affiche est donc verifiable : il doit correspondre a ce que `find` trouve.
//
// AJOUTER UNE RACINE ici si un jour des releves vivent ailleurs. En revanche e2e/ reste
// dehors : ces specifications se lancent par `npm run test:e2e`, avec Playwright.

import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const RACINES = ['scripts', 'supabase/functions']

function releves(dossier, acc = []) {
  let entrees
  try {
    entrees = readdirSync(dossier)
  } catch {
    return acc // racine absente : on ne fait pas tomber la commande pour autant
  }
  for (const nom of entrees) {
    if (nom === 'node_modules' || nom.startsWith('.')) continue
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) releves(chemin, acc)
    else if (nom.endsWith('.test.ts')) acc.push(chemin)
  }
  return acc
}

const fichiers = RACINES.flatMap((r) => releves(r))

if (fichiers.length === 0) {
  console.error('Aucun releve trouve. Lancez cette commande depuis la racine du projet.')
  process.exit(1)
}

console.log(`${fichiers.length} fichiers de releves, dans ${RACINES.join(' et ')}\n`)

const resultat = spawnSync('node', ['--import', 'tsx', '--test', ...fichiers], {
  stdio: 'inherit',
})

process.exit(resultat.status ?? 1)
