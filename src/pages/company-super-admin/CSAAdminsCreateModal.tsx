import { useState, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useThemeTokens } from '../../hooks/useThemeTokens';

interface Props {
  onClose: () => void;
  onCreated: () => void;
  targetCompanyId?: string;
}

export default function CSAAdminsCreateModal({ onClose, onCreated, targetCompanyId }: Props) {
  const t = useThemeTokens();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  const pinComplete = digits.every(d => /^\d$/.test(d));
  const canSubmit = firstName.trim() && lastName.trim() && company.trim() && email.trim() && pinComplete;

  function handleDigitChange(index: number, value: string) {
    if (value && !/^\d$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) pinRefs.current[index + 1]?.focus();
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) pinRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowLeft' && index > 0) pinRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) pinRefs.current[index + 1]?.focus();
  }

  function handleDigitPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
    setDigits(next);
    pinRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Non authentifie'); setSaving(false); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin-for-super-admin`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email: email.trim(),
            password: digits.join(''),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            company: company.trim(),
            ...(phone.trim() ? { phone: phone.trim() } : {}),
            ...(targetCompanyId ? { target_company_id: targetCompanyId } : {}),
          }),
        },
      );

      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Erreur lors de la creation'); setSaving(false); return; }
      onCreated();
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ background: t.modal.overlayBg, backdropFilter: 'blur(6px)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <h2 className="text-sm font-semibold" style={{ color: t.modal.title }}>Creer un admin</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: t.modal.fieldLabel }}>Prenom *</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all" style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue }} />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: t.modal.fieldLabel }}>Nom *</label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont" className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all" style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue }} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: t.modal.fieldLabel }}>Societe *</label>
            <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Societe / entreprise" className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all" style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue }} />
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: t.modal.fieldLabel }}>Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@entreprise.com" className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all" style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue }} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: t.modal.fieldLabel }}>Mot de passe (6 chiffres) *</label>
              <button type="button" onClick={() => setShowPin(!showPin)} className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: t.text.secondary }}>
                {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showPin ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            <div className="flex items-center gap-2 justify-center" onPaste={handleDigitPaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { pinRefs.current[i] = el; }}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleDigitKeyDown(i, e)}
                  className="w-10 h-12 text-center text-lg font-bold rounded-xl outline-none transition-all focus:ring-2 focus:ring-amber-500/40"
                  style={{ background: t.modal.fieldBg, border: `1px solid ${d ? 'rgba(245,158,11,0.5)' : t.modal.fieldBorder}`, color: t.modal.fieldValue }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: t.modal.fieldLabel }}>Telephone (optionnel)</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all" style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue }} />
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>{error}</p>}
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors" style={{ background: t.surface.hover, color: t.text.secondary }}>Annuler</button>
            <button type="submit" disabled={!canSubmit || saving} className="flex-1 py-2.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40" style={{ background: canSubmit && !saving ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'rgba(245,158,11,0.3)' }}>
              {saving ? 'Creation...' : 'Creer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
