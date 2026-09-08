import { createPortal } from 'react-dom';
import { X, Eye } from 'lucide-react';
import type { ActionDef } from '../ActionModal';
import type { ThemeTokens } from '../../../lib/themeTokensTypes';

interface Props {
  /** Actions actuellement masquees dans le BROUILLON en cours. */
  actions: ActionDef[];
  t: ThemeTokens;
  onShow: (id: string) => void;
  onClose: () => void;
}

/**
 * Second modal « Boutons masques ».
 *
 * Purement presentationnel : il lit le brouillon du modal principal et lui
 * renvoie les demandes de reaffichage. Le fermer ne valide ni n'annule rien —
 * le brouillon reste intact et c'est le modal principal qui tranche.
 */
export default function PremiumHiddenActionsModal({ actions, t, onShow, onClose }: Props) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100001] flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: t.modal.overlayBg, backdropFilter: 'blur(10px)' }}
    >
      <div
        className="rounded-2xl w-full max-w-[400px] overflow-hidden"
        style={{
          background: t.modal.bg,
          border: `1px solid ${t.modal.border}`,
          boxShadow: '0 24px 64px -12px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.25)',
        }}
      >
        <div
          className="flex items-center justify-between gap-3 pl-5 pr-3 py-3"
          style={{ borderBottom: `1px solid ${t.surface.borderLight}` }}
        >
          <h2 className="text-[13px] font-semibold tracking-tight" style={{ color: t.text.primary }}>
            Boutons masqués
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ color: t.text.quaternary }}
            onMouseEnter={e => { e.currentTarget.style.background = t.surface.hover; e.currentTarget.style.color = t.text.primary; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.text.quaternary; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {actions.length === 0 ? (
            <p className="text-[11px] text-center py-6" style={{ color: t.text.quaternary }}>
              Aucun bouton masqué pour cette société.
            </p>
          ) : actions.map(action => (
            <div
              key={action.id}
              className="flex items-center gap-3 px-3 py-2.5 min-h-[58px] rounded-xl"
              style={{
                background: `linear-gradient(140deg, ${t.surface.secondary}, ${t.surface.secondary}99)`,
                border: `1px solid ${t.surface.borderLight}`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)',
              }}
            >
              <span
                className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 opacity-50"
                style={{ background: `${action.color}14`, border: `1px solid ${action.color}2e`, color: action.color }}
              >
                {action.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold leading-tight truncate" style={{ color: t.text.tertiary }}>
                  {action.label}
                </span>
                {action.description && (
                  <span className="block text-[10.5px] leading-snug mt-0.5" style={{ color: t.text.quaternary }}>
                    {action.description}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => onShow(action.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold flex-shrink-0 transition-all active:scale-[0.97]"
                style={{ background: '#34d39914', border: '1px solid #34d3992e', color: '#34d399' }}
              >
                <Eye className="w-3 h-3" />Réafficher
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
