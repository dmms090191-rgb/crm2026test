import { Zap, PenTool } from 'lucide-react';
import type { CleanMethod } from './calquer-logo-types';

interface Props {
  active: CleanMethod;
  onChange: (m: CleanMethod) => void;
}

export default function CalquerLogoMethodPicker({ active, onChange }: Props) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'rgba(148,163,184,0.6)' }}>
        Methode de nettoyage
      </h3>

      <div className="space-y-2">
        <MethodCard
          active={active === 'rapide'}
          onClick={() => onChange('rapide')}
          icon={<Zap className="w-5 h-5" />}
          title="Nettoyage rapide"
          description="Pour les logos simples avec fond blanc ou fond uni."
          accentColor="#f59e0b"
          accentBg="rgba(245,158,11,0.12)"
          accentBorder="rgba(245,158,11,0.35)"
        />
        <MethodCard
          active={active === 'manuel'}
          onClick={() => onChange('manuel')}
          icon={<PenTool className="w-5 h-5" />}
          title="Nettoyage manuel"
          description="Pour les logos complexes avec texture, ombre, fond difficile ou details a corriger."
          accentColor="#3b82f6"
          accentBg="rgba(59,130,246,0.12)"
          accentBorder="rgba(59,130,246,0.35)"
        />
      </div>
    </div>
  );
}

function MethodCard({ active, onClick, icon, title, description, accentColor, accentBg, accentBorder }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
}) {
  return (
    <button onClick={onClick}
      className="w-full text-left p-3 rounded-xl transition-all duration-250 hover:scale-[1.01] group"
      style={{
        background: active ? accentBg : 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${active ? accentBorder : 'rgba(255,255,255,0.08)'}`,
        boxShadow: active ? `0 4px 16px ${accentBg}` : 'none',
      }}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
          style={{
            background: active ? accentColor : 'rgba(255,255,255,0.06)',
            color: active ? '#fff' : 'rgba(148,163,184,0.6)',
            boxShadow: active ? `0 2px 8px ${accentBg}` : 'none',
          }}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight mb-0.5"
            style={{ color: active ? accentColor : 'rgba(226,232,240,0.85)' }}>
            {title}
          </p>
          <p className="text-[10px] leading-snug"
            style={{ color: active ? 'rgba(226,232,240,0.7)' : 'rgba(148,163,184,0.5)' }}>
            {description}
          </p>
        </div>
      </div>
      {active && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
          <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: accentColor }}>
            Actif
          </span>
        </div>
      )}
    </button>
  );
}
