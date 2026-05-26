import { X, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../../../lib/supabase';
import { usePinInput } from '../../../../../components/hooks/usePinInput';
import { type SiteModalTheme, getSiteModalTheme } from './siteModalTheme';
import { RegisterSuccessView, RegisterFields } from './TalvexRegisterForm';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
  theme?: SiteModalTheme;
}

function FloatingOrbs({ theme }: { theme: SiteModalTheme }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-[0.06] animate-[orbFloat_9s_ease-in-out_infinite]"
        style={{ background: `radial-gradient(circle, ${theme.orbColor2}, transparent 70%)` }} />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-[0.05] animate-[orbFloat_11s_ease-in-out_infinite_reverse]"
        style={{ background: `radial-gradient(circle, ${theme.orbColor1}, transparent 70%)` }} />
    </div>
  );
}

const REGISTER_STYLES = `
  @keyframes orbFloat {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(12px, -18px) scale(1.1); }
    66% { transform: translate(-8px, 12px) scale(0.95); }
  }
  @keyframes modalEnter {
    from { opacity: 0; transform: translateY(20px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
  @keyframes iconPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
  @keyframes successScale {
    0% { transform: scale(0.5); opacity: 0; }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes confettiDot {
    0% { transform: translateY(0) scale(1); opacity: 1; }
    100% { transform: translateY(-30px) scale(0); opacity: 0; }
  }
`;

export default function TalvexRegisterModal({ isOpen, onClose, onBackToLogin, theme: themeProp }: Props) {
  const t = themeProp ?? getSiteModalTheme();
  const RegisterIcon = t.registerIcon;
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

  return createPortal(
    <>
      <style>{REGISTER_STYLES}{`
        .site-modal-input::placeholder { color: ${t.placeholderColor} !important; opacity: 1 !important; }
        .site-modal-input:invalid { box-shadow: none !important; outline: none !important; }
        .site-modal-input:-webkit-autofill,
        .site-modal-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #fff !important;
          -webkit-box-shadow: 0 0 0 1000px rgba(15,23,42,0.97) inset !important;
          caret-color: ${t.caretColor} !important;
          transition: background-color 5000s ease-in-out 0s;
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
            border: `1px solid rgba(${t.primaryRgb},0.12)`,
            boxShadow: `0 0 80px rgba(${t.primaryRgb},0.06), 0 25px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)`,
            animation: mounted ? 'modalEnter 0.4s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
            opacity: mounted ? 1 : 0,
          }}
        >
          <FloatingOrbs theme={t} />

          <div className="relative px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
            <button onClick={onBackToLogin} className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 transition-all duration-200 group"
              onMouseEnter={e => { e.currentTarget.style.color = t.primary; }}
              onMouseLeave={e => { e.currentTarget.style.color = ''; }}
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Retour
            </button>

            <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-90 group"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <X className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
            </button>

            <div className="flex flex-col items-center mt-6 sm:mt-8">
              <div className="relative mb-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center relative z-10"
                  style={{ background: t.gradient, boxShadow: `0 0 40px rgba(${t.primaryRgb},0.25), 0 8px 24px rgba(${t.primaryRgb},0.2)`, animation: 'iconPulse 3s ease-in-out infinite' }}
                >
                  <RegisterIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2.5} />
                </div>
                <div className="absolute inset-0 rounded-2xl animate-ping opacity-20" style={{ background: t.gradient }} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: t.textGradient }}>Inscription</span>
              </h2>
              <p className="text-[13px] mt-1.5 text-slate-500 font-medium">Creer un compte</p>
            </div>
          </div>

          <div className="px-6 sm:px-8 pb-6 sm:pb-8">
            {success ? (
              <RegisterSuccessView theme={t} onClose={onClose} />
            ) : (
              <RegisterFields
                firstName={firstName} setFirstName={setFirstName}
                lastName={lastName} setLastName={setLastName}
                email={email} setEmail={setEmail}
                phone={phone} setPhone={setPhone}
                digits={digits} showPin={showPin} setShowPin={setShowPin}
                focusedPin={focusedPin} setFocusedPin={setFocusedPin}
                pinRefs={pinRefs} handlePinInput={handlePinInput}
                handlePinKeyDown={handlePinKeyDown} handlePinFocus={handlePinFocus}
                error={error} loading={loading} canSubmit={canSubmit}
                submitHover={submitHover} setSubmitHover={setSubmitHover}
                onRegister={handleRegister} theme={t}
              />
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
