import { useThemeTokens } from '../../../hooks/useThemeTokens';
import CentreTelechargement from '../../../components/telechargement/CentreTelechargement';

/**
 * L'onglet « Telecharger » du panneau Admin.
 *
 * Ce fichier ne fait qu'UNE chose : prendre les couleurs du theme actif et les passer au
 * centre de telechargement. C'est tout son interet — AdminViewRenderer ne porte aucun
 * jeton (ses vues les lisent elles-memes), et CentreTelechargement ne lit aucun contexte,
 * puisqu'il doit aussi s'afficher sur la page publique, ou il n'y a pas de ThemeProvider.
 *
 * Le composant rendu est EXACTEMENT celui de /telecharger : une seule source pour la liste
 * des versions, donc aucune divergence possible entre ce que voit un visiteur et ce que
 * voit une Societe connectee.
 */
export default function AdminTelechargerView() {
  const t = useThemeTokens();
  return <CentreTelechargement tokens={t} avecEntete />;
}
