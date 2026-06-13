import { MessageCircle, Wrench } from 'lucide-react';
import type { AiCompanyBrain } from './brainTypes';
import { AVAILABLE_TOOLS } from './brainTypes';

interface Props {
  brain: AiCompanyBrain;
  onChange: (fields: Partial<AiCompanyBrain>) => void;
  tokens: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
}

export default function BrainToneToolsSection({ brain, onChange, tokens: t }: Props) {
  const tools = brain.allowed_tools ?? [];

  function toggleTool(toolId: string) {
    const next = tools.includes(toolId)
      ? tools.filter(id => id !== toolId)
      : [...tools, toolId];
    onChange({ allowed_tools: next });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`, border: `1px solid ${t.surface.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
            <MessageCircle className="w-4 h-4" style={{ color: t.accent.text }} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Ton et personnalite</h3>
        </div>
        <textarea
          value={brain.tone}
          onChange={e => onChange({ tone: e.target.value })}
          placeholder="Ex: Sois professionnel mais chaleureux. Tutoie le client. Utilise des phrases courtes..."
          rows={6}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
        />
        <p className="text-[10px] mt-2" style={{ color: t.input.placeholder }}>
          Instructions libres pour definir le style de communication de l'IA.
        </p>
      </div>

      <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`, border: `1px solid ${t.surface.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
            <Wrench className="w-4 h-4" style={{ color: t.accent.text }} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Outils autorises</h3>
        </div>
        <div className="space-y-2">
          {AVAILABLE_TOOLS.map(tool => {
            const enabled = tools.includes(tool.id);
            return (
              <button
                key={tool.id}
                onClick={() => toggleTool(tool.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                style={{
                  background: enabled ? t.accent.bg : t.surface.secondary,
                  border: `1px solid ${enabled ? t.accent.border : t.surface.border}`,
                }}
              >
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-all"
                  style={{
                    background: enabled ? t.accent.text : 'transparent',
                    border: `1.5px solid ${enabled ? t.accent.text : t.surface.border}`,
                    color: enabled ? '#fff' : 'transparent',
                  }}
                >
                  {enabled ? '\u2713' : ''}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: enabled ? t.accent.text : t.text.primary }}>{tool.label}</p>
                  <p className="text-[10px]" style={{ color: t.text.tertiary }}>{tool.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
