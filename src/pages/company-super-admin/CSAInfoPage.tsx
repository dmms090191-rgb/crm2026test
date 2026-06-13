import { useState, useEffect } from 'react';
import { User, Save, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import type { ImpersonatedCompanySuperAdmin } from '../../App';
import CSAInfoPasswordSection from './CSAInfoPasswordSection';

interface Props {
  impersonated: ImpersonatedCompanySuperAdmin;
  onNameUpdated?: (firstName: string, lastName: string) => void;
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

export default function CSAInfoPage({ impersonated, onNameUpdated }: Props) {
  const t = useThemeTokens();
  const [firstName, setFirstName] = useState(impersonated.first_name);
  const [lastName, setLastName] = useState(impersonated.last_name);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [identityMsg, setIdentityMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loadedDigits, setLoadedDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [pinLoading, setPinLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setPinLoading(true);
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || cancelled) return;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-pin`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
              Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ target_user_id: impersonated.id }),
          },
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.pin && !cancelled) {
          const pinStr = String(data.pin);
          setLoadedDigits(pinStr.split('').concat(Array(6).fill('')).slice(0, 6));
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setPinLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [impersonated.id]);

  const saveIdentity = async () => {
    setSavingIdentity(true);
    setIdentityMsg(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIdentityMsg({ text: 'Session expiree.', type: 'error' }); setSavingIdentity(false); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-company-super-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            target_user_id: impersonated.id,
            first_name: firstName,
            last_name: lastName,
          }),
        },
      );
      setSavingIdentity(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setIdentityMsg({ text: data.error || 'Erreur lors de la sauvegarde.', type: 'error' });
      } else {
        setIdentityMsg({ text: 'Nom et prenom enregistres.', type: 'success' });
        onNameUpdated?.(firstName, lastName);
        setTimeout(() => setIdentityMsg(null), 3000);
      }
    } catch {
      setSavingIdentity(false);
      setIdentityMsg({ text: 'Erreur lors de la sauvegarde.', type: 'error' });
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-2xl mx-auto space-y-3 md:space-y-5 min-w-0 overflow-x-hidden">
        <div className="flex items-center gap-3 md:gap-4 rounded-2xl p-3 md:p-5" style={{
          background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
          border: `1px solid ${t.surface.border}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
          <div
            className="w-9 h-9 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${t.accent.text}, ${t.accent.text}cc)`, boxShadow: `0 0 20px ${t.accent.border}` }}
          >
            <Shield className="w-4 h-4 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-bold" style={{ color: t.text.primary }}>Info Super Admin</h2>
            <p className="text-[11px] md:text-xs" style={{ color: t.text.tertiary }}>
              Informations de {impersonated.first_name} {impersonated.last_name} — {impersonated.company}
            </p>
          </div>
        </div>

        <div className="rounded-2xl p-3.5 md:p-5 space-y-3 md:space-y-4 min-w-0" style={{
          background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
          border: `1px solid ${t.surface.border}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" style={{ color: t.text.quaternary }} />
            <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>Identite</h3>
          </div>

          <div className="grid grid-cols-2 gap-2 md:gap-3 min-w-0">
            <div className="min-w-0">
              <label className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1 md:mb-1.5 block" style={{ color: t.text.quaternary }}>Prenom</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Prenom"
                className="w-full rounded-xl px-3 py-2 md:py-2.5 text-sm transition-all min-w-0 outline-none focus:ring-1"
                style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
              />
            </div>
            <div className="min-w-0">
              <label className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1 md:mb-1.5 block" style={{ color: t.text.quaternary }}>Nom</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Nom"
                className="w-full rounded-xl px-3 py-2 md:py-2.5 text-sm transition-all min-w-0 outline-none focus:ring-1"
                style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
              />
            </div>
          </div>

          {identityMsg && <Toast message={identityMsg.text} type={identityMsg.type} />}

          <button
            onClick={saveIdentity}
            disabled={savingIdentity}
            className="w-full flex items-center justify-center gap-2 py-2 md:py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60"
            style={{ background: t.success.text, color: '#ffffff', boxShadow: `0 4px 14px ${t.success.border}` }}
          >
            <Save className="w-4 h-4" />
            {savingIdentity ? 'Enregistrement...' : 'Enregistrer nom et prenom'}
          </button>
        </div>

        <CSAInfoPasswordSection
          targetUserId={impersonated.id}
          initialEmail={impersonated.email}
          initialDigits={loadedDigits}
          pinLoading={pinLoading}
        />
      </div>
    </div>
  );
}
