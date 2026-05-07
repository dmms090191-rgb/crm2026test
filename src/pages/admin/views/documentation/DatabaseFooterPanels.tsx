import { Eye, Code2, ShieldCheck } from 'lucide-react';
import DATABASE_DOC from './databaseDocumentation';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export default function DatabaseFooterPanels() {
  const tokens = useThemeTokens();

  return (
    <div className="mt-6 flex flex-col gap-3">
      <div
        className="rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.015)', border: `1px solid ${tokens.surface.borderLight}` }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-3.5 h-3.5" style={{ color: tokens.text.quaternary }} />
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: tokens.text.quaternary }}>
            Vues SQL
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium ml-auto"
            style={{ background: tokens.success.bg, color: tokens.success.text, border: `1px solid ${tokens.success.border}`, fontSize: '10px' }}
          >
            {DATABASE_DOC.views.length}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {DATABASE_DOC.views.map((v) => (
            <div key={v.name} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold" style={{ color: tokens.accent.text }}>{v.name}</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-mono"
                  style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}`, fontSize: '9px' }}
                >
                  {v.returns}
                </span>
              </div>
              <p className="text-xs" style={{ color: tokens.text.tertiary }}>{v.description}</p>
              <span className="font-mono text-xs mt-0.5" style={{ color: tokens.success.text, fontSize: '10px' }}>{v.sql}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.015)', border: `1px solid ${tokens.surface.borderLight}` }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Code2 className="w-3.5 h-3.5" style={{ color: tokens.text.quaternary }} />
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: tokens.text.quaternary }}>
            Fonctions SQL
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium ml-auto"
            style={{ background: tokens.warning.bg, color: tokens.warning.text, border: `1px solid ${tokens.warning.border}`, fontSize: '10px' }}
          >
            {DATABASE_DOC.functions.length}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {DATABASE_DOC.functions.map((fn) => (
            <div key={fn.name}>
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs font-semibold flex-shrink-0" style={{ color: '#a78bfa' }}>{fn.name}</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: tokens.text.tertiary }}>{fn.description}</p>
              {fn.trigger && (
                <span className="font-mono text-xs mt-0.5 block" style={{ color: 'rgba(167,139,250,0.45)', fontSize: '10px' }}>
                  {fn.trigger}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        className="rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.015)', border: `1px solid ${tokens.surface.borderLight}` }}
      >
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: tokens.text.quaternary }} />
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: tokens.text.quaternary }}>
            Regles importantes
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {DATABASE_DOC.globalRules.map((rule, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span
                className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full"
                style={{ background: 'rgba(251,191,36,0.4)' }}
              />
              <p className="text-xs leading-relaxed" style={{ color: tokens.text.tertiary }}>{rule}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
