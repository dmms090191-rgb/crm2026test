import { Eye, EyeOff, Wrench, Crown, Trash2, AlertTriangle } from 'lucide-react';
import type { ThemeStatus } from '../../../../hooks/useThemeConfig';

interface BulkActionBarProps {
  count: number;
  onStatus: (s: ThemeStatus) => void;
  onDelete: () => void;
}

export function BulkActionBar({ count, onStatus, onDelete }: BulkActionBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9000] animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 rounded-2xl shadow-2xl" style={{
        background: 'rgba(15,18,30,0.95)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.06)',
      }}>
        <span className="text-[11px] sm:text-xs font-bold text-white/80 whitespace-nowrap mr-1">
          {count} theme{count > 1 ? 's' : ''} selectionne{count > 1 ? 's' : ''}
        </span>

        <div className="w-px h-6 bg-white/[0.08]" />

        <button onClick={() => onStatus('visible')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Visible</span>
        </button>

        <button onClick={() => onStatus('hidden')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
          <EyeOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Masquer</span>
        </button>

        <button onClick={() => onStatus('rework')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>
          <Wrench className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">A retravailler</span>
        </button>

        <button onClick={() => onStatus('premium')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa' }}>
          <Crown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Premium</span>
        </button>

        <div className="w-px h-6 bg-white/[0.08]" />

        <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)', color: '#ef4444' }}>
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Supprimer</span>
        </button>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ count, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }} onClick={onCancel}>
      <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden" style={{ background: '#121620', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
        <div className="p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.20)' }}>
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white/90">Supprimer {count} theme{count > 1 ? 's' : ''} ?</h3>
            <p className="text-xs mt-2 font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.40)' }}>
              Cette action est irreversible. Les themes selectionnes seront definitivement supprimes de la configuration.
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 flex justify-center gap-3">
          <button onClick={onCancel} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/50 hover:text-white/70 transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Annuler
          </button>
          <button onClick={onConfirm} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:brightness-110" style={{ background: 'rgba(239,68,68,0.80)', border: '1px solid rgba(239,68,68,0.60)' }}>
            Supprimer {count} theme{count > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
