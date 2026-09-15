import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * BARRIERE D'ERREUR autour de la boutique 3D.
 *
 * Sans elle, une erreur levee dans la branche 3D remonte jusqu'a la racine de React et DEMONTE
 * TOUTE L'APPLICATION : l'utilisateur voit une page blanche a la place de Talvex, barre laterale
 * comprise, et le seul recours est de recharger. Ce n'est pas une precaution de principe — le
 * moteur charge 9,4 Mo d'assets a l'execution, et plusieurs chemins mènent a une exception :
 *
 *   - `useGLTF` LEVE quand le GLB est illisible. Et la reecriture attrape-tout de vercel.json
 *     transforme un fichier manquant en index.html servi en HTTP 200 : le chargeur recoit du
 *     HTML la ou il attend du binaire, et echoue sur une erreur d'analyse opaque ;
 *   - un contexte WebGL refuse — machine sans GPU, pilote a bout, trop d'onglets ouverts ;
 *   - un `import()` de chunk qui echoue sur un reseau coupe.
 *
 * Une boutique qui ne s'ouvre pas est un incident. Un Talvex blanc est une panne.
 */

interface Props {
  children: ReactNode;
  /** Rendu a la place de la boutique. Recoit de quoi revenir a la liste. */
  secours: (erreur: Error, reessayer: () => void) => ReactNode;
}

interface State {
  erreur: Error | null;
}

export default class BarriereErreur extends Component<Props, State> {
  state: State = { erreur: null };

  static getDerivedStateFromError(erreur: Error): State {
    return { erreur };
  }

  componentDidCatch(erreur: Error, info: ErrorInfo) {
    // On garde une trace lisible : sans cela, une scene qui refuse de s'ouvrir ne laisse
    // qu'un message generique et personne ne sait par ou commencer.
    console.error('[boutique3d] la scene a leve', erreur, info.componentStack);
  }

  render() {
    const { erreur } = this.state;
    if (erreur) return this.props.secours(erreur, () => this.setState({ erreur: null }));
    return this.props.children;
  }
}
