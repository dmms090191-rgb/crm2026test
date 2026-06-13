import { useState, useRef, useCallback, useEffect } from 'react';
import { Mail, Lock, Save, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import type { ThemeTokens } from '../../../../lib/themeTokens';

function Toast({ message, type, tokens }: { message: string; type: 'success' | 'error'; tokens: ThemeTokens }) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium"
      style={{
        background: type === 'success' ? tokens.success.bg : tokens.danger.bg,
        border: `1px solid ${type === 'success' ? tokens.success.border : tokens.danger.border}`,
        color: type === 'success' ? tokens.success.text : tokens.danger.text,
      }}
    >
      {type === 'success'
        ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      {message}
    </div>
  );
}

interface Props {
  userEmail: string;
  initialEmail: string;
  initialDigits: string[];
  initialPinSynced: boolean;
  tokens: ThemeTokens;
}

export default function SAMonComptePasswordSection({ userEmail, initialEmail, initialDigits, initialPinSynced, tokens: t }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState<string[]>(initialDigits);
  const [pinSynced, setPinSynced] = useState(initialPinSynced);

  useEffect(() => { if (initialEmail) setEmail(initialEmail); }, [initialEmail]);
  useEffect(() => { if (initialDigits.some(d => d)) setDigits(initialDigits); }, [initialDigits]);
  useEffect(() => { setPinSynced(initialPinSynced); }, [initialPinSynced]);
  const [syncingPin, setSyncingPin] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [credMsg, setCredMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [savingCred, setSavingCred] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePinInput = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setDigits(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) {
      setTimeout(() => pinRefs.current[index + 1]?.focus(), 0);
    }
  }, []);

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
    }
  }, [digits]);

  const handlePinFocus = useCallback((index: number) => {
    pinRefs.current[index]?.select();
  }, []);

  const syncPin = async () => {
    const pinStr = digits.join('');
    if (pinStr.length !== 6 || !/^\d{6}$/.test(pinStr)) {
      setCredMsg({ text: 'Saisissez 6 chiffres pour confirmer votre code.', type: 'error' });
      return;
    }
    setSyncingPin(true);
    setCredMsg(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: pinStr,
    });

    if (signInError) {
      setSyncingPin(false);
      setCredMsg({ text: 'Code incorrect. Saisissez votre code actuel.', type: 'error' });
      return;
    }

    await supabase.auth.updateUser({ data: { pin: pinStr } });
    setSyncingPin(false);
    setPinSynced(true);
    setCredMsg({ text: 'Code synchronise avec succes.', type: 'success' });
    setTimeout(() => setCredMsg(null), 3000);
  };

  const saveCredentials = async () => {
    const pinStr = digits.join('');
    if (pinStr.length !== 6) {
      setCredMsg({ text: 'Le mot de passe doit contenir 6 chiffres.', type: 'error' });
      return;
    }
    setSavingCred(true);
    setCredMsg(null);

    const updates: { email?: string; password?: string; data?: Record<string, string> } = {
      data: { pin: pinStr },
    };
    if (email) updates.email = email;
    updates.password = pinStr;

    const { error } = await supabase.auth.updateUser(updates);
    setSavingCred(false);
    if (error) {
      setCredMsg({ text: `Erreur : ${error.message}`, type: 'error' });
    } else {
      setCredMsg({ text: 'Email et mot de passe enregistres.', type: 'success' });
      setTimeout(() => setCredMsg(null), 3000);
    }
  };

  const inputStyle = {
    background: t.input.bg,
    border: `1px solid ${t.input.border}`,
    outline: 'none',
    color: t.input.text,
  };

  return (
    <div
      className="rounded-2xl p-3.5 md:p-5 space-y-3 md:space-y-4 min-w-0"
      style={{
        background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
        border: `1px solid ${t.surface.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4" style={{ color: t.label.muted }} />
        <h3 className="text-sm font-semibold" style={{ color: t.heading.primary }}>Email et mot de passe</h3>
      </div>

      <div>
        <label className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1 md:mb-1.5 block" style={{ color: t.label.muted }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="votre@email.com"
          className="w-full rounded-xl px-3 py-2 md:py-2.5 text-sm transition-all"
          style={inputStyle}
          onFocus={e => (e.currentTarget.style.borderColor = t.input.borderFocus)}
          onBlur={e => (e.currentTarget.style.borderColor = t.input.border)}
        />
        <p className="text-[9px] md:text-[10px] mt-0.5 md:mt-1" style={{ color: t.label.hint }}>Modifier l'email changera vos identifiants de connexion</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <div className="flex items-center gap-1.5 md:gap-2">
            <Lock className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: t.label.muted }} />
            <label className="text-xs md:text-sm font-medium" style={{ color: t.heading.primary }}>Mot de passe (6 chiffres)</label>
          </div>
          <button
            onClick={() => setShowPin(v => !v)}
            className="flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg text-[11px] md:text-xs font-medium transition-all"
            style={{ background: t.button.toggleBg, color: t.button.toggleText, border: `1px solid ${t.button.toggleBorder}` }}
          >
            {showPin ? <EyeOff className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <Eye className="w-3 h-3 md:w-3.5 md:h-3.5" />}
            {showPin ? 'Masquer' : 'Afficher'}
          </button>
        </div>

        <div className="flex gap-1 xs:gap-1.5 md:gap-2 justify-center max-w-full">
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
              className="flex-1 max-w-10 h-11 md:max-w-12 md:h-14 rounded-xl text-center text-lg md:text-xl font-bold transition-all caret-transparent"
              style={{
                background: digit ? t.pin.bgFilled : t.pin.bg,
                border: `1px solid ${digit ? t.pin.borderFilled : t.pin.border}`,
                outline: 'none',
                color: t.pin.text,
              }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = t.pin.borderFocus)}
              onBlurCapture={e => (e.currentTarget.style.borderColor = digit ? t.pin.borderFilled : t.pin.border)}
            />
          ))}
        </div>
        <p className="text-[9px] md:text-[10px] text-center mt-1.5 md:mt-2" style={{ color: t.label.hint }}>
          {!pinSynced
            ? 'Saisissez votre code actuel pour le synchroniser'
            : 'Utilisez les fleches gauche/droite pour naviguer entre les chiffres'}
        </p>
      </div>

      {credMsg && <Toast message={credMsg.text} type={credMsg.type} tokens={t} />}

      {!pinSynced ? (
        <button
          onClick={syncPin}
          disabled={syncingPin || digits.join('').length < 6}
          className="w-full flex items-center justify-center gap-2 py-2 md:py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60"
          style={{
            background: '#059669',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(5,150,105,0.30)',
          }}
        >
          <Lock className="w-4 h-4" />
          {syncingPin ? 'Verification...' : 'Confirmer mon code actuel'}
        </button>
      ) : (
        <button
          onClick={saveCredentials}
          disabled={savingCred}
          className="w-full flex items-center justify-center gap-2 py-2 md:py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60"
          style={{
            background: t.accent.solid,
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(6,182,212,0.30)',
          }}
        >
          <Save className="w-4 h-4" />
          {savingCred ? 'Enregistrement...' : 'Enregistrer email et mot de passe'}
        </button>
      )}
    </div>
  );
}
