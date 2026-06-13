import { X } from 'lucide-react';

interface Props {
  quickEmails: string[];
  onSelect: (email: string) => void;
  onClose: () => void;
}

export default function SimulatedPhoneQuickEmailsModal({ quickEmails, onSelect, onClose }: Props) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-3" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-[200px] rounded-xl overflow-hidden shadow-2xl" style={{ background: '#121825', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] font-semibold text-white/90">Emails rapides</p>
          <button onClick={onClose} className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-white/60 transition-all">
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
        <div className="max-h-36 overflow-y-auto">
          {quickEmails.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-[8px] text-white/35">Aucun email rapide.</p>
              <p className="text-[7px] text-white/20 mt-0.5">Cliquez Enregistrer pour ajouter.</p>
            </div>
          ) : quickEmails.map(qe => (
            <button key={qe} onClick={() => { onSelect(qe); onClose(); }} className="w-full text-left px-3 py-2 text-[9px] text-white/70 transition-colors hover:bg-white/[0.04] border-b border-white/[0.04] last:border-0 truncate">
              {qe}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
