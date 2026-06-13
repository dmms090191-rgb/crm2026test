import { Paintbrush, ArrowRight, Layers, Smartphone, Monitor, LayoutGrid } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';

interface Props {
  t: ThemeTokens;
  onOpenEditor: () => void;
  onGoToTemplates: () => void;
  hasTemplate: boolean;
  isPublished: boolean;
}

export default function StudioEntryPage({ t, onOpenEditor, onGoToTemplates, hasTemplate, isPublished }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[480px] px-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 relative"
          style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.14), rgba(6,182,212,0.08))',
            border: '1px solid rgba(14,165,233,0.2)',
            boxShadow: '0 0 40px rgba(14,165,233,0.12), 0 8px 32px rgba(0,0,0,0.08)',
          }}
        >
          <Paintbrush className="w-9 h-9" style={{ color: '#0ea5e9' }} />
          <div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
            style={{
              background: isPublished ? '#10b981' : '#f59e0b',
              boxShadow: `0 0 8px ${isPublished ? 'rgba(16,185,129,0.5)' : 'rgba(245,158,11,0.5)'}`,
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        </div>

        <h2 className="text-xl font-bold mb-2 text-center" style={{ color: t.text.primary }}>
          Studio Site
        </h2>
        <p className="text-sm text-center max-w-xs mb-8 leading-relaxed" style={{ color: t.text.tertiary }}>
          Creez et personnalisez votre site visuellement avec l'editeur integre.
        </p>

        <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-8">
          {[
            { icon: <Layers className="w-4 h-4" />, label: 'Elements', color: '#f59e0b' },
            { icon: <Monitor className="w-4 h-4" />, label: 'Desktop', color: '#0ea5e9' },
            { icon: <Smartphone className="w-4 h-4" />, label: 'Mobile', color: '#8b5cf6' },
          ].map(item => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl"
              style={{
                background: `${item.color}08`,
                border: `1px solid ${item.color}18`,
              }}
            >
              <div style={{ color: item.color }}>{item.icon}</div>
              <span className="text-[10px] font-semibold" style={{ color: t.text.tertiary }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onOpenEditor}
          disabled={!hasTemplate}
          className="group flex items-center gap-3 px-7 py-3.5 rounded-2xl text-sm font-bold transition-all hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: hasTemplate
              ? 'linear-gradient(135deg, #0ea5e9, #0284c7)'
              : t.surface.secondary,
            color: hasTemplate ? '#ffffff' : t.text.quaternary,
            boxShadow: hasTemplate
              ? '0 4px 20px rgba(14,165,233,0.35), 0 0 0 1px rgba(14,165,233,0.1)'
              : 'none',
            cursor: hasTemplate ? 'pointer' : 'not-allowed',
            opacity: hasTemplate ? 1 : 0.6,
          }}
        >
          <Paintbrush className="w-4 h-4" />
          Ouvrir l'editeur de site
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        {!hasTemplate && (
          <>
            <p className="text-[11px] mt-3 mb-3 text-center" style={{ color: t.text.quaternary }}>
              Choisissez d'abord un template pour activer l'editeur.
            </p>
            <button
              onClick={onGoToTemplates}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', boxShadow: '0 2px 12px rgba(14,165,233,0.3)' }}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Choisir un template
            </button>
          </>
        )}
      </div>
    </div>
  );
}
