/**
 * LE BUCKET PRIVE RESISTE-T-IL A UN ACCES ANONYME ?
 * Lancer :  node scripts/crm-immo/documentsAccesAnonyme.mjs
 *
 * ---------- POURQUOI CE CONTROLE N EST PAS DANS LA SUITE AUTOMATIQUE ----------
 *
 * Il parle au vrai projet Supabase par le reseau, et il lit le .env local. Un test qui
 * depend du reseau n'a rien a faire dans une suite qu'on lance a froid : il serait rouge
 * hors connexion pour une raison qui n'est pas un defaut du code. Il porte donc
 * l'extension .mjs, et non .test.ts — l'agregateur de la suite ne prend que les *.test.ts.
 *
 * ---------- CE QU IL MESURE, ET POURQUOI IL N A BESOIN D AUCUNE SESSION ----------
 *
 * La cle anon est PUBLIQUE : elle est dans le bundle de production, donc quiconque ouvre
 * le JavaScript du site l'a. Ce fichier se place exactement dans cette position — celle
 * d'un visiteur non connecte qui a lu le code — et verifie que le bucket prive ne lui
 * cede rien : ni depot, ni lecture, ni URL signee, ni listage.
 *
 * ---------- LE TEMOIN POSITIF EST INDISPENSABLE ----------
 *
 * Sans lui, six refus pourraient venir d'une URL mal formee ou d'une cle invalide plutot
 * que de la securite. Le dernier controle lit donc un bucket PUBLIC existant : il DOIT
 * reussir. S'il echoue, les six autres ne prouvent rien.
 *
 * Resultat obtenu le 22 octobre 2026 : les 7 controles passent. Deux details valent d'etre
 * retenus — le depot est refuse par la policy elle-meme (<< new row violates row-level
 * security policy >>), et sur le chemin public Supabase repond << Bucket not found >> : il
 * ne reconnait meme pas l'existence d'un bucket prive.
 */
import { readFileSync, existsSync } from 'node:fs';

let url = '', key = '';
for (const f of ['.env', '.env.local', '.env.production']) {
  if (!existsSync(f)) continue;
  for (const ligne of readFileSync(f, 'utf8').split('\n')) {
    const u = /^VITE_SUPABASE_URL=(.*)$/.exec(ligne.trim());
    if (u) url = u[1].trim();
    const k = /^VITE_SUPABASE_ANON_KEY=(.*)$/.exec(ligne.trim());
    if (k) key = k[1].trim();
  }
}
if (!url || !key) {
  console.log('Ce controle a besoin de VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans le .env.');
  console.log('Lancez-le depuis la racine du projet.');
  process.exit(2);
}

const B = 'crm-immo-documents';
/* Un chemin PLAUSIBLE : la vraie Societe, le vrai dossier, un identifiant de document
   qui n'existe pas. C'est la position d'un attaquant qui a devine la forme du chemin. */
const COMPANY = '87875350-40c8-4ee5-be3b-9398fa4106bf';
const DOSSIER = 'a0f395b2-63e8-4ebf-94d4-7dd2a92b607c';
const chemin = `${COMPANY}/${DOSSIER}/00000000-0000-0000-0000-0000000000ff.pdf`;
const anon = { apikey: key, Authorization: 'Bearer ' + key };

let ko = 0;
const v = (nom, code, texte, accepte) => {
  const bon = accepte(code, texte);
  if (!bon) ko++;
  console.log(`${bon ? 'OK   ' : 'ECHEC'} | ${nom.padEnd(46)} HTTP ${code}  ${String(texte).replace(/\s+/g, ' ').slice(0, 64)}`);
};

/* 1. DEPOSER un fichier anonymement dans le bucket prive. */
{
  const r = await fetch(`${url}/storage/v1/object/${B}/${chemin}`, {
    method: 'POST',
    headers: { ...anon, 'Content-Type': 'application/pdf' },
    body: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x37]),
  });
  v('depot anonyme dans le bucket prive', r.status, await r.text(), c => c >= 400);
}
/* 2. LIRE un objet du bucket prive par son chemin, sans jeton utilisateur. */
{
  const r = await fetch(`${url}/storage/v1/object/${B}/${chemin}`, { headers: anon });
  v('lecture anonyme par chemin', r.status, await r.text(), c => c >= 400);
}
/* 3. LIRE par l URL PUBLIQUE permanente : la fuite que David refuse. */
{
  const r = await fetch(`${url}/storage/v1/object/public/${B}/${chemin}`);
  v('lecture par URL publique permanente', r.status, await r.text(), c => c >= 400);
}
/* 4. SIGNER une URL anonymement : le contournement evident. */
{
  const r = await fetch(`${url}/storage/v1/object/sign/${B}/${chemin}`, {
    method: 'POST', headers: { ...anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 600 }),
  });
  v('signature d URL anonyme', r.status, await r.text(), c => c >= 400);
}
/* 5. LISTER le contenu du bucket. Un 200 avec une liste VIDE est acceptable — la policy
      filtre — mais un 200 qui revele des noms ne l'est pas. */
{
  const r = await fetch(`${url}/storage/v1/object/list/${B}`, {
    method: 'POST', headers: { ...anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: '', limit: 100 }),
  });
  const txt = await r.text();
  v('listage anonyme du bucket', r.status, txt, (c, t) => c >= 400 || t.trim() === '[]');
}
/* 6. TEMOIN : la table des metadonnees doit refuser anon elle aussi. */
{
  const r = await fetch(`${url}/rest/v1/crm_immo_documents?select=id&limit=1`, { headers: anon });
  const txt = await r.text();
  v('TEMOIN : lecture anonyme de la table', r.status, txt, (c, t) => c >= 400 || t.trim() === '[]');
}
/* 7. TEMOIN POSITIF : un bucket PUBLIC existant se lit, lui. Sans ce controle, les six
      refus ci-dessus pourraient venir d'une URL mal formee plutot que de la securite. */
{
  const r = await fetch(`${url}/storage/v1/object/list/company-logos`, {
    method: 'POST', headers: { ...anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: '', limit: 1 }),
  });
  const txt = await r.text();
  const lisible = r.status === 200 && txt.trim() !== '[]';
  if (!lisible) ko++;
  console.log(`${lisible ? 'OK   ' : 'ECHEC'} | ${'TEMOIN POSITIF : un bucket PUBLIC se lit'.padEnd(46)} HTTP ${r.status}  ${txt.slice(0, 64)}`);
}

console.log('\n=> ' + (ko === 0 ? 'les 7 controles passent' : ko + ' controle(s) en echec'));
process.exit(ko === 0 ? 0 : 1);
