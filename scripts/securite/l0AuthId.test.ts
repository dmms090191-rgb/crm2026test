// L0 : aucune cle de leads.data ne designe une conversation, un destinataire ou une identite.
//   node --import tsx --test scripts/securite/l0AuthId.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { idConversationLead } from "../../src/lib/conversationLead.ts";

/*
 * ============== CE QUE CE FICHIER SURVEILLE, ET POURQUOI ==============
 *
 * Jusqu'au lot L0 (19/11/2026), l'identifiant de conversation d'un lead etait calcule par la
 * cascade data['AuthId'] ?? data['auth_id'] ?? id, a 13 endroits de l'interface ET dans un
 * declencheur SECURITY DEFINER sans filtre de societe. Or `data` est rempli par l'import CSV et
 * modifiable par l'API : une colonne « AuthId » dans un fichier designait la conversation d'une
 * autre societe, bloquait la reaffectation des leads (une cellule vide fait echouer le cast en
 * uuid), detournait messagerie et notifications, et faisait passer la vraie conversation pour
 * orpheline dans le nettoyage de la sauvegarde.
 *
 * Ces releves empechent le RETOUR du defaut. Ils lisent le CODE prive de ses commentaires :
 * src/lib/conversationLead.ts cite volontairement l'ancienne cascade pour l'expliquer, et un
 * releve qui lirait la prose echouerait pour de mauvaises raisons — piege deja rencontre dans
 * ce depot.
 */

const RACINE = process.cwd();

/* Retire les commentaires d'un source TypeScript ou JavaScript EN S'APPUYANT SUR L'ANALYSEUR DE
   TYPESCRIPT, pas sur des expressions regulieres : une chaine comme 'image/*', une expression
   reguliere ou une URL dans du texte JSX ne sont pas des commentaires. Le retrait par regex
   avalait le code qui suivait 'image/*' jusqu'a la fin de commentaire suivante (constat de la
   contre-verification du 19/11/2026 sur src/lib/crmImmoDocuments.ts). Chaque commentaire est
   remplace par des espaces, sauts de ligne gardes : les positions du code ne bougent pas. */
function sansCommentairesTs(src: string, nom = "source.tsx"): string {
  const genre = /\.(tsx|jsx)$/.test(nom) ? ts.ScriptKind.TSX
    : /\.(js|mjs|cjs)$/.test(nom) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const fichier = ts.createSourceFile(nom, src, ts.ScriptTarget.Latest, true, genre);
  const plages: Array<[number, number]> = [];
  const noter = (debut: number, fin: number) => { plages.push([debut, fin]); };
  const visiter = (noeud: ts.Node): void => {
    if (noeud.kind >= ts.SyntaxKind.FirstJSDocNode && noeud.kind <= ts.SyntaxKind.LastJSDocNode) return;
    const enfants = noeud.getChildren(fichier);
    if (enfants.length > 0) { enfants.forEach(visiter); return; }
    /* Un texte JSX n'a pas de trivia : ce qui y ressemble a « // » ou « /* » est du texte. */
    if (noeud.kind === ts.SyntaxKind.JsxText || noeud.kind === ts.SyntaxKind.JsxTextAllWhiteSpaces) return;
    /* Les commentaires vivent dans la trivia qui precede chaque jeton : ceux de la meme ligne
       (« trailing » du jeton precedent) et ceux des lignes suivantes (« leading »). */
    const debut = noeud.getFullStart();
    ts.forEachTrailingCommentRange(src, debut, noter);
    ts.forEachLeadingCommentRange(src, debut, noter);
  };
  visiter(fichier);
  const car = src.split("");
  for (const [d, f] of plages) for (let i = d; i < f; i++) if (car[i] !== "\n") car[i] = " ";
  return car.join("");
}

const sansCommentairesSql = (src: string) => src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/--[^\n]*/g, "");

/* Les trois formes par lesquelles une cle de data peut designer une conversation :
   l'acces par crochets, l'acces par point, et le filtre PostgREST data->>AuthId. */
const MOTIFS_INTERDITS = [
  /\[\s*['"](AuthId|auth_id)['"]\s*\]/,
  /\bdata\??\.(AuthId|auth_id)\b/,
  /->>\s*'?(AuthId|auth_id)\b/,
];
const lectureInterdite = (code: string) => MOTIFS_INTERDITS.some(m => m.test(code));

/* Le detecteur EXHAUSTIF : n'importe quel jeton AuthId ou auth_id dans du CODE. Les trois motifs
   ci-dessus ne voient ni la destructuration (const { AuthId } = data), ni data!.AuthId, ni
   .contains('data', { auth_id }), ni data->'AuthId' : celui-ci voit tout, parce qu'aucun code
   vivant n'a de raison legitime d'ecrire ces cles. `\b` ne coupe pas client_auth_id ni
   clientAuthId : le « _ » et les lettres sont des caracteres de mot. */
const JETON_INTERDIT = /\b(AuthId|auth_id)\b/;

function fichiersSource(dossier: string, extensions = /\.(ts|tsx)$/, acc: string[] = []): string[] {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) fichiersSource(chemin, extensions, acc);
    else if (extensions.test(nom)) acc.push(chemin);
  }
  return acc;
}

/* Les fins de ligne sont normalisees DES LA LECTURE : sur ce poste, git convertit en CRLF au
   checkout, et une assertion qui contient "\n" echouerait sur un depot fraichement clone. */
const lireAbsolu = (chemin: string) => readFileSync(chemin, "utf8").replace(/\r\n/g, "\n");
const lire = (chemin: string) => lireAbsolu(join(RACINE, chemin));

test("idConversationLead rend l'id du lead, quoi que contienne data", () => {
  const ID = "7d4c2f0a-1b2c-4d5e-8f90-a1b2c3d4e5f6";
  const ETRANGER = "0e9d8c7b-6a5f-4e3d-9c2b-1a0f9e8d7c6b";
  const cas = [
    { id: ID, data: {} },
    { id: ID, data: { AuthId: ETRANGER } },
    { id: ID, data: { auth_id: ETRANGER } },
    { id: ID, data: { AuthId: "" } },
    { id: ID, data: { AuthId: "abc" } },
    { id: ID, data: { AuthId: null } },
  ];
  for (const lead of cas) {
    assert.equal(idConversationLead(lead), ID, `data = ${JSON.stringify(lead.data)}`);
  }
});

test("TEMOIN : le detecteur reconnait les cinq formes exactes de l'ancienne cascade", () => {
  /* Sans ce temoin, le releve suivant passerait aussi bien avec un detecteur casse. Ce sont
     les lignes telles qu'elles existaient avant L0, recopiees mot pour mot. */
  const ancien = [
    "const authId = l.data['AuthId'] ?? l.data['auth_id'] ?? l.id;",
    "const authId = lead.data?.['AuthId'] ?? lead.data?.['auth_id'] ?? lead.id;",
    "return lead ? (lead.data['AuthId'] ?? lead.data['auth_id'] ?? lead.id) : id;",
    "? (selectedLead.data['AuthId'] ?? selectedLead.data['auth_id'] ?? selectedLead.id)",
    ".or(`id.eq.${clientAuthId},data->>AuthId.eq.${clientAuthId},data->>auth_id.eq.${clientAuthId}`)",
  ];
  for (const ligne of ancien) assert.ok(lectureInterdite(ligne), `non detecte : ${ligne}`);
  /* Et il ne mord pas sur ce qui est legitime. */
  assert.ok(!lectureInterdite("const authId = idConversationLead(l);"));
  assert.ok(!lectureInterdite("const clientAuthId = selectedLead ? idConversationLead(selectedLead) : null;"));
});

test("aucun fichier de src/ ne lit AuthId ou auth_id dans data", () => {
  const fichiers = fichiersSource(join(RACINE, "src"));
  /* Garde-fou du garde-fou : un parcours vide passerait sans rien verifier. */
  assert.ok(fichiers.length > 300, `seulement ${fichiers.length} fichiers parcourus`);
  const fautifs = fichiers.filter(f => lectureInterdite(sansCommentairesTs(lireAbsolu(f), f)));
  assert.deepEqual(fautifs.map(f => f.slice(RACINE.length + 1)), [],
    "ces fichiers designent une conversation par une cle de data : passer par idConversationLead");
});

test("TEMOIN : le retrait des commentaires enleve la prose et ne mange aucun code", () => {
  const cas: Array<{ nom: string; src: string; garde: string[]; retire: string[] }> = [
    { /* Le piege du 19/11 : un retrait par regex avalait tout jusqu'a la fin de commentaire suivante. */
      nom: "a.ts",
      src: "const t = 'image/*';\nconst v = lead.data.AuthId;\n/* fin */\n",
      garde: ["'image/*'", "lead.data.AuthId"], retire: ["fin"] },
    { nom: "b.tsx",
      src: "const e = <a href=\"https://x\">http://y</a>;\n// AuthId en prose\nconst w = d.auth_id;\n",
      garde: ["https://x", "http://y", "d.auth_id"], retire: ["en prose"] },
    { nom: "c.tsx",
      src: "const f = <div>{/* AuthId cite */}{x}</div>;\n/** @see AuthId */\nconst r = /a\\/*/.test(s); const z = q.AuthId;\n",
      garde: ["/a\\/*/", "q.AuthId", "{x}"], retire: ["AuthId cite", "@see"] },
    { nom: "d.js",
      src: "const u = `${a} // pas un commentaire ${b}`; // vrai commentaire\nconst k = o.AuthId;\n",
      garde: ["// pas un commentaire", "o.AuthId"], retire: ["vrai commentaire"] },
  ];
  for (const { nom, src, garde, retire } of cas) {
    const code = sansCommentairesTs(src, nom);
    assert.equal(code.length, src.length, `${nom} : les positions ont bouge`);
    for (const g of garde) assert.ok(code.includes(g), `${nom} : du code a disparu : ${g}`);
    for (const r of retire) assert.ok(!code.includes(r), `${nom} : un commentaire est reste : ${r}`);
  }
});

test("TEMOIN : le detecteur exhaustif voit les formes que les trois motifs ne voient pas", () => {
  const formes = [
    "const { AuthId } = lead.data;",
    "const a = lead.data!.AuthId;",
    "const b = (l.data as any).auth_id;",
    "q.contains('data', { AuthId: id })",
    ".filter(\"data->'auth_id'\", 'eq', id)",
    "const c = get(lead.data, 'AuthId');",
  ];
  for (const f of formes) {
    assert.ok(JETON_INTERDIT.test(f), `non detecte : ${f}`);
    /* Et ces formes echappaient bien aux trois motifs : c'est ce que ce detecteur ajoute. */
    assert.ok(!lectureInterdite(f), `forme deja couverte par les trois motifs, temoin inutile : ${f}`);
  }
  for (const legitime of [
    "supabase.from('client_messages').select('client_auth_id')",
    "const clientAuthId = idConversationLead(lead);",
    "const authId = idConversationLead(l);",
  ]) assert.ok(!JETON_INTERDIT.test(legitime), `faux positif : ${legitime}`);
});

test("aucun jeton AuthId ou auth_id dans le CODE : src (toutes extensions), Edge Functions, service worker", () => {
  const fichiers = [
    ...fichiersSource(join(RACINE, "src"), /\.(ts|tsx|js|jsx|mjs|cjs)$/),
    ...fichiersSource(join(RACINE, "supabase", "functions"), /\.(ts|js|mjs)$/),
    join(RACINE, "public", "service-worker.js"),
  ];
  /* Garde-fous : un parcours ampute passerait sans rien verifier. */
  assert.ok(fichiers.filter(f => f.includes(join(RACINE, "src"))).length > 1200, "src/ incomplet");
  assert.ok(fichiers.filter(f => f.includes(join(RACINE, "supabase", "functions"))).length > 30, "supabase/functions incomplet");
  assert.ok(fichiers.some(f => /\.(js|jsx)$/.test(f) && f.includes(join(RACINE, "src"))), "les .js/.jsx de src/ ne sont pas parcourus");
  const fautifs = fichiers.filter(f => JETON_INTERDIT.test(sansCommentairesTs(lireAbsolu(f), f)));
  assert.deepEqual(fautifs.map(f => f.slice(RACINE.length + 1)), [],
    "ces fichiers ecrivent AuthId ou auth_id dans du code : une cle de data ne designe jamais une conversation, un destinataire ou une identite");
});

test("les messageries designent la conversation ET le destinataire du push par idConversationLead", () => {
  for (const chemin of ["src/pages/admin/views/ChatClient.tsx", "src/pages/vendor/views/VendorChatClient.tsx"]) {
    const code = sansCommentairesTs(lire(chemin));
    assert.ok(/const clientAuthId = selectedLead \? idConversationLead\(selectedLead\) : null;/.test(code),
      `${chemin} : clientAuthId ne vient pas de idConversationLead`);
    assert.ok(/sendPushForMessage\(\{ targetUserId: clientAuthId,/.test(code),
      `${chemin} : le push ne vise plus clientAuthId`);
  }
});

test("toute suppression de message des messageries est bornee a la Societe", () => {
  const attendu: Record<string, number> = {
    "src/pages/admin/views/ChatClient.tsx": 3,
    "src/pages/vendor/views/VendorChatClient.tsx": 2,
  };
  for (const [chemin, n] of Object.entries(attendu)) {
    const code = sansCommentairesTs(lire(chemin));
    const suppressions = code.match(/from\('client_messages'\)\.delete\(\)[^;\n]*/g) ?? [];
    assert.equal(suppressions.length, n, `${chemin} : ${suppressions.length} suppression(s), ${n} attendue(s)`);
    for (const s of suppressions) {
      assert.ok(s.includes(".eq('company_id', companyId)"), `${chemin} : suppression non bornee : ${s}`);
    }
  }
});

test("l'historique des notifications retrouve le lead par son id seul", () => {
  const code = sansCommentairesTs(lire("src/pages/admin/dashboard/useHistoriqueNotifications.ts"));
  assert.ok(code.includes(".eq('id', clientAuthId)"), "le lead n'est plus retrouve par son id");
});

test("la migration L0 : le declencheur ne lit plus data, reste dans la societe, droits retires", () => {
  const dossier = join(RACINE, "supabase", "migrations");
  /* Retrouvee par MOTIF : le fichier est renomme a la version du registre apres application. */
  const candidats = readdirSync(dossier).filter(n => n.endsWith("_l0_authid_ne_designe_plus_la_conversation.sql"));
  assert.equal(candidats.length, 1, `fichiers de migration L0 trouves : ${candidats.join(", ") || "aucun"}`);
  const sql = sansCommentairesSql(lireAbsolu(join(dossier, candidats[0])));

  const debut = sql.indexOf("create or replace function public.propagate_lead_vendor_id_to_client_messages()");
  assert.ok(debut >= 0, "la fonction de propagation n'est pas redefinie");
  const corpsDebut = sql.indexOf("as $$", debut);
  const corpsFin = sql.indexOf("$$;", corpsDebut + 5);
  const corps = sql.slice(corpsDebut, corpsFin);
  assert.ok(corps.length > 100, "corps de la fonction introuvable ou suspectement court");
  assert.ok(!/\bdata\b/.test(corps), "le corps de la propagation lit encore data");
  assert.ok(corps.includes("where client_auth_id = new.id"), "la conversation n'est plus celle du lead");
  assert.ok(corps.includes("and company_id = new.company_id"), "la propagation n'est plus bornee a la societe");
  assert.ok(corps.includes("v.company_id = new.company_id"), "un commercial d'une autre societe serait propage");

  const entete = sql.slice(debut, corpsDebut);
  assert.ok(entete.includes("security definer") && entete.includes("set search_path = ''"),
    "la propagation doit rester SECURITY DEFINER avec un search_path vide");

  for (const f of ["propagate_lead_vendor_id_to_client_messages", "leads_neutraliser_cle_authid"]) {
    assert.ok(sql.includes(`revoke all on function public.${f}()\n  from public, anon, authenticated, service_role;`),
      `EXECUTE n'est pas retire sur ${f}`);
  }

  assert.ok(sql.includes("before insert or update of data on public.leads"),
    "la neutralisation n'est pas declenchee a l'ecriture de data");
  assert.ok(sql.includes("'CSV · ' || k") && sql.includes("array['AuthId', 'auth_id']"),
    "AuthId / auth_id ne sont plus renommes en « CSV · … »");
});
