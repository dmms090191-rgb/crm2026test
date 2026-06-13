import { AlertTriangle } from 'lucide-react';

interface Props {
  type: 'single' | 'bulk';
  singleName?: string;
  singleThemeCount?: number;
  bulkCount?: number;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CategoryDeleteConfirmModal({ type, singleName, singleThemeCount = 0, bulkCount = 0, busy, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }} onClick={onCancel}>
      <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden" style={{ background: '#121620', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
        <div className="p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.20)' }}>
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <div>
            {type === 'single' && singleName && (
              <>
                <h3 className="text-base font-bold text-white/90">
                  Supprimer "{singleName}" ?
                </h3>
                <p className="text-xs mt-2 font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.40)' }}>
                  {singleThemeCount > 0
                    ? `Les ${singleThemeCount} theme(s) de cette categorie seront deplaces vers "Non categorise".`
                    : 'Cette categorie ne contient aucun theme visible.'}
                  {' '}Cette action est irreversible.
                </p>
              </>
            )}
            {type === 'bulk' && (
              <>
                <h3 className="text-base font-bold text-white/90">
                  Supprimer {bulkCount} categorie{bulkCount > 1 ? 's' : ''} ?
                </h3>
                <p className="text-xs mt-2 font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.40)' }}>
                  Les themes contenus dans ces categories seront deplaces vers "Non categorise".
                  Cette action est irreversible.
                </p>
              </>
            )}
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-center gap-3">
          <button onClick={onCancel} disabled={busy} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/50 hover:text-white/70 transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Annuler
          </button>
          <button onClick={onConfirm} disabled={busy} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:brightness-110 disabled:opacity-50" style={{ background: 'rgba(239,68,68,0.80)', border: '1px solid rgba(239,68,68,0.60)' }}>
            {busy ? 'Suppression...' : 'Supprimer definitivement'}
          </button>
        </div>
      </div>
    </div>
  );
}
