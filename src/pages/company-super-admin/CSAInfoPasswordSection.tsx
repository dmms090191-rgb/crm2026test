import { useState, useRef, useCallback, useEffect } from 'react';
import { Mail, Lock, Save, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useThemeTokens } from '../../hooks/useThemeTokens';

interface Props {
  targetUserId: string;
  initialEmail: string;
  initialDigits: string[];
  pinLoading?: boolean;
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  const t = useThemeTokens();
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium"
      style={{
        background: type === 'success' ? t.success.bg : t.danger.bg,
        border: `1px solid ${type === 'success' ? t.success.border : t.danger.border}`,
        color: type === 'success' ? t.success.text : t.danger.text,
      }}
    >
      {type === 'success'
        ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      {message}
    </div>
  );
}

export default function CSAInfoPasswordSection({ targetUserId, initialEmail, initialDigits, pinLoading }: Props) {
  const t = useThemeTokens();
  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState<string[]>(initialDigits);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (initialDigits.some(d => d !== '')) setDigits(initialDigits);
  }, [initialDigits]);
  const [credMsg, setCredMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);
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

  const handlePinPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      setDigits(pasted.split(''));
      pinRefs.current[5]?.focus();
    }
  }, []);

  const saveCredentials = async () => {
    const pinStr = digits.join('');
    if (pinStr.length !== 6 || !/^\d{6}$/.test(pinStr)) {
      setCredMsg({ text: 'Le mot de passe doit contenir 6 chiffres.', type: 'error' });
      return;
    }
    setSaving(true);
    setCredMsg(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setCredMsg({ text: 'Session expiree.', type: 'error' }); setSaving(false); return; }

      const body: Record<string, string> = { target_user_id: targetUserId, password: pinStr };
      if (email) body.email = email;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-company-super-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(body),
        },
      );
      setSaving(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCredMsg({ text: data.error || 'Erreur lors de la mise a jour.', type: 'error' });
      } else {
        setCredMsg({ text: 'Email et mot de passe enregistres.', type: 'success' });
        setTimeout(() => setCredMsg(null), 3000);
      }
    } catch {
      setSaving(false);
      setCredMsg({ text: 'Erreur lors de la mise a jour.', type: 'error' });
    }
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
        <Mail className="w-4 h-4" style={{ color: t.text.quaternary }} />
        <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>Email et mot de passe</h3>
      </div>

      {pinLoading ? (
        <>
          <div>
            <div className="h-3 w-10 rounded mb-1.5 animate-pulse" style={{ background: t.surface.hover }} />
            <div className="h-10 rounded-xl animate-pulse" style={{ background: t.surface.hover, border: `1px solid ${t.surface.border}` }} />
          </div>
          <div>
            <div className="h-4 w-44 rounded mb-3 animate-pulse" style={{ background: t.surface.hover }} />
            <div className="flex gap-1 xs:gap-1.5 md:gap-2 justify-center max-w-full">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-1 max-w-10 h-11 md:max-w-12 md:h-14 rounded-xl animate-pulse" style={{ background: t.surface.hover, border: `1px solid ${t.surface.border}` }} />
              ))}
            </div>
          </div>
          <div className="h-10 rounded-xl animate-pulse" style={{ background: t.surface.hover, border: `1px solid ${t.surface.border}` }} />
        </>
      ) : (
        <>
          <div>
            <label className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1 md:mb-1.5 block" style={{ color: t.text.quaternary }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full rounded-xl px-3 py-2 md:py-2.5 text-sm transition-all outline-none focus:ring-1"
              style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
            />
            <p className="text-[9px] md:text-[10px] mt-0.5 md:mt-1" style={{ color: t.text.quaternary }}>
              Modifier l'email changera les identifiants de connexion
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-1.5 md:gap-2">
                <Lock className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: t.text.quaternary }} />
                <label className="text-xs md:text-sm font-medium" style={{ color: t.text.primary }}>Mot de passe (6 chiffres)</label>
              </div>
              <button
                onClick={() => setShowPin(v => !v)}
                className="flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg text-[11px] md:text-xs font-medium transition-all"
                style={{ background: t.surface.hover, color: t.text.tertiary, border: `1px solid ${t.surface.border}` }}
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
                  onPaste={handlePinPaste}
                  onFocus={() => pinRefs.current[i]?.select()}
                  className="flex-1 max-w-10 h-11 md:max-w-12 md:h-14 rounded-xl text-center text-lg md:text-xl font-bold transition-all caret-transparent outline-none"
                  style={{
                    background: digit ? t.accent.bg : t.input.bg,
                    border: `1px solid ${digit ? t.accent.border : t.input.border}`,
                    color: digit ? t.accent.text : t.input.text,
                  }}
                />
              ))}
            </div>
            <p className="text-[9px] md:text-[10px] text-center mt-1.5 md:mt-2" style={{ color: t.text.quaternary }}>
              Utilisez les fleches gauche/droite pour naviguer entre les chiffres
            </p>
          </div>

          {credMsg && <Toast message={credMsg.text} type={credMsg.type} />}

          <button
            onClick={saveCredentials}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2 md:py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${t.accent.text}, ${t.accent.text}cc)`, color: '#ffffff', boxShadow: `0 4px 14px ${t.accent.border}` }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer email et mot de passe'}
          </button>
        </>
      )}
    </div>
  );
}
