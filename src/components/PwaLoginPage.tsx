import { useState, useRef, useCallback, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, Delete, X, LogIn, UserPlus, ChevronDown, Star, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePinInput } from './hooks/usePinInput';
import { useAppIcon } from '../hooks/useAppIcon';
import RegisterModal from './RegisterModal';
import PwaQuickEmailsModal from './PwaQuickEmailsModal';
import PwaManageEmailsModal from './PwaManageEmailsModal';

interface Props {
  onLogin: () => void;
  domainCompanyId?: string | null;
}

const LAST_EMAIL_KEY = 'crm_last_login_email';
const QUICK_EMAILS_KEY = 'crm_quick_login_emails';

function getQuickEmails(): string[] {
  try { return JSON.parse(localStorage.getItem(QUICK_EMAILS_KEY) || '[]'); } catch { return []; }
}
function saveQuickEmails(emails: string[]) {
  localStorage.setItem(QUICK_EMAILS_KEY, JSON.stringify(emails));
}

export default function PwaLoginPage({ onLogin, domainCompanyId }: Props) {
  const ownerType = domainCompanyId ? 'company' as const : 'super_admin' as const;
  const { appIconUrl, appName: configAppName } = useAppIcon(domainCompanyId ?? null, ownerType);
  const displayName = configAppName || 'Talvex';

  const [email, setEmailRaw] = useState(() => {
    try { return localStorage.getItem(LAST_EMAIL_KEY) || ''; } catch { return ''; }
  });
  const setEmail = useCallback((v: string | ((prev: string) => string)) => {
    setEmailRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      try { localStorage.setItem(LAST_EMAIL_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const validateRef = useRef<() => void>(() => {});

  const [quickEmails, setQuickEmailsState] = useState<string[]>(getQuickEmails);
  const [showQuickPicker, setShowQuickPicker] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [toast, setToast] = useState('');

  const showToastMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };
  const refreshQuick = () => { const l = getQuickEmails(); setQuickEmailsState(l); return l; };

  const playClick = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08);
    } catch { /* audio not supported */ }
  }, []);

  const { digits, setDigits, pinRefs, handlePinInput, handlePinKeyDown, handlePinFocus } = usePinInput({
    onDigitEntered: playClick,
    onEnter: () => validateRef.current(),
  });

  const handleValidate = useCallback(async () => {
    const pin = digits.join('');
    if (!email || pin.length !== 6) return;
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: pin });
    if (authError) {
      setLoading(false);
      setError('Email ou mot de passe incorrect.');
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => pinRefs.current[0]?.focus(), 0);
      return;
    }

    if (domainCompanyId) {
      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.app_metadata;
      const appRole = meta?.role;
      if (appRole !== 'super_admin') {
        let userCompanyId: string | null = (meta?.company_id as string) ?? null;
        if (!userCompanyId && appRole === 'client') {
          const { data: reg } = await supabase
            .from('registrations').select('company_id')
            .eq('email', email.toLowerCase().trim()).maybeSingle();
          userCompanyId = reg?.company_id ?? null;
        }
        if (userCompanyId !== domainCompanyId) {
          await supabase.auth.signOut();
          setLoading(false);
          setError("Ce compte n'est pas autorise sur ce domaine.");
          setDigits(['', '', '', '', '', '']);
          setTimeout(() => pinRefs.current[0]?.focus(), 0);
          return;
        }
      }
    }

    setLoading(false);
    supabase.auth.updateUser({ data: { pin } });
    onLogin();
  }, [email, digits, onLogin, setDigits, pinRefs, domainCompanyId]);

  validateRef.current = handleValidate;

  useEffect(() => {
    try { setEmailRaw(localStorage.getItem(LAST_EMAIL_KEY) || ''); } catch { /* ignore */ }
    setDigits(['', '', '', '', '', '']);
    setError('');
  }, [setDigits]);

  const pin = digits.join('');
  const canSubmit = !!email && pin.length === 6 && !loading;

  const handleSaveQuick = () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { showToastMsg('Email invalide'); return; }
    const list = refreshQuick();
    if (list.includes(trimmed)) { showToastMsg('Deja enregistre'); return; }
    const updated = [...list, trimmed];
    saveQuickEmails(updated); setQuickEmailsState(updated);
    showToastMsg('Email enregistre');
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
    saveQuickEmails([]); setQuickEmailsState([]);
    showToastMsg('Emails vides');
  };

  return (
    <>
      <RegisterModal isOpen={showRegister} onClose={() => setShowRegister(false)} onBackToLogin={() => setShowRegister(false)} />

      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(170deg, #020a1a 0%, #0a1628 40%, #071020 100%)' }}>
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(14,165,233,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />

        <div className="flex-shrink-0 flex flex-col items-center pt-10 sm:pt-14 pb-4 sm:pb-6 px-4 relative z-10">
          {appIconUrl ? (
            <img src={appIconUrl} alt={displayName} className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-[1.2rem] object-cover mb-3" style={{ boxShadow: '0 8px 40px rgba(14,165,233,0.30), 0 2px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)' }} />
          ) : (
            <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-[1.2rem] flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, #0ea5e9, #10b981)', boxShadow: '0 8px 40px rgba(14,165,233,0.30), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.15)' }}>
              <span className="text-white text-3xl font-bold select-none">{displayName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Connexion</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Accedez a votre espace {displayName}</p>
        </div>

        <div className="flex-1 flex flex-col px-4 sm:px-6 pb-4 relative z-10">
          <div className="w-full max-w-md mx-auto flex flex-col gap-4 sm:gap-5">
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold mb-1.5 text-slate-300 tracking-wide">Adresse email</label>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1 min-w-0">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none z-10" />
                  <input ref={emailInputRef} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" autoComplete="off" className="w-full rounded-xl pl-10 pr-9 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-all truncate" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.15)' }} onFocus={e => { e.currentTarget.style.borderColor = 'rgba(14,165,233,0.45)'; e.currentTarget.style.boxShadow = 'inset 0 1px 4px rgba(0,0,0,0.15), 0 0 0 2px rgba(14,165,233,0.08)'; }} onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'inset 0 1px 4px rgba(0,0,0,0.15)'; }} />
                  {email && (
                    <button type="button" onClick={() => { setEmail(''); emailInputRef.current?.focus(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-colors" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {email && (
                  <button type="button" onClick={() => { setEmail(v => v.slice(0, -1)); emailInputRef.current?.focus(); }} className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Delete className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <QuickBtn icon={<ChevronDown className="w-3 h-3" />} label="Rapides" onClick={() => { refreshQuick(); setShowQuickPicker(true); }} />
                <QuickBtn icon={<Star className="w-3 h-3" />} label="Enregistrer" onClick={handleSaveQuick} disabled={!email.trim()} />
                <QuickBtn icon={<Settings className="w-3 h-3" />} label="Gerer" onClick={() => { refreshQuick(); setShowManage(true); }} />
                {toast && <span className="text-[10px] font-medium text-cyan-400 animate-pulse ml-1">{toast}</span>}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <label className="text-[11px] sm:text-xs font-semibold text-slate-300 tracking-wide">Mot de passe (6 chiffres)</label>
                </div>
                <button type="button" onClick={() => setShowPin(v => !v)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showPin ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              <div className="flex gap-2 sm:gap-2.5 justify-center w-full max-w-[340px] mx-auto">
                {digits.map((digit, i) => (
                  <input key={i} ref={el => { pinRefs.current[i] = el; }} type={showPin ? 'text' : 'password'} inputMode="numeric" maxLength={1} value={digit} onChange={e => handlePinInput(i, e.target.value)} onKeyDown={e => handlePinKeyDown(i, e)} onFocus={() => handlePinFocus(i)} className="flex-1 min-w-0 max-w-[52px] aspect-square rounded-xl text-center text-xl font-bold transition-all caret-transparent text-white" style={{ background: digit ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.03)', border: digit ? '1.5px solid rgba(14,165,233,0.45)' : '1.5px solid rgba(255,255,255,0.07)', boxShadow: digit ? '0 0 12px rgba(14,165,233,0.08), inset 0 1px 4px rgba(0,0,0,0.1)' : 'inset 0 1px 4px rgba(0,0,0,0.1)', outline: 'none' }} onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(14,165,233,0.6)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(14,165,233,0.12), inset 0 1px 4px rgba(0,0,0,0.1)'; }} onBlurCapture={e => { e.currentTarget.style.borderColor = digit ? 'rgba(14,165,233,0.45)' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = digit ? '0 0 12px rgba(14,165,233,0.08), inset 0 1px 4px rgba(0,0,0,0.1)' : 'inset 0 1px 4px rgba(0,0,0,0.1)'; }} />
                ))}
              </div>
            </div>

            {error && <p className="text-[13px] text-center text-red-400 -mt-1">{error}</p>}

            <button onClick={handleValidate} disabled={!canSubmit} className="w-full py-3.5 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed" style={{ background: canSubmit ? 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)' : 'rgba(255,255,255,0.06)', boxShadow: canSubmit ? '0 8px 32px rgba(14,165,233,0.25), 0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.12)' : 'none', opacity: canSubmit ? 1 : 0.5 }}>
              <LogIn className="w-4 h-4" />
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            <button onClick={() => setShowRegister(true)} className="w-full text-[13px] font-medium transition-colors flex items-center justify-center gap-2 text-slate-400 hover:text-slate-300">
              <UserPlus className="w-3.5 h-3.5" />
              S'inscrire
            </button>
          </div>

          <div className="mt-auto pt-4 text-center">
            <p className="text-[11px] text-slate-600">&copy; 2026 {displayName}</p>
          </div>
        </div>
      </div>

      {showQuickPicker && (
        <PwaQuickEmailsModal quickEmails={quickEmails} onSelect={setEmail} onClose={() => setShowQuickPicker(false)} />
      )}

      {showManage && (
        <PwaManageEmailsModal quickEmails={quickEmails} onAdd={handleManageAdd} onRemove={handleRemoveQuick} onClearAll={handleClearAll} onClose={() => setShowManage(false)} showToast={showToastMsg} />
      )}
    </>
  );
}

function QuickBtn({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all disabled:opacity-30" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.40)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {icon}
      {label}
    </button>
  );
}
