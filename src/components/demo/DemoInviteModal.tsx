import { Monitor, Check, X } from 'lucide-react';

interface Props {
  saName: string;
  onAccept: () => void;
  onReject: () => void;
}

export default function DemoInviteModal({ saName, onAccept, onReject }: Props) {
  return (
    <div
      className="fixed inset-0 z-[99998] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden"
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(245,158,11,0.25)',
          animation: 'demoModalSlideUp 300ms ease-out',
        }}
      >
        <div
          className="px-4 py-3 sm:px-5 sm:py-4 flex items-center gap-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              boxShadow: '0 0 20px rgba(245,158,11,0.3)',
            }}
          >
            <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Demo en direct</p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Invitation de demonstration</p>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-sm text-white leading-relaxed">
            <span className="font-bold" style={{ color: '#f59e0b' }}>{saName}</span> souhaite vous presenter
            une demonstration en direct de Talvex.
          </p>
          <p className="text-xs mt-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Vous verrez les actions du presentateur dans l'application.
            Vous pouvez arreter la demo a tout moment.
          </p>
        </div>

        <div
          className="px-4 py-3 sm:px-5 sm:py-4 flex items-center gap-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <X className="w-3.5 h-3.5" />
            Refuser
          </button>
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
            }}
          >
            <Check className="w-3.5 h-3.5" />
            Accepter
          </button>
        </div>
      </div>

      <style>{`
        @keyframes demoModalSlideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
