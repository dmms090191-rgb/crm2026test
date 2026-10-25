import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

/*
 * ============== POURQUOI CE PLUGIN EXISTE ==============
 *
 * La page « Structure du CRM » affiche l'arborescence du projet. Elle obtenait la liste des
 * fichiers par cinq import.meta.glob, dont quatre avec query:'?raw' :
 *
 *   const SRC_FILES = Object.keys(import.meta.glob('/src/**''/*.{ts,tsx,css,json}', ...));
 *   const SCRIPTS_FILES = Object.keys(import.meta.glob('/scripts/**''/*.{ts,js}', { query: '?raw' }));
 *   ... et trois autres sur /supabase.
 *
 * Seules les CLES etaient utilisees — jamais le contenu. Mais import.meta.glob, meme avec
 * eager:false, oblige Vite a EMETTRE un module par fichier trouve, pour que les imports
 * dynamiques soient resolvables. Le code source du projet partait donc dans le paquet public :
 * tout src/, toutes les migrations SQL, toutes les edge functions, tous les scripts.
 *
 * MESURE DU 25/10/2026, sur le meme commit, en ne changeant que ces cinq lignes :
 *   avec les globs    : 1 190 fichiers dans dist/assets, 12 Mo
 *   sans les globs    :   119 fichiers,                 5,7 Mo
 *   soit une fuite de 1 071 fichiers et 6,3 Mo — plus de la moitie du paquet.
 *
 * Depuis la creation du projet Android, cela partait aussi dans l'APK.
 *
 * POURQUOI PAS SIMPLEMENT RETIRER query:'?raw'. Essaye et mesure : le build ECHOUE. Sans
 * ?raw, Rollup tente de resoudre les .sql et les .toml comme des modules JavaScript et
 * s'arrete. Le ?raw n'etait donc pas la cause, seulement ce qui rendait la chose possible.
 *
 * CE QUE FAIT CE PLUGIN. Il parcourt le disque et ecrit la seule chose dont la page a besoin :
 * la LISTE DES CHEMINS, dans src/generated/structureProjet.json. Aucun contenu de fichier
 * n'est lu, donc rien ne peut fuiter. Le JSON s'importe normalement (resolveJsonModule est
 * deja actif), exactement comme src/generated/auditSnapshot.json, dont ce plugin reprend le
 * motif — y compris le rafraichissement en developpement.
 *
 * DIFFERENCE AVEC auditPlugin.ts, ET ELLE EST VOULUE : auditPlugin porte apply:'serve' et ne
 * tourne qu'en developpement, son instantane etant commite pour la production. Ici le JSON est
 * aussi regenere au buildStart, donc l'arborescence affichee est exacte a chaque build, en
 * local comme sur Vercel, sans dependre de quelqu'un qui penserait a la rafraichir.
 */

/** Les memes motifs que les cinq globs d'origine, dans le meme ordre. */
const MOTIFS: Array<{ cle: string; racine: string; extensions: string[]; recursif: boolean }> = [
  { cle: 'src', racine: 'src', extensions: ['.ts', '.tsx', '.css', '.json'], recursif: true },
  { cle: 'supabaseFunctions', racine: 'supabase/functions', extensions: ['.ts'], recursif: true },
  { cle: 'supabaseMigrations', racine: 'supabase/migrations', extensions: ['.sql'], recursif: true },
  { cle: 'supabaseRoot', racine: 'supabase', extensions: ['.toml', '.sql'], recursif: false },
  { cle: 'scripts', racine: 'scripts', extensions: ['.ts', '.js'], recursif: true },
];

const SORTIE = path.join('src', 'generated', 'structureProjet.json');

/**
 * Les chemins sont rendus AVEC leur barre oblique de tete, comme le faisait import.meta.glob :
 * syncStructure() depouille « /supabase/functions/ » pour compter les edge functions, et ce
 * depouillage echouerait sur un chemin relatif. La forme compte autant que le contenu.
 */
function collecter(racineProjet: string, m: (typeof MOTIFS)[number]): string[] {
  const depart = path.resolve(racineProjet, m.racine);
  const trouves: string[] = [];

  const parcourir = (dossier: string) => {
    let entrees: fs.Dirent[];
    try {
      entrees = fs.readdirSync(dossier, { withFileTypes: true });
    } catch {
      return; // dossier absent : on rend une liste vide, comme un glob sans correspondance
    }
    for (const e of entrees) {
      // fast-glob, qu'utilise import.meta.glob, ignore les entrees commencant par un point.
      if (e.name.startsWith('.')) continue;
      const complet = path.join(dossier, e.name);
      if (e.isDirectory()) {
        if (!m.recursif) continue;
        if (e.name === 'node_modules') continue;
        parcourir(complet);
      } else if (m.extensions.includes(path.extname(e.name))) {
        trouves.push('/' + path.relative(racineProjet, complet).split(path.sep).join('/'));
      }
    }
  };

  parcourir(depart);
  return trouves.sort();
}

export function construireStructure(racineProjet: string): Record<string, string[]> {
  const resultat: Record<string, string[]> = {};
  for (const m of MOTIFS) resultat[m.cle] = collecter(racineProjet, m);

  // Le fichier produit vit sous src/ et correspond au motif de la cle « src » : s'il n'etait
  // ajoute qu'au parcours suivant, la premiere generation differerait de la seconde et le
  // depot porterait un diff a chaque fois. On le pose donc des maintenant.
  const soi = '/' + SORTIE.split(path.sep).join('/');
  if (!resultat.src.includes(soi)) {
    resultat.src.push(soi);
    resultat.src.sort();
  }
  return resultat;
}

function ecrire(racineProjet: string): string {
  const chemin = path.resolve(racineProjet, SORTIE);
  const contenu = JSON.stringify(construireStructure(racineProjet), null, 2) + '\n';

  // On n'ecrit que si le contenu change : sinon le serveur de developpement se rechargerait
  // en boucle, puisqu'il surveille src/.
  let precedent: string | null = null;
  try {
    precedent = fs.readFileSync(chemin, 'utf-8');
  } catch { /* premiere generation */ }
  if (precedent !== contenu) {
    fs.mkdirSync(path.dirname(chemin), { recursive: true });
    fs.writeFileSync(chemin, contenu);
  }
  return chemin;
}

export default function structureProjetPlugin(): Plugin {
  let racineProjet = '';
  let minuteur: ReturnType<typeof setTimeout> | null = null;
  let serveur: ViteDevServer | null = null;

  const rafraichir = () => {
    if (minuteur) clearTimeout(minuteur);
    minuteur = setTimeout(() => {
      try {
        const chemin = ecrire(racineProjet);
        if (serveur) {
          const mod = serveur.moduleGraph.getModuleById(chemin);
          if (mod) {
            serveur.moduleGraph.invalidateModule(mod);
            serveur.ws.send({ type: 'full-reload' });
          }
        }
      } catch { /* ne jamais faire tomber le serveur de developpement */ }
    }, 300);
  };

  return {
    name: 'talvex-structure-projet',

    configResolved(config) {
      racineProjet = config.root;
    },

    // En PRODUCTION : la liste est refaite avant la compilation, donc toujours exacte.
    buildStart() {
      try {
        ecrire(racineProjet);
      } catch { /* un echec ici ne doit pas casser le build : le JSON commite sert de repli */ }
    },

    configureServer(srv) {
      serveur = srv;
      try {
        ecrire(racineProjet);
      } catch { /* ignore */ }
    },

    // Un fichier ajoute ou supprime change l'arborescence ; une simple edition, non.
    watchChange(_id, change) {
      if (change.event === 'update') return;
      rafraichir();
    },
  };
}
