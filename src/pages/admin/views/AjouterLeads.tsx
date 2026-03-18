import { useState, useRef } from 'react';
import { UserPlus, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';


const inputClass = "w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all";
const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
};
const inputFocusStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(34,211,238,0.3)',
};

function PinInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
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
          className="w-11 h-11 text-center text-lg font-bold text-white rounded-xl outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
          style={{
            background: digit ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.04)',
            border: digit ? '1px solid rgba(34,211,238,0.3)' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: digit ? '0 0 10px rgba(34,211,238,0.12)' : 'none',
          }}
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
}: {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  as?: 'input' | 'textarea';
}) {
  const [focused, setFocused] = useState(false);
  const style = { ...inputStyle, ...(focused ? inputFocusStyle : {}) };

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
          <h2 className="text-white text-xl font-bold">Ajouter un lead</h2>
          <p className="text-slate-600 text-xs mt-0.5">Remplissez le formulaire pour ajouter un lead manuellement au CRM</p>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(34,211,238,0.08)', boxShadow: '0 0 16px rgba(34,211,238,0.15)' }}
        >
          <UserPlus className="w-4 h-4 text-cyan-400" />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500">
                Prénom <span className="text-rose-500">*</span>
              </label>
              <FocusInput placeholder="Jean" value={prenom} onChange={setPrenom} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500">
                Nom <span className="text-rose-500">*</span>
              </label>
              <FocusInput placeholder="Dupont" value={nom} onChange={setNom} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500">
              Adresse email
            </label>
            <FocusInput type="email" placeholder="jean.dupont@example.com" value={email} onChange={setEmail} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500">
              Téléphone
            </label>
            <FocusInput type="tel" placeholder="+33 6 00 00 00 00" value={telephone} onChange={setTelephone} />
          </div>

          <div className="space-y-2.5">
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500">
              Mot de passe (6 chiffres)
            </label>
            <PinInput value={pin} onChange={setPin} />
          </div>

          {error && (
            <p className="text-xs text-rose-400 px-1">{error}</p>
          )}
        </div>

        <div
          className="px-6 py-4 flex items-center gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(90deg, #0ea5e9, #22d3ee)',
              boxShadow: '0 0 20px rgba(34,211,238,0.2)',
            }}
          >
            <UserPlus className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer le lead'}
          </button>

          {success && (
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
              <Check className="w-4 h-4" />
              Lead ajouté au CRM avec succès
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
