import { useEffect, useState } from 'react';
import { ArrowDownToLine, X } from 'lucide-react';
import { chercherMiseAJour, VERSION_APPLICATION, type MiseAJourDisponible } from '../lib/miseAJour';

/*
 * ============== « UNE NOUVELLE VERSION EXISTE » ==============
 *
 * POURQUOI CE BANDEAU. Une application posee sur un appareil reste figee a la version du jour
 * ou on l'a installee. Le 25/10/2026, la premiere version Android ne demarrait pas : son
 * porteur n'avait aucun moyen d'apprendre qu'une correction existait, sinon en retournant de
 * lui-meme sur la page de telechargement. Ce bandeau ferme cet angle mort.
 *
 * POURQUOI IL N'UTILISE AUCUN THEME. Il est monte au plus haut niveau de l'application, donc
 * au-dessus de branches qui n'ont PAS de ThemeProvider — le launcher de bureau en est une, et
 * c'est delibere. Un useTheme ici leverait exactement comme il l'a fait dans PwaLoginPage.
 * Les couleurs sont donc ecrites en dur, dans la charte : encre, gris Talvex, cyan.
 *
 * CE QU'IL NE FAIT PAS. Il ne telecharge rien, n'installe rien, et n'insiste pas : un refus
 * vaut pour cette version-la, pas pour toujours. Rien ne s'affiche hors d'une application
 * installee, ni hors ligne, ni quand la version en ligne n'est pas plus recente.
 */

/** Une preference par appareil : « ne me redemande pas pour CETTE version ». */
const CLE_REFUS = 'talvex_maj_ignoree';

function dejaIgnoree(version: string): boolean {
  try {
    return localStorage.getItem(CLE_REFUS) === version;
  } catch {
    return false; // stockage refuse : on affiche, c'est le defaut utile
  }
}

function ignorer(version: string): void {
  try {
    localStorage.setItem(CLE_REFUS, version);
  } catch { /* sans consequence : le bandeau reviendra au prochain lancement */ }
}

export default function BandeauMiseAJour() {
  const [maj, setMaj] = useState<MiseAJourDisponible | null>(null);

  useEffect(() => {
    let vivant = true;
    chercherMiseAJour()
      .then((trouvee) => {
        if (!vivant || !trouvee) return;
        if (dejaIgnoree(trouvee.version)) return;
        setMaj(trouvee);
      })
      .catch(() => { /* chercherMiseAJour ne leve pas, mais on ne parie pas la-dessus */ });
    return () => { vivant = false; };
  }, []);

  if (!maj) return null;

  return (
    <div
      role="status"
      data-testid="bandeau-mise-a-jour"
      style={{
        position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 9999,
        maxWidth: 560, margin: '0 auto',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 12,
        background: '#1F2937', border: '1px solid #AEB8C7',
        boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: 650 }}>
          Talvex {maj.version} est disponible
        </div>
        <div style={{ color: '#AEB8C7', fontSize: 11.5, marginTop: 2 }}>
          Vous utilisez la version {VERSION_APPLICATION}.
        </div>
      </div>

      <a
        href={maj.url}
        download
        data-testid="bandeau-mise-a-jour-lien"
        style={{
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
          height: 36, padding: '0 14px', borderRadius: 9, textDecoration: 'none',
          background: '#00BCD4', color: '#07121F', fontSize: 13, fontWeight: 650,
        }}
      >
        <ArrowDownToLine className="w-3.5 h-3.5" />
        Mettre a jour
      </a>

      <button
        type="button"
        aria-label="Ignorer cette version"
        data-testid="bandeau-mise-a-jour-fermer"
        onClick={() => { ignorer(maj.version); setMaj(null); }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
          background: 'transparent', border: '1px solid #AEB8C7', color: '#AEB8C7',
        }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
