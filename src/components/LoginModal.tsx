import { X, Mail, Delete } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import RegisterModal from './RegisterModal';
import { useTheme } from '../contexts/ThemeContext';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { usePinInput } from './hooks/usePinInput';
import LoginPinInput from './login/LoginPinInput';
import QuickEmailSelector from './login/QuickEmailSelector';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const { theme } = useTheme();
  const tokens = useThemeTokens();
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
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

    setLoading(false);

    if (authError) {
      setError('Email ou mot de passe incorrect.');
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => pinRefs.current[0]?.focus(), 0);
    } else {
      onLogin();
    }
  }, [email, digits, onLogin, setDigits, pinRefs]);

  validateRef.current = handleValidate;

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setDigits(['', '', '', '', '', '']);
      setError('');
    }
  }, [isOpen, setDigits]);

  const pin = digits.join('');

  return (
    <>
    <RegisterModal
      isOpen={showRegister}
      onClose={() => { setShowRegister(false); onClose(); }}
      onBackToLogin={() => setShowRegister(false)}
    />
    {isOpen && <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4" style={{ backgroundColor: tokens.modal.overlayBg }}>
      <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 w-full max-w-md relative shadow-2xl overflow-hidden" style={{ background: tokens.modal.bg, borderColor: tokens.modal.border, borderWidth: '1px', borderStyle: 'solid' }}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = tokens.modal.closeBtnHoverBg;
            e.currentTarget.style.color = tokens.modal.closeBtnHoverText;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = tokens.modal.closeBtnBg;
            e.currentTarget.style.color = tokens.modal.closeBtnText;
          }}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-5 sm:mb-8">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-lg">
            <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400">
            Connexion
          </h2>
          <p className="text-xs sm:text-sm mt-1.5 sm:mt-2" style={{ color: tokens.modal.subtitle }}>Accédez à votre espace personnel</p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: tokens.modal.fieldLabel }}>
              Adresse email
            </label>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 z-10 pointer-events-none" style={{ color: tokens.input.placeholder }} />
                <input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  autoComplete="off"
                  className="w-full rounded-xl pl-9 sm:pl-12 pr-9 sm:pr-10 py-3 focus:outline-none focus:ring-2 transition-all text-sm sm:text-base truncate"
                  style={{
                    backgroundColor: tokens.input.bg,
                    borderColor: tokens.input.border,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    color: tokens.input.text,
                  }}
                  onFocusCapture={(e) => {
                    e.currentTarget.style.borderColor = tokens.input.borderFocus;
                  }}
                  onBlurCapture={(e) => {
                    e.currentTarget.style.borderColor = tokens.input.border;
                  }}
                />
                {email && (
                  <button
                    type="button"
                    onClick={() => { setEmail(''); emailInputRef.current?.focus(); }}
                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-colors"
                    style={{ backgroundColor: tokens.surface.tertiary, color: tokens.text.tertiary }}
                    title="Effacer l'adresse email"
                    aria-label="Effacer l'adresse email"
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
                  style={{ backgroundColor: tokens.surface.tertiary, color: tokens.text.tertiary }}
                  title="Supprimer le dernier caractere"
                  aria-label="Supprimer le dernier caractere"
                >
                  <Delete className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>
            <QuickEmailSelector email={email} onSelect={setEmail} tokens={tokens} />
          </div>

          <LoginPinInput
            digits={digits}
            showPin={showPin}
            setShowPin={setShowPin}
            isDark={isDark}
            tokens={tokens}
            pinRefs={pinRefs}
            handlePinInput={handlePinInput}
            handlePinKeyDown={handlePinKeyDown}
            handlePinFocus={handlePinFocus}
          />

          {error && (
            <p className="text-sm text-center -mt-2" style={{ color: tokens.danger.text }}>{error}</p>
          )}

          <button
            onClick={handleValidate}
            disabled={!email || pin.length !== 6 || loading}
            className="w-full py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white text-sm sm:text-base font-bold rounded-xl transition-all shadow-lg disabled:shadow-none"
          >
            {loading ? 'Connexion...' : 'VALIDER'}
          </button>

          <button
            onClick={() => setShowRegister(true)}
            className="w-full text-sm font-medium transition-colors flex items-center justify-center gap-2"
            style={{ color: tokens.text.tertiary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = tokens.text.secondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = tokens.text.tertiary;
            }}
          >
            <span className="text-orange-500">S'inscrire</span>
          </button>
        </div>
      </div>
    </div>}
    </>
  );
}
