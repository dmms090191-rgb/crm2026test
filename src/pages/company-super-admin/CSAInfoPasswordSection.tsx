import { useState, useRef, useCallback, useEffect } from 'react';
import { Mail, Lock, Save, Eye, EyeOff, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useThemeTokens } from '../../hooks/useThemeTokens';

/**
 * « EMAIL ET MOT DE PASSE » DU PANEL GROUPE.
 *
 * ---------- TROISIEME ECRAN ALIGNE, ET LE DERNIER ----------
 *
 * Le 23 octobre 2026, trois ecrans portaient le meme defaut, au caractere pres : un seul
 * bouton envoyait l'email ET le mot de passe, le mot de passe partait meme quand
 * l'utilisateur n'y avait pas touche, et le succes etait annonce sur la seule absence
 * d'erreur. Les deux premiers (« Societe > Info Admin » et « Talvex > Mon compte ») ont
 * ete corriges d'abord ; celui-ci a ete trouve en VERIFIANT LA PRODUCTION, pas en le
 * devinant : son ancien libelle « Enregistrer email et mot de passe » subsistait dans les
 * paquets servis alors que les deux autres avaient disparu.
 *
 * ---------- CE QUI ETAIT DEJA CORRIGE ICI, ET CE QUI NE L'ETAIT PAS ----------
 *
 * Cet ecran passe par l'Edge Function `update-company-super-admin`, redeployee le meme
 * jour : son email etait donc DEJA applique immediatement, et un conflit n'y bloquait
 * deja plus le mot de passe. Ce qui restait etait cote affichage — libelle couple, aucune
 * relecture du resultat, mot de passe toujours envoye. C'est cela qui est corrige ici.
 *
 * ---------- DEUX IDENTITES, LA MEME DISTINCTION QU'AILLEURS ----------
 *
 * Cet ecran sert au Groupe sur SON compte, mais aussi a Talvex qui l'observe en Visu.
 * `targetUserId` est donc la CIBLE, et la session celle de l'ACTEUR. Les deux ne
 * coincident pas toujours, et seule leur coincidence autorise un `refreshSession()` :
 * rafraichir la session de l'observateur apres avoir modifie le compte d'un autre serait
 * sans effet au mieux, trompeur au pire.
 */

interface Props {
  /** Le compte REGLE. En Visu, ce n'est pas celui de l'acteur authentifie. */
  targetUserId: string;
  initialEmail: string;
  initialDigits: string[];
  pinLoading?: boolean;
}

type Ton = 'success' | 'error' | 'info';

function Toast({ message, type, testid }: { message: string; type: Ton; testid?: string }) {
  const t = useThemeTokens();
  const fond = type === 'success' ? t.success.bg : type === 'error' ? t.danger.bg : t.surface.hover;
  const bord = type === 'success' ? t.success.border : type === 'error' ? t.danger.border : t.surface.border;
  const texte = type === 'success' ? t.success.text : type === 'error' ? t.danger.text : t.text.tertiary;
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
          : <Info className="w-4 h-4 flex-shrink-0" />}
      {message}
    </div>
  );
}

export default function CSAInfoPasswordSection({ targetUserId, initialEmail, initialDigits, pinLoading }: Props) {
  const t = useThemeTokens();
  const [email, setEmail] = useState(initialEmail);
  /** L'email REELLEMENT en place, reference du « a-t-il change ? ». */
  const [emailEnPlace, setEmailEnPlace] = useState(initialEmail);
  const [digits, setDigits] = useState<string[]>(initialDigits);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (initialEmail) { setEmail(initialEmail); setEmailEnPlace(initialEmail); }
  }, [initialEmail]);

  useEffect(() => {
    if (initialDigits.some(d => d !== '')) setDigits(initialDigits);
  }, [initialDigits]);

  const [credMsg, setCredMsg] = useState<{ text: string; type: Ton } | null>(null);
  const [emailMsg, setEmailMsg] = useState<{ text: string; type: Ton } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  const handlePinPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      setDigits(pasted.split(''));
      pinRefs.current[5]?.focus();
    }
  }, []);

  /** L'appel partage par les deux boutons : un seul endroit sait construire la requete. */
  const appeler = async (corpsPartiel: Record<string, string>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { session: null, res: null, corps: null };
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-company-super-admin`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ target_user_id: targetUserId, ...corpsPartiel }),
      },
    );
    const corps = await res.json().catch(() => ({} as Record<string, unknown>));
    return { session, res, corps };
  };

  /** ENREGISTRER L'EMAIL, ET LUI SEUL. Le mot de passe n'est PAS joint. */
  const saveEmail = async () => {
    const vise = email.trim();
    setEmailMsg(null);

    if (!targetUserId) { setEmailMsg({ text: 'Compte introuvable.', type: 'error' }); return; }
    if (vise === '') { setEmailMsg({ text: "L'email est requis.", type: 'error' }); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(vise)) {
      setEmailMsg({ text: 'Email invalide.', type: 'error' }); return;
    }
    /* Aucune confirmation verte si rien n'a change. */
    if (!emailAChange) {
      setEmailMsg({ text: "L'email n'a pas change.", type: 'info' });
      setTimeout(() => setEmailMsg(null), 3000);
      return;
    }

    setSavingEmail(true);
    try {
      const { session, res, corps } = await appeler({ email: vise });
      setSavingEmail(false);

      if (!session) { setEmailMsg({ text: 'Session expiree.', type: 'error' }); return; }
      if (!res || !res.ok) {
        setEmailMsg({
          text: typeof corps?.error === 'string' ? corps.error : "L'email n'a pas pu etre enregistre.",
          type: 'error',
        });
        return;
      }

      /*
       * ON NE CROIT PAS L'ABSENCE D'ERREUR : on lit l'email que le SERVEUR dit avoir en
       * place. C'est ce qui manquait aux trois ecrans.
       */
      const applique = typeof corps?.email === 'string' ? corps.email : null;
      if (applique === null || normaliser(applique) !== normaliser(vise)) {
        setEmailMsg({
          text: "Le serveur n'a pas confirme le nouvel email. Rechargez la page pour voir l'email reellement en place.",
          type: 'error',
        });
        return;
      }

      setEmail(applique);
      setEmailEnPlace(applique);

      /*
       * Le jeton porte encore l'ancien email : `updateUserById` ne le rafraichit pas. On
       * ne rafraichit QUE si l'acteur a modifie son propre compte — en Visu, la session
       * est celle de l'observateur, et la rafraichir n'aurait aucun sens.
       */
      if (session.user.id === targetUserId) await supabase.auth.refreshSession();

      setEmailMsg({ text: 'Email enregistre. La connexion se fait desormais avec cet email.', type: 'success' });
      setTimeout(() => setEmailMsg(null), 4000);
    } catch {
      setSavingEmail(false);
      setEmailMsg({ text: "L'email n'a pas pu etre enregistre.", type: 'error' });
    }
  };

  /** ENREGISTRER LE MOT DE PASSE, ET LUI SEUL. L'email n'est PAS joint. */
  const savePassword = async () => {
    const pinStr = digits.join('');
    if (pinStr.length !== 6 || !/^\d{6}$/.test(pinStr)) {
      setCredMsg({ text: 'Le mot de passe doit contenir 6 chiffres.', type: 'error' });
      return;
    }
    setSaving(true);
    setCredMsg(null);

    try {
      const { session, res, corps } = await appeler({ password: pinStr });
      setSaving(false);

      if (!session) { setCredMsg({ text: 'Session expiree.', type: 'error' }); return; }
      if (!res || !res.ok) {
        setCredMsg({
          text: typeof corps?.error === 'string' ? corps.error : 'Erreur lors de la mise a jour.',
          type: 'error',
        });
        return;
      }
      setCredMsg({ text: 'Mot de passe enregistre.', type: 'success' });
      setTimeout(() => setCredMsg(null), 3000);
    } catch {
      setSaving(false);
      setCredMsg({ text: 'Erreur lors de la mise a jour.', type: 'error' });
    }
  };

  const boutonStyle = {
    background: `linear-gradient(135deg, ${t.accent.text}, ${t.accent.text}cc)`,
    color: '#ffffff',
    boxShadow: `0 4px 14px ${t.accent.border}`,
  };

  return (
    <div
      className="rounded-2xl p-3.5 md:p-5 space-y-4 md:space-y-5 min-w-0"
      style={{
        background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
        border: `1px solid ${t.surface.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {pinLoading ? (
        <>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" style={{ color: t.text.quaternary }} />
            <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>Email et mot de passe</h3>
          </div>
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
        </>
      ) : (
        <>
          {/* ---------- L'EMAIL ---------- */}
          <div className="space-y-2.5 md:space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" style={{ color: t.text.quaternary }} />
              <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>Email de connexion</h3>
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1 md:mb-1.5 block" style={{ color: t.text.quaternary }}>Email</label>
              <input
                data-testid="csa-info-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full rounded-xl px-3 py-2 md:py-2.5 text-sm transition-all outline-none focus:ring-1"
                style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
              />
              <p className="text-[9px] md:text-[10px] mt-0.5 md:mt-1" style={{ color: t.text.quaternary }}>
                Le changement prend effet immediatement : la connexion se fera avec le nouvel email et le mot de passe actuel.
              </p>
            </div>

            {emailMsg && <Toast message={emailMsg.text} type={emailMsg.type} testid="csa-info-email-message" />}

            <button
              data-testid="csa-info-save-email-btn"
              onClick={saveEmail}
              disabled={savingEmail}
              className="w-full flex items-center justify-center gap-2 py-2 md:py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60"
              style={boutonStyle}
            >
              <Save className="w-4 h-4" />
              {savingEmail ? 'Enregistrement...' : "Enregistrer l'email"}
            </button>
          </div>

          {/* ---------- LE MOT DE PASSE ---------- */}
          <div className="space-y-2.5 md:space-y-3 pt-3.5 md:pt-4" style={{ borderTop: `1px solid ${t.surface.border}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 md:gap-2">
                <Lock className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: t.text.quaternary }} />
                <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>Mot de passe (6 chiffres)</h3>
              </div>
              <button
                onClick={() => setShowPin(v => !v)}
                className="flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg text-[11px] md:text-xs font-medium transition-all"
                style={{ background: t.surface.hover, color: t.text.tertiary, border: `1px solid ${t.surface.border}` }}
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
                  data-testid={`csa-info-pin-${i}`}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handlePinInput(i, e.target.value)}
                  onKeyDown={e => handlePinKeyDown(i, e)}
                  onPaste={handlePinPaste}
                  onFocus={() => pinRefs.current[i]?.select()}
                  className="flex-1 max-w-10 h-11 md:max-w-12 md:h-14 rounded-xl text-center text-lg md:text-xl font-bold transition-all caret-transparent outline-none"
                  style={{
                    background: digit ? t.accent.bg : t.input.bg,
                    border: `1px solid ${digit ? t.accent.border : t.input.border}`,
                    color: digit ? t.accent.text : t.input.text,
                  }}
                />
              ))}
            </div>
            <p className="text-[9px] md:text-[10px] text-center mt-1.5 md:mt-2" style={{ color: t.text.quaternary }}>
              Utilisez les fleches gauche/droite pour naviguer entre les chiffres
            </p>

            {credMsg && <Toast message={credMsg.text} type={credMsg.type} testid="csa-info-cred-message" />}

            <button
              data-testid="csa-info-save-password-btn"
              onClick={savePassword}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2 md:py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60"
              style={boutonStyle}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
