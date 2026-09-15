// Composition de patchs de shader sur un materiau three.js.
// Plusieurs modules (IBL diffus, reflet du sol) veulent modifier le meme materiau via
// onBeforeCompile : on tient un registre par materiau, un seul onBeforeCompile applique
// tous les patchs presents, et customProgramCacheKey reflete la combinaison pour que
// three compile un programme distinct par combinaison.

const registres = new WeakMap()

function registre(material) {
  let r = registres.get(material)
  if (r) return r
  r = new Map()
  registres.set(material, r)
  material.onBeforeCompile = (shader, renderer) => {
    for (const p of r.values()) p(shader, renderer)
  }
  material.customProgramCacheKey = () => 'patchs:' + [...r.keys()].sort().join('|')
  return r
}

/** Pose (ou remplace) le patch `nom` : fonction (shader, renderer) => void. */
export function poserPatch(material, nom, patch) {
  registre(material).set(nom, patch)
  material.needsUpdate = true
}

export function retirerPatch(material, nom) {
  const r = registres.get(material)
  if (r && r.delete(nom)) material.needsUpdate = true
}

export const aPatch = (material, nom) => !!registres.get(material)?.has(nom)
