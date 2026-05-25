import { X, Mail, Lock, Phone, User, UserPlus, Eye, EyeOff, ArrowLeft, CheckCircle, Shield, Sparkles, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../../../../lib/supabase';
import { usePinInput } from '../../../../../components/hooks/usePinInput';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
}

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-[0.06] animate-[orbFloat_9s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-[0.05] animate-[orbFloat_11s_ease-in-out_infinite_reverse]"
        style={{ background: 'radial-gradient(circle, #0ea5e9, transparent 70%)' }} />
    </div>
  );
}

function InputField({ icon: Icon, label, ...inputProps }: {
  icon: typeof Mail; label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[13px] font-semibold mb-2 text-slate-400">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      <div className="relative group">
        <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-0"
          style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.06), rgba(6,182,212,0.03))', border: '1px solid rgba(14,165,233,0.2)' }} />
        <input
          {...inputProps}
          className="relative z-10 w-full rounded-xl px-4 py-3 focus:outline-none transition-all text-sm placeholder:text-slate-600"
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1.5px solid rgba(255,255,255,0.06)',
            color: '#fff',
          }}
          onFocusCapture={(e) => { e.currentTarget.style.borderColor = 'rgba(14,165,233,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        />
      </div>
    </div>
  );
}

export default function TalvexRegisterModal({ isOpen, onClose, onBackToLogin }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const { digits, pinRefs, handlePinInput, handlePinKeyDown, handlePinFocus } = usePinInput();
  const [showPin, setShowPin] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedPin, setFocusedPin] = useState(-1);
  const [submitHover, setSubmitHover] = useState(false);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setMounted(true));
    else setMounted(false);
  }, [isOpen]);

  const handleRegister = async () => {
    const password = digits.join('');
    if (!firstName || !lastName || !email || password.length !== 6) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setLoading(true);
    setError('');

    const { error: insertError } = await supabase.from('registrations').insert({
      first_name: firstName, last_name: lastName, email, password, phone, status: 'pending',
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.code === '23505'
        ? 'Cette adresse email est deja en cours de traitement.'
        : 'Une erreur est survenue. Veuillez reessayer.');
    } else {
      setSuccess(true);
    }
  };

  const pin = digits.join('');
  const canSubmit = !!firstName && !!lastName && !!email && pin.length === 6 && !loading;

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(12px, -18px) scale(1.1); }
          66% { transform: translate(-8px, 12px) scale(0.95); }
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
        @keyframes successScale {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes confettiDot {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-30px) scale(0); opacity: 0; }
        }
      `}</style>

      <div
        className="fixed inset-0 flex items-center justify-center z-[60] p-3 sm:p-4"
        style={{ backgroundColor: 'rgba(2,6,14,0.88)', backdropFilter: 'blur(20px)', animation: 'backdropIn 0.3s ease-out' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="rounded-3xl w-full max-w-[420px] relative overflow-x-hidden overflow-y-auto max-h-[calc(100vh-24px)]"
          style={{
            background: 'linear-gradient(165deg, rgba(15,23,42,0.97) 0%, rgba(6,10,20,0.99) 100%)',
            border: '1px solid rgba(14,165,233,0.12)',
            boxShadow: '0 0 80px rgba(14,165,233,0.06), 0 25px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
            animation: mounted ? 'modalEnter 0.4s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
            opacity: mounted ? 1 : 0,
          }}
        >
          <FloatingOrbs />

          {/* Header */}
          <div className="relative px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
            <button
              onClick={onBackToLogin}
              className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-cyan-400 transition-all duration-200 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Retour
            </button>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-90 group"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <X className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
            </button>

            <div className="flex flex-col items-center mt-6 sm:mt-8">
              <div className="relative mb-4">
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center relative z-10"
                  style={{
                    background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                    boxShadow: '0 0 40px rgba(14,165,233,0.25), 0 8px 24px rgba(14,165,233,0.2)',
                    animation: 'iconPulse 3s ease-in-out infinite',
                  }}
                >
                  <UserPlus className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2.5} />
                </div>
                <div className="absolute inset-0 rounded-2xl animate-ping opacity-20"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)' }} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                  Inscription
                </span>
              </h2>
              <p className="text-[13px] mt-1.5 text-slate-500 font-medium">Creer un compte</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8">
            {success ? (
              <div className="text-center py-6" style={{ animation: 'successScale 0.5s cubic-bezier(0.16,1,0.3,1) forwards' }}>
                <div className="relative inline-block mb-5">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(6,182,212,0.08))', border: '2px solid rgba(14,165,233,0.3)' }}
                  >
                    <CheckCircle className="w-10 h-10 text-cyan-400" />
                  </div>
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className="absolute w-1.5 h-1.5 rounded-full"
                      style={{
                        background: '#0ea5e9',
                        top: '50%',
                        left: '50%',
                        animation: `confettiDot 0.8s ease-out ${i * 0.1}s forwards`,
                        transform: `rotate(${i * 60}deg) translateY(-40px)`,
                      }}
                    />
                  ))}
                </div>
                <p className="font-bold text-lg mb-2 text-white">Inscription confirmee</p>
                <p className="text-sm leading-relaxed text-slate-400 max-w-[280px] mx-auto">
                  Votre inscription a bien ete prise en compte. Vous serez recontacte ulterieurement.
                </p>
                <button
                  onClick={onClose}
                  className="mt-6 px-8 py-3 text-white text-sm font-bold rounded-xl transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', boxShadow: '0 0 24px rgba(14,165,233,0.25)' }}
                >
                  Fermer
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <InputField icon={User} label="Prenom" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prenom" />
                  <InputField icon={User} label="Nom" type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom" />
                </div>

                <InputField icon={Mail} label="Adresse email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" />

                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
                  <Shield className="w-3.5 h-3.5 text-slate-600" />
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
                </div>

                {/* PIN */}
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
                    {digits.map((digit, i) => {
                      const filled = !!digit;
                      const focused = focusedPin === i;
                      return (
                        <div key={i} className="relative flex-1 min-w-0 max-w-[52px]">
                          {filled && (
                            <div className="absolute inset-0 rounded-xl opacity-60"
                              style={{ background: 'radial-gradient(circle at center, rgba(14,165,233,0.15), transparent 70%)' }} />
                          )}
                          <input
                            ref={el => { pinRefs.current[i] = el; }}
                            type={showPin ? 'text' : 'password'}
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handlePinInput(i, e.target.value)}
                            onKeyDown={e => handlePinKeyDown(i, e)}
                            onFocus={() => { setFocusedPin(i); handlePinFocus(i); }}
                            className="relative z-10 w-full aspect-square rounded-xl text-center text-xl font-bold text-white caret-transparent outline-none transition-all duration-300"
                            style={{
                              background: filled ? 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(6,182,212,0.08))' : focused ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                              border: filled ? '1.5px solid rgba(14,165,233,0.5)' : focused ? '1.5px solid rgba(14,165,233,0.35)' : '1.5px solid rgba(255,255,255,0.06)',
                              boxShadow: filled ? '0 0 20px rgba(14,165,233,0.12)' : 'none',
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
                    })}
                  </div>
                </div>

                <InputField icon={Phone} label="Telephone (optionnel)" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 1 23 45 67 89" />

                {error && (
                  <div
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}
                  >
                    <X className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleRegister}
                  disabled={!canSubmit}
                  onMouseEnter={() => setSubmitHover(true)}
                  onMouseLeave={() => setSubmitHover(false)}
                  className="relative w-full py-3.5 sm:py-4 text-sm sm:text-[15px] font-bold rounded-xl transition-all duration-300 disabled:cursor-not-allowed overflow-hidden group"
                  style={{
                    background: canSubmit ? 'linear-gradient(135deg, #0ea5e9, #0891b2)' : 'rgba(255,255,255,0.04)',
                    boxShadow: canSubmit
                      ? submitHover ? '0 0 40px rgba(14,165,233,0.35), 0 8px 30px rgba(14,165,233,0.25)' : '0 0 24px rgba(14,165,233,0.2)'
                      : 'none',
                    color: canSubmit ? '#fff' : 'rgba(255,255,255,0.2)',
                    border: canSubmit ? 'none' : '1.5px solid rgba(255,255,255,0.04)',
                    transform: canSubmit && submitHover ? 'translateY(-1px)' : 'none',
                  }}
                >
                  {canSubmit && (
                    <div className="absolute inset-0 overflow-hidden">
                      <div style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                        animation: submitHover ? 'shimmer 1.5s ease-in-out infinite' : 'none',
                        position: 'absolute', inset: 0,
                      }} />
                    </div>
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Inscription en cours...
                      </>
                    ) : (
                      <>
                        {canSubmit && <Sparkles className="w-4 h-4" />}
                        S'INSCRIRE
                        {canSubmit && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
                      </>
                    )}
                  </span>
                </button>

                <p className="text-center text-[12px] text-slate-600 font-medium">
                  Votre demande sera examinee par un administrateur avant activation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
