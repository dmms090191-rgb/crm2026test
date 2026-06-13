import { Sparkles, HelpCircle, Settings2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export function EditeurIaHeader({ credits }: { credits: number | null }) {
  const t = useThemeTokens();
  return (
    <div
      className="flex items-center justify-between px-5 py-3 border-b"
      style={{
        background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
        borderColor: t.surface.border,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-white/90">Editeur d'image IA</h1>
        </div>
        <p className="text-[11px] text-white/30 hidden sm:block">
          Generez et modifiez vos images avec Stability AI
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/40 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60 transition-all">
          <HelpCircle className="w-3.5 h-3.5" />
          Aide
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/15">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-bold text-cyan-300">Stability AI</span>
        </div>
        {credits !== null && (
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-white/25 leading-tight">Credits disponibles</span>
            <span className="text-sm font-bold text-white/70 leading-tight tabular-nums">
              {credits.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
        <Settings2 className="w-4 h-4 text-white/20" />
      </div>
    </div>
  );
}

export function EditeurIaMobileTabs({ active, onChange }: { active: string; onChange: (v: 'chat' | 'result' | 'library') => void }) {
  const t = useThemeTokens();
  const tabs = [
    { id: 'chat' as const, label: 'Conversation' },
    { id: 'result' as const, label: 'Resultat' },
    { id: 'library' as const, label: 'Bibliotheque' },
  ];
  return (
    <div
      className="flex border-b"
      style={{
        background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
        borderColor: t.surface.border,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-2.5 text-[11px] font-semibold transition-all ${
            active === tab.id
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-white/30 hover:text-white/50'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
