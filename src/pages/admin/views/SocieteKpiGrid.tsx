import type { ReactNode } from 'react';
import {
  Users, Tag, UserCheck, MessageCircle, CalendarClock, UserPlus,
  AlertTriangle, Banknote, BadgeCheck, RefreshCw, CalendarX, Home, CalendarPlus,
} from 'lucide-react';
import type { useThemeTokens } from '../../../hooks/useThemeTokens';
import type { CategorieImmo, CompteursImmo } from '../../../lib/crmImmoEcheancier';

export interface KpiValues {
  leadsActifs: number | null;
  sansStatut: number;
  vendeurs: number;
  messages: number;
  rendezVous: number;
  enAttente: number;
}

type Tokens = ReturnType<typeof useThemeTokens>;

interface Kpi {
  key: string;
  label: string;
  sublabel: string;
  value: number | null;
  icon: ReactNode;
  accent: string;
  onClick?: () => void;
}

/**
 * La coquille d'une carte, et la grille. Les DEUX jeux de compteurs — le generique et
 * celui de CRM Immo — passent par ICI : ils sont donc identiques d'aspect par
 * construction, et non parce que quelqu'un a recopie quarante lignes de JSX.
 *
 * Presentation seule, aucune requete.
 */
function GrilleKpi({ kpis, tokens: t }: { kpis: Kpi[]; tokens: Tokens }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {kpis.map(k => {
        const cliquable = Boolean(k.onClick);
        return (
          <div
            key={k.key}
            onClick={k.onClick}
            role={cliquable ? 'button' : undefined}
            tabIndex={cliquable ? 0 : undefined}
            aria-label={cliquable ? `${k.label} : ${k.sublabel}` : undefined}
            onKeyDown={cliquable
              ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); k.onClick?.(); } }
              : undefined}
            className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 transition-all duration-200${cliquable ? ' cursor-pointer hover:brightness-110 active:scale-[0.99]' : ''}`}
            style={{
              background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
              border: `1px solid ${t.surface.border}`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full" style={{ background: k.accent }} />

            <div className="flex items-start justify-between gap-3 pl-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${k.accent}14`, border: `1px solid ${k.accent}26`, color: k.accent }}
                  >
                    {k.icon}
                  </span>
                  <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: k.accent }}>
                    {k.label}
                  </span>
                </div>
                <p className="text-[11px] mt-2 leading-tight" style={{ color: t.text.quaternary }}>{k.sublabel}</p>
              </div>

              <span
                className="text-2xl sm:text-3xl font-bold tabular-nums leading-none flex-shrink-0"
                style={{ color: k.value === null ? t.text.quaternary : t.text.primary }}
              >
                {k.value === null ? '—' : k.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  values: KpiValues;
  tokens: Tokens;
  onSansStatutClick?: () => void;
}

/** Cartes KPI de la vue d'ensemble Societe — le jeu GENERIQUE, inchange. */
export default function SocieteKpiGrid({ values, tokens: t, onSansStatutClick }: Props) {
  const kpis: Kpi[] = [
    { key: 'leads', label: 'Leads actifs', sublabel: 'Dans votre CRM', value: values.leadsActifs, icon: <Users className="w-4 h-4" />, accent: '#60a5fa' },
    { key: 'sans', label: 'Sans statut', sublabel: 'À qualifier', value: values.sansStatut, icon: <Tag className="w-4 h-4" />, accent: '#f59e0b', onClick: onSansStatutClick },
    { key: 'vendeurs', label: 'Vendeurs', sublabel: 'Votre équipe', value: values.vendeurs, icon: <UserCheck className="w-4 h-4" />, accent: '#34d399' },
    { key: 'messages', label: 'Messages', sublabel: 'Conversations à ouvrir', value: values.messages, icon: <MessageCircle className="w-4 h-4" />, accent: '#818cf8' },
    { key: 'rdv', label: 'Rendez-vous', sublabel: 'À traiter', value: values.rendezVous, icon: <CalendarClock className="w-4 h-4" />, accent: '#f472b6' },
    { key: 'attente', label: 'Inscriptions', sublabel: 'En attente', value: values.enAttente, icon: <UserPlus className="w-4 h-4" />, accent: '#22d3ee' },
  ];
  return <GrilleKpi kpis={kpis} tokens={t} />;
}

interface PropsImmo {
  compteurs: CompteursImmo;
  /** Vrai pendant le premier chargement : on affiche un tiret, jamais un zero trompeur. */
  chargement: boolean;
  tokens: Tokens;
  /** Ouvre la page du module sur la categorie de la carte cliquee. */
  onOuvrirModule?: (categorie: CategorieImmo) => void;
}

/**
 * Cartes KPI de la vue d'ensemble d'une Societe QUI POSSEDE CRM IMMO.
 *
 * ---------- LES QUATRE CATEGORIES DE CONTRAT SONT UNE PARTITION ----------
 *
 * David, le 22 octobre 2026 : « Je veux une partition stricte. Un contrat ne doit
 * apparaitre que dans UNE seule de ces quatre categories. »
 *
 * Un bail est donc soit expire, soit a venir, soit a renouveler (fin sous 30 jours),
 * soit en cours (fin au-dela de 30 jours) — jamais deux a la fois. Les quatre chiffres
 * s'additionnent, et leur somme est le nombre de baux. Les sous-titres disent la borne
 * de chacun, parce qu'une carte « Dossiers en cours » qui tairait qu'elle exclut les
 * fins proches serait lue comme un total.
 *
 * ---------- PENDANT LE CHARGEMENT, UN TIRET ----------
 *
 * classerTableauDeBord rend des zeros quand il n'a rien a compter. Afficher ces zeros
 * pendant la premiere requete dirait « aucun loyer en retard » a une Societe qui en a
 * trois. On affiche donc un tiret, comme le fait deja la carte Leads actifs.
 *
 * ---------- OU MENE CHAQUE CARTE ----------
 *
 * Chacune ouvre la page du module sur SA categorie, pas sur « Tous ». La page lit le
 * MEME classement que ces cartes, par le contexte : la liste affichee est donc
 * exactement celle qui a ete comptee ici.
 *
 * Attention a l'unite, pour les trois cartes de loyer : le chiffre compte des
 * ECHEANCES, la liste montre des DOSSIERS. Neuf loyers en retard peuvent n'appartenir
 * qu'a un seul dossier. La barre de filtres de la page affiche les deux nombres.
 */
export function SocieteKpiGridImmo({ compteurs: c, chargement, tokens: t, onOuvrirModule }: PropsImmo) {
  const v = (n: number) => (chargement ? null : n);
  const vers = (categorie: CategorieImmo) =>
    (onOuvrirModule ? () => onOuvrirModule(categorie) : undefined);

  const kpis: Kpi[] = [
    { key: 'loyers-en-retard', label: 'Loyers en retard', sublabel: 'Échéance passée, non encaissée', value: v(c.loyersEnRetard), icon: <AlertTriangle className="w-4 h-4" />, accent: '#f87171', onClick: vers('loyers-en-retard') },
    { key: 'loyers-a-encaisser', label: 'Loyers à encaisser', sublabel: 'Dus ce mois-ci', value: v(c.loyersAEncaisser), icon: <Banknote className="w-4 h-4" />, accent: '#f59e0b', onClick: vers('loyers-a-encaisser') },
    { key: 'encaisses-ce-mois', label: 'Encaissés ce mois', sublabel: 'Reçus ce mois-ci, toute échéance', value: v(c.encaissesCeMois), icon: <BadgeCheck className="w-4 h-4" />, accent: '#34d399', onClick: vers('encaisses-ce-mois') },
    { key: 'contrats-a-renouveler', label: 'Contrats à renouveler', sublabel: 'Bail actif, fin sous 30 jours', value: v(c.contratsARenouveler), icon: <RefreshCw className="w-4 h-4" />, accent: '#22d3ee', onClick: vers('contrats-a-renouveler') },
    { key: 'baux-expires', label: 'Baux expirés', sublabel: 'Fin déjà passée, non renouvelés', value: v(c.bauxExpires), icon: <CalendarX className="w-4 h-4" />, accent: '#fb7185', onClick: vers('baux-expires') },
    { key: 'dossiers-en-cours', label: 'Dossiers en cours', sublabel: 'Bail actif, fin au-delà de 30 jours', value: v(c.dossiersEnCours), icon: <Home className="w-4 h-4" />, accent: '#60a5fa', onClick: vers('dossiers-en-cours') },
    { key: 'baux-a-venir', label: 'Baux à venir', sublabel: 'Commencent plus tard', value: v(c.bauxAVenir), icon: <CalendarPlus className="w-4 h-4" />, accent: '#818cf8', onClick: vers('baux-a-venir') },
  ];
  return <GrilleKpi kpis={kpis} tokens={t} />;
}
