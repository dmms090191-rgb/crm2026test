import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import {
  COLONNES_SYSTEME, TYPES_COLONNE, formatDateImmo,
  type ColonneImmo, type SaisieDossier, type ChampSysteme,
} from './crmImmoTypes';


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
  date_entree: 'date', date_fin_contrat: 'date',
  locataire: 'text', proprietaire: 'text',
  jour_encaissement: 'number', commentaire: 'textarea',
};

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

  const Valeur = ({ v, type, testid }: { v: string; type: string; testid: string }) => (
    <p className="text-sm break-words min-h-[1.25rem]" data-testid={testid}
      style={{ color: v.trim() === '' ? t.label.muted : t.modal.fieldValue }}>
      {lisible(v, type)}
    </p>
  );

  const systeme = COLONNES_SYSTEME.filter(d => !(sansCommentaire && d.cle === 'commentaire'));

  const champ = (cle: ChampSysteme) => {
    const def = COLONNES_SYSTEME.find(d => d.cle === cle)!;
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
    return (
      <label key={cle} className={type === 'textarea' ? 'sm:col-span-2' : ''}>
        <span className="block text-xs mb-1" style={{ color: t.modal.fieldLabel }}>
          {def.libelle}{cle === 'nom' && !lectureSeule && ' *'}
        </span>
        {lectureSeule
          ? <Valeur v={saisie[cle] as string} type={def.type} testid={`crm-immo-lecture-${cle}`} />
          : type === 'textarea'
            ? <textarea {...commun} rows={3} />
            : <input {...commun} type={type} {...(cle === 'jour_encaissement' ? { min: 1, max: 31, step: 1 } : {})} />}
        {cle === 'jour_encaissement' && !lectureSeule && (
          <span className="block text-[11px] mt-1" style={{ color: t.label.hint }}>
            Jour du mois. « 5 » = le 5 de chaque mois ; « 31 » est ramené au dernier jour des mois plus courts.
          </span>
        )}
      </label>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {systeme.map(d => champ(d.cle))}
      </div>

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
