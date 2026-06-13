import { Save, Check, AlertCircle } from 'lucide-react';

export function SaveSessionBtn({ status, onClick }: { status: 'idle' | 'saving' | 'saved' | 'error'; onClick: () => void }) {
  const isBusy = status === 'saving';
  const isSaved = status === 'saved';
  const isError = status === 'error';

  const bg = isSaved
    ? 'rgba(34,197,94,0.15)'
    : isError
      ? 'rgba(239,68,68,0.12)'
      : 'rgba(59,130,246,0.10)';
  const border = isSaved
    ? '1px solid rgba(34,197,94,0.30)'
    : isError
      ? '1px solid rgba(239,68,68,0.25)'
      : '1px solid rgba(59,130,246,0.20)';
  const color = isSaved
    ? '#22c55e'
    : isError
      ? '#f87171'
      : '#60a5fa';

  const label = isBusy
    ? 'Sauvegarde...'
    : isSaved
      ? 'Sauvegarde'
      : isError
        ? 'Erreur de sauvegarde'
        : 'Sauvegarder';

  const icon = isSaved
    ? <Check className="w-3 h-3" />
    : isError
      ? <AlertCircle className="w-3 h-3" />
      : <Save className="w-3 h-3" />;

  return (
    <button
      onClick={onClick}
      disabled={isBusy}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50"
      style={{ background: bg, border, color }}
    >
      {isBusy ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function ToolbarBtn({ icon, label, onClick, active, danger, accent }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
      style={{
        background: accent ? 'rgba(52,211,153,0.12)' : active ? 'rgba(59,130,246,0.15)' : danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
        border: accent ? '1px solid rgba(52,211,153,0.25)' : active ? '1px solid rgba(59,130,246,0.30)' : danger ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(255,255,255,0.06)',
        color: accent ? '#34d399' : active ? '#60a5fa' : danger ? '#f87171' : 'rgba(255,255,255,0.50)',
      }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
