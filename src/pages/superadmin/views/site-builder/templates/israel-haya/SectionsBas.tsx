/**
 * LE SITE SOUS LE VOYAGE.
 *
 * Le voyage donne envie ; cette partie repond aux questions et mene a l'action. Elle est en
 * HTML ordinaire, sans 3D, sans video : elle doit fonctionner meme si tout le reste a echoue.
 *
 * ---------- CE QUI N'EST PAS INVENTE ----------
 *
 * Aucun tarif, aucune adresse, aucun numero, aucun temoignage. Sur un sujet spirituel, inventer
 * est le risque principal du projet : une prestation imaginaire engage la praticienne aupres de
 * gens qui viendront la chercher. Les champs a renseigner sont donc marques comme tels, en
 * clair, et le visiteur ne voit jamais un faux chiffre.
 */

interface Props {
  onReserver?: () => void;
  /** Mode secours : ni WebGL ni video. Cette partie porte alors tout le site. */
  seul?: boolean;
}

const OR = '#e8cd93';
const CREME = '#f4ece0';

const PRESTATIONS = [
  { titre: 'ייעוץ אישי', texte: 'פגישה אחת, לעומק, סביב שאלה שמעסיקה אתכם.' },
  { titre: 'ליווי מתמשך', texte: 'סדרת מפגשים, לאורך תקופה, עם מעקב בין הפגישות.' },
  { titre: 'שאלה אחת', texte: 'תשובה כתובה ומנומקת לשאלה ממוקדת אחת.' },
];

export default function SectionsBas({ onReserver, seul }: Props) {
  return (
    <div
      dir="rtl"
      lang="he"
      style={{
        background: 'linear-gradient(to bottom, #070a16 0%, #0d1326 40%, #121a31 100%)',
        color: CREME,
        fontFamily: '"Heebo", system-ui, sans-serif',
        paddingBlock: 'clamp(56px, 12vh, 140px)',
        paddingInline: 'clamp(20px, 6vw, 96px)',
      }}
    >
      {seul && (
        <header style={{ maxWidth: '38ch', marginInline: 'auto', textAlign: 'center', marginBottom: 'clamp(40px, 8vh, 90px)' }}>
          <h1 style={{ ...titre, fontSize: 'clamp(2.4rem, 7vw, 4.4rem)', margin: 0 }}>ישראל חיה</h1>
          <p style={{ margin: '0.6em 0 0', color: 'rgba(238,231,219,0.75)' }}>מסע הנשמה</p>
        </header>
      )}

      <section style={{ maxWidth: 1040, marginInline: 'auto' }}>
        <h2 style={{ ...titre, fontSize: 'clamp(1.7rem, 4vw, 2.7rem)', margin: 0 }}>מה אפשר לעשות יחד</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'clamp(14px, 2.5vw, 26px)',
            marginTop: 'clamp(22px, 4vh, 40px)',
          }}
        >
          {PRESTATIONS.map(p => (
            <article key={p.titre} style={carte}>
              <h3 style={{ margin: 0, fontSize: '1.12rem', color: OR, fontWeight: 400 }}>{p.titre}</h3>
              <p style={{ margin: '0.6em 0 0', fontSize: '0.94rem', lineHeight: 1.75, color: 'rgba(238,231,219,0.74)' }}>
                {p.texte}
              </p>
            </article>
          ))}
        </div>
        {/* Dit au visiteur, pas cache dans un commentaire. */}
        <p style={{ marginTop: 18, fontSize: 12, color: 'rgba(238,231,219,0.45)' }}>
          פרטי המחיר, המשך והמקום יתווספו לאחר אישור המטפלת.
        </p>
      </section>

      <section style={{ maxWidth: 1040, marginInline: 'auto', marginTop: 'clamp(48px, 10vh, 110px)' }}>
        <h2 style={{ ...titre, fontSize: 'clamp(1.7rem, 4vw, 2.7rem)', margin: 0 }}>על המספרים</h2>
        <p style={{ maxWidth: '46ch', margin: '0.8em 0 0', lineHeight: 1.85, color: 'rgba(238,231,219,0.78)' }}>
          המספרים שעל האתר מחושבים בשיטה נומרולוגית מודרנית, מתוך תאריך הלידה. זו אינה גימטריה,
          ואינה מסורת יהודית עתיקה. ההבחנה הזו חשובה, ולכן היא כתובה כאן ולא מוסתרת.
        </p>
      </section>

      <section
        style={{
          maxWidth: 760,
          marginInline: 'auto',
          marginTop: 'clamp(56px, 12vh, 130px)',
          textAlign: 'center',
          padding: 'clamp(28px, 5vw, 56px)',
          borderRadius: 22,
          background: 'rgba(232,205,147,0.055)',
          border: '1px solid rgba(232,205,147,0.2)',
        }}
      >
        <h2 style={{ ...titre, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', margin: 0 }}>לקביעת פגישה</h2>
        <p style={{ margin: '0.7em auto 0', maxWidth: '34ch', lineHeight: 1.8, color: 'rgba(238,231,219,0.78)' }}>
          השאירו פרטים ונחזור אליכם. אפשר גם פשוט לשאול שאלה.
        </p>
        <button type="button" onClick={() => onReserver?.()} data-testid="ih-reserver" style={bouton}>
          אני רוצה לקבוע
        </button>
      </section>

      <footer
        style={{
          maxWidth: 1040,
          marginInline: 'auto',
          marginTop: 'clamp(48px, 10vh, 110px)',
          paddingTop: 24,
          borderTop: '1px solid rgba(232,205,147,0.14)',
          fontSize: 12,
          lineHeight: 1.9,
          color: 'rgba(238,231,219,0.45)',
        }}
      >
        <p style={{ margin: 0 }}>ישראל חיה · ייעוץ אישי</p>
        <p style={{ margin: 0 }}>התמונות והסרטונים באתר נוצרו באמצעות בינה מלאכותית.</p>
        <p style={{ margin: 0 }}>האתר אינו מהווה ייעוץ רפואי, משפטי או פיננסי.</p>
      </footer>
    </div>
  );
}

const titre: React.CSSProperties = {
  fontFamily: '"Frank Ruhl Libre", Georgia, serif',
  fontWeight: 300,
  color: CREME,
  textWrap: 'balance',
};

const carte: React.CSSProperties = {
  padding: 'clamp(18px, 2.6vw, 28px)',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.035)',
  border: '1px solid rgba(232,205,147,0.16)',
  minWidth: 0,
};

const bouton: React.CSSProperties = {
  marginTop: 'clamp(20px, 3.5vh, 34px)',
  padding: '13px 32px',
  borderRadius: 999,
  border: '1px solid rgba(232,205,147,0.5)',
  background: 'linear-gradient(180deg, rgba(232,205,147,0.24), rgba(184,137,60,0.12))',
  color: '#ffeccb',
  fontSize: 15,
  fontFamily: 'inherit',
  letterSpacing: '0.04em',
  cursor: 'pointer',
};
