import { useState, useRef } from 'react';
import { UserPlus, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import type { ThemeTokens } from '../../../lib/themeTokens';


const inputClass = "w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all";

function PinInput({ value, onChange, tokens }: { value: string[]; onChange: (v: string[]) => void; tokens: ThemeTokens }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = [...value];
    next[i] = digit;
    onChange(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...value];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
    onChange(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <div className="flex gap-2.5">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-11 h-11 text-center text-lg font-bold rounded-xl outline-none focus:ring-2 transition-all"
          style={{
            color: tokens.text.primary,
            background: digit ? tokens.accent.bg : tokens.input.bg,
            border: digit ? `1px solid ${tokens.accent.border}` : `1px solid ${tokens.input.border}`,
            boxShadow: 'none',
            '--tw-ring-color': tokens.accent.border,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function FocusInput({
  type = 'text',
  placeholder,
  value,
  onChange,
  as,
  tokens,
}: {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  as?: 'input' | 'textarea';
  tokens: ThemeTokens;
}) {
  const [focused, setFocused] = useState(false);
  const style = {
    color: tokens.input.text,
    background: tokens.input.bg,
    border: focused ? `1px solid ${tokens.input.borderFocus}` : `1px solid ${tokens.input.border}`,
  };

  if (as === 'textarea') {
    return (
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={3}
        className={inputClass + ' resize-none'}
        style={style}
      />
    );
  }

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={inputClass}
      style={style}
    />
  );
}


export default function AjouterLeads() {
  const tokens = useThemeTokens();

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prenom.trim() || !nom.trim()) {
      setError('Le prénom et le nom sont requis.');
      return;
    }
    setSaving(true);
    setError('');

    const data: Record<string, string> = {
      Prenom: prenom.trim(),
      Nom: nom.trim(),
      Email: email.trim(),
      Telephone: telephone.trim(),
      MotDePasse: pin.join(''),
    };

    const { error: dbError } = await supabase.from('leads').insert({
      data,
      import_id: null,
    });

    setSaving(false);

    if (dbError) {
      setError('Une erreur est survenue. Veuillez réessayer.');
      return;
    }

    setSuccess(true);
    setPrenom('');
    setNom('');
    setEmail('');
    setTelephone('');
    setPin(['', '', '', '', '', '']);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: tokens.text.primary }}>Ajouter leads</h2>
          <p className="text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>Ajouter leads</p>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: tokens.accent.bg }}
        >
          <UserPlus className="w-4 h-4" style={{ color: tokens.accent.text }} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl overflow-hidden"
        style={{
          background: tokens.card.bg,
          border: `1px solid ${tokens.card.border}`,
        }}
      >
        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.text.tertiary }}>
                Prénom <span style={{ color: tokens.danger.text }}>*</span>
              </label>
              <FocusInput placeholder="Jean" value={prenom} onChange={setPrenom} tokens={tokens} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.text.tertiary }}>
                Nom <span style={{ color: tokens.danger.text }}>*</span>
              </label>
              <FocusInput placeholder="Dupont" value={nom} onChange={setNom} tokens={tokens} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.text.tertiary }}>
              Adresse email
            </label>
            <FocusInput type="email" placeholder="jean.dupont@example.com" value={email} onChange={setEmail} tokens={tokens} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.text.tertiary }}>
              Téléphone
            </label>
            <FocusInput type="tel" placeholder="+33 6 00 00 00 00" value={telephone} onChange={setTelephone} tokens={tokens} />
          </div>

          <div className="space-y-2.5">
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.text.tertiary }}>
              Mot de passe (6 chiffres)
            </label>
            <PinInput value={pin} onChange={setPin} tokens={tokens} />
          </div>

          {error && (
            <p className="text-xs px-1" style={{ color: tokens.danger.text }}>{error}</p>
          )}
        </div>

        <div
          className="px-6 py-4 flex items-center gap-4"
          style={{ borderTop: `1px solid ${tokens.card.border}` }}
        >
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              color: '#ffffff',
              background: tokens.accent.solid,
            }}
          >
            <UserPlus className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer le lead'}
          </button>

          {success && (
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: tokens.success.text }}>
              <Check className="w-4 h-4" />
              Lead ajouté au CRM avec succès
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
