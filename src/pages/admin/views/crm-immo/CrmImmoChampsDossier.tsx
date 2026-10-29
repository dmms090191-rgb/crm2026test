import { useMemo } from 'react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import {
  CHAMPS_DOSSIER, GROUPES_FORMULAIRE, TYPES_COLONNE, formatDateImmo,
  type ColonneImmo, type SaisieDossier, type ChampSysteme,
} from './crmImmoTypes';
import {
  prochainsEncaissements, formatJourMoisCourt, journeeDeReference, FUSEAU_ALERTES,
  enDateFrancaise,
} from '../../../../lib/crmImmoAlertes';
import { construireEcheancier } from '../../../../lib/crmImmoEcheancier';


/**
 * LES CHAMPS D'UN DOSSIER — le seul endroit qui les dessine.
 *
 * ---------- POURQUOI PARTAGE ----------
 *
 * Deux modales montrent les memes dix champs systeme et les memes colonnes
 * personnalisees : celle qui cree un client, et celle qui affiche le detail d'un dossier.
 * Les dessiner deux fois, c'est se garantir qu'elles divergeront — et la divergence la
 * plus probable n'est pas visible : la regle des 16 px sur mobile, celle qui empeche iOS
 * Safari d'agrandir la page au premier toucher d'un champ. On la corrigerait d'un cote
 * sans voir l'autre.
 *
 * ---------- DEUX MODES, UN SEUL DESSIN ----------
 *
 * `lectureSeule` rend les memes champs en TEXTE. Ce n'est pas un `disabled` : un champ
 * desactive reste un champ, il garde son cadre, sa hauteur et son fond, et une fiche de
 * dix champs grises se lit beaucoup moins bien qu'une fiche de dix lignes. C'est l'etat
 * par defaut de la modale Details — on vient d'abord consulter.
 */

/** Le type de champ HTML qui convient a une colonne systeme. */
const TYPE_HTML: Record<ChampSysteme, string> = {
  nom: 'text', prenom: 'text', email: 'email', telephone: 'tel',
  /* Les deux champs uniques de nom. `text` et non `name` : l'autocompletion du
     navigateur sur `name` proposerait l'identite du GESTIONNAIRE connecte, pas celle du
     locataire qu'il saisit. */
  nom_complet_locataire: 'text', nom_complet_proprietaire: 'text',
  date_entree: 'date', date_fin_contrat: 'date',
  locataire: 'text', proprietaire: 'text',
  /* `tel` comme celui du locataire : sur telephone, c'est ce qui fait monter le pave
     numerique au lieu du clavier alphabetique. */
  telephone_proprietaire: 'tel',
  jour_encaissement: 'number', commentaire: 'textarea',
  /* `select` et non `text` : cette valeur ne sert ici qu'a dire ce que le champ N'EST
     pas — ni une zone de texte, qui prendrait les deux colonnes de la grille, ni un
     champ libre. Le rendu, lui, se decide sur la presence de `def.choix`. */
  mode_paiement: 'select',
};

/**
 * LES 31 JOURS, ET LES TROIS QUI MERITENT UN MOT.
 *
 * ---------- POURQUOI UNE LISTE, ET PAS UN CALENDRIER ----------
 *
 * Un calendrier choisit une DATE ; un loyer a un JOUR DU MOIS qui revient. Il faudrait
 * donc saisir un jour, un mois et une annee pour n'en garder qu'un tiers — et surtout
 * cela ne reglerait rien : choisir « 31 janvier » laisserait entiere la question de
 * fevrier. Un calendrier ne repond pas au probleme des mois courts, il le cache.
 *
 * ---------- POURQUOI UNE LISTE, ET PAS UN CHAMP LIBRE ----------
 *
 * Le champ libre acceptait la frappe a l'aveugle. La liste supprime la faute de frappe
 * et la valeur impossible, et surtout elle dit a QUEL MOMENT CA COMPTE ce que la regle
 * de rabattement fera — au lieu de le laisser decouvrir en fevrier.
 *
 * La valeur rendue reste un entier de 1 a 31 : la colonne `jour_encaissement` ne change
 * pas, et le dossier existant garde la sienne.
 */
const JOURS_ENCAISSEMENT: { valeur: number; libelle: string }[] = Array.from(
  { length: 31 },
  (_, i) => {
    const n = i + 1;
    if (n === 29) return { valeur: n, libelle: '29 (28 en février, sauf année bissextile)' };
    if (n === 30) return { valeur: n, libelle: '30 (28 ou 29 en février)' };
    if (n === 31) return { valeur: n, libelle: '31 (dernier jour du mois)' };
    return { valeur: n, libelle: String(n) };
  },
);

interface Props {
  saisie: SaisieDossier;
  colonnesPerso: ColonneImmo[];
  onPoser: (cle: keyof SaisieDossier, v: string) => void;
  onPoserValeur: (id: string, v: string) => void;
  /** Vrai : on consulte. Faux : on modifie. */
  lectureSeule?: boolean;
  /**
   * Vrai dans la modale Details : le champ `commentaire` n'y est pas montre, parce que
   * l'onglet Commentaires le remplace par un historique. La colonne reste en base et
   * garde sa valeur — on masque, on ne supprime pas.
   */
  sansCommentaire?: boolean;
}

export default function CrmImmoChampsDossier({
  saisie, colonnesPerso, onPoser, onPoserValeur, lectureSeule, sansCommentaire,
}: Props) {
  const t = useThemeTokens();

  /** Une valeur affichee en lecture : jamais vide, jamais « null ». */
  function lisible(v: string, type: string): string {
    if (v.trim() === '') return '—';
    if (type === 'date') return formatDateImmo(v);
    return v;
  }

  const Valeur = ({ v, type, testid, choix }: {
    v: string; type: string; testid: string;
    choix?: readonly { valeur: string; libelle: string }[];
  }) => (
    <p className="text-sm break-words min-h-[1.25rem]" data-testid={testid}
      style={{ color: v.trim() === '' ? t.label.muted : t.modal.fieldValue }}>
      {/* En lecture, un champ a choix montre son LIBELLE : la valeur technique `cheque`
          au milieu de « Chèque » ailleurs laisserait croire a deux modes differents. */}
      {choix !== undefined
        ? (v === '' ? lisible('', type) : (choix.find(o => o.valeur === v)?.libelle ?? lisible('', type)))
        : lisible(v, type)}
    </p>
  );

  const systeme = CHAMPS_DOSSIER.filter(d => !(sansCommentaire && d.cle === 'commentaire'));

  /*
   * L'APERCU DES PROCHAINES ECHEANCES.
   *
   * Le jour du mois est une regle, pas une date : « 31 » ne veut pas dire la meme chose
   * en mars et en fevrier. L'apercu montre ce que la regle donnera REELLEMENT, pour que
   * personne n'ait a se demander ce qui se passera au mois court suivant.
   *
   * `aujourdhui` est fige au montage. Un loyer n'a pas besoin de suivre le passage de
   * minuit : la modale ne reste pas ouverte une journee, et un intervalle de plus dans
   * une modale de saisie couterait plus qu'il ne rapporte.
   */
  /* Israel, comme partout ailleurs dans le module : l'apercu des prochaines echeances
     doit partir du meme << aujourd'hui >> que la cloche et les cartes. */
  const aujourdhui = useMemo(() => journeeDeReference(new Date(), FUSEAU_ALERTES), []);
  const apercuEcheances = useMemo(() => {
    const brut = (saisie.jour_encaissement as string ?? '').trim();
    if (brut === '') return '';
    const n = Number(brut);
    const dates = prochainsEncaissements(n, aujourdhui, 3);
    return dates.map(formatJourMoisCourt).filter(Boolean).join(', ');
  }, [saisie.jour_encaissement, aujourdhui]);

  /*
   * L'ECHEANCIER COMPLET, des que les TROIS champs sont la.
   *
   * David : << Je ne veux pas attendre la création du dossier pour voir le calcul. >> Le
   * nombre de loyers n'est donc jamais saisi, et il s'affiche avant meme d'enregistrer.
   *
   * C'est `construireEcheancier` qui le produit — exactement la fonction que lisent
   * l'onglet Echeancier et la numerotation des notifications. Ce formulaire ne refait
   * aucun calcul : ce qu'il annonce ici est ce que le dossier aura.
   */
  const echeancier = useMemo(() => construireEcheancier({
    debut: (saisie.date_entree as string) || null,
    fin: (saisie.date_fin_contrat as string) || null,
    jour: Number((saisie.jour_encaissement as string) || NaN),
  }), [saisie.date_entree, saisie.date_fin_contrat, saisie.jour_encaissement]);

  /** Vrai des que les trois champs sont renseignes, meme si la periode est vide. */
  const contratRenseigne =
    ((saisie.date_entree as string) ?? '').trim() !== ''
    && ((saisie.date_fin_contrat as string) ?? '').trim() !== ''
    && ((saisie.jour_encaissement as string) ?? '').trim() !== '';

  const champ = (cle: ChampSysteme) => {
    const def = CHAMPS_DOSSIER.find(d => d.cle === cle)!;
    const type = TYPE_HTML[cle];
    const commun = {
      value: saisie[cle] as string,
      onChange: (e: { target: { value: string } }) => onPoser(cle, e.target.value),
      'data-testid': `crm-immo-champ-${cle}`,
      /* max-md:text-base : 16 px sous 768 px, le seuil en dessous duquel iOS Safari
         agrandit la page des qu on touche le champ — elle deborde alors a droite,
         precisement au moment ou le clavier monte. */
      className: 'w-full px-3 py-2 rounded-lg text-sm max-md:text-base outline-none',
      style: { background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue },
    };
    /*
     * LES DEUX CHAMPS DE NOM PRENNENT TOUTE LA LARGEUR, comme le commentaire.
     *
     * Ce n'est pas une preference d'allure, c'est une consequence du champ unique. Une
     * demi-colonne suffisait a << Nom locataire >> seul ; elle ne suffit plus a
     * << de La Tour Marie Anne >>, et c'est precisement le genre de valeur que ce
     * chantier rend possible — David a interdit toute decoupe parce que les noms composes
     * existent dans ses donnees. Un nom tronque a l'oeil dans un champ etroit ferait
     * douter de ce qui est enregistre.
     *
     * Et le libelle lui-meme est plus long qu'avant : << Nom prenom proprietaire >> passe
     * a la ligne sur un telephone dans une demi-colonne.
     */
    const pleineLargeur = type === 'textarea'
      || cle === 'nom_complet_locataire' || cle === 'nom_complet_proprietaire';
    return (
      <label
        key={cle}
        className={pleineLargeur ? 'sm:col-span-2' : ''}
      >
        <span className="block text-xs mb-1" style={{ color: t.modal.fieldLabel }}>
          {def.libelle}{cle === 'nom' && !lectureSeule && ' *'}
        </span>
        {lectureSeule
          ? <Valeur v={saisie[cle] as string} type={def.type} testid={`crm-immo-lecture-${cle}`}
              choix={def.choix} />
          : type === 'textarea'
            ? <textarea {...commun} rows={3} />
            /* Un champ A CHOIX est une liste, pas un texte libre — et c'est la presence
               de `def.choix` qui le dit, jamais sa cle. L'option vide est le SEUL endroit
               d'ou l'on peut remettre un dossier a << non renseigne >> : la cellule du
               tableau, elle, ne propose que les valeurs. */
            : def.choix !== undefined
              ? <select {...commun} style={{ ...commun.style, background: t.selectBg }}>
                  <option value="">—</option>
                  {def.choix.map(o => (
                    <option key={o.valeur} value={o.valeur}>{o.libelle}</option>
                  ))}
                </select>
            : cle === 'jour_encaissement'
              /* Une liste, et non plus un champ libre : ni faute de frappe, ni valeur
                 impossible, et les trois jours delicats s'expliquent au moment du choix.
                 `t.selectBg` et non `t.modal.fieldBg` : c'est le fond deja employe par
                 les listes de ce formulaire, et un select au fond d'un input se repere
                 mal sur les themes clairs. */
              ? <select {...commun} style={{ ...commun.style, background: t.selectBg }}>
                  <option value="">—</option>
                  {JOURS_ENCAISSEMENT.map(j => (
                    <option key={j.valeur} value={j.valeur}>{j.libelle}</option>
                  ))}
                </select>
              : <input {...commun} type={type} />}

        {cle === 'jour_encaissement' && (
          <>
            {!lectureSeule && (
              <span className="block text-[11px] mt-1" style={{ color: t.label.hint }}>
                Le jour revient chaque mois.
              </span>
            )}
            {/* L'apercu vaut aussi en consultation : on vient souvent dans Details pour
                savoir quand tombe le prochain loyer, pas pour relire un nombre. */}
            {apercuEcheances !== '' && (
              <span className="block text-[11px] mt-1 break-words"
                style={{ color: t.text.link }}
                data-testid="crm-immo-apercu-encaissements">
                Prochains encaissements : {apercuEcheances}
              </span>
            )}
          </>
        )}
      </label>
    );
  };

  /*
   * ============ TROIS GROUPES, ET LE MEME MOTIF QUE « VOS COLONNES » ============
   *
   * Le formulaire rendait TOUS les champs par une seule boucle dans une seule grille :
   * l'ordre a l'ecran etait celui de CHAMPS_DOSSIER, sans aucun repere. David, le
   * 28/10/2026 : « je veux une presentation logique et compacte, pas des champs
   * disperses ».
   *
   * Le motif de section n'est pas invente ici : c'est EXACTEMENT celui de « Vos colonnes »,
   * quelques lignes plus bas — bordure haute, titre en petites capitales, puis la meme
   * grille. Reemployer plutot qu'ajouter evite qu'un formulaire finisse avec deux facons
   * de dessiner une section.
   *
   * DEUX PRECAUTIONS :
   *   - un groupe VIDE ne se rend pas. `sansCommentaire` peut retirer un champ ; si c'etait
   *     le dernier de son groupe, un titre nu resterait, a annoncer rien.
   *   - le PREMIER groupe ne porte pas la bordure haute : elle separe des sections, elle
   *     n'ouvre pas la premiere.
   *
   * Le helper champ() reste l'UNIQUE endroit qui ecrit les classes d'un champ. Sortir un
   * champ a la main pour le placer dans un groupe rouvrirait le zoom automatique d'iOS a
   * 375 px, que `max-md:text-base` existe pour empecher — et les releves de cible tactile
   * balaient chaque ligne de classes du fichier, pas une simple presence.
   */
  const groupes = GROUPES_FORMULAIRE
    .map(g => ({ ...g, champs: systeme.filter(d => d.groupe === g.cle) }))
    .filter(g => g.champs.length > 0);

  return (
    <>
      {groupes.map((g, i) => (
        <div
          key={g.cle}
          className={i === 0 ? '' : 'mt-5 pt-4'}
          style={i === 0 ? undefined : { borderTop: `1px solid ${t.surface.borderLight}` }}
          data-testid={`crm-immo-groupe-${g.cle}`}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: t.label.hint }}>
            {g.titre}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {g.champs.map(d => champ(d.cle))}
          </div>
        </div>
      ))}

      {/*
        * L'ECHEANCIER, CALCULE AVANT MEME D'ENREGISTRER.
        *
        * Il apparait des que les trois champs sont la, et il dit le nombre REEL de
        * loyers — pas un nombre de mois theorique. Une periode qui n'en contient aucun
        * le dit aussi : c'est une information, pas un vide.
        */}
      {contratRenseigne && (
        <div className="mt-3 rounded-lg p-2.5 text-xs break-words"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.tertiary }}
          data-testid="crm-immo-apercu-echeancier">
          {echeancier.length === 0 ? (
            <>Aucun loyer ne tombe entre ces deux dates. Vérifiez la période et le jour d'encaissement.</>
          ) : (
            <>
              <strong style={{ color: t.text.secondary }} data-testid="crm-immo-apercu-nombre-loyers">
                {echeancier.length} loyer{echeancier.length > 1 ? 's' : ''}
              </strong>
              {' — du '}{enDateFrancaise(echeancier[0].date)}
              {' au '}{enDateFrancaise(echeancier[echeancier.length - 1].date)}
              {echeancier.length > 3 && (
                <span style={{ color: t.label.hint }}>
                  {' · '}
                  {echeancier.slice(0, 3).map(e => enDateFrancaise(e.date)).join(', ')}…
                </span>
              )}
            </>
          )}
        </div>
      )}

      {colonnesPerso.length > 0 && (
        <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${t.surface.borderLight}` }}>
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: t.label.hint }}>
            Vos colonnes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {colonnesPerso.map(c => (
              <label key={c.id}>
                {/* break-words : ce libelle est saisi dans la modale Colonnes, rien ne
                    borne sa longueur ni ne garantit qu il contient un espace. */}
                <span className="block text-xs mb-1 break-words" style={{ color: t.modal.fieldLabel }}>{c.nom}</span>
                {lectureSeule ? (
                  <Valeur v={saisie.valeurs[c.id] ?? ''} type={c.type}
                    testid={`crm-immo-lecture-perso-${c.id}`} />
                ) : c.type === 'oui_non' ? (
                  <select
                    value={saisie.valeurs[c.id] ?? ''}
                    onChange={e => onPoserValeur(c.id, e.target.value)}
                    data-testid={`crm-immo-champ-perso-${c.id}`}
                    className="w-full px-3 py-2 rounded-lg text-sm max-md:text-base outline-none"
                    style={{ background: t.selectBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue }}>
                    <option value="">—</option>
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                ) : (
                  <input
                    type={c.type === 'nombre' ? 'number' : c.type === 'date' ? 'date' : 'text'}
                    value={saisie.valeurs[c.id] ?? ''}
                    onChange={e => onPoserValeur(c.id, e.target.value)}
                    data-testid={`crm-immo-champ-perso-${c.id}`}
                    className="w-full px-3 py-2 rounded-lg text-sm max-md:text-base outline-none"
                    style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue }}
                  />
                )}
                {!lectureSeule && (
                  <span className="block text-[11px] mt-1" style={{ color: t.label.hint }}>
                    {TYPES_COLONNE.find(x => x.valeur === c.type)?.libelle}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
