/*
 * Produit la vignette du template « Numerologie celeste » A PARTIR DE LA SCENE REELLE.
 *
 * Pas une illustration, pas une image generee : une capture de ce que le template rend
 * vraiment, via sa propre route d'apercu. Si la scene change, on relance ce script et la
 * vignette suit. C'est la seule facon d'avoir une vignette qui ne mente jamais.
 *
 * Usage : node capture-vignette.mjs   (le serveur de dev doit tourner sur 5173)
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const LARGEUR = 1280;
const HAUTEUR = 720; // 16/9, le rapport impose par la carte de la bibliotheque
const SORTIE = 'C:/Users/David/Desktop/saas/saas david/SaaSClaude1/public/site-templates';

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: LARGEUR, height: HAUTEUR } });

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

// L'apercu n'accepte de rendre que dans une iframe de meme origine, qui lui envoie son
// contenu par postMessage. On reproduit exactement ce que fait SitePreviewFrame.
await page.evaluate(() => {
  const f = document.createElement('iframe');
  f.id = 'vignette';
  f.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483647';
  f.src = '/site-apercu';
  document.body.appendChild(f);
  window.addEventListener('message', e => {
    if (e.data && e.data.type === 'talvex-site-preview-ready') {
      f.contentWindow.postMessage(
        { type: 'talvex-site-preview-payload', payload: { templateKey: 'numerologie_celeste', appIconUrl: null } },
        location.origin,
      );
    }
  });
});

// On attend que la scene soit montee ET qu'elle ait eu le temps de rendre plusieurs images :
// capturer trop tot donnerait un ciel sans nuages, le raymarch n'ayant pas encore tourne.
await page.waitForFunction(() => {
  const f = document.getElementById('vignette');
  return !!f?.contentDocument?.querySelector('canvas');
}, null, { timeout: 60_000 });
await page.waitForTimeout(9_000);

mkdirSync(SORTIE, { recursive: true });
await page.screenshot({ path: `${SORTIE}/numerologie-celeste.jpg`, type: 'jpeg', quality: 82 });

const octets = (await import('node:fs')).statSync(`${SORTIE}/numerologie-celeste.jpg`).size;
console.log(`vignette ecrite : ${SORTIE}/numerologie-celeste.jpg  (${(octets / 1024).toFixed(1)} ko, ${LARGEUR}x${HAUTEUR})`);

await navigateur.close();
