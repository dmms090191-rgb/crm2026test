import { X } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../../../lib/supabase';
import { usePinInput } from '../../../../../components/hooks/usePinInput';
import TalvexRegisterModal from './TalvexRegisterModal';
import { type SiteModalTheme, getSiteModalTheme } from './siteModalTheme';
import { FloatingOrbs, GlowLine, LOGIN_MODAL_STYLES, buildInputStyles } from './TalvexLoginHelpers';
import TalvexLoginForm from './TalvexLoginForm';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onRegister?: () => void;
  theme?: SiteModalTheme;
  domainCompanyId?: string | null;
  appIconUrl?: string | null;
}

export default function TalvexLoginModal({ isOpen, onClose, onLogin, onRegister, theme: themeProp, domainCompanyId, appIconUrl }: Props) {
  const t = themeProp ?? getSiteModalTheme();
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
    if (isOpen) requestAnimationFrame(() => setMounted(true));
    else setMounted(false);
  }, [isOpen]);

  const playClick = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08);
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
    setLoading(true); setError('');
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
      const appRole = meta?.role as string | undefined;

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
          setError('Ce compte n\'est pas autorise sur ce domaine.');
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
    if (isOpen) { setEmail(''); setDigits(['', '', '', '', '', '']); setError(''); setFocusedPin(-1); }
  }, [isOpen, setDigits]);

  const pin = digits.join('');
  const canSubmit = !!email && pin.length === 6 && !loading;
  const filledCount = digits.filter(d => d !== '').length;
  const progress = (email ? 1 : 0) + filledCount;

  const modalContent = (
    <>
      <style>{LOGIN_MODAL_STYLES}{buildInputStyles(t)}</style>

      <TalvexRegisterModal isOpen={showRegister} onClose={() => { setShowRegister(false); onClose(); }} onBackToLogin={() => setShowRegister(false)} theme={t} />

      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4" style={{ backgroundColor: 'rgba(2,6,14,0.88)', backdropFilter: 'blur(20px)', animation: 'backdropIn 0.3s ease-out' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
          <div className="rounded-3xl w-full max-w-[420px] relative overflow-hidden" style={{ background: 'linear-gradient(165deg, rgba(15,23,42,0.97) 0%, rgba(6,10,20,0.99) 100%)', border: `1px solid rgba(${t.primaryRgb},0.12)`, boxShadow: `0 0 80px rgba(${t.primaryRgb},0.06), 0 25px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)`, animation: mounted ? 'modalEnter 0.4s cubic-bezier(0.16,1,0.3,1) forwards' : 'none', opacity: mounted ? 1 : 0 }}>
            <FloatingOrbs theme={t} />
            <GlowLine active={canSubmit} theme={t} />

            <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-90 group z-20" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <X className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
            </button>

            <TalvexLoginForm
              email={email} setEmail={setEmail} emailInputRef={emailInputRef}
              digits={digits} showPin={showPin} setShowPin={setShowPin}
              focusedPin={focusedPin} pinRefs={pinRefs}
              handlePinInput={handlePinInput} handlePinKeyDown={handlePinKeyDown} wrappedPinFocus={wrappedPinFocus}
              error={error} loading={loading} canSubmit={canSubmit}
              submitHover={submitHover} setSubmitHover={setSubmitHover}
              onValidate={handleValidate} progress={progress} theme={t}
              onRegister={() => { if (onRegister) { onClose(); onRegister(); } else setShowRegister(true); }}
              appIconUrl={appIconUrl}
            />
          </div>
        </div>
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}
