import { useState, useEffect } from 'react';
import { ChevronDown, Star, Settings, Trash2, Plus, X, Mail, Zap, Inbox, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'crm_quick_login_emails';

function getQuickEmails(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function setQuickEmails(emails: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
}
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface Props {
  email: string;
  onSelect: (email: string) => void;
}

function ModalShell({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) requestAnimationFrame(() => setMounted(true));
    else setMounted(false);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes qeBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes qeModalIn { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes qeOrbFloat { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(8px,-12px) scale(1.08); } }
        @keyframes qeShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        @keyframes qeItemIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        style={{
          backgroundColor: 'rgba(2,6,14,0.82)',
          backdropFilter: 'blur(16px)',
          animation: 'qeBackdropIn 0.25s ease-out',
        }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="w-[92%] max-w-sm rounded-2xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(165deg, rgba(15,23,42,0.97), rgba(6,10,20,0.99))',
            border: '1px solid rgba(14,165,233,0.12)',
            boxShadow: '0 0 60px rgba(14,165,233,0.06), 0 20px 50px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
            animation: mounted ? 'qeModalIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
            opacity: mounted ? 1 : 0,
          }}
        >
          {/* Floating orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full opacity-[0.06]"
              style={{ background: 'radial-gradient(circle, #0ea5e9, transparent 70%)', animation: 'qeOrbFloat 8s ease-in-out infinite' }} />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full opacity-[0.04]"
              style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)', animation: 'qeOrbFloat 10s ease-in-out infinite reverse' }} />
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

function ModalHeader({ title, icon: Icon, onClose, count }: { title: string; icon: typeof Mail; onClose: () => void; count?: number }) {
  return (
    <div className="relative px-5 pt-5 pb-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-90 group"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <X className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
      </button>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(6,182,212,0.08))',
            border: '1px solid rgba(14,165,233,0.25)',
          }}
        >
          <Icon className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-white">{title}</h3>
          {count !== undefined && (
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {count} email{count !== 1 ? 's' : ''} enregistre{count !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message, sub }: { message: string; sub: string }) {
  return (
    <div className="px-5 py-8 flex flex-col items-center text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(255,255,255,0.08)' }}
      >
        <Inbox className="w-6 h-6 text-slate-600" />
      </div>
      <p className="text-[13px] font-medium text-slate-500">{message}</p>
      <p className="text-[11px] text-slate-600 mt-1">{sub}</p>
    </div>
  );
}

export default function TalvexQuickEmailSelector({ email, onSelect }: Props) {
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
      {/* Action buttons */}
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
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            <btn.icon className="w-3.5 h-3.5 group-hover:text-cyan-400 transition-colors" />
            <span className="group-hover:text-slate-300 transition-colors">{btn.label}</span>
          </button>
        ))}

        {toast && (
          <span className="flex items-center gap-1 text-[11px] font-semibold basis-full mt-1.5 text-cyan-400 animate-pulse">
            <Sparkles className="w-3 h-3" />
            {toast}
          </span>
        )}
      </div>

      {/* ---- Picker modal ---- */}
      <ModalShell open={showPicker} onClose={() => setShowPicker(false)}>
        <ModalHeader title="Emails rapides" icon={Zap} onClose={() => setShowPicker(false)} count={quickEmails.length} />

        <div className="h-px mx-5" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />

        <div className="max-h-64 overflow-y-auto py-2 px-2">
          {quickEmails.length === 0 ? (
            <EmptyState message="Aucun email rapide" sub="Cliquez Enregistrer pour ajouter l'email actuel." />
          ) : (
            quickEmails.map((qe, i) => (
              <button
                key={qe}
                type="button"
                onClick={() => { onSelect(qe); setShowPicker(false); }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 group hover:scale-[1.01]"
                style={{
                  animation: `qeItemIn 0.3s cubic-bezier(0.16,1,0.3,1) ${i * 0.05}s both`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(6,182,212,0.04))';
                  e.currentTarget.style.border = '1px solid rgba(14,165,233,0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.border = '1px solid transparent';
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  style={{
                    background: 'rgba(14,165,233,0.08)',
                    border: '1px solid rgba(14,165,233,0.15)',
                  }}
                >
                  <Mail className="w-3.5 h-3.5 text-cyan-400/70 group-hover:text-cyan-400 transition-colors" />
                </div>
                <span className="text-[13px] font-medium text-slate-400 group-hover:text-white truncate transition-colors">
                  {qe}
                </span>
              </button>
            ))
          )}
        </div>
        <div className="h-3" />
      </ModalShell>

      {/* ---- Manage modal ---- */}
      <ModalShell open={showManage} onClose={() => setShowManage(false)}>
        <ModalHeader title="Gerer les emails" icon={Settings} onClose={() => setShowManage(false)} count={quickEmails.length} />

        <div className="h-px mx-5" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />

        {/* Add input */}
        <div className="px-4 pt-4 flex gap-2">
          <div className="relative flex-1 min-w-0 group">
            <input
              type="email"
              value={manageInput}
              onChange={e => setManageInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleManageAdd(); } }}
              placeholder="Ajouter un email..."
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all placeholder:text-slate-600"
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1.5px solid rgba(255,255,255,0.06)',
                color: '#fff',
              }}
              onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(14,165,233,0.35)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            />
          </div>
          <button
            type="button"
            onClick={handleManageAdd}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #0891b2)',
              boxShadow: '0 0 16px rgba(14,165,233,0.2)',
              color: '#fff',
            }}
          >
            <Plus className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Email list */}
        <div className="px-3 py-3 max-h-52 overflow-y-auto space-y-1">
          {quickEmails.length === 0 ? (
            <EmptyState message="Aucun email rapide" sub="Ajoutez un email ci-dessus." />
          ) : (
            quickEmails.map((qe, i) => (
              <div
                key={qe}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  animation: `qeItemIn 0.3s cubic-bezier(0.16,1,0.3,1) ${i * 0.05}s both`,
                  opacity: deletingEmail === qe ? 0 : undefined,
                  transform: deletingEmail === qe ? 'translateX(20px) scale(0.95)' : undefined,
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.12)' }}
                >
                  <Mail className="w-3 h-3 text-cyan-400/60" />
                </div>
                <span className="text-[13px] truncate flex-1 text-slate-400">{qe}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(qe)}
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 group"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400/60 group-hover:text-red-400 transition-colors" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Clear all */}
        <div className="px-4 pb-4 pt-2">
          <div className="h-px mb-3" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
          <button
            type="button"
            onClick={handleClearAll}
            disabled={quickEmails.length === 0}
            className="w-full py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200 disabled:opacity-30 hover:scale-[1.01]"
            style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.1)',
              color: '#f87171',
            }}
          >
            Tout supprimer
          </button>
        </div>

        {toast && (
          <div className="flex items-center justify-center gap-1 pb-3">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <p className="text-[11px] font-semibold text-cyan-400 animate-pulse">{toast}</p>
          </div>
        )}
      </ModalShell>
    </>
  );
}
