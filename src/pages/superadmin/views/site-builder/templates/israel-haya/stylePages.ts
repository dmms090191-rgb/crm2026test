/**
 * LE STYLE COMMUN AUX PAGES « A PROPOS » ET « CONTACT ».
 *
 * Les deux pages partagent la meme armature parce qu'elles appartiennent au meme site : meme
 * nuit, meme or, meme typographie fine que le voyage. Ce qui change d'une page a l'autre, c'est
 * le contenu, pas le cadre.
 *
 * Le conteneur porte SON PROPRE defilement, comme le voyage : html, body et #root ont une
 * hauteur fixe dans Talvex, donc la fenetre ne defile jamais (voir useVoyage.ts).
 *
 * `paddingBlockStart` reserve la place de la barre de navigation, qui FLOTTE au-dessus du
 * contenu au lieu de le pousser. Sans cette reserve, le premier titre passerait dessous.
 *
 * Aucune propriete physique : tout est logique, donc tout se retourne en hebreu sans une ligne
 * de code de plus.
 */

export const OR = '#e8cd93';
export const CREME = '#f4ece0';
export const NUIT = '#070a16';

export const zonePage: React.CSSProperties = {
  height: '100%',
  minHeight: '100svh',
  overflowY: 'auto',
  overflowX: 'hidden',
  overflowAnchor: 'none',
  background: 'linear-gradient(to bottom, #070a16 0%, #0d1326 45%, #121a31 100%)',
  color: CREME,
  fontFamily: '"Heebo", system-ui, sans-serif',
};

export const corpsPage: React.CSSProperties = {
  maxWidth: 820,
  marginInline: 'auto',
  paddingInline: 'clamp(20px, 6vw, 72px)',
  /*
   * La reserve suit la hauteur MESUREE de la barre, publiee dans --ih-barre.
   *
   * Elle valait avant clamp(84px, 14vh, 128px), calcule dans son coin. Sur un ecran de
   * 568 px cela donnait 84 px — alors que la barre, repliee sur deux rangees, en mesurait
   * 128. Le titre « A propos » se retrouvait donc ENTIEREMENT derriere elle. Deux reserves
   * calculees separement finissent toujours par se contredire ; il n'en reste qu'une.
   */
  paddingBlockStart: 'calc(var(--ih-barre, 96px) + clamp(16px, 3vh, 36px))',
  paddingBlockEnd: 'clamp(56px, 12vh, 120px)',
};

export const titrePage: React.CSSProperties = {
  margin: 0,
  fontFamily: '"Frank Ruhl Libre", "David Libre", Georgia, serif',
  fontWeight: 300,
  fontSize: 'clamp(2rem, 5.5vw, 3.4rem)',
  lineHeight: 1.2,
  color: CREME,
  textWrap: 'balance',
};

export const sousTitrePage: React.CSSProperties = {
  margin: '0.5em 0 0',
  fontSize: 'clamp(0.95rem, 1.9vw, 1.12rem)',
  fontWeight: 300,
  color: OR,
  letterSpacing: '0.01em',
};

export const paragraphe: React.CSSProperties = {
  margin: '1.5em 0 0',
  fontSize: 'clamp(0.95rem, 1.7vw, 1.06rem)',
  lineHeight: 1.9,
  color: 'rgba(238,231,219,0.82)',
};

/** L'encadre des mentions : visible, jamais relegue en petit en bas de page. */
export const encadre: React.CSSProperties = {
  marginBlockStart: 'clamp(32px, 6vh, 56px)',
  padding: 'clamp(18px, 3vw, 28px)',
  borderRadius: 16,
  background: 'rgba(232,205,147,0.06)',
  border: '1px solid rgba(232,205,147,0.22)',
};

export const titreEncadre: React.CSSProperties = {
  margin: 0,
  fontSize: '0.78rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: OR,
  fontWeight: 400,
};
