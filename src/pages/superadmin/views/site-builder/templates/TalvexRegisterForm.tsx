import { X, Mail, Lock, Phone, User, Eye, EyeOff, Shield, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';
import type { SiteModalTheme } from './siteModalTheme';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: typeof Mail;
  label: string;
  primaryRgb: string;
  secondaryRgb: string;
  caretColor: string;
}

function InputField({ icon: Icon, label, primaryRgb, secondaryRgb, caretColor, ...inputProps }: InputFieldProps) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[13px] font-semibold mb-2 text-slate-400">
        <Icon className="w-3.5 h-3.5" />{label}
      </label>
      <div className="relative group">
        <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-0"
          style={{ background: `linear-gradient(135deg, rgba(${primaryRgb},0.06), rgba(${secondaryRgb},0.03))`, border: `1px solid rgba(${primaryRgb},0.2)` }} />
        <input
          {...inputProps}
          className="site-modal-input relative z-10 w-full rounded-xl px-4 py-3 focus:outline-none transition-all text-sm"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.06)', color: '#fff', caretColor }}
          onFocusCapture={e => { e.currentTarget.style.borderColor = `rgba(${primaryRgb},0.4)`; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        />
      </div>
    </div>
  );
}

export function RegisterSuccessView({ theme: t, onClose }: { theme: SiteModalTheme; onClose: () => void }) {
  return (
    <div className="text-center py-6" style={{ animation: 'successScale 0.5s cubic-bezier(0.16,1,0.3,1) forwards' }}>
      <div className="relative inline-block mb-5">
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, rgba(${t.primaryRgb},0.12), rgba(${t.secondaryRgb},0.08))`, border: `2px solid rgba(${t.primaryRgb},0.3)` }}>
          <CheckCircle className="w-10 h-10" style={{ color: t.primary }} />
        </div>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="absolute w-1.5 h-1.5 rounded-full" style={{ background: t.primary, top: '50%', left: '50%', animation: `confettiDot 0.8s ease-out ${i * 0.1}s forwards`, transform: `rotate(${i * 60}deg) translateY(-40px)` }} />
        ))}
      </div>
      <p className="font-bold text-lg mb-2 text-white">Inscription confirmee</p>
      <p className="text-sm leading-relaxed text-slate-400 max-w-[280px] mx-auto">Votre inscription a bien ete prise en compte. Vous serez recontacte ulterieurement.</p>
      <button onClick={onClose} className="mt-6 px-8 py-3 text-white text-sm font-bold rounded-xl transition-all hover:scale-105" style={{ background: t.gradient, boxShadow: `0 0 24px rgba(${t.primaryRgb},0.25)` }}>Fermer</button>
    </div>
  );
}

interface RegisterFieldsProps {
  firstName: string; setFirstName: (v: string) => void;
  lastName: string; setLastName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  digits: string[];
  showPin: boolean; setShowPin: (v: boolean | ((p: boolean) => boolean)) => void;
  focusedPin: number; setFocusedPin: (v: number) => void;
  pinRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  handlePinInput: (i: number, v: string) => void;
  handlePinKeyDown: (i: number, e: React.KeyboardEvent) => void;
  handlePinFocus: (i: number) => void;
  error: string;
  loading: boolean;
  canSubmit: boolean;
  submitHover: boolean; setSubmitHover: (v: boolean) => void;
  onRegister: () => void;
  theme: SiteModalTheme;
}

export function RegisterFields({
  firstName, setFirstName, lastName, setLastName,
  email, setEmail, phone, setPhone,
  digits, showPin, setShowPin, focusedPin, setFocusedPin,
  pinRefs, handlePinInput, handlePinKeyDown, handlePinFocus,
  error, loading, canSubmit, submitHover, setSubmitHover,
  onRegister, theme: t,
}: RegisterFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <InputField icon={User} label="Prenom" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prenom" primaryRgb={t.primaryRgb} secondaryRgb={t.secondaryRgb} caretColor={t.caretColor} />
        <InputField icon={User} label="Nom" type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom" primaryRgb={t.primaryRgb} secondaryRgb={t.secondaryRgb} caretColor={t.caretColor} />
      </div>

      <InputField icon={Mail} label="Adresse email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" primaryRgb={t.primaryRgb} secondaryRgb={t.secondaryRgb} caretColor={t.caretColor} />

      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
        <Shield className="w-3.5 h-3.5 text-slate-600" />
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-400"><Lock className="w-3.5 h-3.5" />Mot de passe (6 chiffres)</label>
          <button type="button" onClick={() => setShowPin(v => !v)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-200 hover:scale-105" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}{showPin ? 'Masquer' : 'Afficher'}
          </button>
        </div>
        <div className="flex gap-2 sm:gap-2.5 justify-center w-full max-w-[340px] mx-auto">
          {digits.map((digit, i) => {
            const filled = !!digit;
            const focused = focusedPin === i;
            return (
              <div key={i} className="relative flex-1 min-w-0 max-w-[52px]">
                {filled && <div className="absolute inset-0 rounded-xl opacity-60" style={{ background: `radial-gradient(circle at center, rgba(${t.primaryRgb},0.15), transparent 70%)` }} />}
                <input
                  ref={el => { pinRefs.current[i] = el; }}
                  type={showPin ? 'text' : 'password'} inputMode="numeric" maxLength={1} value={digit}
                  onChange={e => handlePinInput(i, e.target.value)}
                  onKeyDown={e => handlePinKeyDown(i, e)}
                  onFocus={() => { setFocusedPin(i); handlePinFocus(i); }}
                  className="relative z-10 w-full aspect-square rounded-xl text-center text-xl font-bold text-white caret-transparent outline-none transition-all duration-300"
                  style={{
                    background: filled ? `linear-gradient(135deg, rgba(${t.primaryRgb},0.12), rgba(${t.secondaryRgb},0.08))` : focused ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                    border: filled ? `1.5px solid rgba(${t.primaryRgb},0.5)` : focused ? `1.5px solid rgba(${t.primaryRgb},0.35)` : '1.5px solid rgba(255,255,255,0.06)',
                    boxShadow: filled ? `0 0 20px rgba(${t.primaryRgb},0.12)` : 'none',
                    transform: filled ? 'scale(1.04)' : 'scale(1)',
                  }}
                />
                {focused && !filled && (
                  <div className="absolute inset-x-0 bottom-2.5 flex justify-center z-20 pointer-events-none">
                    <div className="w-4 h-0.5 rounded-full animate-pulse" style={{ backgroundColor: t.primary }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <InputField icon={Phone} label="Telephone (optionnel)" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 1 23 45 67 89" primaryRgb={t.primaryRgb} secondaryRgb={t.secondaryRgb} caretColor={t.caretColor} />

      {error && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}>
          <X className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </div>
      )}

      <button onClick={onRegister} disabled={!canSubmit} onMouseEnter={() => setSubmitHover(true)} onMouseLeave={() => setSubmitHover(false)}
        className="relative w-full py-3.5 sm:py-4 text-sm sm:text-[15px] font-bold rounded-xl transition-all duration-300 disabled:cursor-not-allowed overflow-hidden group"
        style={{ background: canSubmit ? t.gradientHover : 'rgba(255,255,255,0.04)', boxShadow: canSubmit ? (submitHover ? `0 0 40px rgba(${t.primaryRgb},0.35), 0 8px 30px rgba(${t.primaryRgb},0.25)` : `0 0 24px rgba(${t.primaryRgb},0.2)`) : 'none', color: canSubmit ? '#fff' : 'rgba(255,255,255,0.2)', border: canSubmit ? 'none' : '1.5px solid rgba(255,255,255,0.04)', transform: canSubmit && submitHover ? 'translateY(-1px)' : 'none' }}
      >
        {canSubmit && <div className="absolute inset-0 overflow-hidden"><div style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', animation: submitHover ? 'shimmer 1.5s ease-in-out infinite' : 'none', position: 'absolute', inset: 0 }} /></div>}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Inscription en cours...</>) : (<>{canSubmit && <Sparkles className="w-4 h-4" />}S'INSCRIRE{canSubmit && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}</>)}
        </span>
      </button>

      <p className="text-center text-[12px] text-slate-600 font-medium">Votre demande sera examinee par un administrateur avant activation.</p>
    </div>
  );
}
