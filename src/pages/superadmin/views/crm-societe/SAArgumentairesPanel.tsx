import { Plus, Trash2, Check, AppWindow, Pencil } from 'lucide-react';
import type { Argumentaire } from './types';
import { checkboxStyle } from './types';

interface Props {
  args: Argumentaire[];
  loading: boolean;
  selectedArgs: Set<string>;
  onToggleSel: (id: string) => void;
  onToggleAll: () => void;
  onAdd: () => void;
  onEdit: (arg: Argumentaire) => void;
  onDelete: (ids: string[]) => void;
  onFloat: (arg: Argumentaire) => void;
  t: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
}

export default function SAArgumentairesPanel({
  args, loading, selectedArgs, onToggleSel, onToggleAll,
  onAdd, onEdit, onDelete, onFloat, t,
}: Props) {
  return (
    <div className="w-full">
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
          border: `1px solid ${t.surface.border}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold" style={{ color: t.text.primary }}>Argumentaires</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(14,165,233,0.12)', color: '#0ea5e9' }}>
              {args.length}
            </span>
          </div>
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter
          </button>
        </div>

        {/* Bulk bar */}
        {selectedArgs.size > 0 && (
          <div className="flex items-center justify-between px-4 py-2" style={{ background: 'rgba(239,68,68,0.06)', borderBottom: `1px solid ${t.surface.border}` }}>
            <span className="text-xs font-medium" style={{ color: '#ef4444' }}>
              {selectedArgs.size} selectionne{selectedArgs.size > 1 ? 's' : ''}
            </span>
            <button
              onClick={() => onDelete([...selectedArgs])}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
            >
              <Trash2 className="w-3 h-3" />
              Supprimer
            </button>
          </div>
        )}

        {/* List */}
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : args.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-xs" style={{ color: t.text.tertiary }}>Aucun argumentaire. Cliquez sur "Ajouter" pour commencer.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 px-4 py-2" style={{ borderBottom: `1px solid ${t.surface.borderLight}` }}>
                <div style={checkboxStyle(selectedArgs.size === args.length && args.length > 0, t.surface.border)} onClick={onToggleAll}>
                  {selectedArgs.size === args.length && args.length > 0 && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="text-[10px] font-medium" style={{ color: t.text.tertiary }}>Tout selectionner</span>
              </div>

              {args.map(arg => (
                <div key={arg.id} className="transition-colors" style={{ borderBottom: `1px solid ${t.surface.borderLight}` }}>
                  <div className="flex items-center gap-2.5 px-4 py-3">
                    <div style={checkboxStyle(selectedArgs.has(arg.id), t.surface.border)} onClick={() => onToggleSel(arg.id)}>
                      {selectedArgs.has(arg.id) && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: t.text.primary }}>
                      {arg.title}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => onFloat(arg)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color: '#0ea5e9' }} title="Ouvrir en fenetre">
                        <AppWindow className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onEdit(arg)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color: t.text.tertiary }} title="Modifier">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDelete([arg.id])} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color: '#ef4444' }} title="Supprimer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
