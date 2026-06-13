import { useState } from 'react';
import { Layers, ChevronRight, Lock } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';

interface Props {
  t: ThemeTokens;
}

export default function StudioRightPanel({ t }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-9 flex-shrink-0 flex flex-col items-center justify-start pt-3 gap-2 rounded-xl transition-all hover:scale-[1.02]"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.55), rgba(15, 23, 42, 0.65))',
          border: '1px solid rgba(148, 163, 184, 0.15)',
          backdropFilter: 'blur(24px) saturate(140%)',
        }}
      >
        <ChevronRight className="w-3 h-3 rotate-180" style={{ color: t.text.quaternary }} />
        <span
          className="text-[9px] font-bold tracking-wider"
          style={{
            color: t.text.quaternary,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
          }}
        >
          Structure
        </span>
      </button>
    );
  }

  return (
    <div
      className="w-52 flex-shrink-0 rounded-xl overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.55), rgba(15, 23, 42, 0.65))',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.30)',
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
      }}
    >
      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5" style={{ color: '#0ea5e9' }} />
          <span className="text-[11px] font-bold" style={{ color: t.text.primary }}>
            Structure
          </span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="w-5 h-5 rounded-md flex items-center justify-center transition-all hover:scale-110"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
        >
          <ChevronRight className="w-3 h-3" style={{ color: t.text.quaternary }} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: 'rgba(148, 163, 184, 0.06)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
          }}
        >
          <Lock className="w-5 h-5" style={{ color: t.text.quaternary }} />
        </div>
        <p className="text-[11px] font-semibold text-center mb-1" style={{ color: t.text.tertiary }}>
          Bientot disponible
        </p>
        <p className="text-[9px] text-center leading-relaxed" style={{ color: t.text.quaternary }}>
          Gerez vos calques, elements et la hierarchie de votre page.
        </p>
      </div>
    </div>
  );
}
