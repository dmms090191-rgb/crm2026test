import { useState, useRef } from 'react';
import { UserCheck, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function AjouterVendeur() {
  const tokens = useThemeTokens();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handlePinChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...pin];
    next[index] = digit;
    setPin(next);
    if (digit && index < 5) {
      pinRefs.current[index + 1]?.focus();
    }
  }

  function handlePinKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  }

  function handlePinPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...pin];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || '';
    }
    setPin(next);
    const lastFilled = Math.min(pasted.length, 5);
    pinRefs.current[lastFilled]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const password = pin.join('');
    if (password.length < 6) {
      setError('Le mot de passe doit contenir 6 chiffres.');
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Prénom, nom et email sont obligatoires.');
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? SUPABASE_ANON_KEY}`,
          'Apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role: 'vendor',
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const authUserId = json.user?.id ?? null;
      const { error: dbError } = await supabase.from('vendors').insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        auth_user_id: authUserId,
      });
      if (dbError) throw dbError;
      setSuccess('Vendeur créé avec succès. Il peut maintenant se connecter avec son email et mot de passe.');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setPin(['', '', '', '', '', '']);
      pinRefs.current[0]?.focus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes('unique') || msg.includes('already') ? 'Cet email est déjà utilisé.' : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: tokens.text.primary }}>Vendeur</h2>
          <p className="text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>Créer un nouveau compte vendeur</p>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: tokens.accent.bg }}
        >
          <UserCheck className="w-4 h-4" style={{ color: tokens.accent.text }} />
        </div>
      </div>

      <div
        className="rounded-2xl p-6 max-w-lg"
        style={{
          background: tokens.card.bg,
          border: `1px solid ${tokens.card.border}`,
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: tokens.text.tertiary }}>
                Prénom
              </label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Jean"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1 transition-all"
                style={{
                  background: tokens.input.bg,
                  border: `1px solid ${tokens.input.border}`,
                  color: tokens.input.text,
                }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: tokens.text.tertiary }}>
                Nom
              </label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Dupont"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1 transition-all"
                style={{
                  background: tokens.input.bg,
                  border: `1px solid ${tokens.input.border}`,
                  color: tokens.input.text,
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: tokens.text.tertiary }}>
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jean.dupont@exemple.com"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1 transition-all"
              style={{
                background: tokens.input.bg,
                border: `1px solid ${tokens.input.border}`,
                color: tokens.input.text,
              }}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: tokens.text.tertiary }}>
              Téléphone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+33 6 00 00 00 00"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1 transition-all"
              style={{
                background: tokens.input.bg,
                border: `1px solid ${tokens.input.border}`,
                color: tokens.input.text,
              }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.text.tertiary }}>
                Mot de passe (6 chiffres)
              </label>
              <button
                type="button"
                onClick={() => setShowPin(v => !v)}
                className="flex items-center gap-1 text-[10px] transition-colors"
                style={{ color: tokens.text.tertiary }}
              >
                {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showPin ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            <div className="flex gap-2.5">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { pinRefs.current[i] = el; }}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handlePinChange(i, e.target.value)}
                  onKeyDown={e => handlePinKeyDown(i, e)}
                  onPaste={handlePinPaste}
                  className="w-11 h-11 text-center text-lg font-bold rounded-xl outline-none focus:ring-2 transition-all"
                  style={{
                    background: digit ? tokens.accent.bg : tokens.input.bg,
                    border: digit ? `1px solid ${tokens.accent.border}` : `1px solid ${tokens.input.border}`,
                    color: tokens.input.text,
                  }}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs px-1" style={{ color: tokens.danger.text }}>{error}</p>
          )}
          {success && (
            <p className="text-xs px-1" style={{ color: tokens.success.text }}>{success}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50"
            style={{
              background: tokens.accent.solid,
              color: '#ffffff',
            }}
          >
            {loading ? 'Création...' : 'Créer le vendeur'}
          </button>
        </form>
      </div>
    </div>
  );
}
