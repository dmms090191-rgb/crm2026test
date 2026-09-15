/**
 * BANC D'ESSAI de la boutique 3D — page de DEVELOPPEMENT, jamais servie en production.
 *
 * Pourquoi il existe : la vraie page Boutiques vit derriere l'authentification Supabase et le
 * panel Societe. On ne peut donc pas verifier le montage du moteur sans se connecter avec un
 * vrai compte — et sans ecrire dans la vraie base. Cette page monte `BoutiqueVue3D` avec une
 * boutique FICTIVE, dans un cadre qui reproduit la mise en page du tableau de bord : barre
 * laterale, en-tete, et la colonne ou la scene atterrit.
 *
 * Elle sert surtout a verifier ce qu'aucun test ne peut voir autrement :
 *   - la boutique reste dans sa colonne et ne couvre ni la barre laterale ni l'en-tete ;
 *   - la couche video reste alignee sur le canvas ;
 *   - le THEME GLASS ne deplace pas le panneau de la boutique — c'est le seul theme qui pose
 *     `html[data-theme="glass"] nav { position: relative; z-index: 20 }`, et le panneau EST un
 *     <nav>. Le selecteur de theme en haut permet de basculer d'un clic.
 *
 * Elle n'est atteignable que par /boutique3d.html en developpement. Aucun lien n'y mene, et
 * elle n'est referencee par aucune route de l'application.
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import BoutiqueVue3D from '../src/boutique3d/BoutiqueVue3D';
import type { Boutique } from '../src/pages/admin/views/boutiques/boutiqueTypes';
import '../src/index.css';

/** Une boutique fictive : aucune requete n'est faite avec cet identifiant. */
const BOUTIQUE_TEST: Boutique = {
  id: '00000000-0000-4000-8000-0000000000a1',
  company_id: '00000000-0000-4000-8000-0000000000c1',
  name: 'Johanna Netanya (banc d’essai)',
  template_key: 'johanna-mode-luxe',
  status: 'active',
  created_at: new Date().toISOString(),
};

const THEMES = ['dark', 'glass', 'beige', 'highlevel_light'];

function Banc() {
  const [theme, setTheme] = useState('dark');
  // Ouvrir / fermer : c'est le cycle que la vraie page fait vivre au moteur, et qu'il n'a
  // jamais connu dans Johanna 2 ou il est monte une fois par chargement de page.
  const [ouverte, setOuverte] = useState(true);
  const poser = (t: string) => {
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: '#14121a', color: '#e8e2f0' }}>
      <aside style={{ flex: '0 0 280px', background: '#1c1926', borderRight: '1px solid #2c2838',
                      padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 15, letterSpacing: '.12em', color: '#b9a8e8' }}>TALVEX</div>
        {['Tableau de bord', 'CRM', 'Agenda', 'Boutique', 'Chat'].map((l) => (
          <div key={l} style={{ fontSize: 12, padding: '7px 9px', borderRadius: 7,
                                background: l === 'Boutique' ? '#2a2536' : 'transparent',
                                color: l === 'Boutique' ? '#fff' : '#8b849c' }}>{l}</div>
        ))}
      </aside>

      <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{ flex: '0 0 64px', display: 'flex', alignItems: 'center', gap: 12,
                         padding: '0 20px', background: '#1c1926', borderBottom: '1px solid #2c2838' }}>
          <strong>Banc d’essai boutique 3D</strong>
          <span style={{ color: '#8b849c', fontSize: 12 }}>thème :</span>
          {THEMES.map((t) => (
            <button key={t} type="button" onClick={() => poser(t)}
              data-testid={`theme-${t}`}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                       border: '1px solid #3a3448',
                       background: theme === t ? '#4c3f6b' : 'transparent', color: '#e8e2f0' }}>
              {t}
            </button>
          ))}
        </header>

        {/* La colonne du tableau de bord. `<main>` de Talvex n'est PAS positionne hors theme
            glass : on reproduit donc exactement cette situation, sans `position: relative`,
            pour que le banc revele le defaut si le cadre ne se defend pas tout seul. */}
        <main data-testid="hote-boutique"
              style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: 24 }}>
          {ouverte
            ? <BoutiqueVue3D boutique={BOUTIQUE_TEST} onFermer={() => setOuverte(false)} />
            : <button type="button" data-testid="rouvrir" onClick={() => setOuverte(true)}
                style={{ padding: "10px 18px", borderRadius: 8, cursor: "pointer" }}>Rouvrir la boutique</button>}
        </main>
      </div>
    </div>
  );
}

// `ThemeProvider` est indispensable : `BoutiqueVue3D` lit ses couleurs dans `useThemeTokens`,
// qui leve sans lui. Dans l'application, c'est AppShell qui l'enveloppe ; ici le banc s'en
// charge, avec le meme role de panel que le tableau de bord Societe.
//
// `StrictMode` est VOLONTAIRE, et c'est un test a lui seul : le moteur n'a jamais tourne dedans
// dans Johanna 2, ou l'amorcage autonome ne l'utilise pas. Talvex, lui, enveloppe toute
// l'application. En developpement, chaque effet est donc invoque deux fois pour la premiere
// fois de son existence — chargements, ecouteurs globaux, lecteur audio et contexte WebGL
// compris. Si quelque chose casse a ce montage double, il vaut mieux le voir ici.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider panelRole="admin">
      <Banc />
    </ThemeProvider>
  </StrictMode>,
);
