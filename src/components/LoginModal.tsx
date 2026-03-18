import { X, Mail, Eye, EyeOff, Lock } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import RegisterModal from './RegisterModal';

const SAVED_EMAILS_KEY = 'login_saved_emails';

function getSavedEmails(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_EMAILS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveEmail(email: string) {
  const emails = getSavedEmails();
  const filtered = emails.filter((e) => e !== email);
  filtered.unshift(email);
  localStorage.setItem(SAVED_EMAILS_KEY, JSON.stringify(filtered.slice(0, 10)));
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setDigits(['', '', '', '', '', '']);
    setError('');
    setShowSuggestions(false);
    if (isOpen) {
      const saved = getSavedEmails();
      if (saved.length > 0) {
        setEmail(saved[0]);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        emailInputRef.current &&
        !emailInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    const saved = getSavedEmails();
    const filtered = value
      ? saved.filter((e) => e.toLowerCase().includes(value.toLowerCase()))
      : saved;
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  const handleEmailFocus = () => {
    const saved = getSavedEmails();
    const filtered = email
      ? saved.filter((e) => e.toLowerCase().includes(email.toLowerCase()))
      : saved;
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setEmail(suggestion);
    setShowSuggestions(false);
  };

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
    } catch {}
  }, []);

  const handlePinInput = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    if (digit) playClick();
    setDigits(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) {
      setTimeout(() => pinRefs.current[index + 1]?.focus(), 0);
    }
  }, [playClick]);

  const handlePinKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigits(prev => { const n = [...prev]; n[index] = ''; return n; });
      } else if (index > 0) {
        pinRefs.current[index - 1]?.focus();
        setDigits(prev => { const n = [...prev]; n[index - 1] = ''; return n; });
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      pinRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      handleValidate();
    }
  }, [digits]);

  const handlePinFocus = useCallback((index: number) => {
    pinRefs.current[index]?.select();
  }, []);

  const handleValidate = async () => {
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
      saveEmail(email);
      onLogin();
    }
  };

  const pin = digits.join('');

  return (
    <>
    <RegisterModal
      isOpen={showRegister}
      onClose={() => { setShowRegister(false); onClose(); }}
      onBackToLogin={() => setShowRegister(false)}
    />
    {isOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 w-full max-w-md relative border border-slate-700 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-slate-700/50 hover:bg-slate-600/50 rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-slate-300" />
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400">
            Connexion
          </h2>
          <p className="text-slate-400 text-sm mt-2">Accédez à votre espace personnel</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Adresse email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 z-10 pointer-events-none" />
              <input
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onFocus={handleEmailFocus}
                placeholder="votre@email.com"
                autoComplete="off"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-12 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
              />
              {showSuggestions && (
                <div
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-50"
                >
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onMouseDown={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-4 py-3 text-slate-200 text-sm hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500" />
                <label className="text-slate-300 text-sm font-medium">Mot de passe (6 chiffres)</label>
              </div>
              <button
                type="button"
                onClick={() => setShowPin(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPin ? 'Masquer' : 'Afficher'}
              </button>
            </div>

            <div className="flex gap-2 justify-center">
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
                  className="w-12 h-14 rounded-xl text-center text-xl font-bold text-white transition-all caret-transparent"
                  style={{
                    background: digit ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.04)',
                    border: digit ? '1px solid rgba(249,115,22,0.4)' : '1px solid rgba(255,255,255,0.09)',
                    outline: 'none',
                  }}
                  onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(249,115,22,0.6)')}
                  onBlurCapture={e => (e.currentTarget.style.borderColor = digit ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.09)')}
                />
              ))}
            </div>
            <p className="text-xs text-slate-600 text-center mt-2">Utilisez les flèches gauche/droite pour naviguer</p>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center -mt-2">{error}</p>
          )}

          <button
            onClick={handleValidate}
            disabled={!email || pin.length !== 6 || loading}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg disabled:shadow-none"
          >
            {loading ? 'Connexion...' : 'VALIDER'}
          </button>

          <button
            onClick={() => setShowRegister(true)}
            className="w-full text-slate-400 hover:text-slate-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-orange-500">S'inscrire</span>
          </button>
        </div>
      </div>
    </div>}
    </>
  );
}
