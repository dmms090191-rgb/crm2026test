import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { Vendor, ModalTab } from './vendeurTypes';
import PinDisplay from './PinDisplay';
import CommentsTab from './CommentsTab';
import CopyButton from '../../../../components/CopyButton';

export default function VendorDetailModal({ vendor, onClose, onUpdate }: { vendor: Vendor; onClose: () => void; onUpdate: () => void }) {
  const tokens = useThemeTokens();
  const [tab, setTab] = useState<ModalTab>('informations');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  const [firstName, setFirstName] = useState(vendor.first_name);
  const [lastName, setLastName] = useState(vendor.last_name);
  const [email, setEmail] = useState(vendor.email);
  const [phone, setPhone] = useState(vendor.phone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const tabs: { id: ModalTab; label: string }[] = [
    { id: 'informations', label: 'Informations' },
    { id: 'mot-de-passe', label: 'Mot de passe' },
    { id: 'commentaires', label: 'Commentaires' },
  ];

  async function saveInfo() {
    setSaving(true);
    await supabase.from('vendors').update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
    }).eq('id', vendor.id);
    setSaving(false);
    setSaved(true);
    onUpdate();
    setTimeout(() => setSaved(false), 2000);
  }

  return createPortal(
    <div
      className="flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 99999,
        background: tokens.modal.overlayBg,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: tokens.modal.bg,
          border: `1px solid ${tokens.modal.border}`,
          boxShadow: tokens.modal.shadow,
        }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: tokens.modal.title }}>{vendor.first_name} {vendor.last_name}</p>
            <p className="text-xs" style={{ color: tokens.modal.subtitle }}>{vendor.email}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex px-6 pt-4 gap-1" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-3 py-2 text-xs font-semibold rounded-t-lg transition-all"
              style={
                tab === t.id
                  ? { color: tokens.accent.text, borderBottom: `2px solid ${tokens.accent.text}`, marginBottom: '-1px' }
                  : { color: tokens.text.quaternary }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 min-h-0 max-h-72 overflow-y-auto">
          {tab === 'informations' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.modal.fieldLabel }}>Prénom</label>
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
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 transition-all"
                    style={{ background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}`, color: tokens.modal.fieldValue }}
                  />
                  <CopyButton value={email} label="Copier l'email du vendeur" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.modal.fieldLabel }}>Téléphone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 transition-all"
                  style={{ background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}`, color: tokens.modal.fieldValue }}
                />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={saveInfo}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                  style={{ background: tokens.accent.solid, color: tokens.text.primary, boxShadow: `0 0 16px ${tokens.accent.border}` }}
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                {saved && <p className="text-xs" style={{ color: tokens.success.text }}>Informations mises à jour.</p>}
              </div>
            </div>
          )}

          {tab === 'mot-de-passe' && (
            <PinDisplay password={vendor.password} vendorId={vendor.id} authUserId={vendor.auth_user_id} />
          )}

          {tab === 'commentaires' && (
            <CommentsTab vendorId={vendor.id} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
