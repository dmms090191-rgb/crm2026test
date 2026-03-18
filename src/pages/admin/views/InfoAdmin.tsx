import { useState, useRef, useEffect, useCallback } from 'react';
import { User, Mail, Lock, Save, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface InfoAdminProps {
  onNameChange?: (firstName: string, lastName: string) => void;
}

const cardStyle = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
  border: '1px solid rgba(255,255,255,0.07)',
};

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  outline: 'none',
};

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium"
      style={{
        background: type === 'success' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
        border: `1px solid ${type === 'success' ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
        color: type === 'success' ? '#34d399' : '#f87171',
      }}
    >
      {type === 'success'
        ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      {message}
    </div>
  );
}

export default function InfoAdmin({ onNameChange }: InfoAdminProps) {
  const [firstName, setFirstName] = useState('Administrateur');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [showPin, setShowPin] = useState(true);
  const [identityMsg, setIdentityMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [credMsg, setCredMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingCred, setSavingCred] = useState(false);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email ?? '');
        const meta = user.user_metadata ?? {};
        if (meta.first_name) setFirstName(meta.first_name);
        if (meta.last_name) setLastName(meta.last_name);
        if (meta.pin) {
          const pinStr = String(meta.pin);
          setDigits(pinStr.split('').concat(Array(6).fill('')).slice(0, 6));
        }
      }
    });
  }, []);

  const handlePinInput = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setDigits(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) {
      setTimeout(() => pinRefs.current[index + 1]?.focus(), 0);
    }
  }, []);

  const handlePinKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigits(prev => { const n = [...prev]; n[index] = ''; return n; });
      } else if (index > 0) {
        pinRefs.current[index - 1]?.focus();
        setDigits(prev => { const n = [...prev]; n[index - 1] = ''; return n; });
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      pinRefs.current[index + 1]?.focus();
    }
  }, [digits]);

  const handlePinFocus = useCallback((index: number) => {
    pinRefs.current[index]?.select();
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
      setIdentityMsg({ text: 'Nom et prénom enregistrés.', type: 'success' });
      onNameChange?.(firstName, lastName);
      setTimeout(() => setIdentityMsg(null), 3000);
    }
  };

  const saveCredentials = async () => {
    const pinStr = digits.join('');
    if (pinStr.length !== 6) {
      setCredMsg({ text: 'Le mot de passe doit contenir 6 chiffres.', type: 'error' });
      return;
    }
    setSavingCred(true);
    setCredMsg(null);

    const updates: { email?: string; password?: string; data?: Record<string, string> } = {
      data: { pin: pinStr },
    };
    if (email) updates.email = email;
    updates.password = pinStr;

    const { error } = await supabase.auth.updateUser(updates);
    setSavingCred(false);
    if (error) {
      setCredMsg({ text: `Erreur : ${error.message}`, type: 'error' });
    } else {
      setCredMsg({ text: 'Email et mot de passe enregistrés.', type: 'success' });
      setTimeout(() => setCredMsg(null), 3000);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-4 rounded-2xl p-5" style={cardStyle}>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)', boxShadow: '0 0 20px rgba(249,115,22,0.35)' }}
        >
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-white text-base font-bold">Info Admin</h2>
          <p className="text-slate-600 text-xs">Modifiez vos informations et cliquez sur Enregistrer</p>
        </div>
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-slate-500" />
          <h3 className="text-white text-sm font-semibold">Identité</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600 mb-1.5 block">Prénom</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Votre prénom"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-700 transition-all"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(34,211,238,0.35)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600 mb-1.5 block">Nom</label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Entrez votre nom"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-700 transition-all"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(34,211,238,0.35)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
            />
          </div>
        </div>

        {identityMsg && <Toast message={identityMsg.text} type={identityMsg.type} />}

        <button
          onClick={saveIdentity}
          disabled={savingIdentity}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #f97316, #ec4899)',
            color: 'white',
            boxShadow: '0 0 20px rgba(249,115,22,0.25)',
          }}
        >
          <Save className="w-4 h-4" />
          {savingIdentity ? 'Enregistrement...' : 'Enregistrer nom et prénom'}
        </button>
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-4 h-4 text-slate-500" />
          <h3 className="text-white text-sm font-semibold">Email et mot de passe</h3>
        </div>

        <div>
          <label className="text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600 mb-1.5 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="votre@email.com"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-700 transition-all"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(34,211,238,0.35)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
          />
          <p className="text-[10px] text-slate-700 mt-1">Modifier l'email changera vos identifiants de connexion</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500" />
              <label className="text-sm text-white font-medium">Mot de passe (6 chiffres)</label>
            </div>
            <button
              onClick={() => setShowPin(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPin ? 'Masquer' : 'Afficher'}
            </button>
          </div>

          <div className="flex gap-2 justify-center">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={el => { pinRefs.current[i] = el; }}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handlePinInput(i, e.target.value)}
                onKeyDown={e => handlePinKeyDown(i, e)}
                onFocus={() => handlePinFocus(i)}
                className="w-12 h-14 rounded-xl text-center text-xl font-bold text-white transition-all caret-transparent"
                style={{
                  background: digit ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.04)',
                  border: digit ? '1px solid rgba(34,211,238,0.3)' : '1px solid rgba(255,255,255,0.09)',
                  outline: 'none',
                }}
                onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(34,211,238,0.5)')}
                onBlurCapture={e => (e.currentTarget.style.borderColor = digit ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.09)')}
              />
            ))}
          </div>
          <p className="text-[10px] text-slate-700 text-center mt-2">Utilisez les flèches gauche/droite pour naviguer entre les chiffres</p>
        </div>

        {credMsg && <Toast message={credMsg.text} type={credMsg.type} />}

        <button
          onClick={saveCredentials}
          disabled={savingCred}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)',
            color: '#050a10',
            boxShadow: '0 0 20px rgba(34,211,238,0.25)',
          }}
        >
          <Save className="w-4 h-4" />
          {savingCred ? 'Enregistrement...' : 'Enregistrer email et mot de passe'}
        </button>
      </div>
    </div>
  );
}
