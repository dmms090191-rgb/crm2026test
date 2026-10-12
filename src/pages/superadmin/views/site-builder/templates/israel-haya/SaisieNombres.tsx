import { useState } from 'react';
import { calculer, salutation, themeDe, type Resultat } from './numerologie';

/**
 * LA SAISIE — prenom et date de naissance.
 *
 * ---------- TROIS HONNETETES, ET ELLES SONT DANS LE CODE ----------
 *
 * 1. LE RESULTAT EST ETIQUETE. Tant que la methode de la praticienne n'est pas fournie, le
 *    bandeau le dit au visiteur, en hebreu, avant le nombre. On ne presente jamais un calcul
 *    moderne comme un enseignement traditionnel.
 *
 * 2. LE PRENOM N'ENTRE DANS AUCUN CALCUL. Il sert a s'adresser a la personne, rien de plus.
 *    Calculer sur les lettres d'un prenom serait de la guematria, et le projet demande
 *    explicitement de ne pas confondre les deux.
 *
 * 3. RIEN NE PART NULLE PART. Aucun envoi, aucun stockage, aucun journal. Le calcul se fait
 *    dans la page et disparait avec elle. C'est ecrit sous le formulaire, parce qu'une donnee
 *    de naissance est une donnee personnelle et que le visiteur a le droit de le savoir.
 *
 * Les champs sont du HTML natif : un clavier de telephone s'ouvre correctement, un lecteur
 * d'ecran les annonce, et la navigation au clavier fonctionne sans qu'on ait rien a ecrire.
 */

interface Props {
  /** Appele quand un nombre sort, pour que la scene 3D l'affiche. */
  onResultat: (nombre: number | null) => void;
}

const OR = '#e8cd93';

export default function SaisieNombres({ onResultat }: Props) {
  const [prenom, setPrenom] = useState('');
  const [date, setDate] = useState('');
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [erreur, setErreur] = useState('');

  /**
   * LE CALCUL NE PASSE PAS PAR UNE SOUMISSION DE FORMULAIRE, et c'est delibere.
   *
   * L'apercu du module Sites bloque toutes les soumissions, en phase de capture et avec
   * stopPropagation : `document.addEventListener('submit', blockSubmit, true)` dans
   * SitePreviewEntry. C'est une protection saine — un apercu ne doit rien envoyer — mais elle
   * rend tout bouton de type submit inerte a l'interieur. Mesure a l'appui : ni le clic ni un
   * requestSubmit() n'atteignaient le gestionnaire.
   *
   * Comme le calcul est entierement local et n'envoie rien, il n'avait de toute facon aucune
   * raison de passer par la. Le bouton agit directement. Le formulaire reste, pour que la
   * touche Entree fonctionne hors apercu et pour l'accessibilite.
   */
  const soumettre = (e?: { preventDefault: () => void }) => {
    e?.preventDefault();
    setErreur('');
    const [a, m, j] = date.split('-').map(Number);
    const r = calculer({ jour: j, mois: m, annee: a });
    if (!r) {
      setErreur('תאריך לא תקין');
      setResultat(null);
      onResultat(null);
      return;
    }
    setResultat(r);
    onResultat(r.nombre);
  };

  const nom = salutation(prenom);
  const theme = resultat ? themeDe(resultat.nombre) : null;

  return (
    <div
      dir="rtl"
      lang="he"
      style={{
        pointerEvents: 'auto',
        width: 'min(92vw, 440px)',
        padding: 'clamp(18px, 3vw, 26px)',
        borderRadius: 18,
        background: 'rgba(10, 14, 30, 0.62)',
        border: '1px solid rgba(232, 205, 147, 0.22)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        fontFamily: '"Heebo", system-ui, sans-serif',
      }}
    >
      {!resultat ? (
        <form onSubmit={soumettre} style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, letterSpacing: '0.06em', color: 'rgba(238,231,219,0.7)' }}>שם פרטי</span>
            <input
              type="text"
              value={prenom}
              onChange={e => setPrenom(e.target.value)}
              data-testid="ih-prenom"
              data-ih-champ
              autoComplete="given-name"
              style={champ}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, letterSpacing: '0.06em', color: 'rgba(238,231,219,0.7)' }}>תאריך לידה</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              name="naissance"
              data-testid="ih-date"
              data-ih-champ
              style={{ ...champ, direction: 'ltr', textAlign: 'start' }}
            />
          </label>

          {erreur && <p style={{ margin: 0, fontSize: 13, color: '#f0a8a8' }}>{erreur}</p>}

          <button type="button" onClick={() => soumettre()} data-testid="ih-calculer" style={bouton}>
            גלו את המספר
          </button>

          <p style={{ margin: 0, fontSize: 11, lineHeight: 1.6, color: 'rgba(238,231,219,0.5)' }}>
            החישוב מתבצע בדפדפן שלכם בלבד. שום פרט אינו נשמר ואינו נשלח לשום מקום.
          </p>
        </form>
      ) : (
        <div style={{ display: 'grid', gap: 12, textAlign: 'center' }} data-testid="ih-resultat">
          {resultat.estDemonstration && (
            <p
              data-testid="ih-demo"
              style={{
                margin: 0, padding: '8px 12px', borderRadius: 10,
                background: 'rgba(232,205,147,0.10)',
                border: '1px solid rgba(232,205,147,0.30)',
                fontSize: 11, lineHeight: 1.6, color: OR,
              }}
            >
              הדגמה בלבד. שיטת החישוב הסופית טרם הוגדרה, והמספר כאן אינו ייעוץ.
            </p>
          )}

          {nom && (
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(238,231,219,0.75)' }}>{nom},</p>
          )}

          <div style={{ fontSize: 'clamp(3.4rem, 9vw, 5rem)', lineHeight: 1, color: OR, fontFamily: '"Frank Ruhl Libre", Georgia, serif', fontVariantNumeric: 'tabular-nums' }}>
            {resultat.nombre}
          </div>

          {theme && (
            <>
              <p style={{ margin: 0, fontSize: 17, color: '#f4ece0' }}>{theme.titre}</p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.75, color: 'rgba(238,231,219,0.78)' }}>{theme.texte}</p>
            </>
          )}

          {/* Le calcul est montre : un nombre qu'on ne peut pas refaire a la main ne vaut rien. */}
          <details style={{ textAlign: 'start' }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, color: 'rgba(238,231,219,0.6)' }}>איך מחושב המספר</summary>
            <ul style={{ margin: '8px 0 0', paddingInlineStart: 18, fontSize: 12, lineHeight: 1.9, color: 'rgba(238,231,219,0.65)', direction: 'ltr', textAlign: 'start' }}>
              {resultat.etapes.map(e => <li key={e}>{e}</li>)}
            </ul>
          </details>

          <button
            type="button"
            onClick={() => { setResultat(null); onResultat(null); }}
            style={{ ...bouton, background: 'transparent', border: '1px solid rgba(232,205,147,0.35)', color: OR }}
          >
            חישוב נוסף
          </button>
        </div>
      )}
    </div>
  );
}

const champ: React.CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  borderRadius: 10,
  border: '1px solid rgba(232,205,147,0.24)',
  background: 'rgba(255,255,255,0.05)',
  color: '#f4ece0',
  fontSize: 15,
  fontFamily: 'inherit',
  // PAS de `outline: none` ici : un style en ligne ne peut pas porter d'etat, donc le retirer
  // etait retirer l'anneau de focus pour de bon. Mesure : outlineStyle 'none', boxShadow 'none'
  // et bordure inchangee sur le champ focalise — un visiteur au clavier ne voyait plus ou il
  // etait. L'anneau est maintenant une regle :focus-visible sur [data-ih-champ], posee dans
  // IsraelHayaSite.
};

const bouton: React.CSSProperties = {
  padding: '12px 18px',
  borderRadius: 999,
  border: '1px solid rgba(232,205,147,0.45)',
  background: 'linear-gradient(180deg, rgba(232,205,147,0.22), rgba(184,137,60,0.12))',
  color: '#ffeccb',
  fontSize: 14,
  fontFamily: 'inherit',
  letterSpacing: '0.04em',
  cursor: 'pointer',
};
