import { useState, useEffect } from 'react';
import { X, Check, Sparkles, Layers, Wand2 } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { PRESETS, MAX_SELECTED_PRESETS, type Preset } from './logoAiConstants';

interface Props {
  selected: Preset[];
  onConfirm: (presets: Preset[]) => void;
  onClose: () => void;
}

export default function LogoTypePickerModal({ selected, onConfirm, onClose }: Props) {
  const t = useThemeTokens();
  const [draft, setDraft] = useState<Preset[]>(selected);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const toggle = (id: Preset) => {
    setDraft(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      if (prev.length >= MAX_SELECTED_PRESETS) return prev;
      return [...prev, id];
    });
  };

  const atLimit = draft.length >= MAX_SELECTED_PRESETS;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center lg:p-6"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full h-full lg:h-auto lg:max-w-lg lg:rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: t.surface.primary,
          border: `1px solid ${t.surface.border}`,
          boxShadow: '0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)',
          maxHeight: '100dvh',
        }}>

        {/* Header with gradient accent */}
        <div className="flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706, #b45309)', padding: '2px 0 0 0' }}>
          <div className="flex items-center justify-between px-4 py-3 lg:px-5 lg:py-4" style={{ background: t.surface.primary }}>
            <div className="flex items-center gap-3 lg:gap-3.5 flex-1 min-w-0">
              <div className="w-9 h-9 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #b45309)', boxShadow: '0 6px 20px rgba(245,158,11,0.3)' }}>
                <Wand2 className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
              </div>
              <div>
                <h3 className="text-[13px] lg:text-[14px] font-extrabold" style={{ color: t.text.primary }}>Types de logo</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] lg:text-[11px] font-medium" style={{ color: t.text.tertiary }}>
                    Selectionnez jusqu'a {MAX_SELECTED_PRESETS} types
                  </span>
                  <span className="inline-flex items-center justify-center px-1.5 lg:px-2 py-0.5 rounded-md text-[9px] lg:text-[10px] font-black tabular-nums"
                    style={{
                      background: draft.length > 0 ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(180,83,9,0.18))' : 'rgba(0,0,0,0.04)',
                      color: draft.length > 0 ? '#92400e' : t.text.quaternary,
                    }}>
                    {draft.length}/{MAX_SELECTED_PRESETS}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-70 active:scale-90"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.tertiary }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable cards */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2.5 lg:p-5" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-3">
            {PRESETS.map(p => {
              const sel = draft.includes(p.id);
              const dis = !sel && atLimit;
              return (
                <button key={p.id} type="button" onClick={() => !dis && toggle(p.id)}
                  className="group relative flex items-center gap-2.5 px-3 py-2 lg:items-start lg:gap-3.5 lg:p-4 rounded-xl text-left transition-all"
                  style={{
                    background: sel ? 'linear-gradient(160deg, rgba(245,158,11,0.06), rgba(180,83,9,0.12))' : t.surface.secondary,
                    border: `1.5px solid ${sel ? 'rgba(245,158,11,0.4)' : t.surface.border}`,
                    opacity: dis ? 0.35 : 1,
                    cursor: dis ? 'not-allowed' : 'pointer',
                    boxShadow: sel ? '0 4px 16px rgba(245,158,11,0.1), inset 0 1px 0 rgba(255,255,255,0.4)' : '0 1px 3px rgba(0,0,0,0.02)',
                  }}>
                  <div className="w-4 h-4 lg:w-5 lg:h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all lg:mt-0.5"
                    style={sel ? {
                      background: 'linear-gradient(135deg, #f59e0b, #b45309)',
                      boxShadow: '0 3px 10px rgba(245,158,11,0.35)',
                    } : { background: t.surface.primary, border: `2px solid ${t.surface.border}` }}>
                    {sel && <Check className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 lg:gap-2 lg:mb-1">
                      <span className="flex items-center justify-center w-5 h-5 lg:w-6 lg:h-6 rounded-lg"
                        style={{
                          background: sel ? 'rgba(245,158,11,0.12)' : 'rgba(0,0,0,0.03)',
                          color: sel ? '#b45309' : t.text.tertiary,
                          boxShadow: sel ? '0 2px 6px rgba(245,158,11,0.08)' : 'none',
                        }}>{p.icon}</span>
                      <span className="text-[11px] lg:text-[12px] font-extrabold" style={{ color: sel ? '#92400e' : t.text.primary }}>{p.label}</span>
                    </div>
                    <p className="text-[9px] lg:text-[10.5px] leading-snug lg:leading-relaxed font-medium mt-0.5 lg:mt-0" style={{ color: t.text.tertiary }}>{p.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {draft.length === MAX_SELECTED_PRESETS && (
            <div className="mt-2.5 lg:mt-4 flex items-start gap-2.5 lg:gap-3 rounded-xl px-3 py-2 lg:px-4 lg:py-3" style={{
              background: 'linear-gradient(135deg, rgba(14,165,233,0.04), rgba(3,105,161,0.08))',
              border: '1px solid rgba(14,165,233,0.12)',
              boxShadow: '0 2px 8px rgba(14,165,233,0.04)',
            }}>
              <Layers className="w-3.5 h-3.5 lg:w-4 lg:h-4 flex-shrink-0 mt-0.5" style={{ color: '#0ea5e9' }} />
              <p className="text-[9px] lg:text-[10.5px] leading-snug lg:leading-relaxed font-medium" style={{ color: t.text.secondary }}>
                Les deux types seront generes avec le meme nom de marque, les memes couleurs et la meme identite visuelle.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-3 lg:px-5 py-2.5 lg:py-4 flex items-center justify-end gap-2 lg:gap-3"
          style={{
            borderTop: `1px solid ${t.surface.border}`,
            paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom, 0.625rem))',
          }}>
          <button onClick={onClose}
            className="px-4 lg:px-5 py-2 lg:py-2.5 rounded-xl text-[12px] font-bold transition-all active:scale-95"
            style={{ background: t.surface.secondary, border: `1.5px solid ${t.surface.border}`, color: t.text.tertiary }}>
            Annuler
          </button>
          <button onClick={() => { if (draft.length > 0) onConfirm(draft); }} disabled={draft.length === 0}
            className="relative overflow-hidden flex-1 lg:flex-none px-5 lg:px-6 py-2 lg:py-2.5 rounded-xl text-[12px] font-extrabold transition-all disabled:opacity-35 active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706, #b45309)',
              color: '#fff',
              boxShadow: draft.length > 0 ? '0 4px 18px rgba(180,83,9,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
              letterSpacing: '0.03em',
            }}>
            <span className="flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Valider ({draft.length} type{draft.length > 1 ? 's' : ''})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
