import { X } from 'lucide-react';

interface Props {
  quickEmails: string[];
  onSelect: (email: string) => void;
  onClose: () => void;
}

export default function PwaQuickEmailsModal({ quickEmails, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-[90%] max-w-xs rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#121825', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-semibold text-white/90">Emails rapides</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {quickEmails.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-xs text-white/35">Aucun email rapide enregistre.</p>
              <p className="text-[11px] text-white/20 mt-1">Cliquez sur Enregistrer pour ajouter l'email actuel.</p>
            </div>
          ) : quickEmails.map(qe => (
            <button key={qe} onClick={() => { onSelect(qe); onClose(); }} className="w-full text-left px-5 py-3 text-sm text-white/70 transition-colors hover:bg-white/[0.04] border-b border-white/[0.04] last:border-0">
              {qe}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
