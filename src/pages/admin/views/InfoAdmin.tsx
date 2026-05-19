import { useState, useEffect } from 'react';
import { User, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import type { ThemeTokens } from '../../../lib/themeTokens';
import type { ImpersonatedAdminInfo } from '../AdminDashboard';
import InfoAdminPasswordSection from './info-admin/InfoAdminPasswordSection';

interface InfoAdminProps {
  onNameChange?: (firstName: string, lastName: string) => void;
  impersonatedAdmin?: ImpersonatedAdminInfo | null;
}

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

export default function InfoAdmin({ onNameChange, impersonatedAdmin }: InfoAdminProps) {
  const t = useThemeTokens();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [firstName, setFirstName] = useState('Administrateur');
  const [lastName, setLastName] = useState('');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [pinSynced, setPinSynced] = useState(false);
  const [identityMsg, setIdentityMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [savingIdentity, setSavingIdentity] = useState(false);

  const isImpersonating = Boolean(impersonatedAdmin);

  useEffect(() => {
    if (impersonatedAdmin) {
      setAdminId(impersonatedAdmin.id);
      setAdminEmail(impersonatedAdmin.email ?? '');
      if (impersonatedAdmin.first_name) setFirstName(impersonatedAdmin.first_name);
      if (impersonatedAdmin.last_name) setLastName(impersonatedAdmin.last_name);
      if (impersonatedAdmin.pin) {
        const pinStr = String(impersonatedAdmin.pin);
        setDigits(pinStr.split('').concat(Array(6).fill('')).slice(0, 6));
        setPinSynced(true);
      } else {
        setPinSynced(false);
      }
    } else {
      supabase.auth.refreshSession().then(() => supabase.auth.getUser()).then(({ data: { user } }) => {
        if (user) {
          setAdminId(user.id);
          setAdminEmail(user.email ?? '');
          const meta = user.user_metadata ?? {};
          if (meta.first_name) setFirstName(meta.first_name);
          if (meta.last_name) setLastName(meta.last_name);
          if (meta.pin) {
            const pinStr = String(meta.pin);
            setDigits(pinStr.split('').concat(Array(6).fill('')).slice(0, 6));
            setPinSynced(true);
          } else {
            setPinSynced(false);
          }
        }
      });
    }
  }, [impersonatedAdmin]);

  const saveIdentity = async () => {
    setSavingIdentity(true);
    setIdentityMsg(null);

    if (isImpersonating && adminId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setIdentityMsg({ text: 'Session expirée.', type: 'error' }); setSavingIdentity(false); return; }
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-admin`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
            body: JSON.stringify({ admin_id: adminId, first_name: firstName, last_name: lastName }),
          }
        );
        setSavingIdentity(false);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setIdentityMsg({ text: body.error || 'Erreur lors de la sauvegarde.', type: 'error' });
        } else {
          setIdentityMsg({ text: 'Nom et prénom enregistrés.', type: 'success' });
          onNameChange?.(firstName, lastName);
          setTimeout(() => setIdentityMsg(null), 3000);
        }
      } catch {
        setSavingIdentity(false);
        setIdentityMsg({ text: 'Erreur lors de la sauvegarde.', type: 'error' });
      }
    } else {
      const { error } = await supabase.auth.updateUser({
        data: { first_name: firstName, last_name: lastName },
      });
      setSavingIdentity(false);
      if (error) {
        setIdentityMsg({ text: 'Erreur lors de la sauvegarde.', type: 'error' });
      } else {
        setIdentityMsg({ text: 'Nom et prénom enregistrés.', type: 'success' });
        onNameChange?.(firstName, lastName);
        setTimeout(() => setIdentityMsg(null), 3000);
      }
    }
  };

  const cardStyle = {
    background: t.card.bg,
    border: `1px solid ${t.card.border}`,
    boxShadow: t.card.shadow,
  };

  const inputStyle = {
    background: t.input.bg,
    border: `1px solid ${t.input.border}`,
    outline: 'none',
    color: t.input.text,
  };

  return (
    <div className="w-full max-w-2xl space-y-3 md:space-y-5 min-w-0 overflow-x-hidden">
      <div className="flex items-center gap-3 md:gap-4 rounded-2xl p-3 md:p-5" style={cardStyle}>
        <div
          className="w-9 h-9 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)', boxShadow: '0 0 20px rgba(249,115,22,0.35)' }}
        >
          <User className="w-4 h-4 md:w-6 md:h-6" style={{ color: '#ffffff' }} />
        </div>
        <div>
          <h2 className="text-sm md:text-base font-bold" style={{ color: t.heading.primary }}>Info Admin</h2>
          <p className="text-[11px] md:text-xs" style={{ color: t.label.muted }}>Informations sur l'administrateur</p>
        </div>
      </div>

      <div className="rounded-2xl p-3.5 md:p-5 space-y-3 md:space-y-4 min-w-0" style={cardStyle}>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" style={{ color: t.label.muted }} />
          <h3 className="text-sm font-semibold" style={{ color: t.heading.primary }}>Identité</h3>
        </div>

        <div className="grid grid-cols-2 gap-2 md:gap-3 min-w-0">
          <div className="min-w-0">
            <label className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1 md:mb-1.5 block" style={{ color: t.label.muted }}>Prénom</label>
            <input
              data-testid="info-admin-firstname"
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Votre prénom"
              className="w-full rounded-xl px-3 py-2 md:py-2.5 text-sm transition-all min-w-0"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = t.input.borderFocus)}
              onBlur={e => (e.currentTarget.style.borderColor = t.input.border)}
            />
          </div>
          <div className="min-w-0">
            <label className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1 md:mb-1.5 block" style={{ color: t.label.muted }}>Nom</label>
            <input
              data-testid="info-admin-lastname"
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Entrez votre nom"
              className="w-full rounded-xl px-3 py-2 md:py-2.5 text-sm transition-all min-w-0"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = t.input.borderFocus)}
              onBlur={e => (e.currentTarget.style.borderColor = t.input.border)}
            />
          </div>
        </div>

        {identityMsg && <Toast message={identityMsg.text} type={identityMsg.type} tokens={t} />}

        <button
          data-testid="info-admin-save-identity-btn"
          onClick={saveIdentity}
          disabled={savingIdentity}
          className="w-full flex items-center justify-center gap-2 py-2 md:py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60"
          style={{
            background: '#059669',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(5,150,105,0.30)',
          }}
        >
          <Save className="w-4 h-4" />
          {savingIdentity ? 'Enregistrement...' : 'Enregistrer nom et prénom'}
        </button>
      </div>

      <InfoAdminPasswordSection
        adminId={adminId}
        adminEmail={adminEmail}
        isImpersonating={isImpersonating}
        initialDigits={digits}
        initialPinSynced={pinSynced}
        tokens={t}
      />
    </div>
  );
}
