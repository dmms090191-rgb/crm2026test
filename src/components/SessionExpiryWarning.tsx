import { createPortal } from 'react-dom';
import { Clock, LogOut } from 'lucide-react';

interface Props {
  remainingSeconds: number;
  onStay: () => void;
  onLogout: () => void;
}

export default function SessionExpiryWarning({ remainingSeconds, onStay, onLogout }: Props) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeLabel = minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, '0')}`
    : `${seconds}s`;

  const urgencyPct = Math.max(0, 1 - remainingSeconds / 300);

  return createPortal(
    <div
      className="fixed inset-0 z-[200000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(165deg, #0f172a 0%, #0a0e1a 100%)',
          border: `1px solid rgba(245,158,11,${0.15 + urgencyPct * 0.25})`,
          boxShadow: `0 0 40px rgba(245,158,11,${0.05 + urgencyPct * 0.1}), 0 20px 60px rgba(0,0,0,0.6)`,
        }}
      >
        <div className="p-6 text-center">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, rgba(245,158,11,${0.15 + urgencyPct * 0.1}), rgba(239,68,68,${urgencyPct * 0.15}))`,
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <Clock className="w-7 h-7" style={{ color: urgencyPct > 0.6 ? '#ef4444' : '#f59e0b' }} />
          </div>

          <h3 className="text-lg font-bold text-white mb-1.5">
            Session bientot expiree
          </h3>
          <p className="text-sm text-slate-400 mb-1">
            Votre session va expirer dans
          </p>
          <p
            className="text-3xl font-mono font-bold mb-5 tabular-nums"
            style={{ color: urgencyPct > 0.6 ? '#ef4444' : '#f59e0b' }}
          >
            {timeLabel}
          </p>

          <div className="flex gap-3">
            <button
              onClick={onLogout}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
              }}
            >
              <LogOut className="w-4 h-4" />
              Se deconnecter
            </button>
            <button
              onClick={onStay}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                boxShadow: '0 4px 20px rgba(14,165,233,0.3)',
              }}
            >
              Rester connecte
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
