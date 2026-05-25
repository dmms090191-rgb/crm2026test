import { X, Mail, Delete, Lock, Eye, EyeOff, Zap, Shield, ArrowRight, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../../../lib/supabase';
import { usePinInput } from '../../../../../components/hooks/usePinInput';
import TalvexRegisterModal from './TalvexRegisterModal';
import TalvexQuickEmailSelector from './TalvexQuickEmailSelector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onRegister?: () => void;
}

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full opacity-[0.07] animate-[orbFloat_8s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle, #0ea5e9, transparent 70%)' }} />
      <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full opacity-[0.05] animate-[orbFloat_10s_ease-in-out_infinite_reverse]"
        style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
      <div className="absolute top-1/2 -left-10 w-24 h-24 rounded-full opacity-[0.04] animate-[orbFloat_12s_ease-in-out_infinite_2s]"
        style={{ background: 'radial-gradient(circle, #38bdf8, transparent 70%)' }} />
    </div>
  );
}

function GlowLine({ active }: { active: boolean }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden rounded-b-3xl">
      <div
        className="h-full transition-all duration-700 ease-out"
        style={{
          width: active ? '100%' : '0%',
          background: 'linear-gradient(90deg, transparent, #0ea5e9, #06b6d4, #0ea5e9, transparent)',
          margin: '0 auto',
        }}
      />
    </div>
  );
}

function PinDigitBox({ digit, index, showPin, focused, inputRef, onInput, onKeyDown, onFocus }: {
  digit: string; index: number; showPin: boolean; focused: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onInput: (i: number, v: string) => void;
  onKeyDown: (i: number, e: React.KeyboardEvent) => void;
  onFocus: (i: number) => void;
}) {
  const filled = !!digit;
  return (
    <div className="relative flex-1 min-w-0 max-w-[52px]">
      {filled && (
        <div className="absolute inset-0 rounded-xl opacity-60 animate-[pinGlow_2s_ease-in-out_infinite]"
          style={{ background: 'radial-gradient(circle at center, rgba(14,165,233,0.15), transparent 70%)' }} />
      )}
      <input
        ref={inputRef}
        type={showPin ? 'text' : 'password'}
        inputMode="numeric"
        maxLength={1}
        value={digit}
        onChange={e => onInput(index, e.target.value)}
        onKeyDown={e => onKeyDown(index, e)}
        onFocus={() => onFocus(index)}
        className="relative z-10 w-full aspect-square rounded-xl text-center text-xl font-bold text-white caret-transparent outline-none transition-all duration-300"
        style={{
          background: filled
            ? 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(6,182,212,0.08))'
            : focused
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(255,255,255,0.03)',
          border: filled
            ? '1.5px solid rgba(14,165,233,0.5)'
            : focused
              ? '1.5px solid rgba(14,165,233,0.35)'
              : '1.5px solid rgba(255,255,255,0.06)',
          boxShadow: filled
            ? '0 0 20px rgba(14,165,233,0.12), inset 0 1px 0 rgba(255,255,255,0.05)'
            : focused
              ? '0 0 12px rgba(14,165,233,0.08)'
              : 'inset 0 1px 0 rgba(255,255,255,0.02)',
          transform: filled ? 'scale(1.04)' : 'scale(1)',
        }}
      />
      {focused && !filled && (
        <div className="absolute inset-x-0 bottom-2.5 flex justify-center z-20 pointer-events-none">
          <div className="w-4 h-0.5 rounded-full bg-cyan-400 animate-pulse" />
        </div>
      )}
    </div>
  );
}

export default function TalvexLoginModal({ isOpen, onClose, onLogin, onRegister }: Props) {
  const [email, setEmail] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedPin, setFocusedPin] = useState(-1);
  const [submitHover, setSubmitHover] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const validateRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  const playClick = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch { /* audio not supported */ }
  }, []);

  const { digits, setDigits, pinRefs, handlePinInput, handlePinKeyDown, handlePinFocus } = usePinInput({
    onDigitEntered: playClick,
    onEnter: () => validateRef.current(),
  });

  const wrappedPinFocus = (i: number) => { setFocusedPin(i); handlePinFocus(i); };

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
      supabase.auth.updateUser({ data: { pin } });
      onLogin();
    }
  }, [email, digits, onLogin, setDigits, pinRefs]);

  validateRef.current = handleValidate;

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setDigits(['', '', '', '', '', '']);
      setError('');
      setFocusedPin(-1);
    }
  }, [isOpen, setDigits]);

  const pin = digits.join('');
  const canSubmit = !!email && pin.length === 6 && !loading;
  const filledCount = digits.filter(d => d !== '').length;
  const progress = (email ? 1 : 0) + filledCount;

  return (
    <>
      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(12px, -18px) scale(1.1); }
          66% { transform: translate(-8px, 12px) scale(0.95); }
        }
        @keyframes pinGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes modalEnter {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes backdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes iconPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes progressGlow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes successRipple {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>

      <TalvexRegisterModal
        isOpen={showRegister}
        onClose={() => { setShowRegister(false); onClose(); }}
        onBackToLogin={() => setShowRegister(false)}
      />

      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4"
          style={{
            backgroundColor: 'rgba(2,6,14,0.88)',
            backdropFilter: 'blur(20px)',
            animation: 'backdropIn 0.3s ease-out',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <div
            className="rounded-3xl w-full max-w-[420px] relative overflow-hidden"
            style={{
              background: 'linear-gradient(165deg, rgba(15,23,42,0.97) 0%, rgba(6,10,20,0.99) 100%)',
              border: '1px solid rgba(14,165,233,0.12)',
              boxShadow: `
                0 0 80px rgba(14,165,233,0.06),
                0 25px 60px rgba(0,0,0,0.6),
                inset 0 1px 0 rgba(255,255,255,0.04)
              `,
              animation: mounted ? 'modalEnter 0.4s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
              opacity: mounted ? 1 : 0,
            }}
          >
            <FloatingOrbs />
            <GlowLine active={canSubmit} />

            {/* Glass header strip */}
            <div className="relative px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-90 group"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <X className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
              </button>

              {/* Icon + Title */}
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center relative z-10"
                    style={{
                      background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                      boxShadow: '0 0 40px rgba(14,165,233,0.25), 0 8px 24px rgba(14,165,233,0.2)',
                      animation: 'iconPulse 3s ease-in-out infinite',
                    }}
                  >
                    <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="absolute inset-0 rounded-2xl animate-ping opacity-20"
                    style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)' }} />
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                    Connexion
                  </span>
                </h2>
                <p className="text-[13px] mt-1.5 text-slate-500 font-medium">
                  Accedez a votre espace personnel
                </p>

                {/* Progress dots */}
                <div className="flex items-center gap-1.5 mt-3">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-1 rounded-full transition-all duration-500"
                      style={{
                        width: i < progress ? 12 : 6,
                        background: i < progress
                          ? 'linear-gradient(90deg, #0ea5e9, #06b6d4)'
                          : 'rgba(255,255,255,0.08)',
                        boxShadow: i < progress ? '0 0 8px rgba(14,165,233,0.3)' : 'none',
                        animation: i < progress ? 'progressGlow 2s ease-in-out infinite' : 'none',
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Form body */}
            <div className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-5">
              {/* Email field */}
              <div>
                <label className="flex items-center gap-1.5 text-[13px] font-semibold mb-2.5 text-slate-400">
                  <Mail className="w-3.5 h-3.5" />
                  Adresse email
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1 min-w-0 group">
                    <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-0"
                      style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.06), rgba(6,182,212,0.03))', border: '1px solid rgba(14,165,233,0.2)' }} />
                    <input
                      ref={emailInputRef}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      autoComplete="off"
                      className="relative z-10 w-full rounded-xl px-4 py-3.5 focus:outline-none transition-all text-sm sm:text-[15px] truncate placeholder:text-slate-600"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border: '1.5px solid rgba(255,255,255,0.06)',
                        color: '#fff',
                      }}
                      onFocusCapture={(e) => { e.currentTarget.style.borderColor = 'rgba(14,165,233,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                      onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    />
                    {email && (
                      <button
                        type="button"
                        onClick={() => { setEmail(''); emailInputRef.current?.focus(); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {email && (
                    <button
                      type="button"
                      onClick={() => { setEmail(v => v.slice(0, -1)); emailInputRef.current?.focus(); }}
                      className="shrink-0 w-[46px] h-[46px] rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                    >
                      <Delete className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>
                <TalvexQuickEmailSelector email={email} onSelect={setEmail} />
              </div>

              {/* Separator */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
                <Shield className="w-3.5 h-3.5 text-slate-600" />
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
              </div>

              {/* PIN field */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                    Mot de passe (6 chiffres)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(v => !v)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-200 hover:scale-105"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showPin ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
                <div className="flex gap-2 sm:gap-2.5 justify-center w-full max-w-[340px] mx-auto">
                  {digits.map((digit, i) => (
                    <PinDigitBox
                      key={i}
                      digit={digit}
                      index={i}
                      showPin={showPin}
                      focused={focusedPin === i}
                      inputRef={el => { pinRefs.current[i] = el; }}
                      onInput={handlePinInput}
                      onKeyDown={handlePinKeyDown}
                      onFocus={wrappedPinFocus}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-center mt-2.5 text-slate-600 font-medium">
                  Fleches gauche/droite pour naviguer
                </p>
              </div>

              {error && (
                <div
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}
                >
                  <X className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleValidate}
                disabled={!canSubmit}
                onMouseEnter={() => setSubmitHover(true)}
                onMouseLeave={() => setSubmitHover(false)}
                className="relative w-full py-3.5 sm:py-4 text-sm sm:text-[15px] font-bold rounded-xl transition-all duration-300 disabled:cursor-not-allowed overflow-hidden group"
                style={{
                  background: canSubmit
                    ? 'linear-gradient(135deg, #0ea5e9, #0891b2)'
                    : 'rgba(255,255,255,0.04)',
                  boxShadow: canSubmit
                    ? submitHover
                      ? '0 0 40px rgba(14,165,233,0.35), 0 8px 30px rgba(14,165,233,0.25)'
                      : '0 0 24px rgba(14,165,233,0.2), 0 4px 16px rgba(14,165,233,0.15)'
                    : 'none',
                  color: canSubmit ? '#fff' : 'rgba(255,255,255,0.2)',
                  border: canSubmit ? 'none' : '1.5px solid rgba(255,255,255,0.04)',
                  transform: canSubmit && submitHover ? 'translateY(-1px)' : 'none',
                }}
              >
                {canSubmit && (
                  <div className="absolute inset-0 overflow-hidden">
                    <div
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                        animation: submitHover ? 'shimmer 1.5s ease-in-out infinite' : 'none',
                      }}
                    />
                  </div>
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connexion en cours...
                    </>
                  ) : (
                    <>
                      {canSubmit && <Sparkles className="w-4 h-4" />}
                      VALIDER
                      {canSubmit && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
                    </>
                  )}
                </span>
              </button>

              {/* Register link */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-[13px] text-slate-600">Pas encore de compte ?</span>
                <button
                  onClick={() => { if (onRegister) { onClose(); onRegister(); } else { setShowRegister(true); } }}
                  className="text-[13px] font-semibold text-cyan-400 hover:text-cyan-300 transition-all duration-200 hover:underline underline-offset-2"
                >
                  S'inscrire
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
