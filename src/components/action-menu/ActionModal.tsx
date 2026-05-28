import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ThemeTokens } from '../../lib/themeTokensTypes';

export interface ActionSectionDef {
  title: string;
  actions: ActionDef[];
}

export interface ActionDef {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  color: string;
  colorBg: string;
  colorBorder: string;
  onClick: () => void;
}

interface SubtitleField {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface Props {
  title: string;
  subtitleFields?: SubtitleField[];
  sections: ActionSectionDef[];
  tokens: ThemeTokens;
  onClose: () => void;
}

export default function ActionModal({ title, subtitleFields, sections, tokens, onClose }: Props) {
  const m = tokens.modal;

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: m.overlayBg, backdropFilter: 'blur(10px)' }}
    >
      <div
        className="rounded-2xl sm:rounded-3xl w-full max-w-md relative overflow-hidden"
        style={{
          background: m.bg,
          border: `1px solid ${m.border}`,
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3)',
        }}
      >
        <div
          className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-4"
          style={{ borderBottom: `1px solid ${tokens.surface.border}` }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-bold" style={{ color: tokens.heading.primary }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
              style={{ backgroundColor: m.closeBtnBg, color: m.closeBtnText }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = m.closeBtnHoverBg;
                e.currentTarget.style.color = m.closeBtnHoverText;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = m.closeBtnBg;
                e.currentTarget.style.color = m.closeBtnText;
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {subtitleFields && subtitleFields.length > 0 && (
            <div
              className="rounded-xl px-3.5 py-2.5 space-y-1"
              style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}` }}
            >
              {subtitleFields.map(f => (
                <div key={f.label} className="flex items-center gap-2">
                  {f.icon && <span className="flex-shrink-0 w-3.5 h-3.5" style={{ color: tokens.text.tertiary }}>{f.icon}</span>}
                  <span className="text-[10px] font-semibold uppercase tracking-wider flex-shrink-0" style={{ color: tokens.text.quaternary }}>
                    {f.label}
                  </span>
                  <span className="text-xs font-medium truncate" style={{ color: tokens.text.primary }}>
                    {f.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 sm:px-6 sm:py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {sections.map(section => (
            <div key={section.title}>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2.5 px-1"
                style={{ color: tokens.text.quaternary }}
              >
                {section.title}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {section.actions.map(action => (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    className="group relative flex flex-col items-start gap-2 px-3.5 py-3.5 rounded-xl text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: action.colorBg,
                      border: `1px solid ${action.colorBorder}`,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.boxShadow = `0 4px 16px ${action.colorBg}, 0 0 0 1px ${action.colorBorder}`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                      style={{ background: action.colorBorder, color: action.color }}
                    >
                      {action.icon}
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: action.color }}>
                        {action.label}
                      </p>
                      {action.description && (
                        <p className="text-[10px] mt-0.5 leading-tight" style={{ color: tokens.text.tertiary }}>
                          {action.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
