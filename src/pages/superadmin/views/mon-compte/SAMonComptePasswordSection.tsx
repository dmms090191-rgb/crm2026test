import { useState, useRef, useCallback, useEffect } from 'react';
import { Mail, Lock, Save, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import type { ThemeTokens } from '../../../../lib/themeTokens';
import { useTalixy } from '../../../../talixy/useTalixy';

type Ton = 'success' | 'error' | 'info';

function Toast({ message, type, tokens, testid }: { message: string; type: Ton; tokens: ThemeTokens; testid?: string }) {
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
        ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
        : type === 'error'
          ? <AlertCircle className="w-4 h-4 flex-shrink-0" />
          : <Mail className="w-4 h-4 flex-shrink-0" />}
      {message}
    </div>
  );
}

/**
 * TALVEX > MON COMPTE — ALIGNE SUR L ARCHITECTURE D INFO ADMIN (23 octobre 2026).
 *
 * Ce fichier portait le MEME defaut qu'« Acces & securite > Info Admin », au caractere
 * pres : un seul bouton envoyait email + mot de passe dans un unique
 * `auth.updateUser`, le mot de passe etait reecrit meme quand seul l email changeait,
 * et le succes etait annonce sur le seul critere `error === null` — alors que
 * `auth.updateUser({ email })` n'applique PAS l email : il enregistre une demande et
 * attend une confirmation par courriel.
 *
 * Meme correction, donc : deux boutons, deux appels, deux messages ; l email par la voie
 * serveur qui pose `email_confirm` ; et la verification de ce que le serveur a
 * reellement enregistre.
 */
interface Props {
  userEmail: string;
  /** L identifiant du compte. La voie serveur exige une cible, et ce sera SOI-MEME. */
  userId: string | null;
  initialEmail: string;
  initialDigits: string[];
  initialPinSynced: boolean;
  tokens: ThemeTokens;
}

export default function SAMonComptePasswordSection({ userEmail, userId, initialEmail, initialDigits, initialPinSynced, tokens: t }: Props) {
  const tx = useTalixy();
  const [email, setEmail] = useState(initialEmail);
  /** L email REELLEMENT en place, reference du « a-t-il change ? ». */
  const [emailEnPlace, setEmailEnPlace] = useState(initialEmail);
  const [digits, setDigits] = useState<string[]>(initialDigits);
  const [pinSynced, setPinSynced] = useState(initialPinSynced);

  useEffect(() => { if (initialEmail) { setEmail(initialEmail); setEmailEnPlace(initialEmail); } }, [initialEmail]);
  useEffect(() => { if (initialDigits.some(d => d)) setDigits(initialDigits); }, [initialDigits]);
  useEffect(() => { setPinSynced(initialPinSynced); }, [initialPinSynced]);
  const [syncingPin, setSyncingPin] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [credMsg, setCredMsg] = useState<{ text: string; type: Ton } | null>(null);
  const [emailMsg, setEmailMsg] = useState<{ text: string; type: Ton } | null>(null);
  const [savingCred, setSavingCred] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  /** Normalisation identique a celle du serveur : la casse n est pas un changement. */
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

  const syncPin = async () => {
    const pinStr = digits.join('');
    if (pinStr.length !== 6 || !/^\d{6}$/.test(pinStr)) {
      setCredMsg({ text: 'Saisissez 6 chiffres pour confirmer votre code.', type: 'error' });
      return;
    }
    setSyncingPin(true);
    setCredMsg(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailEnPlace || userEmail,
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
    setCredMsg({ text: 'Code synchronise avec succes.', type: 'success' });
    setTimeout(() => setCredMsg(null), 3000);
  };

  /** ENREGISTRER LE MOT DE PASSE, ET LUI SEUL. L email n est PAS joint. */
  const savePassword = async () => {
    const pinStr = digits.join('');
    if (pinStr.length !== 6 || !/^\d{6}$/.test(pinStr)) {
      setCredMsg({ text: 'Le mot de passe doit contenir 6 chiffres.', type: 'error' });
      return;
    }
    setSavingCred(true);
    setCredMsg(null);

    const { error } = await supabase.auth.updateUser({
      password: pinStr,
      data: { pin: pinStr },
    });
    setSavingCred(false);
    if (error) {
      setCredMsg({ text: `Erreur : ${error.message}`, type: 'error' });
    } else {
      setCredMsg({ text: 'Mot de passe enregistre.', type: 'success' });
      setTimeout(() => setCredMsg(null), 3000);
    }
  };

  /**
   * ENREGISTRER L EMAIL, ET LUI SEUL, PAR LA VOIE SERVEUR.
   *
   * `auth.updateUser({ email })` n applique pas l email : il ouvre une demande de
   * confirmation. L option qui l applique tout de suite, `email_confirm`, n existe que
   * sur l API Admin, laquelle exige la cle de service — qui ne doit jamais atteindre le
   * navigateur. L email part donc vers l Edge Function, qui verifie elle-meme que
   * l appelant ne vise que SON propre compte.
   */
  const saveEmail = async () => {
    const vise = email.trim();
    setEmailMsg(null);

    if (!userId) { setEmailMsg({ text: 'Compte introuvable.', type: 'error' }); return; }
    if (vise === '') { setEmailMsg({ text: "L'email est requis.", type: 'error' }); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(vise)) {
      setEmailMsg({ text: 'Email invalide.', type: 'error' }); return;
    }
    /* Aucune confirmation verte si rien n a change. */
    if (!emailAChange) {
      setEmailMsg({ text: "L'email n'a pas change.", type: 'info' });
      setTimeout(() => setEmailMsg(null), 3000);
      return;
    }

    setSavingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSavingEmail(false);
        setEmailMsg({ text: 'Session expiree.', type: 'error' });
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
          body: JSON.stringify({ admin_id: userId, email: vise }),
        },
      );
      const corps = await res.json().catch(() => ({} as Record<string, unknown>));
      setSavingEmail(false);

      if (!res.ok) {
        setEmailMsg({
          text: typeof corps.error === 'string' ? corps.error : "L'email n'a pas pu etre enregistre.",
          type: 'error',
        });
        return;
      }

      /* On ne croit pas l absence d erreur : on lit l email que le SERVEUR dit avoir pose. */
      const applique = typeof corps.email === 'string' ? corps.email : null;
      if (applique === null || normaliser(applique) !== normaliser(vise)) {
        setEmailMsg({
          text: "Le serveur n'a pas confirme le nouvel email. Rechargez la page pour voir l'email reellement en place.",
          type: 'error',
        });
        return;
      }

      setEmail(applique);
      setEmailEnPlace(applique);
      /* Le jeton porte encore l ancien email : sans ce refresh, toute lecture serveur
         qui part du JWT verrait l ancienne adresse. */
      await supabase.auth.refreshSession();

      setEmailMsg({ text: 'Email enregistre. La connexion se fait desormais avec cet email.', type: 'success' });
      setTimeout(() => setEmailMsg(null), 4000);
    } catch {
      setSavingEmail(false);
      setEmailMsg({ text: "L'email n'a pas pu etre enregistre.", type: 'error' });
    }
  };

  const inputStyle = {
    background: t.input.bg,
    border: `1px solid ${t.input.border}`,
    outline: 'none',
    color: t.input.text,
  };

  /*
   * TALIXY — meme etat, memes handlers (syncPin, saveCredentials, navigation au clavier dans les
   * six cases, validation) : seule la presentation change. Les autres themes gardent le rendu
   * d'origine juste en dessous.
   */
  if (tx.active) {
    return (
      <section className="tx-surface">
        <h2 className="tx-surface-title"><Mail /> Email et mot de passe</h2>

        <div className="tx-stack">
          <div className="tx-field">
            <span className="tx-label">Email</span>
            <input
              type="email"
              className="tx-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
            />
            <p className="tx-hint">
              Le changement prend effet immediatement : la connexion se fera avec le nouvel email
              et le mot de passe actuel.
            </p>
            {emailMsg && (
              <span className="tx-note" data-kind={emailMsg.type} data-testid="sa-mon-compte-email-message">
                {emailMsg.type === 'success' ? <CheckCircle /> : emailMsg.type === 'error' ? <AlertCircle /> : <Mail />}
                {emailMsg.text}
              </span>
            )}
            <button
              className="tx-btn"
              data-variant="primary"
              data-testid="sa-mon-compte-save-email-btn"
              onClick={saveEmail}
              disabled={savingEmail}
            >
              <Save />
              {savingEmail ? 'Enregistrement…' : "Enregistrer l'email"}
            </button>
          </div>

          <hr className="tx-divider" />

          <div>
            <div className="tx-pin-head">
              <span className="tx-label">Mot de passe · 6 chiffres</span>
              <button className="tx-btn" data-variant="ghost" onClick={() => setShowPin(v => !v)}>
                {showPin ? <EyeOff /> : <Eye />}
                {showPin ? 'Masquer' : 'Afficher'}
              </button>
            </div>

            <div className="tx-pin-row">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { pinRefs.current[i] = el; }}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  data-filled={digit ? 'true' : 'false'}
                  onChange={e => handlePinInput(i, e.target.value)}
                  onKeyDown={e => handlePinKeyDown(i, e)}
                  onFocus={() => handlePinFocus(i)}
                  className="tx-pin"
                />
              ))}
            </div>
            <p className="tx-hint" data-center="true">
              {!pinSynced
                ? 'Saisissez votre code actuel pour le synchroniser'
                : 'Utilisez les flèches gauche et droite pour naviguer entre les chiffres'}
            </p>
          </div>

          <div className="tx-actions">
            {credMsg && (
              <span className="tx-note" data-kind={credMsg.type}>
                {credMsg.type === 'success' ? <CheckCircle /> : <AlertCircle />}
                {credMsg.text}
              </span>
            )}
            {!pinSynced ? (
              <button
                className="tx-btn"
                data-variant="primary"
                onClick={syncPin}
                disabled={syncingPin || digits.join('').length < 6}
              >
                <Lock />
                {syncingPin ? 'Vérification…' : 'Confirmer mon code actuel'}
              </button>
            ) : (
              <button
                className="tx-btn"
                data-variant="primary"
                data-testid="sa-mon-compte-save-password-btn"
                onClick={savePassword}
                disabled={savingCred}
              >
                <Save />
                {savingCred ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div
      className="rounded-2xl p-3.5 md:p-5 space-y-3 md:space-y-4 min-w-0"
      style={{
        background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
        border: `1px solid ${t.surface.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4" style={{ color: t.label.muted }} />
        <h3 className="text-sm font-semibold" style={{ color: t.heading.primary }}>Email et mot de passe</h3>
      </div>

      <div>
        <label className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1 md:mb-1.5 block" style={{ color: t.label.muted }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="votre@email.com"
          className="w-full rounded-xl px-3 py-2 md:py-2.5 text-sm transition-all"
          style={inputStyle}
          onFocus={e => (e.currentTarget.style.borderColor = t.input.borderFocus)}
          onBlur={e => (e.currentTarget.style.borderColor = t.input.border)}
        />
        <p className="text-[9px] md:text-[10px] mt-0.5 md:mt-1" style={{ color: t.label.hint }}>
          Le changement prend effet immediatement : la connexion se fera avec le nouvel email et le mot de passe actuel.
        </p>

        {emailMsg && (
          <div className="mt-2">
            <Toast message={emailMsg.text} type={emailMsg.type} tokens={t} testid="sa-mon-compte-email-message" />
          </div>
        )}

        <button
          data-testid="sa-mon-compte-save-email-btn"
          onClick={saveEmail}
          disabled={savingEmail}
          className="w-full flex items-center justify-center gap-2 py-2 md:py-2.5 mt-2 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60"
          style={{
            background: t.accent.solid,
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(6,182,212,0.30)',
          }}
        >
          <Save className="w-4 h-4" />
          {savingEmail ? 'Enregistrement...' : "Enregistrer l'email"}
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <div className="flex items-center gap-1.5 md:gap-2">
            <Lock className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: t.label.muted }} />
            <label className="text-xs md:text-sm font-medium" style={{ color: t.heading.primary }}>Mot de passe (6 chiffres)</label>
          </div>
          <button
            onClick={() => setShowPin(v => !v)}
            className="flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg text-[11px] md:text-xs font-medium transition-all"
            style={{ background: t.button.toggleBg, color: t.button.toggleText, border: `1px solid ${t.button.toggleBorder}` }}
          >
            {showPin ? <EyeOff className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <Eye className="w-3 h-3 md:w-3.5 md:h-3.5" />}
            {showPin ? 'Masquer' : 'Afficher'}
          </button>
        </div>

        <div className="flex gap-1 xs:gap-1.5 md:gap-2 justify-center max-w-full">
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
          {!pinSynced
            ? 'Saisissez votre code actuel pour le synchroniser'
            : 'Utilisez les fleches gauche/droite pour naviguer entre les chiffres'}
        </p>
      </div>

      {credMsg && <Toast message={credMsg.text} type={credMsg.type} tokens={t} testid="sa-mon-compte-cred-message" />}

      {!pinSynced ? (
        <button
          onClick={syncPin}
          disabled={syncingPin || digits.join('').length < 6}
          className="w-full flex items-center justify-center gap-2 py-2 md:py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60"
          style={{
            background: '#059669',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(5,150,105,0.30)',
          }}
        >
          <Lock className="w-4 h-4" />
          {syncingPin ? 'Verification...' : 'Confirmer mon code actuel'}
        </button>
      ) : (
        <button
          data-testid="sa-mon-compte-save-password-btn"
          onClick={savePassword}
          disabled={savingCred}
          className="w-full flex items-center justify-center gap-2 py-2 md:py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60"
          style={{
            background: t.accent.solid,
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(6,182,212,0.30)',
          }}
        >
          <Save className="w-4 h-4" />
          {savingCred ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
        </button>
      )}
    </div>
  );
}
