import { useState, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { supabase } from '../../lib/supabase';

interface Props {
  adminId: string;
  currentPin?: string;
  onUpdate: () => void;
}

export default function CSAAdminDetailPasswordTab({ adminId, currentPin, onUpdate }: Props) {
  const tokens = useThemeTokens();
  const [show, setShow] = useState(false);
  const [editPin, setEditPin] = useState<string[]>(() => {
    if (currentPin && currentPin.length === 6) return currentPin.split('');
    return Array(6).fill('');
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  const pinFull = editPin.join('').length === 6;

  async function handleSave() {
    const newPass = editPin.join('');
    if (!/^\d{6}$/.test(newPass)) return;
    setSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Non authentifie'); setSaving(false); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ auth_user_id: adminId, password: newPass }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Erreur lors de la mise a jour.');
        setSaving(false);
        return;
      }

      setSaving(false);
      setSaved(true);
      onUpdate();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
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
      <div className="flex gap-2.5">
        {editPin.map((digit, i) => (
          <input
            key={i}
            ref={el => { pinRefs.current[i] = el; }}
            type={show ? 'text' : 'password'}
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onFocus={() => handleFocus(i)}
            onPaste={handlePaste}
            className="w-11 h-11 text-center text-lg font-bold rounded-xl outline-none focus:ring-2 transition-all"
            style={{
              color: tokens.input.text,
              background: digit ? tokens.accent.bg : tokens.input.bg,
              border: `1px solid ${digit ? tokens.accent.border : tokens.input.border}`,
              boxShadow: digit ? `0 0 10px ${tokens.accent.border}` : 'none',
            }}
          />
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={saving || !pinFull}
        className="px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
        style={{ background: tokens.accent.solid, color: tokens.text.primary, boxShadow: `0 0 16px ${tokens.accent.border}` }}
      >
        {saving ? 'Mise a jour...' : 'Modifier le mot de passe'}
      </button>
      {saved && <p className="text-xs" style={{ color: tokens.success.text }}>Mot de passe mis a jour.</p>}
      {error && <p className="text-xs" style={{ color: tokens.danger.text }}>{error}</p>}
    </div>
  );
}
