import { useState, useEffect } from 'react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { supabase } from '../../../../lib/supabase';
import CopyButton from '../../../../components/CopyButton';
import type { AdminUser } from '../SAAdmins';

interface Props {
  admin: AdminUser;
  onUpdate: () => void;
}

export default function AdminDetailInfoTab({ admin, onUpdate }: Props) {
  const tokens = useThemeTokens();
  const [firstName, setFirstName] = useState(admin.first_name);
  const [lastName, setLastName] = useState(admin.last_name);
  const [company, setCompany] = useState(admin.company || '');
  const [phone, setPhone] = useState(admin.phone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFirstName(admin.first_name);
    setLastName(admin.last_name);
    setCompany(admin.company || '');
    setPhone(admin.phone);
    setError('');
    setSaved(false);
  }, [admin]);

  async function saveInfo() {
    setSaving(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Non authentifie'); setSaving(false); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-admin`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            admin_id: admin.id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            company: company.trim(),
            phone: phone.trim(),
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Erreur'); setSaving(false); return; }
      setSaved(true);
      onUpdate();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.modal.fieldLabel }}>Prenom</label>
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 transition-all"
            style={{ background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}`, color: tokens.modal.fieldValue }}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.modal.fieldLabel }}>Nom</label>
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 transition-all"
            style={{ background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}`, color: tokens.modal.fieldValue }}
          />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.modal.fieldLabel }}>Email</label>
        <div className="flex items-center gap-1">
          <input
            type="email"
            value={admin.email}
            disabled
            className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm outline-none opacity-60 cursor-not-allowed"
            style={{ background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}`, color: tokens.modal.fieldValue }}
          />
          <CopyButton value={admin.email} label="Copier l'email" />
        </div>
        <p className="text-[10px] mt-1" style={{ color: tokens.text.tertiary }}>Email non modifiable pour des raisons de securite.</p>
      </div>
      <div>
        <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.modal.fieldLabel }}>Societe</label>
        <input
          type="text"
          value={company}
          onChange={e => setCompany(e.target.value)}
          placeholder="Societe / entreprise"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 transition-all"
          style={{ background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}`, color: tokens.modal.fieldValue }}
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.modal.fieldLabel }}>Telephone</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+33 6 12 34 56 78"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 transition-all"
          style={{ background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}`, color: tokens.modal.fieldValue }}
        />
      </div>

      {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={saveInfo}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
          style={{ background: tokens.accent.solid, color: tokens.text.primary, boxShadow: `0 0 16px ${tokens.accent.border}` }}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        {saved && <p className="text-xs" style={{ color: tokens.success.text }}>Informations mises a jour.</p>}
      </div>
    </div>
  );
}
