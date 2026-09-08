import type { ReactNode } from 'react';
import { Users, Tag, UserCheck, MessageCircle, CalendarClock, UserPlus } from 'lucide-react';
import type { useThemeTokens } from '../../../hooks/useThemeTokens';

export interface KpiValues {
  leadsActifs: number | null;
  sansStatut: number;
  vendeurs: number;
  messages: number;
  rendezVous: number;
  enAttente: number;
}

interface Props {
  values: KpiValues;
  tokens: ReturnType<typeof useThemeTokens>;
  onSansStatutClick?: () => void;
}

interface Kpi {
  key: string;
  label: string;
  sublabel: string;
  value: number | null;
  icon: ReactNode;
  accent: string;
  onClick?: () => void;
}

/** Cartes KPI de la vue d'ensemble Societe. Presentation seule, aucune requete. */
export default function SocieteKpiGrid({ values, tokens: t, onSansStatutClick }: Props) {
  const kpis: Kpi[] = [
    { key: 'leads', label: 'Leads actifs', sublabel: 'Dans votre CRM', value: values.leadsActifs, icon: <Users className="w-4 h-4" />, accent: '#60a5fa' },
    { key: 'sans', label: 'Sans statut', sublabel: 'À qualifier', value: values.sansStatut, icon: <Tag className="w-4 h-4" />, accent: '#f59e0b', onClick: onSansStatutClick },
    { key: 'vendeurs', label: 'Vendeurs', sublabel: 'Votre équipe', value: values.vendeurs, icon: <UserCheck className="w-4 h-4" />, accent: '#34d399' },
    { key: 'messages', label: 'Messages', sublabel: 'Conversations à ouvrir', value: values.messages, icon: <MessageCircle className="w-4 h-4" />, accent: '#818cf8' },
    { key: 'rdv', label: 'Rendez-vous', sublabel: 'À traiter', value: values.rendezVous, icon: <CalendarClock className="w-4 h-4" />, accent: '#f472b6' },
    { key: 'attente', label: 'Inscriptions', sublabel: 'En attente', value: values.enAttente, icon: <UserPlus className="w-4 h-4" />, accent: '#22d3ee' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {kpis.map(k => (
        <div
          key={k.key}
          onClick={k.onClick}
          className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 transition-all duration-200${k.onClick ? ' cursor-pointer hover:brightness-110 active:scale-[0.99]' : ''}`}
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
      ))}
    </div>
  );
}
