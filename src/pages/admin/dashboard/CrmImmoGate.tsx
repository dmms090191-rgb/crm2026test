import { Suspense, lazy } from 'react';
import { Lock, RefreshCw } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { peutOuvrirCrmImmo, accesRefuse, type EtatAcces } from '../../../lib/crmImmoAccess';
import { importCrmImmo } from './adminLazyViews';

/*
 * LA PORTE DU MODULE CRM IMMO.
 *
 * C'est la seule chose que le switch de AdminViewRenderer monte pour 'crm-immo'.
 * Le `case` existe TOUJOURS, dans les quatre etats du droit : c'est la Porte qui
 * decide, jamais le switch.
 *
 * ---------- POURQUOI PAS << return droit ? <Module/> : null >> ----------
 *
 * C'est le patron habituel du depot, et il est ici dangereux pour deux raisons
 * mesurees :
 *
 *   1. AdminViewRenderer:119 est `default: return <VueEnsemble />`. Un case
 *      absent, ou un case qui retomberait dans le default, OUVRE LE DASHBOARD.
 *      Aucune erreur de console, aucune erreur de build — et comme
 *      `npm run build` vaut `vite build` seul, Vercel deploierait le defaut.
 *      Un refus deguise en reussite est pire qu'une panne.
 *
 *   2. Rendre `null` sur un refus laisse une zone principale VIDE sous un fil
 *      d'Ariane qui dit << CRM Immo >>. C'est indiscernable d'un bug
 *      d'affichage : ni la Societe ni nous ne saurions si le module est
 *      interdit ou casse.
 *
 * Donc : trois ecrans NOMMES, et aucun silence.
 *
 * ---------- POURQUOI LE lazy() EST ICI ET NON DANS adminLazyViews ----------
 *
 * Declare ici, il est evalue uniquement dans la branche << accorde >>. Le module
 * ne peut donc PAS etre monte avant validation du droit — c'est garanti par la
 * structure, pas par la discipline. Meme choix que CSATalvexGate.
 *
 * Le garde-fou utile reste intact : CrmImmoGate est un import NORMAL du
 * renderer, donc l'oublier dans le switch leve TS6133 (noUnusedLocals) au
 * typecheck. Le trou qui reste — ne toucher NI l'import NI le case — est couvert
 * par e2e/crm-immo-acces.spec.ts.
 *
 * ---------- LE DROIT N'EST PAS CALCULE ICI ----------
 *
 * Il arrive en prop, depuis l'unique appel de useCrmImmoAccess dans
 * AdminDashboard. La barre laterale lit le MEME etat. Deux appels donneraient
 * deux verites : l'onglet existerait sans que la vue s'ouvre, ou l'inverse,
 * selon lequel des deux a repondu le premier.
 */

/*
 * LE PAQUET DE LA VUE EST PRELEVE D'AVANCE, ET SA FONCTION D'IMPORT VIT AILLEURS.
 *
 * La Porte garantit que la vue ne se monte pas sans le droit — c'est son role — mais
 * elle le garantit AU PRIX D'UNE SERIE : l'appel `import()` n'est evalue que dans la
 * branche « accorde », donc APRES la reponse de la RPC. Mesure en production : ce que ce
 * lazy declenche alors, c'est 31 fichiers que le navigateur n'a pas encore, soit
 * 129 225 octets bruts, decouverts en deux paliers — le paquet de la vue d'abord, ses
 * dependances ensuite. Tout cela sur le chemin du CLIC, devant un spinner.
 *
 * La RPC, elle, a repondu au montage du panel. AdminDashboard preleve donc le paquet sur
 * un creneau au repos des que le droit est connu, en appelant importCrmImmo — range dans
 * adminLazyViews avec importDocumentationCrm, qui sert exactement a cela.
 */
const CrmImmo = lazy(importCrmImmo);

/* Le spinner prend la couleur d'accent du theme actif. lazyFallback, dans
   AdminViewRenderer, est en border-orange-500 EN DUR : correct sur les 11 themes
   sombres, criard sur les 5 clairs, dont Talixy. */
function spinner(accent: string) {
  return (
    <div className="flex items-center justify-center py-12" data-testid="crm-immo-chargement">
      <div className="w-8 h-8 border-4 rounded-full animate-spin"
        style={{ borderColor: accent, borderTopColor: 'transparent' }} />
    </div>
  );
}

interface Props {
  etat: EtatAcces;
  onReessayer: () => void;
}

export default function CrmImmoGate({ etat, onReessayer }: Props) {
  const t = useThemeTokens();

  const chargement = spinner(t.accent.solid);

  if (peutOuvrirCrmImmo(etat)) {
    return <Suspense fallback={chargement}><CrmImmo /></Suspense>;
  }

  /* 'inconnu' : la question est en vol. On attend, on n'accuse personne. */
  if (etat === 'inconnu') return chargement;

  /* 'refuse' et 'erreur' se racontent differemment : un refus est definitif et
     s'explique, une panne est passagere et se reessaie. Les deux ferment. */
  const refus = accesRefuse(etat);

  return (
    <div className="flex items-center justify-center p-6 sm:p-12" data-testid={refus ? 'crm-immo-refus' : 'crm-immo-erreur'}>
      <div
        className="max-w-md w-full rounded-2xl p-6 text-center"
        style={{ background: t.card.bg, border: `1px solid ${t.card.border}`, boxShadow: t.card.shadow }}
      >
        <div
          className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4"
          style={{ background: refus ? t.surface.secondary : t.danger.bg, border: `1px solid ${refus ? t.surface.border : t.danger.border}` }}
        >
          {refus
            ? <Lock className="w-5 h-5" style={{ color: t.label.muted }} />
            : <RefreshCw className="w-5 h-5" style={{ color: t.danger.text }} />}
        </div>

        <h2 className="text-lg font-bold" style={{ color: t.heading.primary }}>
          {refus ? 'CRM Immo n’est pas active' : 'CRM Immo n’a pas pu etre verifie'}
        </h2>

        <p className="text-sm mt-2" style={{ color: t.label.muted }}>
          {refus
            ? 'Ce module n’est pas active pour votre societe. Contactez Talvex pour l’activer.'
            : 'Le droit d’acces n’a pas pu etre lu. Ce n’est pas un refus : la verification a echoue.'}
        </p>

        {!refus && (
          <button
            type="button"
            onClick={onReessayer}
            data-testid="crm-immo-reessayer"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
            style={{ background: t.accent.solid, color: t.text.inverse }}
          >
            <RefreshCw className="w-4 h-4" />
            Reessayer
          </button>
        )}
      </div>
    </div>
  );
}
