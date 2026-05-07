import { Plus, Trash2 } from 'lucide-react';
import { Statut, colorWithAlpha } from './colorUtils';

interface Props {
  statuts: Statut[];
  loading: boolean;
  onDelete: (id: string) => void;
  tokens: ReturnType<typeof import('../../../../lib/themeTokens').getThemeTokens>;
}

export default function StatutsList({ statuts, loading, onDelete, tokens }: Props) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: tokens.card.bg,
        border: `1px solid ${tokens.card.border}`,
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold" style={{ color: tokens.text.primary }}>Statuts créés</h3>
        <span
          className="px-2.5 py-0.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.15)' }}
        >
          {statuts.length}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: tokens.text.quaternary, borderTopColor: '#22d3ee' }} />
        </div>
      ) : statuts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: tokens.surface.secondary }}
          >
            <Plus className="w-4 h-4" style={{ color: tokens.text.quaternary }} />
          </div>
          <p className="text-xs" style={{ color: tokens.label.hint }}>Aucun statut créé</p>
        </div>
      ) : (
        <div className="space-y-2">
          {statuts.map(s => (
            <div
              key={s.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl group transition-all"
              style={{
                background: tokens.surface.secondary,
                border: `1px solid ${tokens.surface.borderLight}`,
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = `${s.couleur}30`)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = tokens.surface.borderLight)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: s.couleur, boxShadow: `0 0 6px ${s.couleur}99` }}
                />
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{
                    background: colorWithAlpha(s.couleur, 0.1),
                    color: s.couleur,
                    border: `1px solid ${colorWithAlpha(s.couleur, 0.22)}`,
                  }}
                >
                  {s.nom}
                </span>
                <span className="font-mono text-[10px]" style={{ color: tokens.text.quaternary }}>{s.couleur}</span>
              </div>
              <button
                onClick={() => onDelete(s.id)}
                className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                style={{ background: tokens.danger.bg, color: tokens.danger.text, border: `1px solid ${tokens.danger.border}` }}
                title="Supprimer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
