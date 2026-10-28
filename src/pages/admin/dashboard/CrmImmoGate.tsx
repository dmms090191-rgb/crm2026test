import { Suspense, lazy } from 'react';
import { Lock, RefreshCw } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import {
  peutOuvrirCrmImmo, accesRefuse, type EtatAcces, type DetailErreur,
} from '../../../lib/crmImmoAccess';
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
  /*
   * Le code et le message REELS de l'echec, quand il y en a un.
   *
   * POURQUOI ILS SONT A L'ECRAN. Le 26/10/2026, un porteur a vu « la verification a echoue »
   * sur son telephone. Il a fallu une heure et les journaux du serveur pour apprendre que la
   * requete avait en fait REUSSI — 200, corps `true` — mais en 23 secondes, et que le
   * navigateur avait renonce avant. Le message generique ne disait pas de quel cote chercher.
   * Avec « TypeError: Failed to fetch » a l'ecran, la reponse etait immediate.
   *
   * Optionnel a dessein : la Porte reste montable sans, et les appelants qui n'en ont pas
   * n'ont rien a inventer.
   */
  detail?: DetailErreur | null;
  onReessayer: () => void;
  /*
   * Auth id de l'entite VISUALISEE, pour la preference de colonnes partagee (28/10/2026).
   *
   * La Porte ne s'en sert pas : elle le fait seulement DESCENDRE. Il traverse parce que
   * AdminDashboard est le seul endroit qui le tient sans aller-retour serveur, et que
   * CrmImmo est monte ici. Optionnel, comme `detail` : la Porte reste montable sans.
   */
  proprietaireReglage?: string | null;
}

export default function CrmImmoGate({ etat, detail, onReessayer, proprietaireReglage = null }: Props) {
  const t = useThemeTokens();

  const chargement = spinner(t.accent.solid);

  if (peutOuvrirCrmImmo(etat)) {
    return <Suspense fallback={chargement}><CrmImmo proprietaireReglage={proprietaireReglage} /></Suspense>;
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
            : detail?.transport
              /* Panne de transport : la reponse n'est jamais arrivee. On le dit en clair,
                 parce que le geste utile n'est pas le meme — ici, reessayer suffit souvent. */
              ? 'La reponse n’est pas arrivee jusqu’a vous. Ce n’est pas un refus : la connexion a ete trop lente ou interrompue.'
              : 'Le droit d’acces n’a pas pu etre lu. Ce n’est pas un refus : la verification a echoue.'}
        </p>

        {/* Le code et le message bruts : laids, et c'est voulu. C'est ce qui transforme un
            signalement en diagnostic, sans avoir a ouvrir les journaux du serveur. */}
        {!refus && detail && (
          <p
            data-testid="crm-immo-erreur-detail"
            className="text-xs mt-2 font-mono break-words"
            style={{ color: t.label.muted, opacity: 0.75 }}
          >
            {detail.code ? `${detail.code} — ${detail.message}` : detail.message}
          </p>
        )}

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
