// Declare un artefact dans le centre de telechargement Talvex, sans recopie a la main.
//
//   node scripts/telechargement/preparerArtefact.mjs <plateforme> <fichier> [options]
//
//   plateforme   windows | macos | android | ios
//   fichier      le binaire reel, celui qui sera publie
//
//   --url <adresse>   l adresse publique de telechargement
//   --version <x.y.z> par defaut : celle de src-tauri/tauri.conf.json
//   --activer         passe le statut a « disponible » (refuse si une information manque)
//   --desactiver      repasse le statut a « bientot », sans effacer les informations
//
// POURQUOI CE SCRIPT EXISTE.
//
// Le manifeste porte une taille et une somme de controle SHA-256. Recopier ces valeurs a la
// main, c est se tromper un jour : une empreinte fausse ne casse rien de visible — la page ne
// la verifie pas — elle ment simplement a qui la compare. Ici, taille et empreinte sont LUES
// SUR LE FICHIER, jamais saisies.
//
// POURQUOI L ACTIVATION EST SEPAREE DE LA PREPARATION. Declarer un artefact et l OUVRIR AU
// PUBLIC sont deux decisions differentes. On prepare quand le fichier est bati ; on active
// quand il est publie a son adresse ET que plus rien ne s y oppose. Le 25/10/2026, Talvex
// Android etait bati, signe et verifie, mais les identifiants de comptes reels etaient encore
// lisibles dans l historique public du depot : l artefact a donc ete prepare sans etre active.
// Deux verbes, deux commandes.
//
// CE QUE LE SCRIPT REFUSE DE FAIRE : activer une plateforme dont l url, la version ou
// l empreinte manquent. C est la meme regle que celle du code (estTelechargeable), appliquee
// a l ecriture plutot qu a la lecture : on ne peut pas produire un manifeste qui mentirait.

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'

const MANIFESTE = 'public/telechargements.json'
const PLATEFORMES = ['windows', 'macos', 'android', 'ios']

const args = process.argv.slice(2)
const option = (nom) => {
  const i = args.indexOf(nom)
  return i >= 0 ? args[i + 1] : undefined
}
const drapeau = (nom) => args.includes(nom)

const plateforme = args[0]
const fichier = args[1] && !args[1].startsWith('--') ? args[1] : undefined

if (!PLATEFORMES.includes(plateforme)) {
  console.error(`Plateforme attendue : ${PLATEFORMES.join(' | ')}`)
  process.exit(1)
}

const manifeste = JSON.parse(readFileSync(MANIFESTE, 'utf8'))
const entree = manifeste[plateforme] ?? {}

// --- le fichier, s il est fourni : taille et empreinte lues, jamais saisies
if (fichier) {
  if (!existsSync(fichier)) {
    console.error(`Fichier introuvable : ${fichier}`)
    process.exit(1)
  }
  const octets = readFileSync(fichier)
  entree.taille = statSync(fichier).size
  entree.sha256 = createHash('sha256').update(octets).digest('hex').toUpperCase()
  console.log(`  fichier  : ${fichier}`)
  console.log(`  taille   : ${entree.taille} octets`)
  console.log(`  SHA-256  : ${entree.sha256}`)
}

// --- la version : celle du produit par defaut, pour qu il n y ait qu une seule source
const version = option('--version')
  ?? JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8')).version
if (version) {
  entree.version = version
  console.log(`  version  : ${version}`)
}

const url = option('--url')
if (url) {
  entree.url = url
  console.log(`  url      : ${url}`)
}

/**
 * Retelecharge le fichier depuis son adresse publique et compare a ce qui est declare.
 *
 * C est la verification qui a ete faite a la main pour Windows, le 25/10/2026, et qui a
 * permis d affirmer que le bouton menait au bon fichier. L automatiser, c est rendre
 * impossible le cas le plus gênant : une entree complete, un bouton actif, et une adresse
 * qui rend 404 ou un fichier different de celui qu on a bati.
 */
async function verifierEnLigne(adresse, tailleAttendue, empreinteAttendue) {
  const reponse = await fetch(adresse, { redirect: 'follow' })
  if (!reponse.ok) {
    // ON CONSOMME LE CORPS MEME EN CAS D ECHEC. Sans cela la connexion reste ouverte, et
    // Node se termine sur une assertion libuv illisible — « UV_HANDLE_CLOSING » — qui ferait
    // croire a un defaut du script alors que le message utile, lui, est deja affiche.
    await reponse.arrayBuffer().catch(() => undefined)
    return { ok: false, raison: `la page rend ${reponse.status}` }
  }
  const octets = Buffer.from(await reponse.arrayBuffer())
  const empreinte = createHash('sha256').update(octets).digest('hex').toUpperCase()
  if (octets.length !== tailleAttendue) {
    return { ok: false, raison: `taille ${octets.length}, attendue ${tailleAttendue}` }
  }
  if (empreinte !== empreinteAttendue) {
    return { ok: false, raison: 'empreinte differente du fichier bati' }
  }
  return { ok: true, octets: octets.length }
}

/*
 * UN REFUS NE COUPE PAS LE PROCESSUS, IL ARRETE L ECRITURE.
 *
 * process.exit() apres un fetch fait planter Node sous Windows sur une assertion libuv
 * (« UV_HANDLE_CLOSING ») : le pool de connexions se ferme encore quand le processus
 * disparait. Le message utile reste affiche, mais il est suivi d un pave illisible qui
 * donne l impression que le script est casse — alors qu il vient precisement de faire son
 * travail en refusant. On pose donc un drapeau, on laisse Node finir, et le code de sortie
 * dit quand meme l echec a qui enchainerait des commandes.
 */
let refuse = false

if (drapeau('--activer')) {
  const manquants = ['url', 'version', 'sha256'].filter((c) => !entree[c])
  if (manquants.length > 0) {
    console.error(`\n  REFUS d activer ${plateforme} : ${manquants.join(', ')} manque(nt).`)
    console.error('  La page afficherait un bouton vers rien. Completez d abord.')
    refuse = true
  } else {
    // On ne croit pas l adresse sur parole : on va chercher le fichier.
    console.log(`\n  verification de ${entree.url} ...`)
    let verdict
    try {
      verdict = await verifierEnLigne(entree.url, entree.taille, entree.sha256)
    } catch (e) {
      verdict = { ok: false, raison: `injoignable (${e.message})` }
    }
    if (!verdict.ok) {
      console.error(`  REFUS d activer ${plateforme} : ${verdict.raison}.`)
      console.error('  Publiez d abord le fichier a cette adresse, puis relancez.')
      refuse = true
    } else {
      console.log(`  verifie : ${verdict.octets} octets retelecharges, empreinte identique.`)
      entree.statut = 'disponible'
      entree.publie_le = new Date().toISOString().slice(0, 10)
      console.log(`  statut   : disponible  (publie le ${entree.publie_le})`)
    }
  }
} else if (drapeau('--desactiver')) {
  entree.statut = 'bientot'
  console.log('  statut   : bientot  (les informations sont conservees)')
} else {
  console.log(`  statut   : ${entree.statut ?? 'bientot'}  (inchange — utilisez --activer pour ouvrir au public)`)
}

if (refuse) {
  console.error(`\n  ${MANIFESTE} n a PAS ete modifie.`)
  process.exitCode = 1
} else {
  manifeste[plateforme] = entree
  writeFileSync(MANIFESTE, JSON.stringify(manifeste, null, 2) + '\n')
  console.log(`\n  ${MANIFESTE} mis a jour.`)

  if (entree.statut !== 'disponible') {
    console.log('  La page continuera d afficher « Bientot disponible » pour cette plateforme.')
  }
}
