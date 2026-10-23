import { useState, useEffect, useRef, useCallback } from 'react';
import { Mail, Lock, Save, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import type { ThemeTokens } from '../../../../lib/themeTokens';

/**
 * « EMAIL ET MOT DE PASSE » DE L'ECRAN SOCIETE > ACCES & SECURITE > INFO ADMIN.
 *
 * ---------- DEUX CHOSES, DEUX BOUTONS, DEUX MESSAGES ----------
 *
 * Jusqu'au 23 octobre 2026, un seul bouton envoyait l'email ET le mot de passe dans un
 * seul appel, et le mot de passe partait MEME quand l'utilisateur n'y avait pas touche :
 * `updates.password = pinStr` etait pose sans condition. Changer son email reecrivait
 * donc son mot de passe par l'ancienne valeur, et un refus sur l'un faisait echouer
 * l'autre. Ils sont desormais separes : deux boutons, deux appels, deux messages.
 *
 * ---------- POURQUOI L'EMAIL PASSE PAR LE SERVEUR ----------
 *
 * `supabase.auth.updateUser({ email })` NE POSE PAS l'email : il enregistre une DEMANDE
 * et attend une confirmation par courriel. Deux comptes du projet portaient ainsi un
 * `email_change` en attente depuis plusieurs jours, pendant que cet ecran affichait
 * « Email et mot de passe enregistrés ». Et l'option qui applique l'email tout de suite,
 * `email_confirm`, n'existe QUE sur l'API Admin, laquelle exige la cle de service.
 *
 * Cette cle ne doit jamais atteindre le navigateur : l'email part donc vers l'Edge
 * Function `update-admin-for-super-admin`, qui la detient cote serveur et qui verifie
 * elle-meme le droit de l'appelant — un Admin ne peut viser que SON propre compte, et
 * la cible est lue dans le jeton verifie par le serveur, pas dans le corps de l'appel.
 *
 * ---------- UN SEUL CHEMIN, QUEL QUE SOIT LE MODE ----------
 *
 * L'ancienne version avait deux branches : en mode Visu, l'email n'etait envoye a AUCUNE
 * fonction — le champ etait editable et la saisie jetee en silence. Il n'y a plus qu'un
 * chemin, et c'est `adminId` qui designe la cible : son propre compte en auto-service,
 * le compte observe en Visu. Le compte Talvex connecte n'est donc jamais touche.
 */

interface Props {
  adminId: string | null;
  adminEmail: string;
  isImpersonating: boolean;
  initialDigits: string[];
  initialPinSynced: boolean;
  tokens: ThemeTokens;
  /** Remonte l'email REELLEMENT applique, tel que le serveur l'a relu. */
  onEmailApplique?: (email: string) => void;
}

function Toast({ message, type, tokens, testid }: {
  message: string; type: 'success' | 'error' | 'info'; tokens: ThemeTokens; testid?: string;
}) {
  const fond = type === 'success' ? tokens.success.bg
    : type === 'error' ? tokens.danger.bg : tokens.surface.secondary;
  const bord = type === 'success' ? tokens.success.border
    : type === 'error' ? tokens.danger.border : tokens.surface.border;
  const texte = type === 'success' ? tokens.success.text
    : type === 'error' ? tokens.danger.text : tokens.text.secondary;
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium"
      data-testid={testid}
      style={{ background: fond, border: `1px solid ${bord}`, color: texte }}
    >
      {type === 'success'
        ? <span className="w-4 h-4 flex-shrink-0">&#10003;</span>
        : type === 'error'
          ? <span className="w-4 h-4 flex-shrink-0">&#9888;</span>
          : <span className="w-4 h-4 flex-shrink-0">&#8505;</span>}
      {message}
    </div>
  );
}

type Message = { text: string; type: 'success' | 'error' | 'info' } | null;

export default function InfoAdminPasswordSection({
  adminId, adminEmail, isImpersonating, initialDigits, initialPinSynced,
  tokens: t, onEmailApplique,
}: Props) {
  const [email, setEmail] = useState(adminEmail);
  /** L'email REELLEMENT en place, qui sert de reference au « a-t-il change ? ». */
  const [emailEnPlace, setEmailEnPlace] = useState(adminEmail);
  const [digits, setDigits] = useState<string[]>(initialDigits);
  const [pinSynced, setPinSynced] = useState(initialPinSynced);
  const [syncingPin, setSyncingPin] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [emailMsg, setEmailMsg] = useState<Message>(null);
  const [credMsg, setCredMsg] = useState<Message>(null);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingCred, setSavingCred] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (adminEmail) { setEmail(adminEmail); setEmailEnPlace(adminEmail); }
  }, [adminEmail]);

  useEffect(() => {
    if (initialDigits.some(d => d !== '')) setDigits(initialDigits);
  }, [initialDigits]);

  useEffect(() => {
    setPinSynced(initialPinSynced);
  }, [initialPinSynced]);

  /** Normalisation identique a celle du serveur : la casse n'est pas un changement. */
  const normaliser = (v: string) => v.trim().toLowerCase();
  const emailAChange = normaliser(email) !== normaliser(emailEnPlace);

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

  /**
   * ENREGISTRER L'EMAIL, ET LUI SEUL.
   *
   * Le mot de passe n'est PAS joint : modifier son email ne doit pas reecrire son code.
   */
  const saveEmail = async () => {
    const vise = email.trim();
    setEmailMsg(null);

    if (!adminId) { setEmailMsg({ text: 'Compte introuvable.', type: 'error' }); return; }
    if (vise === '') { setEmailMsg({ text: "L'email est requis.", type: 'error' }); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(vise)) {
      setEmailMsg({ text: 'Email invalide.', type: 'error' }); return;
    }
    /*
     * AUCUNE CONFIRMATION VERTE SI RIEN N'A CHANGE. L'ancienne version affichait
     * « Email et mot de passe enregistrés » meme quand l'email etait identique.
     */
    if (!emailAChange) {
      setEmailMsg({ text: "L'email n'a pas changé.", type: 'info' });
      setTimeout(() => setEmailMsg(null), 3000);
      return;
    }

    setSavingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSavingEmail(false);
        setEmailMsg({ text: 'Session expirée.', type: 'error' });
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-admin-for-super-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          /* La cible est `adminId` : soi-meme en auto-service, le compte observe en
             Visu. Aucun autre champ ne part : ni nom, ni role, ni company_id. */
          body: JSON.stringify({ admin_id: adminId, email: vise }),
        },
      );
      const corps = await res.json().catch(() => ({} as Record<string, unknown>));
      setSavingEmail(false);

      if (!res.ok) {
        setEmailMsg({
          text: typeof corps.error === 'string' ? corps.error : "L'email n'a pas pu être enregistré.",
          type: 'error',
        });
        return;
      }

      /*
       * ON NE CROIT PAS L'ABSENCE D'ERREUR : on lit l'email que le SERVEUR dit avoir en
       * place. C'est exactement ce qui manquait — l'ancienne version annoncait un succes
       * sur le seul critere `error === null`, sans jamais verifier l'email applique.
       */
      const applique = typeof corps.email === 'string' ? corps.email : null;
      if (applique === null || normaliser(applique) !== normaliser(vise)) {
        setEmailMsg({
          text: "Le serveur n'a pas confirmé le nouvel email. Rechargez la page pour voir l'email réellement en place.",
          type: 'error',
        });
        return;
      }

      setEmail(applique);
      setEmailEnPlace(applique);
      onEmailApplique?.(applique);

      /*
       * Le jeton de session porte encore l'ancien email : `updateUserById` ne le
       * rafraichit pas. Sans ce refresh, toute lecture serveur qui part du JWT — RLS,
       * Edge Function — continuerait de voir l'ancienne adresse. On ne le fait QUE pour
       * son propre compte : en Visu, la session est celle de l'observateur.
       */
      if (!isImpersonating) await supabase.auth.refreshSession();

      setEmailMsg({ text: 'Email enregistré. La connexion se fait désormais avec cet email.', type: 'success' });
      setTimeout(() => setEmailMsg(null), 4000);
    } catch {
      setSavingEmail(false);
      setEmailMsg({ text: "L'email n'a pas pu être enregistré.", type: 'error' });
    }
  };

  /**
   * SYNCHRONISER LE CODE EXISTANT.
   *
   * Pour un compte dont `user_metadata.pin` est absent, on confirme d'abord le code
   * actuel. Cette etape ne concerne QUE le mot de passe : l'email a son propre bouton,
   * disponible sans condition — l'ancienne version le rendait inatteignable dans cet
   * etat, puisque le seul bouton de la carte etait « Confirmer mon code actuel ».
   */
  const syncPin = async () => {
    const pinStr = digits.join('');
    if (pinStr.length !== 6 || !/^\d{6}$/.test(pinStr)) {
      setCredMsg({ text: 'Saisissez 6 chiffres pour confirmer votre code.', type: 'error' });
      return;
    }
    setSyncingPin(true);
    setCredMsg(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailEnPlace,
      password: pinStr,
    });

    if (signInError) {
      setSyncingPin(false);
      setCredMsg({ text: 'Code incorrect. Saisissez votre code actuel.', type: 'error' });
      return;
    }

    await supabase.auth.updateUser({ data: { pin: pinStr } });
    setSyncingPin(false);
    setPinSynced(true);
    setCredMsg({ text: 'Code synchronisé avec succès.', type: 'success' });
    setTimeout(() => setCredMsg(null), 3000);
  };

  /** ENREGISTRER LE MOT DE PASSE, ET LUI SEUL. L'email n'est PAS joint. */
  const savePassword = async () => {
    const pinStr = digits.join('');
    if (pinStr.length !== 6 || !/^\d{6}$/.test(pinStr)) {
      setCredMsg({ text: 'Le mot de passe doit contenir 6 chiffres.', type: 'error' });
      return;
    }
    setSavingCred(true);
    setCredMsg(null);

    if (isImpersonating && adminId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setCredMsg({ text: 'Session expirée.', type: 'error' }); setSavingCred(false); return; }
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-password`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
            body: JSON.stringify({ auth_user_id: adminId, password: pinStr }),
          }
        );
        setSavingCred(false);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setCredMsg({ text: body.error || 'Erreur lors de la mise à jour.', type: 'error' });
        } else {
          setCredMsg({ text: 'Mot de passe enregistré.', type: 'success' });
          setTimeout(() => setCredMsg(null), 3000);
        }
      } catch {
        setSavingCred(false);
        setCredMsg({ text: 'Erreur lors de la mise à jour.', type: 'error' });
      }
    } else {
      /* Son propre mot de passe : l'API utilisateur suffit, et elle n'exige aucune
         cle privilegiee. L'email ne figure PAS dans cet appel. */
      const { error } = await supabase.auth.updateUser({
        password: pinStr,
        data: { pin: pinStr },
      });
      setSavingCred(false);
      if (error) {
        setCredMsg({ text: `Erreur : ${error.message}`, type: 'error' });
      } else {
        setCredMsg({ text: 'Mot de passe enregistré.', type: 'success' });
        setTimeout(() => setCredMsg(null), 3000);
      }
    }
  };

  const inputStyle = {
    background: t.input.bg,
    border: `1px solid ${t.input.border}`,
    outline: 'none',
    color: t.input.text,
  };

  const boutonStyle = {
    background: t.accent.solid,
    color: '#ffffff',
    boxShadow: '0 4px 14px rgba(6,182,212,0.30)',
  };

  return (
    <div className="rounded-2xl p-3.5 md:p-5 space-y-4 md:space-y-5 min-w-0" style={{ background: t.card.bg, border: `1px solid ${t.card.border}`, boxShadow: t.card.shadow }}>
      {/* ---------- L'EMAIL ---------- */}
      <div className="space-y-2.5 md:space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" style={{ color: t.label.muted }} />
          <h3 className="text-sm font-semibold" style={{ color: t.heading.primary }}>Email de connexion</h3>
        </div>

        <div>
          <label className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1 md:mb-1.5 block" style={{ color: t.label.muted }}>Email</label>
          <input
            data-testid="info-admin-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="votre@email.com"
            className="w-full rounded-xl px-3 py-2 md:py-2.5 text-sm max-md:text-base transition-all"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = t.input.borderFocus)}
            onBlur={e => (e.currentTarget.style.borderColor = t.input.border)}
          />
          <p className="text-[9px] md:text-[10px] mt-0.5 md:mt-1" style={{ color: t.label.hint }}>
            Le changement prend effet immédiatement : la connexion se fera avec le nouvel email et le mot de passe actuel.
          </p>
        </div>

        {emailMsg && <Toast message={emailMsg.text} type={emailMsg.type} tokens={t} testid="info-admin-email-message" />}

        <button
          data-testid="info-admin-save-email-btn"
          onClick={saveEmail}
          disabled={savingEmail}
          className="w-full flex items-center justify-center gap-2 py-2 md:py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60 max-md:min-h-[44px]"
          style={boutonStyle}
        >
          <Save className="w-4 h-4" />
          {savingEmail ? 'Enregistrement...' : "Enregistrer l'email"}
        </button>
      </div>

      {/* ---------- LE MOT DE PASSE ---------- */}
      <div className="space-y-2.5 md:space-y-3 pt-3.5 md:pt-4" style={{ borderTop: `1px solid ${t.surface.borderLight}` }}>
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 md:gap-2">
            <Lock className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: t.label.muted }} />
            <h3 className="text-sm font-semibold" style={{ color: t.heading.primary }}>Mot de passe (6 chiffres)</h3>
          </div>
          <button
            data-testid="info-admin-toggle-pin"
            onClick={() => setShowPin(v => !v)}
            className="flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg text-[11px] md:text-xs font-medium transition-all"
            style={{ background: t.button.toggleBg, color: t.button.toggleText, border: `1px solid ${t.button.toggleBorder}` }}
          >
            {showPin ? <EyeOff className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <Eye className="w-3 h-3 md:w-3.5 md:h-3.5" />}
            {showPin ? 'Masquer' : 'Afficher'}
          </button>
        </div>

        <div data-testid="info-admin-pin-container" className="flex gap-1 xs:gap-1.5 md:gap-2 justify-center max-w-full">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={el => { pinRefs.current[i] = el; }}
              data-testid={`info-admin-pin-${i}`}
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handlePinInput(i, e.target.value)}
              onKeyDown={e => handlePinKeyDown(i, e)}
              onFocus={() => handlePinFocus(i)}
              className="flex-1 max-w-10 h-11 md:max-w-12 md:h-14 rounded-xl text-center text-lg md:text-xl font-bold transition-all caret-transparent"
              style={{
                background: digit ? t.pin.bgFilled : t.pin.bg,
                border: `1px solid ${digit ? t.pin.borderFilled : t.pin.border}`,
                outline: 'none',
                color: t.pin.text,
              }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = t.pin.borderFocus)}
              onBlurCapture={e => (e.currentTarget.style.borderColor = digit ? t.pin.borderFilled : t.pin.border)}
            />
          ))}
        </div>
        <p className="text-[9px] md:text-[10px] text-center mt-1.5 md:mt-2" style={{ color: t.label.hint }}>
          {!pinSynced && !isImpersonating
            ? 'Saisissez votre code actuel pour le synchroniser'
            : 'Utilisez les flèches gauche/droite pour naviguer entre les chiffres'}
        </p>

        {credMsg && <Toast message={credMsg.text} type={credMsg.type} tokens={t} testid="info-admin-cred-message" />}

        {!pinSynced && !isImpersonating ? (
          <button
            data-testid="info-admin-sync-pin-btn"
            onClick={syncPin}
            disabled={syncingPin || digits.join('').length < 6}
            className="w-full flex items-center justify-center gap-2 py-2 md:py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60 max-md:min-h-[44px]"
            style={{
              background: '#059669',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(5,150,105,0.30)',
            }}
          >
            <Lock className="w-4 h-4" />
            {syncingPin ? 'Vérification...' : 'Confirmer mon code actuel'}
          </button>
        ) : (
          <button
            data-testid="info-admin-save-credentials-btn"
            onClick={savePassword}
            disabled={savingCred}
            className="w-full flex items-center justify-center gap-2 py-2 md:py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60 max-md:min-h-[44px]"
            style={boutonStyle}
          >
            <Save className="w-4 h-4" />
            {savingCred ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
          </button>
        )}
      </div>
    </div>
  );
}
