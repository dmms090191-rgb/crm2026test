import { X, Mail, Delete, Lock, Eye, EyeOff, Shield, ArrowRight, Sparkles } from 'lucide-react';
import type { SiteModalTheme } from './siteModalTheme';
import TalvexQuickEmailSelector from './TalvexQuickEmailSelector';
import { PinDigitBox } from './TalvexLoginHelpers';

interface Props {
  email: string;
  setEmail: (v: string | ((prev: string) => string)) => void;
  emailInputRef: React.RefObject<HTMLInputElement>;
  digits: string[];
  showPin: boolean;
  setShowPin: (v: boolean | ((prev: boolean) => boolean)) => void;
  focusedPin: number;
  pinRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  handlePinInput: (i: number, v: string) => void;
  handlePinKeyDown: (i: number, e: React.KeyboardEvent) => void;
  wrappedPinFocus: (i: number) => void;
  error: string;
  loading: boolean;
  canSubmit: boolean;
  submitHover: boolean;
  setSubmitHover: (v: boolean) => void;
  onValidate: () => void;
  onRegister: () => void;
  progress: number;
  theme: SiteModalTheme;
  appIconUrl?: string | null;
}

export default function TalvexLoginForm({
  email, setEmail, emailInputRef, digits, showPin, setShowPin,
  focusedPin, pinRefs, handlePinInput, handlePinKeyDown, wrappedPinFocus,
  error, loading, canSubmit, submitHover, setSubmitHover,
  onValidate, onRegister, progress, theme: t, appIconUrl,
}: Props) {
  const LoginIcon = t.loginIcon;

  return (
    <>
      {/* Header */}
      <div className="relative px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            {appIconUrl ? (
              <img
                src={appIconUrl}
                alt=""
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover relative z-10"
                style={{ boxShadow: `0 0 40px rgba(${t.primaryRgb},0.25), 0 8px 24px rgba(${t.primaryRgb},0.2)` }}
              />
            ) : (
              <>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center relative z-10" style={{ background: t.gradient, boxShadow: `0 0 40px rgba(${t.primaryRgb},0.25), 0 8px 24px rgba(${t.primaryRgb},0.2)`, animation: 'iconPulse 3s ease-in-out infinite' }}>
                  <LoginIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2.5} />
                </div>
                <div className="absolute inset-0 rounded-2xl animate-ping opacity-20" style={{ background: t.gradient }} />
              </>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: t.textGradient }}>Connexion</span>
          </h2>
          <p className="text-[13px] mt-1.5 text-slate-500 font-medium">Accedez a votre espace personnel</p>
          <div className="flex items-center gap-1.5 mt-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-1 rounded-full transition-all duration-500" style={{ width: i < progress ? 12 : 6, background: i < progress ? `linear-gradient(90deg, ${t.primary}, ${t.secondary})` : 'rgba(255,255,255,0.08)', boxShadow: i < progress ? `0 0 8px rgba(${t.primaryRgb},0.3)` : 'none', animation: i < progress ? 'progressGlow 2s ease-in-out infinite' : 'none', animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Form body */}
      <div className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-5">
        {/* Email field */}
        <div>
          <label className="flex items-center gap-1.5 text-[13px] font-semibold mb-2.5 text-slate-400"><Mail className="w-3.5 h-3.5" />Adresse email</label>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 min-w-0 group">
              <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-0" style={{ background: `linear-gradient(135deg, rgba(${t.primaryRgb},0.06), rgba(${t.secondaryRgb},0.03))`, border: `1px solid rgba(${t.primaryRgb},0.2)` }} />
              <input ref={emailInputRef} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" autoComplete="off" className="site-modal-input relative z-10 w-full rounded-xl px-4 py-3.5 focus:outline-none transition-all text-sm sm:text-[15px] truncate" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.06)', color: '#fff', caretColor: t.caretColor }}
                onFocusCapture={e => { e.currentTarget.style.borderColor = `rgba(${t.primaryRgb},0.4)`; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              />
              {email && (
                <button type="button" onClick={() => { setEmail(''); emailInputRef.current?.focus(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {email && (
              <button type="button" onClick={() => { setEmail((v: string) => v.slice(0, -1)); emailInputRef.current?.focus(); }} className="shrink-0 w-[46px] h-[46px] rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                <Delete className="w-4.5 h-4.5" />
              </button>
            )}
          </div>
          <TalvexQuickEmailSelector email={email} onSelect={v => setEmail(v)} theme={t} />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
          <Shield className="w-3.5 h-3.5 text-slate-600" />
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
        </div>

        {/* PIN field */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-400"><Lock className="w-3.5 h-3.5" />Mot de passe (6 chiffres)</label>
            <button type="button" onClick={() => setShowPin((v: boolean) => !v)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-200 hover:scale-105" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}{showPin ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          <div className="flex gap-2 sm:gap-2.5 justify-center w-full max-w-[340px] mx-auto">
            {digits.map((digit, i) => (
              <PinDigitBox key={i} digit={digit} index={i} showPin={showPin} focused={focusedPin === i} inputRef={el => { pinRefs.current[i] = el; }} onInput={handlePinInput} onKeyDown={handlePinKeyDown} onFocus={wrappedPinFocus} theme={t} />
            ))}
          </div>
          <p className="text-[11px] text-center mt-2.5 text-slate-600 font-medium">Fleches gauche/droite pour naviguer</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}>
            <X className="w-3.5 h-3.5 flex-shrink-0" />{error}
          </div>
        )}

        {/* Submit */}
        <button onClick={onValidate} disabled={!canSubmit} onMouseEnter={() => setSubmitHover(true)} onMouseLeave={() => setSubmitHover(false)}
          className="relative w-full py-3.5 sm:py-4 text-sm sm:text-[15px] font-bold rounded-xl transition-all duration-300 disabled:cursor-not-allowed overflow-hidden group"
          style={{ background: canSubmit ? t.gradientHover : 'rgba(255,255,255,0.04)', boxShadow: canSubmit ? (submitHover ? `0 0 40px rgba(${t.primaryRgb},0.35), 0 8px 30px rgba(${t.primaryRgb},0.25)` : `0 0 24px rgba(${t.primaryRgb},0.2), 0 4px 16px rgba(${t.primaryRgb},0.15)`) : 'none', color: canSubmit ? '#fff' : 'rgba(255,255,255,0.2)', border: canSubmit ? 'none' : '1.5px solid rgba(255,255,255,0.04)', transform: canSubmit && submitHover ? 'translateY(-1px)' : 'none' }}
        >
          {canSubmit && (
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', animation: submitHover ? 'shimmer 1.5s ease-in-out infinite' : 'none' }} />
            </div>
          )}
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Connexion en cours...</>) : (<>{canSubmit && <Sparkles className="w-4 h-4" />}VALIDER{canSubmit && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}</>)}
          </span>
        </button>

        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="text-[13px] text-slate-600">Pas encore de compte ?</span>
          <button onClick={onRegister} className="text-[13px] font-semibold transition-all duration-200 hover:underline underline-offset-2" style={{ color: t.primary }}>S'inscrire</button>
        </div>
      </div>
    </>
  );
}
