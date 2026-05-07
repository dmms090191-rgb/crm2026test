import { Check, Copy } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
}

export default function InfoRow({ icon, label, value, onCopy, copied }: InfoRowProps) {
  const tokens = useThemeTokens();

  return (
    <div
      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
      style={{ background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}` }}
    >
      <div className="flex items-center gap-2.5">
        <span style={{ color: tokens.modal.fieldLabel }}>{icon}</span>
        <div>
          <p className="text-[9px] font-bold tracking-[0.15em] uppercase mb-0.5" style={{ color: tokens.modal.fieldLabel }}>{label}</p>
          <p className="text-xs" style={{ color: tokens.modal.fieldValue }}>{value}</p>
        </div>
      </div>
      {onCopy && (
        <button
          onClick={onCopy}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
          style={{ color: copied ? tokens.success.text : 'rgba(255,255,255,0.2)', background: 'transparent' }}
          onMouseEnter={e => { if (!copied) { e.currentTarget.style.color = tokens.accent.text; e.currentTarget.style.background = tokens.accent.bg; } }}
          onMouseLeave={e => { if (!copied) { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'transparent'; } }}
          title="Copier"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}
