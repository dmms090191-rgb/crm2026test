import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface CrmPinDisplayProps {
  password: string;
  leadId: string;
  leadData: Record<string, string>;
  onPasswordUpdate?: (newData: Record<string, string>) => void;
  readOnly?: boolean;
}

export default function CrmPinDisplay({ password, leadId, leadData, onPasswordUpdate, readOnly }: CrmPinDisplayProps) {
  const tokens = useThemeTokens();
  const [show, setShow] = useState(false);
  const [editPin, setEditPin] = useState(password.padEnd(6, '').split('').slice(0, 6));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setEditPin(password.padEnd(6, '').split('').slice(0, 6));
  }, [password]);

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...editPin];
    next[index] = digit;
    setEditPin(next);
    if (digit && index < 5) pinRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (editPin[index]) {
        const next = [...editPin];
        next[index] = '';
        setEditPin(next);
      } else if (index > 0) {
        pinRefs.current[index - 1]?.focus();
        const next = [...editPin];
        next[index - 1] = '';
        setEditPin(next);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinRefs.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < 5) {
      pinRefs.current[index + 1]?.focus();
      e.preventDefault();
    }
  }

  function handleFocus(index: number) {
    pinRefs.current[index]?.select();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...editPin];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
    setEditPin(next);
    pinRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  const changed = editPin.join('') !== password;

  async function handleSave() {
    const newPass = editPin.join('');
    if (newPass.length < 6 || !/^\d{6}$/.test(newPass)) return;
    setSaving(true);
    setError('');

    const updatedData = { ...leadData, MotDePasse: newPass };
    const { error: dbError } = await supabase.from('leads').update({ data: updatedData }).eq('id', leadId);

    if (dbError) {
      setError('Erreur lors de la mise a jour.');
      setSaving(false);
      return;
    }

    const clientEmail = leadData['Email'];
    if (clientEmail) {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ email: clientEmail, password: newPass, role: 'client' }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Erreur lors de la mise a jour Auth.');
        setSaving(false);
        return;
      }
    }

    onPasswordUpdate?.(updatedData);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.label.hint }}>
          Mot de passe (6 chiffres)
        </p>
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="flex items-center gap-1 text-[10px] transition-colors"
          style={{ color: tokens.label.hint }}
        >
          {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {show ? 'Masquer' : 'Afficher'}
        </button>
      </div>
      <div className="flex gap-1.5 sm:gap-2.5">
        {editPin.map((digit, i) => (
          <input
            key={i}
            ref={el => { pinRefs.current[i] = el; }}
            type={show ? 'text' : 'password'}
            inputMode="numeric"
            maxLength={1}
            value={digit}
            readOnly={readOnly}
            onChange={e => !readOnly && handleChange(i, e.target.value)}
            onKeyDown={e => !readOnly && handleKeyDown(i, e)}
            onFocus={() => !readOnly && handleFocus(i)}
            onPaste={e => !readOnly && handlePaste(e)}
            className="w-9 h-9 sm:w-11 sm:h-11 text-center text-base sm:text-lg font-bold rounded-xl outline-none focus:ring-2 transition-all"
            style={{
              color: tokens.input.text,
              background: digit ? tokens.accent.bg : tokens.input.bg,
              border: `1px solid ${digit ? tokens.accent.border : tokens.input.border}`,
              boxShadow: digit ? `0 0 10px ${tokens.accent.border}` : 'none',
              borderColor: tokens.input.borderFocus,
              opacity: readOnly ? 0.7 : 1,
              cursor: readOnly ? 'default' : undefined,
            }}
          />
        ))}
      </div>
      {readOnly ? (
        <p className="text-xs" style={{ color: tokens.label.hint }}>Modification reservee a l'administrateur</p>
      ) : (
        <>
          <button
            onClick={handleSave}
            disabled={saving || !changed || editPin.join('').length < 6}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            style={{ background: tokens.accent.solid, color: tokens.text.primary, boxShadow: `0 0 16px ${tokens.accent.border}` }}
          >
            {saving ? 'Mise a jour...' : 'Mettre a jour le mot de passe'}
          </button>
          {saved && <p className="text-xs" style={{ color: tokens.success.text }}>Mot de passe mis a jour.</p>}
          {error && <p className="text-xs" style={{ color: tokens.danger.text }}>{error}</p>}
        </>
      )}
    </div>
  );
}
