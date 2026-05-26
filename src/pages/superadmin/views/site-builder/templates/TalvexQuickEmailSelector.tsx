import { useState } from 'react';
import { ChevronDown, Star, Settings, Trash2, Plus, Mail, Zap, Sparkles } from 'lucide-react';
import { type SiteModalTheme, getSiteModalTheme } from './siteModalTheme';
import { getQuickEmails, setQuickEmails, isValidEmail, ModalShell, ModalHeader, EmptyState } from './TalvexQuickEmailShell';

interface Props {
  email: string;
  onSelect: (email: string) => void;
  theme?: SiteModalTheme;
}

export default function TalvexQuickEmailSelector({ email, onSelect, theme: themeProp }: Props) {
  const t = themeProp ?? getSiteModalTheme();
  const [quickEmails, setQuickEmailsState] = useState<string[]>(getQuickEmails);
  const [showPicker, setShowPicker] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [manageInput, setManageInput] = useState('');
  const [toast, setToast] = useState('');
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);

  function refresh() { const list = getQuickEmails(); setQuickEmailsState(list); return list; }
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  function handleSaveCurrent() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) { showToast('Adresse email invalide.'); return; }
    const list = refresh();
    if (list.includes(trimmed)) { showToast('Cet email est deja enregistre.'); return; }
    const updated = [...list, trimmed];
    setQuickEmails(updated);
    setQuickEmailsState(updated);
    showToast('Email ajoute aux acces rapides.');
  }

  function handleRemove(target: string) {
    setDeletingEmail(target);
    setTimeout(() => {
      const updated = quickEmails.filter(e => e !== target);
      setQuickEmails(updated);
      setQuickEmailsState(updated);
      setDeletingEmail(null);
      showToast('Email supprime.');
    }, 250);
  }

  function handleClearAll() {
    setQuickEmails([]);
    setQuickEmailsState([]);
    showToast('Emails rapides vides.');
  }

  function handleManageAdd() {
    const trimmed = manageInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) { showToast('Adresse email invalide.'); return; }
    if (quickEmails.includes(trimmed)) { showToast('Cet email est deja enregistre.'); return; }
    const updated = [...quickEmails, trimmed];
    setQuickEmails(updated);
    setQuickEmailsState(updated);
    setManageInput('');
    showToast('Email ajoute.');
  }

  return (
    <>
      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        {([
          { label: 'Rapides', icon: ChevronDown, action: () => { refresh(); setShowPicker(true); } },
          { label: 'Enregistrer', icon: Star, action: handleSaveCurrent, disabled: !email.trim() },
          { label: 'Gerer', icon: Settings, action: () => { refresh(); setShowManage(true); } },
        ] as const).map(btn => (
          <button
            key={btn.label}
            type="button"
            onClick={btn.action}
            disabled={'disabled' in btn ? btn.disabled : false}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 disabled:opacity-30 hover:scale-[1.03] group"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
          >
            <btn.icon className="w-3.5 h-3.5 group-hover:text-cyan-400 transition-colors" />
            <span className="group-hover:text-slate-300 transition-colors">{btn.label}</span>
          </button>
        ))}
        {toast && (
          <span className="flex items-center gap-1 text-[11px] font-semibold basis-full mt-1.5 animate-pulse" style={{ color: t.primary }}>
            <Sparkles className="w-3 h-3" />{toast}
          </span>
        )}
      </div>

      {/* Picker modal */}
      <ModalShell open={showPicker} onClose={() => setShowPicker(false)} theme={t}>
        <ModalHeader title="Emails rapides" icon={Zap} onClose={() => setShowPicker(false)} count={quickEmails.length} theme={t} />
        <div className="h-px mx-5" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
        <div className="max-h-64 overflow-y-auto py-2 px-2">
          {quickEmails.length === 0 ? (
            <EmptyState message="Aucun email rapide" sub="Cliquez Enregistrer pour ajouter l'email actuel." />
          ) : (
            quickEmails.map((qe, i) => (
              <button key={qe} type="button"
                onClick={() => { onSelect(qe); setShowPicker(false); }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 group hover:scale-[1.01]"
                style={{ animation: `qeItemIn 0.3s cubic-bezier(0.16,1,0.3,1) ${i * 0.05}s both` }}
                onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, rgba(${t.primaryRgb},0.08), rgba(${t.secondaryRgb},0.04))`; e.currentTarget.style.border = `1px solid rgba(${t.primaryRgb},0.15)`; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.border = '1px solid transparent'; }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  style={{ background: `rgba(${t.primaryRgb},0.08)`, border: `1px solid rgba(${t.primaryRgb},0.15)` }}
                >
                  <Mail className="w-3.5 h-3.5 transition-colors" style={{ color: t.primary, opacity: 0.7 }} />
                </div>
                <span className="text-[13px] font-medium text-slate-400 group-hover:text-white truncate transition-colors">{qe}</span>
              </button>
            ))
          )}
        </div>
        <div className="h-3" />
      </ModalShell>

      {/* Manage modal */}
      <ModalShell open={showManage} onClose={() => setShowManage(false)} theme={t}>
        <ModalHeader title="Gerer les emails" icon={Settings} onClose={() => setShowManage(false)} count={quickEmails.length} theme={t} />
        <div className="h-px mx-5" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
        <div className="px-4 pt-4 flex gap-2">
          <div className="relative flex-1 min-w-0 group">
            <input type="email" value={manageInput} onChange={e => setManageInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleManageAdd(); } }}
              placeholder="Ajouter un email..." className="site-modal-input w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.06)', color: '#fff', caretColor: t.caretColor }}
              onFocusCapture={e => { e.currentTarget.style.borderColor = `rgba(${t.primaryRgb},0.35)`; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            />
          </div>
          <button type="button" onClick={handleManageAdd}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-lg"
            style={{ background: t.gradientHover, boxShadow: `0 0 16px rgba(${t.primaryRgb},0.2)`, color: '#fff' }}
          >
            <Plus className="w-4.5 h-4.5" />
          </button>
        </div>
        <div className="px-3 py-3 max-h-52 overflow-y-auto space-y-1">
          {quickEmails.length === 0 ? (
            <EmptyState message="Aucun email rapide" sub="Ajoutez un email ci-dessus." />
          ) : (
            quickEmails.map((qe, i) => (
              <div key={qe} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)',
                  animation: `qeItemIn 0.3s cubic-bezier(0.16,1,0.3,1) ${i * 0.05}s both`,
                  opacity: deletingEmail === qe ? 0 : undefined,
                  transform: deletingEmail === qe ? 'translateX(20px) scale(0.95)' : undefined,
                }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `rgba(${t.primaryRgb},0.08)`, border: `1px solid rgba(${t.primaryRgb},0.12)` }}
                >
                  <Mail className="w-3 h-3" style={{ color: t.primary, opacity: 0.6 }} />
                </div>
                <span className="text-[13px] truncate flex-1 text-slate-400">{qe}</span>
                <button type="button" onClick={() => handleRemove(qe)}
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 group"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400/60 group-hover:text-red-400 transition-colors" />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="px-4 pb-4 pt-2">
          <div className="h-px mb-3" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
          <button type="button" onClick={handleClearAll} disabled={quickEmails.length === 0}
            className="w-full py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200 disabled:opacity-30 hover:scale-[1.01]"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)', color: '#f87171' }}
          >
            Tout supprimer
          </button>
        </div>
        {toast && (
          <div className="flex items-center justify-center gap-1 pb-3">
            <Sparkles className="w-3 h-3" style={{ color: t.primary }} />
            <p className="text-[11px] font-semibold animate-pulse" style={{ color: t.primary }}>{toast}</p>
          </div>
        )}
      </ModalShell>
    </>
  );
}
