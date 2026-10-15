import { useEffect, useState } from 'react';
import TalvexLoginModal from '../TalvexLoginModal';
import { getSiteModalTheme } from '../siteModalTheme';
import BarreNavigation, { type Page } from './BarreNavigation';
import IsraelHayaSite from './IsraelHayaSite';
import PageAPropos from './PageAPropos';
import PageContact from './PageContact';
import { libererFilms } from './cacheFilms';
import { directionDe, etiquetteLangue, useLangue } from './langue';
import { useHauteurVue, usePolicesHebraiques } from './useVoyage';

/**
 * LA COQUILLE DU SITE : la langue, la page affichee, et la connexion.
 *
 * Elle est posee entre l'hote paresseux (IsraelHayaTemplate) et le voyage (IsraelHayaSite).
 * Trois choses qui DEBORDENT du voyage vivent donc ici, et pas en dessous :
 *
 * 1. LA DIRECTION DU DOCUMENT. « A propos » et « Contact » ont besoin du meme RTL que le
 *    voyage, et l'attribut se pose sur `document.documentElement`, qui est partage avec tout
 *    Talvex. L'etat anterieur est memorise et restaure au demontage : sans cela, revenir au
 *    panneau d'administration laisserait l'application entiere en hebreu, a l'envers.
 *
 * 2. LES FILMS GARDES EN MEMOIRE. Les liberer au demontage du voyage les faisait
 *    retelecharger — douze mega-octets — a chaque aller-retour par le menu. Ils appartiennent
 *    a la visite, pas a la page d'accueil.
 *
 * 3. LA CONNEXION. Voir plus bas : elle n'etait pas branchee, elle etait branchee a l'envers.
 *
 * ---------- SANS ROUTEUR, ET C'EST VOULU ----------
 *
 * Le projet n'a aucune bibliotheque de routage, et un template n'a pas d'URL interne : il est
 * rendu par CompanySitePage dans un seul composant. La navigation est donc un etat local, comme
 * dans TalvexOfficialTemplate. Chaque page porte son propre conteneur de defilement, parce que
 * html, body et #root ont une hauteur fixe dans Talvex et que la fenetre ne defile jamais.
 */

const THEME_MODALE = getSiteModalTheme('israel_haya');

interface Props {
  domainCompanyId?: string | null;
  /**
   * Rappel d'APRES-connexion, fourni par l'hote. Ce n'est PAS un ouvre-fenetre : il sert a
   * signaler au CRM qu'une session vient de s'ouvrir, pour qu'il redetecte le role.
   */
  onDomainLogin?: () => void;
  appIconUrl?: string | null;
}

export default function CoquilleIsraelHaya({ domainCompanyId, onDomainLogin, appIconUrl }: Props) {
  usePolicesHebraiques();
  const [langue, changerLangue] = useLangue();
  const [page, setPage] = useState<Page>('accueil');
  const [connexionOuverte, setConnexionOuverte] = useState(false);

  /*
   * LA CONNEXION ETAIT BRANCHEE A L'ENVERS, et le defaut etait invisible a l'ecran.
   *
   * `onDomainLogin` est le rappel d'APRES-connexion, pas un ouvre-fenetre. Branche en
   * gestionnaire de clic — ce que faisait l'hote — il produisait, selon le chemin : une
   * ejection vers la landing Talvex sur /site/<slug>, rien du tout sur un domaine
   * personnalise, et rien du tout en apercu. Autrement dit, aucun chemin n'ouvrait de
   * connexion.
   *
   * Le motif correct est celui de quatre autres templates : un etat local ouvre la fenetre de
   * connexion de Talvex, et `onDomainLogin` est passe a cette fenetre comme rappel de reussite.
   * Aucune authentification nouvelle n'est ecrite : c'est la connexion Talvex, telle quelle.
   */
  const apresConnexion = () => {
    if (onDomainLogin) onDomainLogin();
    else window.location.href = '/';
  };

  // Le document entier suit la langue du site, et seulement pendant la visite.
  useEffect(() => {
    const html = document.documentElement;
    const dirAvant = html.getAttribute('dir');
    const langAvant = html.getAttribute('lang');
    html.setAttribute('dir', directionDe(langue));
    html.setAttribute('lang', etiquetteLangue(langue));
    return () => {
      if (dirAvant) html.setAttribute('dir', dirAvant); else html.removeAttribute('dir');
      if (langAvant) html.setAttribute('lang', langAvant); else html.removeAttribute('lang');
    };
  }, [langue]);

  // Les films gardes en memoire sont rendus quand le site entier quitte l'ecran.
  useEffect(() => () => { libererFilms(); }, []);

  /*
   * LA HAUTEUR DE LA SCENE, MESUREE ICI ET NULLE PART AILLEURS.
   *
   * Le voyage et les deux pages la lisent dans `--ih-vue`. Une seule mesure, un seul
   * endroit : deux composants qui calculeraient chacun leur hauteur finiraient par se
   * contredire, exactement comme les deux reserves de barre de navigation avant elles.
   *
   * Avant la premiere mesure, le repli `100svh` tient la scene. Il est deja bien meilleur
   * qu'un `height: 100%` : svh ne depend d'aucun parent. Voir useHauteurVue pour le defaut
   * que le pourcentage a cause sur le site public.
   */
  const hauteurVue = useHauteurVue();
  const scene = hauteurVue > 0 ? `${hauteurVue}px` : '100svh';

  return (
    <div
      data-testid="ih-coquille"
      data-ih-page={page}
      style={{
        position: 'relative',
        /*
          Hauteur MESUREE, jamais heritee. `height: 100%` exigeait que chaque parent jusqu a
          la racine porte une hauteur definie : vrai dans l'apercu, faux sur la page publique,
          ou <ThemeProvider> intercale un <div> sans hauteur. La chaine cassait, la scene
          prenait la taille de son CONTENU — 27 439 px — et le voyage se figeait.
        */
        height: scene,
        background: '#070a16',
        // Publiee pour le voyage ET pour les deux pages : une seule verite.
        ['--ih-vue' as string]: scene,
      } as React.CSSProperties}
    >
      <BarreNavigation
        page={page}
        onPage={setPage}
        langue={langue}
        onLangue={changerLangue}
        onConnexion={() => setConnexionOuverte(true)}
        opaque={page !== 'accueil'}
      />

      {page === 'accueil' && (
        /*
         * « Je veux prendre rendez-vous » mene a la page Contact, et non a la connexion.
         * C'est ce qu'un visiteur attend du bouton, et c'est le seul endroit du site ou il
         * trouvera un courriel et un telephone qui fonctionnent vraiment.
         */
        <IsraelHayaSite langue={langue} onReserver={() => setPage('contact')} />
      )}
      {page === 'apropos' && <PageAPropos langue={langue} />}
      {page === 'contact' && <PageContact langue={langue} />}

      <TalvexLoginModal
        isOpen={connexionOuverte}
        onClose={() => setConnexionOuverte(false)}
        onLogin={apresConnexion}
        theme={THEME_MODALE}
        langue={langue}
        /*
          Pas de creation de compte depuis ce site : cette connexion est celle de la
          praticienne vers son CRM, pas une inscription ouverte aux visiteurs. La fenetre
          d'inscription est un autre flux, qui ecrit en base et n'est pas traduit.
        */
        inscription={false}
        domainCompanyId={domainCompanyId}
        appIconUrl={appIconUrl}
      />
    </div>
  );
}
