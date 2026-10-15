import { useState } from 'react';
import { type Langue } from './langue';
import { textesDe } from './textes';
import { COORDONNEES, lienCourriel, lienTelephone } from './coordonnees';
import { OR, CREME } from './stylePages';

/**
 * LE FORMULAIRE DE CONTACT — prepare, valide, et HONNETE sur ce qu'il ne fait pas.
 *
 * ============================================================================
 *   AUCUN ENVOI N'EST BRANCHE. C'EST VOULU, ET C'EST ICI QU'ON LE BRANCHERA.
 *
 *   Audit du depot, resultat net : il n'existe dans Talvex AUCUN systeme de contact
 *   reutilisable. Les trois formulaires des autres templates sont des maquettes —
 *   deux n'ont meme pas de gestionnaire de clic, et le troisieme ne fait que basculer
 *   un booleen d'affichage. Aucune des fonctions edge n'envoie de courriel. Et un
 *   visiteur anonyme ne peut ecrire que dans les deux tables d'inscription, qui
 *   stockent un mot de passe en clair : les detourner pour du contact serait une faute.
 *
 *   Faire croire a un envoi serait donc pire que ne rien faire : un message de
 *   confirmation mensonger, et une personne qui attend une reponse qui ne viendra
 *   jamais. Le formulaire valide la saisie, puis DIT que l'envoi n'est pas raccorde
 *   et renvoie vers le courriel et le telephone, qui eux fonctionnent vraiment.
 *
 *   POUR BRANCHER L'ENVOI PLUS TARD : remplacer le corps de `envoyer()` ci-dessous.
 *   Tout le reste — champs, validation, messages, traductions — est deja en place.
 *   Il faudra une table de messages ouverte en INSERT au role anon, ou une fonction
 *   edge qui relaie vers un service de courriel.
 * ============================================================================
 *
 * Le bouton est un `type="button"` avec un `onClick`, pas une soumission : l'apercu du module
 * Sites annule tout `submit` en phase de capture, et le meme piege avait deja rendu inerte la
 * saisie du chapitre 3.
 */

interface Props {
  langue: Langue;
}

type Champ = 'prenom' | 'nom' | 'telephone' | 'email' | 'sujet' | 'message';

const REQUIS: Champ[] = ['prenom', 'nom', 'email', 'message'];

export default function FormulaireContact({ langue }: Props) {
  const T = textesDe(langue).formulaire;
  const [valeurs, setValeurs] = useState<Record<Champ, string>>({
    prenom: '', nom: '', telephone: '', email: '', sujet: '', message: '',
  });
  const [erreurs, setErreurs] = useState<Partial<Record<Champ, string>>>({});
  const [avis, setAvis] = useState('');

  const poser = (champ: Champ, v: string) => {
    setValeurs(x => ({ ...x, [champ]: v }));
    if (erreurs[champ]) setErreurs(e => ({ ...e, [champ]: undefined }));
  };

  const valider = (): boolean => {
    const trouvees: Partial<Record<Champ, string>> = {};
    for (const champ of REQUIS) {
      if (!valeurs[champ].trim()) trouvees[champ] = T.requis;
    }
    // Verification volontairement minimale : un motif strict rejette des adresses valides.
    if (!trouvees.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valeurs.email.trim())) {
      trouvees.email = T.emailInvalide;
    }
    setErreurs(trouvees);
    return Object.keys(trouvees).length === 0;
  };

  const envoyer = () => {
    setAvis('');
    if (!valider()) return;
    // ---- POINT DE BRANCHEMENT DE L'ENVOI ---------------------------------
    // Ici, et nulle part ailleurs. Aujourd'hui : on le dit, on ne le simule pas.
    setAvis(T.pasBranche);
  };

  const champ = (nom: Champ, type: string, lignes = 0) => (
    <label key={nom} style={{ display: 'grid', gap: 6 }}>
      <span style={etiquette}>
        {T[nom]}
        {REQUIS.includes(nom) && <span aria-hidden style={{ color: OR }}> *</span>}
      </span>
      {lignes > 0 ? (
        <textarea
          value={valeurs[nom]}
          onChange={e => poser(nom, e.target.value)}
          rows={lignes}
          data-ih-champ
          data-testid={`ih-contact-${nom}`}
          aria-invalid={Boolean(erreurs[nom])}
          style={{ ...saisie, resize: 'vertical', minHeight: 120 }}
        />
      ) : (
        <input
          type={type}
          value={valeurs[nom]}
          onChange={e => poser(nom, e.target.value)}
          data-ih-champ
          data-testid={`ih-contact-${nom}`}
          aria-invalid={Boolean(erreurs[nom])}
          autoComplete={AUTO[nom]}
          style={saisie}
        />
      )}
      {erreurs[nom] && (
        <span role="alert" style={{ fontSize: 12, color: '#f0a8a8' }}>{erreurs[nom]}</span>
      )}
    </label>
  );

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        {champ('prenom', 'text')}
        {champ('nom', 'text')}
        {champ('telephone', 'tel')}
        {champ('email', 'email')}
      </div>
      {champ('sujet', 'text')}
      {champ('message', 'text', 5)}

      <button type="button" onClick={envoyer} data-testid="ih-contact-envoyer" style={bouton}>
        {T.envoyer}
      </button>

      {avis && (
        <p role="status" data-testid="ih-contact-avis" style={avisStyle}>
          {avis}
          {' '}
          <a href={lienCourriel()} style={{ color: OR }}>{COORDONNEES.email}</a>
          {' · '}
          <a href={lienTelephone()} style={{ color: OR }}>{COORDONNEES.telephoneAffiche}</a>
        </p>
      )}
    </div>
  );
}

const AUTO: Record<Champ, string> = {
  prenom: 'given-name',
  nom: 'family-name',
  telephone: 'tel',
  email: 'email',
  sujet: 'off',
  message: 'off',
};

const etiquette: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: '0.04em',
  color: 'rgba(238,231,219,0.74)',
};

const saisie: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '11px 13px',
  borderRadius: 10,
  border: '1px solid rgba(232,205,147,0.24)',
  background: 'rgba(255,255,255,0.05)',
  color: CREME,
  fontSize: 15,
  fontFamily: 'inherit',
};

const bouton: React.CSSProperties = {
  justifySelf: 'start',
  minHeight: 46,
  padding: '12px 30px',
  borderRadius: 999,
  border: '1px solid rgba(232,205,147,0.5)',
  background: 'linear-gradient(180deg, rgba(232,205,147,0.24), rgba(184,137,60,0.12))',
  color: '#ffeccb',
  fontSize: 15,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const avisStyle: React.CSSProperties = {
  margin: 0,
  padding: '12px 14px',
  borderRadius: 12,
  background: 'rgba(232,205,147,0.08)',
  border: '1px solid rgba(232,205,147,0.26)',
  fontSize: 13,
  lineHeight: 1.75,
  color: 'rgba(238,231,219,0.9)',
};
