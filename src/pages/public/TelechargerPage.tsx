import { useEffect } from 'react';
import { getThemeTokens } from '../../lib/themeTokens';
import CentreTelechargement from '../../components/telechargement/CentreTelechargement';

/**
 * LA PAGE PUBLIQUE /telecharger. Accessible SANS connexion.
 *
 * POURQUOI ELLE EST MONTEE A LA PLACE DE <App />, et non a l'interieur. src/main.tsx la
 * choisit avant tout, comme il le fait deja pour l'apercu de site. App n'est donc jamais
 * monte : ni detection de role, ni resolution de domaine, ni fenetre de connexion. La
 * connexion est physiquement inatteignable depuis cette page — c'est la lecture la plus
 * stricte de la regle du CLAUDE.md sur la landing : on ne la modifie pas, on ne la gate
 * pas, on ne passe simplement pas par elle.
 *
 * LE DEVOILEMENT EST A NOTRE CHARGE. src/index.css:14 pose #root { opacity: 0 }, et la
 * classe app-ready qui le revele n'est ajoutee que par ThemeProvider, AppStatusScreens,
 * CompanySitePage et SitePreviewEntry. Aucun de ces quatre n'est monte ici : sans la ligne
 * ci-dessous, la page serait INVISIBLE — rendue, correcte, et invisible. Aucune erreur ne
 * le signalerait. Meme geste qu'en SitePreviewEntry.tsx:29.
 *
 * LES COULEURS VIENNENT D'UNE FONCTION PURE. getThemeTokens n'est pas un hook : il ne lit
 * aucun contexte et fonctionne donc sans ThemeProvider, qui leverait ici. On fige le theme
 * sombre : une page publique n'a pas d'utilisateur, donc pas de preference enregistree.
 */
export default function TelechargerPage() {
  useEffect(() => {
    document.getElementById('root')?.classList.add('app-ready');
    document.title = 'Telecharger Talvex';
  }, []);

  const t = getThemeTokens('dark');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: t.main.bg,
        padding: '48px 20px 64px',
        fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1040, margin: '0 auto', marginBottom: 34 }}>
        <img
          src="/talixy/logo-talvex.png"
          alt="Talvex"
          style={{ height: 38, width: 'auto', objectFit: 'contain' }}
        />
      </div>

      <CentreTelechargement tokens={t} />

      <div
        style={{
          maxWidth: 1040, margin: '40px auto 0',
          color: t.label.muted, fontSize: 12, lineHeight: 1.6,
        }}
      >
        <p style={{ margin: 0 }}>
          Talvex pour Windows n'est pas encore signe numeriquement. Au premier lancement,
          Windows peut afficher un avertissement SmartScreen : choisissez « Informations
          complementaires », puis « Executer quand meme ».
        </p>
      </div>
    </div>
  );
}
