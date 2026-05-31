import { useState, useRef, useCallback, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, Delete, X, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePinInput } from './hooks/usePinInput';
import RegisterModal from './RegisterModal';

interface Props {
  onLogin: () => void;
  domainCompanyId?: string | null;
}

const LAST_EMAIL_KEY = 'crm_last_login_email';

export default function PwaLoginPage({ onLogin, domainCompanyId }: Props) {
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

  const playClick = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
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

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: pin,
    });

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
            .from('registrations')
            .select('company_id')
            .eq('email', email.toLowerCase().trim())
            .maybeSingle();
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

  return (
    <>
      <RegisterModal
        isOpen={showRegister}
        onClose={() => setShowRegister(false)}
        onBackToLogin={() => setShowRegister(false)}
      />

      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #050810 0%, #0a1628 50%, #050810 100%)' }}>
        {/* Top section with logo */}
        <div className="flex-shrink-0 flex flex-col items-center pt-12 sm:pt-16 pb-6 sm:pb-8 px-4">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-5"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #10b981)',
              boxShadow: '0 8px 32px rgba(14,165,233,0.35), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.15)',
            }}
          >
            <span className="text-white text-3xl sm:text-4xl font-bold select-none">T</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Connexion</h1>
          <p className="text-sm text-slate-400">Accedez a votre espace Talvex</p>
        </div>

        {/* Login form card */}
        <div className="flex-1 flex flex-col px-4 sm:px-6 pb-6">
          <div
            className="w-full max-w-md mx-auto rounded-2xl sm:rounded-3xl p-5 sm:p-8 flex-shrink-0"
            style={{
              background: 'rgba(15,23,42,0.8)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 16px 64px rgba(0,0,0,0.4)',
            }}
          >
            <div className="space-y-5 sm:space-y-6">
              {/* Email field */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Adresse email
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1 min-w-0">
                    <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 z-10 pointer-events-none text-slate-500" />
                    <input
                      ref={emailInputRef}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      autoComplete="off"
                      className="w-full rounded-xl pl-10 sm:pl-12 pr-9 sm:pr-10 py-3.5 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all truncate"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    />
                    {email && (
                      <button
                        type="button"
                        onClick={() => { setEmail(''); emailInputRef.current?.focus(); }}
                        className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-colors"
                        style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {email && (
                    <button
                      type="button"
                      onClick={() => { setEmail(v => v.slice(0, -1)); emailInputRef.current?.focus(); }}
                      className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-colors"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* PIN field */}
              <div>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 text-slate-500" />
                    <label className="text-xs sm:text-sm font-medium text-slate-300 truncate">Mot de passe (6 chiffres)</label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPin(v => !v)}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0 ml-2"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.5)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {showPin ? <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                    {showPin ? 'Masquer' : 'Afficher'}
                  </button>
                </div>

                <div className="flex gap-1.5 sm:gap-2 justify-center w-full max-w-[320px] mx-auto">
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { pinRefs.current[i] = el; }}
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handlePinInput(i, e.target.value)}
                      onKeyDown={e => handlePinKeyDown(i, e)}
                      onFocus={() => handlePinFocus(i)}
                      className="flex-1 min-w-0 max-w-[48px] sm:max-w-[56px] aspect-[4/5] rounded-lg sm:rounded-xl text-center text-lg sm:text-xl font-bold transition-all caret-transparent text-white"
                      style={{
                        background: digit
                          ? 'rgba(14,165,233,0.15)'
                          : 'rgba(255,255,255,0.04)',
                        border: digit
                          ? '1px solid rgba(14,165,233,0.5)'
                          : '1px solid rgba(255,255,255,0.09)',
                        outline: 'none',
                      }}
                      onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(14,165,233,0.7)')}
                      onBlurCapture={e => (e.currentTarget.style.borderColor = digit
                        ? 'rgba(14,165,233,0.5)'
                        : 'rgba(255,255,255,0.09)'
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Error message */}
              {error && (
                <p className="text-sm text-center text-red-400">{error}</p>
              )}

              {/* Login button */}
              <button
                onClick={handleValidate}
                disabled={!email || pin.length !== 6 || loading}
                className="w-full py-3.5 sm:py-4 text-white text-sm sm:text-base font-bold rounded-xl transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: (!email || pin.length !== 6 || loading)
                    ? 'rgba(255,255,255,0.08)'
                    : 'linear-gradient(135deg, #0ea5e9, #10b981)',
                  boxShadow: (!email || pin.length !== 6 || loading)
                    ? 'none'
                    : '0 8px 32px rgba(14,165,233,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
              >
                <LogIn className="w-4.5 h-4.5" />
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>

              {/* Register link */}
              <button
                onClick={() => setShowRegister(true)}
                className="w-full text-sm font-medium transition-colors flex items-center justify-center gap-2 text-slate-400 hover:text-slate-300"
              >
                <UserPlus className="w-4 h-4" />
                <span>S'inscrire</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-6 text-center">
            <p className="text-xs text-slate-600">&copy; 2026 Talvex</p>
          </div>
        </div>
      </div>
    </>
  );
}
