import { useState, useRef, useCallback } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ArrowLeft, X, Delete, ChevronDown, Star, Settings } from 'lucide-react';
import SimulatedPhoneQuickEmailsModal from './SimulatedPhoneQuickEmailsModal';
import SimulatedPhoneManageEmailsModal from './SimulatedPhoneManageEmailsModal';

const QUICK_EMAILS_KEY = 'crm_quick_login_emails';
function getQuickEmails(): string[] {
  try { return JSON.parse(localStorage.getItem(QUICK_EMAILS_KEY) || '[]'); } catch { return []; }
}
function saveQuickEmails(emails: string[]) {
  localStorage.setItem(QUICK_EMAILS_KEY, JSON.stringify(emails));
}

interface Props {
  appIconUrl: string | null;
  appName?: string;
  onLogin: () => void;
  onBack?: () => void;
}

export default function SimulatedPhoneLoginScreen({ appIconUrl, appName, onLogin, onBack }: Props) {
  const displayName = appName ?? 'Talvex';
  const initial = displayName.charAt(0).toUpperCase() || 'T';
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const emailRef = useRef<HTMLInputElement>(null);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [quickEmails, setQuickEmailsState] = useState<string[]>(getQuickEmails);
  const [showQuickPicker, setShowQuickPicker] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [toast, setToast] = useState('');

  const showToastMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2200); };
  const refreshQuick = () => { const l = getQuickEmails(); setQuickEmailsState(l); return l; };

  const pin = digits.join('');

  const handleSubmit = useCallback(() => {
    if (!email || pin.length !== 6) { setError('Veuillez remplir tous les champs.'); return; }
    setLoading(true); setError('');
    setTimeout(() => { setLoading(false); onLogin(); }, 800);
  }, [email, pin, onLogin]);

  const handlePinInput = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setDigits(prev => { const next = [...prev]; next[index] = digit; return next; });
    if (digit && index < 5) setTimeout(() => pinRefs.current[index + 1]?.focus(), 0);
  }, []);

  const handlePinKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) { setDigits(prev => { const n = [...prev]; n[index] = ''; return n; }); }
      else if (index > 0) { pinRefs.current[index - 1]?.focus(); setDigits(prev => { const n = [...prev]; n[index - 1] = ''; return n; }); }
    } else if (e.key === 'ArrowLeft' && index > 0) { pinRefs.current[index - 1]?.focus(); }
    else if (e.key === 'ArrowRight' && index < 5) { pinRefs.current[index + 1]?.focus(); }
    else if (e.key === 'Enter') { handleSubmit(); }
  }, [digits, handleSubmit]);

  const handleSaveQuick = () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { showToastMsg('Email invalide'); return; }
    const list = refreshQuick();
    if (list.includes(trimmed)) { showToastMsg('Deja enregistre'); return; }
    const updated = [...list, trimmed];
    saveQuickEmails(updated); setQuickEmailsState(updated);
    showToastMsg('Enregistre');
  };

  const handleRemoveQuick = (target: string) => {
    const updated = quickEmails.filter(e => e !== target);
    saveQuickEmails(updated); setQuickEmailsState(updated);
  };

  const handleManageAdd = (trimmed: string) => {
    const updated = [...quickEmails, trimmed];
    saveQuickEmails(updated); setQuickEmailsState(updated);
  };

  const handleClearAll = () => {
    saveQuickEmails([]); setQuickEmailsState([]); showToastMsg('Vide');
  };

  const canSubmit = !!email && pin.length === 6 && !loading;

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: 'linear-gradient(170deg, #020a1a 0%, #0a1628 50%, #071020 100%)' }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(14,165,233,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      {onBack && (
        <div className="flex-shrink-0 pt-1.5 px-3 relative z-10">
          <button onClick={onBack} className="flex items-center gap-1 px-2 py-0.5 rounded-lg transition-all" style={{ color: 'rgba(255,255,255,0.40)' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}>
            <ArrowLeft className="w-3 h-3" />
            <span className="text-[9px] font-medium">Retour</span>
          </button>
        </div>
      )}

      <div className="flex-shrink-0 flex flex-col items-center pt-2.5 pb-2 px-4 relative z-10">
        {appIconUrl ? (
          <img src={appIconUrl} alt={displayName} className="w-11 h-11 rounded-xl object-cover mb-1.5" style={{ boxShadow: '0 4px 16px rgba(14,165,233,0.25), 0 2px 4px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)' }} />
        ) : (
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-1.5" style={{ background: 'linear-gradient(135deg, #0ea5e9, #10b981)', boxShadow: '0 4px 16px rgba(14,165,233,0.25), 0 2px 4px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.15)' }}>
            <span className="text-white text-lg font-bold select-none">{initial}</span>
          </div>
        )}
        <h1 className="text-sm font-bold text-white tracking-tight">Connexion</h1>
        <p className="text-[8px] text-slate-400 mt-0.5">Accedez a votre espace {displayName}</p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-3 pb-1.5 relative z-10">
        <div className="flex flex-col gap-2.5">
          <div>
            <label className="block text-[8px] font-semibold mb-1 text-slate-300 tracking-wide">Adresse email</label>
            <div className="flex items-center gap-1">
              <div className="relative flex-1 min-w-0">
                <Mail className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-500 pointer-events-none z-10" />
                <input ref={emailRef} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" className="w-full rounded-lg pl-6 pr-6 py-1.5 text-[10px] text-white placeholder-slate-500 focus:outline-none transition-all truncate" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.12)' }} onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(14,165,233,0.45)'; e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.12), 0 0 0 1px rgba(14,165,233,0.08)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.12)'; }} />
                {email && (
                  <button type="button" onClick={() => { setEmail(''); emailRef.current?.focus(); }} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                    <X className="w-2 h-2" />
                  </button>
                )}
              </div>
              {email && (
                <button type="button" onClick={() => { setEmail(v => v.slice(0, -1)); emailRef.current?.focus(); }} className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Delete className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <MiniQuickBtn icon={<ChevronDown className="w-2.5 h-2.5" />} label="Rapides" onClick={() => { refreshQuick(); setShowQuickPicker(true); }} />
              <MiniQuickBtn icon={<Star className="w-2.5 h-2.5" />} label="Enregistrer" onClick={handleSaveQuick} disabled={!email.trim()} />
              <MiniQuickBtn icon={<Settings className="w-2.5 h-2.5" />} label="Gerer" onClick={() => { refreshQuick(); setShowManage(true); }} />
              {toast && <span className="text-[7px] font-medium text-cyan-400 animate-pulse ml-0.5">{toast}</span>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-slate-500" />
                <label className="text-[8px] font-semibold text-slate-300">Mot de passe (6 chiffres)</label>
              </div>
              <button type="button" onClick={() => setShowPin(v => !v)} className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px] font-semibold transition-all" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.40)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {showPin ? <EyeOff className="w-2 h-2" /> : <Eye className="w-2 h-2" />}
                {showPin ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            <div className="flex gap-1.5 justify-center">
              {digits.map((digit, i) => (
                <input key={i} ref={el => { pinRefs.current[i] = el; }} type={showPin ? 'text' : 'password'} inputMode="numeric" maxLength={1} value={digit} onChange={e => handlePinInput(i, e.target.value)} onKeyDown={e => handlePinKeyDown(i, e)} onFocus={e => e.currentTarget.select()} className="w-full aspect-square rounded-lg text-center text-sm font-bold transition-all caret-transparent text-white" style={{ maxWidth: 30, background: digit ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.03)', border: digit ? '1px solid rgba(14,165,233,0.45)' : '1px solid rgba(255,255,255,0.07)', boxShadow: digit ? '0 0 8px rgba(14,165,233,0.08), inset 0 1px 3px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.1)', outline: 'none' }} onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(14,165,233,0.6)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(14,165,233,0.12), inset 0 1px 3px rgba(0,0,0,0.1)'; }} onBlurCapture={e => { e.currentTarget.style.borderColor = digit ? 'rgba(14,165,233,0.45)' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = digit ? '0 0 8px rgba(14,165,233,0.08), inset 0 1px 3px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.1)'; }} />
              ))}
            </div>
          </div>

          {error && <p className="text-[8px] text-center text-red-400 -mt-0.5">{error}</p>}

          <button onClick={handleSubmit} disabled={!canSubmit} className="w-full py-1.5 text-white text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 disabled:cursor-not-allowed" style={{ background: canSubmit ? 'linear-gradient(135deg, #0ea5e9, #10b981)' : 'rgba(255,255,255,0.06)', boxShadow: canSubmit ? '0 4px 16px rgba(14,165,233,0.25), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none', opacity: canSubmit ? 1 : 0.5 }}>
            <LogIn className="w-3 h-3" />
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <button className="w-full text-[8px] font-medium flex items-center justify-center gap-1 text-slate-400" onClick={(e) => e.preventDefault()}>
            <UserPlus className="w-2.5 h-2.5" />
            S'inscrire
          </button>
        </div>

        <div className="mt-auto pt-1 text-center flex-shrink-0">
          <p className="text-[7px] text-slate-600">&copy; 2026 {displayName}</p>
        </div>
      </div>

      {showQuickPicker && (
        <SimulatedPhoneQuickEmailsModal quickEmails={quickEmails} onSelect={setEmail} onClose={() => setShowQuickPicker(false)} />
      )}

      {showManage && (
        <SimulatedPhoneManageEmailsModal quickEmails={quickEmails} onAdd={handleManageAdd} onRemove={handleRemoveQuick} onClearAll={handleClearAll} onClose={() => setShowManage(false)} showToast={showToastMsg} />
      )}
    </div>
  );
}

function MiniQuickBtn({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[7px] font-semibold transition-all disabled:opacity-30" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.38)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {icon}
      {label}
    </button>
  );
}
