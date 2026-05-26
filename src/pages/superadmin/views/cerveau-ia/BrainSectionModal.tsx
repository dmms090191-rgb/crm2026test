import { X, Save, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { D } from './brainTheme';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
  saving?: boolean;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  tokens?: Record<string, any>;
  accentColor?: string;
}

export default function BrainSectionModal({ open, onClose, onSave, saving, title, icon, children, tokens, accentColor }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const dark = !tokens;
  const ac = accentColor ?? D.accent;
  const acMuted = dark ? D.accentMuted : ac;
  const cardBg = dark ? D.card : tokens!.card.bg;
  const surfBg = dark ? D.surface : `${tokens!.surface.secondary}25`;
  const surfBorder = dark ? D.surfaceBorder : tokens!.surface.border;
  const text1 = dark ? D.text : tokens!.text.primary;
  const textM = dark ? D.textMuted : tokens!.text.quaternary;
  const textS = dark ? D.textSecondary : tokens!.text.secondary;
  const dimColor = dark ? D.textDim : tokens!.text.quaternary;
  const acBg = dark ? D.accentBg : `${ac}10`;
  const acBorder = dark ? D.accentBorder : `${ac}15`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-start justify-center sm:pt-[5vh] px-0 sm:px-4">
      <div className={`absolute inset-0 ${dark ? 'bg-black/50' : 'bg-black/25'} backdrop-blur-sm`} onClick={onClose} />

      <div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col" style={{ background: cardBg, maxHeight: '92vh', boxShadow: dark ? `0 -4px 60px rgba(0,0,0,0.4), 0 0 0 1px ${D.cardBorder}` : '0 -4px 60px rgba(0,0,0,0.15)' }}>
        <div className="h-[2px] flex-shrink-0" style={{ background: `linear-gradient(90deg, transparent 5%, ${ac}, transparent 95%)` }} />

        <div className="flex justify-center pt-3 pb-0 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: surfBorder }} />
        </div>

        <div className="flex items-center justify-between px-6 py-4 sm:py-5 flex-shrink-0" style={{ borderBottom: `1px solid ${surfBorder}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: acBg, border: `1px solid ${acBorder}` }}>
              <span style={{ color: ac }}>{icon}</span>
            </div>
            <h2 className="text-[14px] font-bold" style={{ color: text1 }}>{title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:brightness-125" style={{ background: `${dimColor}10`, color: textM }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">{children}</div>

        {onSave && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: `1px solid ${surfBorder}`, background: surfBg }}>
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-[12px] font-semibold transition-all hover:brightness-125" style={{ background: `${dimColor}10`, border: `1px solid ${dimColor}15`, color: textS }}>
              Annuler
            </button>
            <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${ac}, ${acMuted})`, color: '#fff', boxShadow: `0 4px 16px ${ac}25` }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
