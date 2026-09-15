// Reflet planaire additif du sol (niveau Ultra seulement).
// Implementation maison inspiree de three/examples/jsm/objects/Reflector.js : camera miroir par
// rapport au plan y = dessus du sol, projection oblique (clipping du plan), rendu de la scene
// dans un render target avec le sol masque, puis injection dans le materiau du sol par
// onBeforeCompile (via patchs.js, pour se composer avec le patch IBL de Scene.jsx).
// On n'utilise pas MeshReflectorMaterial de drei : il module l'albedo avant la lightmap et
// reflechit selon le +Z local du maillage.
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { poserPatch, retirerPatch } from './patchs.js'

const NORMALE = new THREE.Vector3(0, 1, 0)
const BIAIS = new THREE.Matrix4().set(
  0.5, 0.0, 0.0, 0.5,
  0.0, 0.5, 0.0, 0.5,
  0.0, 0.0, 0.5, 0.5,
  0.0, 0.0, 0.0, 1.0,
)

// GLSL insere apres l'eclairage : reflet lu par projection, module par un Fresnel simple
const GLSL_REFLET = /* glsl */`
  if ( vReflet.w > 0.0 ) {
    float refletFresnel = pow( 1.0 - saturate( dot( geometryViewDir, geometryNormal ) ), 5.0 );
    vec3 refletCouleur = textureProjLod( tReflet, vReflet, refletFlou ).rgb;
    outgoingLight += refletCouleur * refletForce * ( 0.35 + 0.65 * refletFresnel );
  }
`

function patchReflet(uniformes) {
  return (shader) => {
    Object.assign(shader.uniforms, uniformes)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 refletMatrice;\nvarying vec4 vReflet;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n\tvReflet = refletMatrice * modelMatrix * vec4( transformed, 1.0 );')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tReflet;\nuniform float refletForce;\nuniform float refletFlou;\nvarying vec4 vReflet;')
      .replace('#include <opaque_fragment>', GLSL_REFLET + '\n#include <opaque_fragment>')
  }
}

// vecteurs de travail (pas d'allocation par image)
const _posCam = new THREE.Vector3(), _vue = new THREE.Vector3(), _regard = new THREE.Vector3()
const _cible = new THREE.Vector3(), _rot = new THREE.Matrix4(), _plan = new THREE.Plane()
const _clip = new THREE.Vector4(), _q = new THREE.Vector4()

/**
 * sol : maillage dont le materiau s'appelle mat_sol_chene__shell.
 * taille : resolution du render target (1024 bureau, 512 telephone).
 * pause : ne rend pas (sonde en cours). version : force un nouveau rendu (textures changees).
 */
export default function Reflet({ actif = false, sol = null, taille = 1024, pause = false, version = 0, force = 0.16, flou = 1.5 }) {
  const { gl, scene, camera } = useThree()
  const etat = useRef(null)

  useEffect(() => {
    if (!actif || !sol?.material) return
    const demiFlottant = gl.capabilities.isWebGL2 &&
      (gl.extensions.has('EXT_color_buffer_half_float') || gl.extensions.has('EXT_color_buffer_float'))
    const rt = new THREE.WebGLRenderTarget(taille, taille, {
      type: demiFlottant ? THREE.HalfFloatType : THREE.UnsignedByteType,
      minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
      generateMipmaps: true, depthBuffer: true, stencilBuffer: false,
    })
    rt.texture.name = 'reflet_sol'
    const uniformes = {
      tReflet: { value: rt.texture },
      refletMatrice: { value: new THREE.Matrix4() },
      refletForce: { value: force },
      refletFlou: { value: flou },
    }
    // plan de reflexion : dessus de la boite englobante du sol, en coordonnees monde
    const boite = new THREE.Box3().setFromObject(sol)
    const point = new THREE.Vector3((boite.min.x + boite.max.x) / 2, boite.max.y, (boite.min.z + boite.max.z) / 2)
    poserPatch(sol.material, 'reflet', patchReflet(uniformes))
    etat.current = {
      rt, cam: new THREE.PerspectiveCamera(), uniformes, point,
      derniere: new THREE.Matrix4().makeScale(0, 0, 0), derniereProj: new THREE.Matrix4().makeScale(0, 0, 0),
      enRendu: false, forces: 3,
    }
    return () => {
      // desactivation : retrait du patch, recompilation, liberation du render target
      retirerPatch(sol.material, 'reflet')
      rt.dispose()
      etat.current = null
    }
  }, [actif, sol, taille, gl])

  useEffect(() => {
    const e = etat.current
    if (!e) return
    e.uniformes.refletForce.value = force
    e.uniformes.refletFlou.value = flou
    e.forces = 3
  }, [force, flou, version, pause, actif])

  useFrame(() => {
    const e = etat.current
    if (!e || pause || e.enRendu) return
    camera.updateMatrixWorld()
    // rien a refaire quand ni la pose ni la projection de la camera n'ont change (scene
    // statique) ; la projection change sans deplacement lors d'un redimensionnement, d'une
    // rotation du telephone ou d'une bascule de cadrage
    if (e.forces <= 0 && camera.matrixWorld.equals(e.derniere) && camera.projectionMatrix.equals(e.derniereProj)) return

    const { rt, cam, point, uniformes } = e
    _posCam.setFromMatrixPosition(camera.matrixWorld)
    _vue.subVectors(point, _posCam)
    if (_vue.dot(NORMALE) > 0) return          // camera sous le sol : rien a reflechir
    _vue.reflect(NORMALE).negate().add(point)   // position de la camera miroir

    _rot.extractRotation(camera.matrixWorld)
    _regard.set(0, 0, -1).applyMatrix4(_rot).add(_posCam)
    _cible.subVectors(point, _regard).reflect(NORMALE).negate().add(point)

    cam.position.copy(_vue)
    cam.up.set(0, 1, 0).applyMatrix4(_rot).reflect(NORMALE)
    cam.lookAt(_cible)
    cam.far = camera.far
    cam.updateMatrixWorld()
    cam.projectionMatrix.copy(camera.projectionMatrix)

    // matrice de texture (avant la projection oblique, comme Reflector.js)
    uniformes.refletMatrice.value.copy(BIAIS).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse)

    // projection oblique : le plan proche devient le plan du sol (Lengyel)
    _plan.setFromNormalAndCoplanarPoint(NORMALE, point).applyMatrix4(cam.matrixWorldInverse)
    _clip.set(_plan.normal.x, _plan.normal.y, _plan.normal.z, _plan.constant)
    const P = cam.projectionMatrix.elements
    _q.x = (Math.sign(_clip.x) + P[8]) / P[0]
    _q.y = (Math.sign(_clip.y) + P[9]) / P[5]
    _q.z = -1.0
    _q.w = (1.0 + P[10]) / P[14]
    _clip.multiplyScalar(2.0 / _clip.dot(_q))
    P[2] = _clip.x; P[6] = _clip.y; P[10] = _clip.z + 1.0; P[14] = _clip.w

    // rendu dans le render target, sol masque, garde contre la recursion
    e.enRendu = true
    const visible = sol.visible
    sol.visible = false
    const rtAvant = gl.getRenderTarget()
    const xr = gl.xr.enabled, ombres = gl.shadowMap.autoUpdate
    gl.xr.enabled = false; gl.shadowMap.autoUpdate = false
    gl.setRenderTarget(rt)
    gl.state.buffers.depth.setMask(true)
    if (gl.autoClear === false) gl.clear()
    gl.render(scene, cam)
    gl.xr.enabled = xr; gl.shadowMap.autoUpdate = ombres
    gl.setRenderTarget(rtAvant)
    sol.visible = visible
    e.enRendu = false

    e.derniere.copy(camera.matrixWorld)
    e.derniereProj.copy(camera.projectionMatrix)
    if (e.forces > 0) e.forces--
  })

  return null
}
