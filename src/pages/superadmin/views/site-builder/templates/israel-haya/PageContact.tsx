import { directionDe, etiquetteLangue, type Langue } from './langue';
import { textesDe } from './textes';
import {
  COORDONNEES, COORDONNEES_PROVISOIRES, HORAIRES,
  adresseComplete, coordonneesActives, lienCourriel, lienTelephone, lienWhatsApp,
} from './coordonnees';
import FormulaireContact from './FormulaireContact';
import { corpsPage, encadre, OR, paragraphe, titreEncadre, titrePage, zonePage } from './stylePages';

/**
 * « CONTACT » — les trois canaux qui fonctionnent, et un formulaire qui ne ment pas.
 *
 * Le courriel, le telephone et WhatsApp sont les trois canaux du site, et ils se presentent
 * AVANT le formulaire : le chemin qui marchera est celui qu'on montre en premier. Le
 * formulaire, lui, n'envoie rien et le dit (voir FormulaireContact).
 *
 * Toutes les coordonnees viennent de `coordonnees.ts` et sont PROVISOIRES. Tant qu elles le
 * sont, elles sont AFFICHEES MAIS INERTES : ni lien, ni bouton, ni cible tactile. Un bandeau
 * qui previent en texte ne desarme pas le bouton WhatsApp juste a cote, et un numero israelien
 * de demonstration n'est pas un numero libre — Israel n'a aucune plage reservee aux fictions.
 * Le jour ou les vraies coordonnees arriveront, `COORDONNEES_PROVISOIRES` passera a false dans
 * `coordonnees.ts` et les trois canaux deviendront cliquables sans que cette page bouge.
 *
 * Les numeros et l'adresse sont forces en LTR : un numero de telephone ou une adresse latine
 * dans un paragraphe hebreu part sinon a l'envers, segment par segment.
 */

export default function PageContact({ langue }: { langue: Langue }) {
  const T = textesDe(langue).contact;
  const jours = textesDe(langue).contact;

  const actives = coordonneesActives();

  /**
   * Une coordonnee. Cliquable seulement si elle est vraie ; sinon un simple texte, qui garde
   * exactement la meme apparence pour que la maquette reste lisible telle qu elle sera.
   */
  const canal = (
    cible: string,
    testid: string,
    style: React.CSSProperties,
    contenu: React.ReactNode,
    options: { externe?: boolean; ltr?: boolean } = {},
  ) => {
    const commun = { 'data-testid': testid, dir: options.ltr ? ('ltr' as const) : undefined };
    if (!actives) {
      return (
        <span
          {...commun}
          data-ih-inerte=""
          title={T.avertissementProvisoire}
          style={{ ...style, cursor: 'default' }}
        >
          {contenu}
        </span>
      );
    }
    return (
      <a
        {...commun}
        href={cible}
        {...(options.externe ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        style={style}
      >
        {contenu}
      </a>
    );
  };

  const ligne = (libelle: string, contenu: React.ReactNode) => (
    <div style={{ display: 'grid', gap: 3 }}>
      <span style={{ fontSize: 12, letterSpacing: '0.06em', color: 'rgba(238,231,219,0.6)' }}>{libelle}</span>
      <span style={{ fontSize: 'clamp(0.95rem, 1.7vw, 1.05rem)' }}>{contenu}</span>
    </div>
  );

  return (
    <div
      data-testid="ih-page-contact"
      dir={directionDe(langue)}
      lang={etiquetteLangue(langue)}
      style={zonePage}
      tabIndex={0}
    >
      <div style={corpsPage}>
        <h1 style={titrePage}>{T.titre}</h1>
        <p style={paragraphe}>{T.chapeau}</p>

        {COORDONNEES_PROVISOIRES && (
          <p
            data-testid="ih-contact-provisoire"
            style={{
              marginBlockStart: 'clamp(20px, 4vh, 32px)',
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(232,205,147,0.09)',
              border: '1px dashed rgba(232,205,147,0.4)',
              fontSize: 12.5,
              lineHeight: 1.7,
              color: 'rgba(238,231,219,0.88)',
            }}
          >
            {T.avertissementProvisoire}
          </p>
        )}

        <section
          style={{
            marginBlockStart: 'clamp(24px, 5vh, 40px)',
            display: 'grid',
            gap: 'clamp(16px, 3vw, 26px)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          }}
        >
          {ligne(T.email, canal(lienCourriel(), 'ih-lien-email',
            { ...lienTactile, wordBreak: 'break-all' }, COORDONNEES.email))}

          {ligne(T.telephone, canal(lienTelephone(), 'ih-lien-telephone',
            lienTactile, COORDONNEES.telephoneAffiche, { ltr: true }))}

          {ligne(T.adresse, (
            <span dir="ltr" style={{ display: 'inline-block', color: 'rgba(238,231,219,0.86)' }}>
              {adresseComplete()}
            </span>
          ))}

          {ligne(T.whatsapp, canal(lienWhatsApp(), 'ih-lien-whatsapp',
            boutonWhatsApp, T.boutonWhatsApp, { externe: true }))}
        </section>

        <section style={encadre}>
          <h2 style={titreEncadre}>{T.horaires}</h2>
          <dl style={{ margin: '0.9em 0 0', display: 'grid', gap: 7 }}>
            {HORAIRES.map(c => (
              <div key={c.cle} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: '0.95rem' }}>
                <dt style={{ color: 'rgba(238,231,219,0.8)' }}>{jours[c.cle]}</dt>
                <dd style={{ margin: 0, color: c.heures ? CREME_DOUX : 'rgba(238,231,219,0.55)' }} dir={c.heures ? 'ltr' : undefined}>
                  {c.heures ?? T.ferme}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section style={{ marginBlockStart: 'clamp(36px, 7vh, 64px)' }}>
          <h2 style={{ ...titrePage, fontSize: 'clamp(1.4rem, 3.4vw, 2rem)' }}>
            {textesDe(langue).formulaire.titre}
          </h2>
          <div style={{ marginBlockStart: 'clamp(18px, 3vh, 28px)' }}>
            <FormulaireContact langue={langue} />
          </div>
        </section>
      </div>
    </div>
  );
}

/*
 * LE COURRIEL ET LE TELEPHONE SONT CE QU'ON VIENT TOUCHER sur cette page, et c'etaient les
 * plus petites cibles du site : 22,0 px et 22,8 px de haut, soit la moitie du seuil. Un
 * lien de texte prend la hauteur de sa ligne ; il faut le lui dire autrement.
 */
const lienTactile: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  color: OR,
};

const CREME_DOUX = 'rgba(244,236,224,0.95)';

const boutonWhatsApp: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  paddingInline: 18,
  borderRadius: 999,
  border: '1px solid rgba(232,205,147,0.46)',
  background: 'rgba(232,205,147,0.12)',
  color: '#ffeccb',
  fontSize: '0.92rem',
  textDecoration: 'none',
};
