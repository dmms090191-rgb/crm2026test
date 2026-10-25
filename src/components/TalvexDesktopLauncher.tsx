import { useState, useRef, useCallback, useEffect } from 'react';
import { Mail, ArrowRight, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePinInput } from './hooks/usePinInput';
import TalvexDesktopQuickEmails from './TalvexDesktopQuickEmails';
import { CYAN, CYAN_CLAIR, BLANC, MIST, DUSK, EDGE, TRAIT, ABYSSE, NUIT, DANGER } from '../lib/talvexDesktopPalette';

/**
 * LE LAUNCHER DE L'APPLICATION DE BUREAU. Rendu par le seul runtime `desktop`
 * (src/App.tsx, branche estDesktop()).
 *
 * POURQUOI UN COMPOSANT A PART, et pas PwaLoginPage recolore : decision de David du
 * 25/10/2026. PwaLoginPage sert la PWA MOBILE et ne doit pas deriver ; la coloriser
 * aurait transforme la PWA en launcher de bureau par petites touches, sans que personne
 * ne decide jamais de le faire. La separation est VISUELLE ET STRUCTURELLE.
 *
 * COMPOSITION, refonte du 25/10/2026. La premiere version posait une carte blanche au
 * milieu d'un fond clair : David l'a refusee, et il avait raison — ca se lisait comme une
 * page web avec une modale, pas comme un logiciel qu'on installe. Le parti pris est
 * desormais : PLEIN ECRAN, deux zones FONDUES l'une dans l'autre, aucun rectangle
 * flottant. A gauche la marque, a droite l'acces. Rien ne ressemble a une boite.
 *
 * CE QUI EST PARTAGE : le client Supabase, usePinInput, et la forme exacte de
 * l'authentification — inchangee par la refonte. On evite de dupliquer la LOGIQUE
 * METIER, pas de construire une vraie interface de bureau.
 *
 * CE QUI N'EST PAS REPRIS, deliberement : PwaLoginPage:115 ecrit le code a six chiffres
 * EN CLAIR dans user_metadata apres chaque connexion. C'est l'une des douze ecritures que
 * le chantier de securite doit retirer ; ce launcher n'en ajoute pas une treizieme.
 *
 * PALETTE : Talixy (src/talixy/talixy.css), assombrie pour la profondeur, comme David l'a
 * autorise. Le logotype officiel porte son "Tal" en BLANC : sur un fond clair il
 * disparait, et il ne reste que "vex". Le fond profond n'est donc pas un gout, c'est ce
 * qui rend la marque lisible.
 */

/* La palette vit dans src/lib/talvexDesktopPalette.ts : les panneaux des emails rapides
   la lisent aussi, et deux jeux de constantes auraient diverge a la premiere retouche. */

/**
 * RECADRAGE DU LOGOTYPE. public/talixy/logo-talvex.png porte, malgre son nom, un WebP
 * de 1024 x 1024 — et le logotype n'y occupe qu'une bande de 770 x 200 px au centre :
 * 413 px de transparence au-dessus, 411 px en dessous (mesure ffmpeg, alpha > 24).
 *
 * C'est tout le probleme de la premiere version : poser height:100px sur cette image ne
 * donne que 19,5 px de logotype visible, les 80 % restants etant du vide. Le logo ne
 * paraissait pas petit, il ETAIT petit. On recadre donc la bande utile au lieu
 * d'agrandir l'image.
 *
 * Les pourcentages ci-dessous se rapportent tous a la LARGEUR du cadre — y compris
 * marginTop, dont le pourcentage se refere en CSS a la largeur du bloc conteneur, pas a
 * sa hauteur. Une seule dimension est donc a piloter : la largeur du cadre.
 */
const LOGO = { src: 1024, x: 128, y: 413, w: 770, h: 200 };
const LOGO_LARGEUR_IMG = `${(100 * LOGO.src / LOGO.w).toFixed(3)}%`;   // 133.0 %
const LOGO_DECALAGE_X = `${(-100 * LOGO.x / LOGO.w).toFixed(3)}%`;      // -16.6 %
const LOGO_DECALAGE_Y = `${(-100 * LOGO.y / LOGO.w).toFixed(3)}%`;      // -53.6 %

const LAST_EMAIL_KEY = 'crm_last_login_email';

interface Props {
  onLogin: () => void;
}

export default function TalvexDesktopLauncher({ onLogin }: Props) {
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem(LAST_EMAIL_KEY) || ''; } catch { return ''; }
  });
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [monte, setMonte] = useState(false);
  const [codeVisible, setCodeVisible] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const validerRef = useRef<() => void>(() => {});

  useEffect(() => {
    const t = setTimeout(() => setMonte(true), 60);
    return () => clearTimeout(t);
  }, []);

  const { digits, setDigits, pinRefs, handlePinInput, handlePinKeyDown, handlePinFocus } = usePinInput({
    onEnter: () => validerRef.current(),
  });

  // --- AUTHENTIFICATION : inchangee par la refonte visuelle ---
  const valider = useCallback(async () => {
    const code = digits.join('');
    if (!email || code.length !== 6) return;
    setEnCours(true);
    setErreur('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: code });
    if (error) {
      setEnCours(false);
      setErreur('Identifiants incorrects.');
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => pinRefs.current[0]?.focus(), 0);
      return;
    }
    try { localStorage.setItem(LAST_EMAIL_KEY, email); } catch { /* stockage indisponible */ }
    setEnCours(false);
    onLogin();
  }, [email, digits, onLogin, setDigits, pinRefs]);

  validerRef.current = valider;
  useEffect(() => { emailRef.current?.focus(); }, []);

  const code = digits.join('');
  const pret = !!email && code.length === 6 && !enCours;

  // Apparition en cascade : chaque bloc entre legerement apres le precedent. Une seule
  // fois, a l'ouverture. Un logiciel professionnel ne rejoue pas son intro.
  const entree = (rang: number) => ({
    opacity: monte ? 1 : 0,
    transform: monte ? 'translateY(0)' : 'translateY(14px)',
    transition: `opacity 520ms ease ${rang * 90}ms, transform 620ms cubic-bezier(.22,1,.36,1) ${rang * 90}ms`,
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${NUIT} 0%, ${ABYSSE} 48%, #080D13 100%)`,
        color: BLANC,
        fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      }}
    >
      <style>{`
        @keyframes tvx-derive {
          0%   { transform: translate3d(-6%, -4%, 0) scale(1); }
          50%  { transform: translate3d(6%, 5%, 0) scale(1.08); }
          100% { transform: translate3d(-6%, -4%, 0) scale(1); }
        }
        @keyframes tvx-souffle {
          0%, 100% { opacity: 0.30; }
          50%      { opacity: 0.52; }
        }
        @keyframes tvx-balayage {
          0%   { transform: translateY(-110%); }
          100% { transform: translateY(110%); }
        }
        .tvx-champ:focus {
          border-color: ${CYAN} !important;
          background: rgba(0,188,212,0.06) !important;
          box-shadow: 0 0 0 1px ${CYAN}66, 0 0 22px -6px ${CYAN}99 !important;
        }
        .tvx-champ::placeholder { color: ${EDGE}; }
        /* LE REVELATEUR NATIF DE WEBVIEW2. Edge injecte de lui-meme un bouton « afficher le
           mot de passe » DANS chaque champ type="password" — visible le 25/10/2026 dans la
           6e case, ou il remplacait le chiffre. Et comme il appartient a SON champ, il ne
           revelait qu'un seul chiffre sur six. On le retire pour poser le notre, qui agit
           sur les six cases a la fois. ::-ms-clear part avec, pour la meme raison. */
        .tvx-pin::-ms-reveal,
        .tvx-pin::-ms-clear { display: none !important; width: 0 !important; height: 0 !important; }
        .tvx-agir:hover:not(:disabled) {
          box-shadow: 0 0 0 1px ${CYAN_CLAIR}, 0 10px 32px -8px ${CYAN}CC !important;
          transform: translateY(-1px);
        }
        @media (max-width: 980px) {
          .tvx-marque { display: none !important; }
          .tvx-acces  { flex: 1 1 100% !important; max-width: none !important; }
          .tvx-acces > div[aria-hidden] { display: none !important; }
        }
      `}</style>

      {/* ---------- DECOR : grille technique, halos, balayage ---------- */}
      {/* Grille : 2 % d'opacite. Elle ne se voit pas, elle se sent — c'est ce qui donne
          l'echelle et la rigueur d'un outil, sans jamais gener la lecture. */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage:
            `linear-gradient(${MIST}0D 1px, transparent 1px), linear-gradient(90deg, ${MIST}0D 1px, transparent 1px)`,
          backgroundSize: '52px 52px',
          maskImage: 'radial-gradient(120% 100% at 30% 40%, #000 20%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(120% 100% at 30% 40%, #000 20%, transparent 78%)',
        }}
      />
      {/* Halo cyan, lent. 34 secondes par cycle : perceptible seulement si on le cherche. */}
      <div
        aria-hidden
        style={{
          position: 'absolute', width: 900, height: 900, left: '-16%', top: '-26%',
          pointerEvents: 'none',
          background: `radial-gradient(circle, ${CYAN}26 0%, ${CYAN}0D 42%, transparent 68%)`,
          filter: 'blur(28px)',
          animation: 'tvx-derive 34s ease-in-out infinite, tvx-souffle 11s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute', width: 760, height: 760, right: '-14%', bottom: '-30%',
          pointerEvents: 'none',
          background: `radial-gradient(circle, ${DUSK}1F 0%, transparent 66%)`,
          filter: 'blur(34px)',
          animation: 'tvx-derive 44s ease-in-out infinite reverse',
        }}
      />

      {/* ---------- ZONE GAUCHE : LA MARQUE ---------- */}
      <section
        className="tvx-marque"
        style={{
          flex: '1 1 58%',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '0 clamp(48px, 7vw, 110px)',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* LE LOGO, en grand. L'element de marque du launcher, pas une vignette. */}
        <div style={{ ...entree(0), position: 'relative', alignSelf: 'flex-start' }}>
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: '-120% -22%',
              background: `radial-gradient(ellipse at center, ${CYAN}2E 0%, ${CYAN}0A 46%, transparent 72%)`,
              filter: 'blur(30px)', pointerEvents: 'none',
              animation: 'tvx-souffle 9s ease-in-out infinite',
            }}
          />
          {/* le cadre EST la bande utile : sa largeur pilote tout, sa hauteur suit */}
          <div
            style={{
              position: 'relative',
              width: 'clamp(320px, 36vw, 560px)',
              aspectRatio: `${LOGO.w} / ${LOGO.h}`,
              overflow: 'hidden',
              filter: `drop-shadow(0 12px 38px ${CYAN}40)`,
            }}
          >
            <img
              src="/talixy/logo-talvex.png"
              alt="Talvex"
              draggable={false}
              style={{
                display: 'block',
                // le preflight Tailwind impose img { max-width: 100% }, qui ecraserait la
                // largeur ci-dessous et tronquerait le haut du logotype : mesure du 25/10.
                maxWidth: 'none',
                width: LOGO_LARGEUR_IMG,
                height: 'auto',
                marginLeft: LOGO_DECALAGE_X,
                marginTop: LOGO_DECALAGE_Y,
              }}
            />
          </div>
        </div>

        <div
          style={{
            ...entree(1),
            marginTop: 26, display: 'flex', alignItems: 'center', gap: 16,
          }}
        >
          <span style={{ width: 54, height: 2, background: `linear-gradient(90deg, ${CYAN}, transparent)` }} />
          <span style={{ color: MIST, fontSize: 'clamp(15px, 1.35vw, 19px)', letterSpacing: '0.04em', fontWeight: 300 }}>
            Tout en un. Plus loin.
          </span>
        </div>

        {/* Trois lignes de statut. Elles disent ce qu'un logiciel dit de lui-meme :
            ce qu'il est, sur quoi il tourne, a quoi il est relie. */}
        <div style={{ ...entree(2), marginTop: 'clamp(42px, 7vh, 84px)', display: 'grid', gap: 13 }}>
          {[
            ['Plateforme', 'Windows'],
            ['Application', 'Talvex Desktop'],
            ['Connexion', 'Chiffree de bout en bout'],
          ].map(([cle, valeur]) => (
            <div key={cle} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12.5 }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: CYAN, boxShadow: `0 0 10px ${CYAN}` }} />
              <span style={{ color: EDGE, minWidth: 96, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 10.5 }}>
                {cle}
              </span>
              <span style={{ color: MIST }}>{valeur}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- ZONE DROITE : L'ACCES ---------- */}
      {/* Pas une carte : un panneau qui prend toute la hauteur et se fond dans le fond.
          La seule separation est un liseré vertical qui s'eteint a ses extremites. */}
      <section
        className="tvx-acces"
        style={{
          flex: '0 0 480px', maxWidth: 480,
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '0 clamp(40px, 3.6vw, 64px)',
          background: 'linear-gradient(180deg, rgba(174,184,199,0.045) 0%, rgba(174,184,199,0.015) 100%)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 1,
            background: `linear-gradient(180deg, transparent 0%, ${CYAN}4D 22%, ${EDGE}59 50%, ${CYAN}4D 78%, transparent 100%)`,
          }}
        />
        {/* une lueur qui descend lentement le long du liseré */}
        <div
          aria-hidden
          style={{
            position: 'absolute', left: -1, top: 0, width: 3, height: '26%',
            background: `linear-gradient(180deg, transparent, ${CYAN_CLAIR}, transparent)`,
            filter: 'blur(2px)',
            animation: 'tvx-balayage 9s ease-in-out infinite',
          }}
        />

        <div style={entree(1)}>
          <div style={{ color: BLANC, fontSize: 25, fontWeight: 600, letterSpacing: '-0.015em' }}>
            Connexion
          </div>
          <div style={{ color: EDGE, fontSize: 13, marginTop: 7 }}>
            Accedez a votre espace de travail.
          </div>
        </div>

        <label style={{ ...entree(2), display: 'block', marginTop: 38 }}>
          <span style={{ color: DUSK, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Adresse email
          </span>
          <div style={{ position: 'relative', marginTop: 11 }}>
            <Mail
              className="w-4 h-4"
              style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: EDGE }}
            />
            <input
              ref={emailRef}
              className="tvx-champ"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@entreprise.com"
              autoComplete="username"
              spellCheck={false}
              style={{
                width: '100%',
                padding: '11px 2px 11px 28px',
                border: 'none',
                borderBottom: `1px solid ${TRAIT}`,
                background: 'transparent',
                color: BLANC,
                fontSize: 15,
                outline: 'none',
                transition: 'border-color 180ms ease, box-shadow 180ms ease, background 180ms ease',
              }}
            />
          </div>
        </label>

        {/* LES TROIS BOUTONS, directement sous le champ email — meme position que sur la
            connexion web. Poses HORS du <label> a dessein : ce label n'a pas de htmlFor,
            il associe donc son premier champ imbrique, et un clic a l'interieur peut
            transferer le focus a ce champ. Un bouton « Gerer » qui, en plus d'ouvrir son
            panneau, ramene le curseur dans l'email est exactement le genre de detail
            qu'on ne remarque qu'a l'usage. L'ecart visuel est nul : c'est marginTop qui
            tient l'espacement, pas l'imbrication. */}
        <div style={entree(3)}>
          <TalvexDesktopQuickEmails email={email} onSelect={setEmail} />
        </div>

        <div style={{ ...entree(4), marginTop: 32 }}>
          <span style={{ color: DUSK, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Code a six chiffres
          </span>
          {/* Les six cases, puis l'oeil — qui n'appartient a AUCUNE case : il est pose
              apres elles, hors de leur groupe, et agit sur les six a la fois. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 13 }}>
            <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 0 }}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { pinRefs.current[i] = el; }}
                  className="tvx-champ tvx-pin"
                  /* Le seul effet de l'oeil : password <-> text sur LES SIX champs.
                     inputMode reste numeric dans les deux etats, donc le pave numerique et
                     la navigation automatique entre les cases ne changent pas. */
                  type={codeVisible ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handlePinInput(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  onFocus={() => handlePinFocus(i)}
                  style={{
                    flex: 1, minWidth: 0, height: 56,
                    textAlign: 'center', fontSize: 20, fontWeight: 600, color: BLANC,
                    borderRadius: 8,
                    border: `1px solid ${d ? CYAN + '99' : 'rgba(174,184,199,0.2)'}`,
                    background: d ? `${CYAN}14` : 'rgba(255,255,255,0.028)',
                    outline: 'none',
                    transition: 'border-color 180ms ease, background 180ms ease, box-shadow 180ms ease',
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCodeVisible((v) => !v)}
              aria-label={codeVisible ? 'Masquer le code' : 'Afficher le code'}
              aria-pressed={codeVisible}
              title={codeVisible ? 'Masquer le code' : 'Afficher le code'}
              style={{
                flexShrink: 0, width: 44, height: 56, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: codeVisible ? `${CYAN}14` : 'rgba(255,255,255,0.028)',
                border: `1px solid ${codeVisible ? CYAN + '99' : 'rgba(174,184,199,0.2)'}`,
                color: codeVisible ? CYAN_CLAIR : EDGE,
                cursor: 'pointer',
                transition: 'color 180ms ease, border-color 180ms ease, background 180ms ease',
              }}
              onMouseEnter={(e) => { if (!codeVisible) e.currentTarget.style.color = MIST; }}
              onMouseLeave={(e) => { if (!codeVisible) e.currentTarget.style.color = EDGE; }}
            >
              {codeVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {erreur && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              color: DANGER, fontSize: 12.5, marginTop: 20,
              paddingLeft: 2,
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erreur}</span>
          </div>
        )}

        <button
          type="button"
          onClick={valider}
          disabled={!pret}
          className="tvx-agir"
          style={{
            ...entree(5),
            marginTop: erreur ? 22 : 38,
            height: 52, width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            borderRadius: 9,
            border: 'none',
            cursor: pret ? 'pointer' : 'not-allowed',
            background: pret
              ? `linear-gradient(135deg, ${CYAN} 0%, #0098B3 100%)`
              : 'rgba(174,184,199,0.09)',
            color: pret ? '#04171C' : EDGE,
            fontSize: 14.5, fontWeight: 650, letterSpacing: '0.02em',
            boxShadow: pret ? `0 8px 26px -10px ${CYAN}E6` : 'none',
            transition: 'background 220ms ease, box-shadow 220ms ease, transform 140ms ease, color 220ms ease',
          }}
        >
          {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {enCours ? 'Connexion…' : 'Se connecter'}
          {!enCours && <ArrowRight className="w-4 h-4" />}
        </button>

        <div
          style={{
            ...entree(6),
            position: 'absolute', left: 'clamp(40px, 3.6vw, 64px)', bottom: 34,
            color: EDGE, fontSize: 11, letterSpacing: '0.04em',
          }}
        >
          Talvex Desktop · version 0.1.0
        </div>
      </section>
    </div>
  );
}
