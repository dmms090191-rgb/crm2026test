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

export default function SimulatedPhoneManageEmailsModal({ quickEmails, onAdd, onRemove, onClearAll, onClose, showToast }: Props) {
  const [manageInput, setManageInput] = useState('');

  const handleManageAdd = () => {
    const trimmed = manageInput.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { showToast('Email invalide'); return; }
    if (quickEmails.includes(trimmed)) { showToast('Deja enregistre'); return; }
    onAdd(trimmed);
    setManageInput('');
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-3" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-[210px] rounded-xl overflow-hidden shadow-2xl" style={{ background: '#121825', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] font-semibold text-white/90">Gerer emails</p>
          <button onClick={onClose} className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-white/60 transition-all">
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
        <div className="px-3 pt-2.5 flex gap-1.5">
          <input
            type="email"
            value={manageInput}
            onChange={e => setManageInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleManageAdd(); } }}
            placeholder="Ajouter..."
            className="flex-1 min-w-0 px-2 py-1.5 rounded-md text-[9px] text-white/90 placeholder-white/25 outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
          <button onClick={handleManageAdd} className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #0ea5e9, #10b981)' }}>
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <div className="px-3 py-2 max-h-28 overflow-y-auto space-y-1">
          {quickEmails.length === 0 ? (
            <p className="text-[8px] py-2 text-center text-white/25">Aucun email.</p>
          ) : quickEmails.map(qe => (
            <div key={qe} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="text-[9px] text-white/60 truncate flex-1">{qe}</span>
              <button onClick={() => onRemove(qe)} className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-red-400/60 hover:text-red-400 transition-colors">
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="px-3 pb-2.5 pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClearAll} disabled={quickEmails.length === 0} className="w-full py-1.5 rounded-md text-[8px] font-semibold transition-colors disabled:opacity-30" style={{ background: 'rgba(239,68,68,0.10)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}>
            Vider tous
          </button>
        </div>
      </div>
    </div>
  );
}
