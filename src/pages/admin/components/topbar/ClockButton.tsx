import { Clock } from 'lucide-react';

interface ClockButtonProps {
  tzLabel: string;
  tzCode?: string;
  clock: string;
  onClick: () => void;
}

export default function ClockButton({ tzLabel, tzCode, clock, onClick }: ClockButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 ml-2 px-3 py-1.5 rounded-xl transition-all duration-200"
      style={{
        background: 'rgba(6,182,212,0.06)',
        border: '1px solid rgba(6,182,212,0.15)',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(6,182,212,0.12)'; e.currentTarget.style.borderColor = 'rgba(6,182,212,0.25)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(6,182,212,0.06)'; e.currentTarget.style.borderColor = 'rgba(6,182,212,0.15)'; }}
    >
      <Clock className="w-3.5 h-3.5" style={{ color: '#22d3ee' }} />
      <span className="text-xs font-medium hidden sm:block" style={{ color: '#94a3b8' }}>{tzLabel}</span>
      {tzCode && <span className="text-xs font-medium sm:hidden" style={{ color: '#94a3b8' }}>{tzCode}</span>}
      <span className="text-xs font-semibold font-mono" style={{ color: '#22d3ee' }}>{clock}</span>
    </button>
  );
}
