import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface Props {
  quickEmails: string[];
  onAdd: (email: string) => void;
  onRemove: (email: string) => void;
  onClearAll: () => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export default function PwaManageEmailsModal({ quickEmails, onAdd, onRemove, onClearAll, onClose, showToast }: Props) {
  const [manageInput, setManageInput] = useState('');

  const handleManageAdd = () => {
    const trimmed = manageInput.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { showToast('Email invalide'); return; }
    if (quickEmails.includes(trimmed)) { showToast('Deja enregistre'); return; }
    onAdd(trimmed);
    setManageInput('');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-[90%] max-w-sm rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#121825', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-semibold text-white/90">Gerer les emails rapides</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="px-5 pt-4 flex gap-2">
          <input
            type="email"
            value={manageInput}
            onChange={e => setManageInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleManageAdd(); } }}
            placeholder="Ajouter un email..."
            className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm text-white/90 placeholder-white/25 outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
          <button onClick={handleManageAdd} className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #0ea5e9, #10b981)' }}>
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-3 max-h-56 overflow-y-auto space-y-1">
          {quickEmails.length === 0 ? (
            <p className="text-xs py-3 text-center text-white/25">Aucun email rapide enregistre.</p>
          ) : quickEmails.map(qe => (
            <div key={qe} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="text-sm text-white/60 truncate flex-1">{qe}</span>
              <button onClick={() => onRemove(qe)} className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-red-400/60 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="px-5 pb-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClearAll} disabled={quickEmails.length === 0} className="w-full py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30" style={{ background: 'rgba(239,68,68,0.10)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}>
            Vider tous les emails rapides
          </button>
        </div>
      </div>
    </div>
  );
}
