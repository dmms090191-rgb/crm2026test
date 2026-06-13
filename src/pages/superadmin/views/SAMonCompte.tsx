import { useState, useEffect } from 'react';
import { User, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import type { ThemeTokens } from '../../../lib/themeTokens';
import SAMonComptePasswordSection from './mon-compte/SAMonComptePasswordSection';

interface SAMonCompteProps {
  onNameChange?: (firstName: string, lastName: string) => void;
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

export default function SAMonCompte({ onNameChange }: SAMonCompteProps) {
  const t = useThemeTokens();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [pinSynced, setPinSynced] = useState(false);
  const [accountLoading, setAccountLoading] = useState(true);
  const [identityMsg, setIdentityMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    setAccountLoading(true);
    supabase.auth.refreshSession().then(() => supabase.auth.getUser()).then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email ?? '');
        setUserEmail(user.email ?? '');
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
    }).finally(() => setAccountLoading(false));
  }, []);

  const saveIdentity = async () => {
    setSavingIdentity(true);
    setIdentityMsg(null);

    const { error } = await supabase.auth.updateUser({
      data: { first_name: firstName, last_name: lastName },
    });
    setSavingIdentity(false);
    if (error) {
      setIdentityMsg({ text: 'Erreur lors de la sauvegarde.', type: 'error' });
    } else {
      setIdentityMsg({ text: 'Nom et prenom enregistres.', type: 'success' });
      onNameChange?.(firstName, lastName);
      setTimeout(() => setIdentityMsg(null), 3000);
    }
  };

  const cardStyle = {
    background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
    border: `1px solid ${t.surface.border}`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  };

  const inputStyle = {
    background: t.input.bg,
    border: `1px solid ${t.input.border}`,
    outline: 'none',
    color: t.input.text,
  };

  if (accountLoading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-2xl mx-auto space-y-3 md:space-y-5 min-w-0 overflow-x-hidden">
          <div className="flex items-center gap-3 md:gap-4 rounded-2xl p-3 md:p-5" style={cardStyle}>
            <div
              className="w-9 h-9 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 20px rgba(245,158,11,0.35)' }}
            >
              <User className="w-4 h-4 md:w-6 md:h-6" style={{ color: '#ffffff' }} />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold" style={{ color: t.heading.primary }}>Mon compte</h2>
              <p className="text-[11px] md:text-xs" style={{ color: t.label.muted }}>Informations sur le Rois Admin</p>
            </div>
          </div>

          <div className="rounded-2xl p-3.5 md:p-5 space-y-3 md:space-y-4 min-w-0" style={cardStyle}>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" style={{ color: t.label.muted }} />
              <h3 className="text-sm font-semibold" style={{ color: t.heading.primary }}>Identite</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 md:gap-3 min-w-0">
              <div className="min-w-0">
                <div className="h-3 w-12 rounded mb-1.5 animate-pulse" style={{ background: t.surface.hover }} />
                <div className="h-10 rounded-xl animate-pulse" style={{ background: t.surface.hover, border: `1px solid ${t.surface.border}` }} />
              </div>
              <div className="min-w-0">
                <div className="h-3 w-8 rounded mb-1.5 animate-pulse" style={{ background: t.surface.hover }} />
                <div className="h-10 rounded-xl animate-pulse" style={{ background: t.surface.hover, border: `1px solid ${t.surface.border}` }} />
              </div>
            </div>
            <div className="h-10 rounded-xl animate-pulse" style={{ background: t.surface.hover, border: `1px solid ${t.surface.border}` }} />
          </div>

          <div className="rounded-2xl p-3.5 md:p-5 space-y-3 md:space-y-4 min-w-0" style={cardStyle}>
            <div className="h-4 w-40 rounded animate-pulse" style={{ background: t.surface.hover }} />
            <div>
              <div className="h-3 w-10 rounded mb-1.5 animate-pulse" style={{ background: t.surface.hover }} />
              <div className="h-10 rounded-xl animate-pulse" style={{ background: t.surface.hover, border: `1px solid ${t.surface.border}` }} />
            </div>
            <div>
              <div className="h-4 w-44 rounded mb-3 animate-pulse" style={{ background: t.surface.hover }} />
              <div className="flex gap-1 xs:gap-1.5 md:gap-2 justify-center max-w-full">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex-1 max-w-10 h-11 md:max-w-12 md:h-14 rounded-xl animate-pulse" style={{ background: t.surface.hover, border: `1px solid ${t.surface.border}` }} />
                ))}
              </div>
            </div>
            <div className="h-10 rounded-xl animate-pulse" style={{ background: t.surface.hover, border: `1px solid ${t.surface.border}` }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-2xl mx-auto space-y-3 md:space-y-5 min-w-0 overflow-x-hidden">
        <div className="flex items-center gap-3 md:gap-4 rounded-2xl p-3 md:p-5" style={cardStyle}>
          <div
            className="w-9 h-9 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 20px rgba(245,158,11,0.35)' }}
          >
            <User className="w-4 h-4 md:w-6 md:h-6" style={{ color: '#ffffff' }} />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-bold" style={{ color: t.heading.primary }}>Mon compte</h2>
            <p className="text-[11px] md:text-xs" style={{ color: t.label.muted }}>Informations sur le Rois Admin</p>
          </div>
        </div>

        <div className="rounded-2xl p-3.5 md:p-5 space-y-3 md:space-y-4 min-w-0" style={cardStyle}>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" style={{ color: t.label.muted }} />
            <h3 className="text-sm font-semibold" style={{ color: t.heading.primary }}>Identite</h3>
          </div>

          <div className="grid grid-cols-2 gap-2 md:gap-3 min-w-0">
            <div className="min-w-0">
              <label className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1 md:mb-1.5 block" style={{ color: t.label.muted }}>Prenom</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Votre prenom"
                className="w-full rounded-xl px-3 py-2 md:py-2.5 text-sm transition-all min-w-0"
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = t.input.borderFocus)}
                onBlur={e => (e.currentTarget.style.borderColor = t.input.border)}
              />
            </div>
            <div className="min-w-0">
              <label className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1 md:mb-1.5 block" style={{ color: t.label.muted }}>Nom</label>
              <input
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
            {savingIdentity ? 'Enregistrement...' : 'Enregistrer nom et prenom'}
          </button>
        </div>

        <SAMonComptePasswordSection
          userEmail={userEmail}
          initialEmail={email}
          initialDigits={digits}
          initialPinSynced={pinSynced}
          tokens={t}
        />
      </div>
    </div>
  );
}
