import { directionDe, etiquetteLangue, type Langue } from './langue';
import { textesDe } from './textes';
import { corpsPage, encadre, paragraphe, sousTitrePage, titreEncadre, titrePage, zonePage } from './stylePages';

/**
 * « A PROPOS » — ce que la praticienne fait, et rien de plus.
 *
 * ---------- CE QUI N'EST PAS ECRIT ICI, ET POURQUOI ----------
 *
 * Aucun diplome, aucune certification, aucun nombre d'annees de pratique, aucun temoignage,
 * aucun tarif, aucune methode qui porterait un nom. La biographie reelle n'a pas ete fournie :
 * tout ce qui serait ecrit a sa place serait une invention sur une personne REELLE, qu'un
 * visiteur pourrait venir lui opposer. Un faux diplome n'est pas un texte de remplissage, c'est
 * une affirmation verifiable et fausse.
 *
 * Le texte parle donc de l'APPROCHE — ecouter, accompagner, mettre des mots — qui ne depend
 * d'aucun element biographique. C'est la seule facon d'etre credible sans rien inventer.
 *
 * La mention sur ce que la numerologie n'est pas est AFFICHEE, dans un encadre, a la fin du
 * texte et non en petits caracteres en bas de page : c'est une information que le visiteur a le
 * droit de lire, pas une precaution juridique a cacher.
 */

export default function PageAPropos({ langue }: { langue: Langue }) {
  const T = textesDe(langue).apropos;

  return (
    <div
      data-testid="ih-page-apropos"
      dir={directionDe(langue)}
      lang={etiquetteLangue(langue)}
      style={zonePage}
      tabIndex={0}
    >
      <article style={corpsPage}>
        <h1 style={titrePage}>{T.titre}</h1>
        <p style={sousTitrePage}>{T.sousTitre}</p>

        {T.paragraphes.map(p => (
          <p key={p.slice(0, 24)} style={paragraphe}>{p}</p>
        ))}

        <aside style={encadre}>
          <h2 style={titreEncadre}>{T.mentionTitre}</h2>
          <p style={{ ...paragraphe, margin: '0.8em 0 0', fontSize: '0.92rem', color: 'rgba(238,231,219,0.88)' }}>
            {T.mention}
          </p>
        </aside>
      </article>
    </div>
  );
}
