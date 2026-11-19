import { useThemeTokens } from '../../hooks/useThemeTokens';
import { estCleReservee, detecterType, correspondancesSysteme, type TypeColonne } from '../../lib/entetesImport';
import { normalizePhone } from '../../lib/phoneNormalizer';
import { champContact, type LeadIdentifiable } from '../../lib/identiteLead';
import { telDuLead } from '../../lib/formatTel';
import type { ColonneRegistre } from '../../lib/ongletsLeads';
import ValeurLead from './ValeurLead';

interface Props {
  lead: LeadIdentifiable;
  /** Le registre des colonnes de la societe : libelles et types connus. */
  registre?: Iterable<ColonneRegistre>;
}

/*
 * TOUT CE QUE LE LEAD PORTE, DANS LA FICHE.
 *
 * Le tableau d'un onglet ne montre que SES colonnes ; la fiche montre tout : les champs de
 * contact, puis chaque valeur importee, quel que soit l'onglet qui l'a apportee. Seules les
 * cles reservees (PIN, commentaires — qui ont leurs propres onglets —, identifiants) sont
 * tenues a l'ecart. Rien n'est modifiable ici : c'est une lecture.
 */
export default function InformationsLead({ lead, registre }: Props) {
  const t = useThemeTokens();
  const parCle = new Map<string, ColonneRegistre>();
  for (const r of registre ?? []) parCle.set(r.cle_data, r);

  const contact = ([
    { libelle: 'Prénom', valeur: champContact(lead, 'prenom'), type: 'texte' },
    { libelle: 'Nom', valeur: champContact(lead, 'nom'), type: 'texte' },
    { libelle: 'Email', valeur: champContact(lead, 'email'), type: 'email' },
    { libelle: 'Téléphone', valeur: telDuLead(lead), type: 'telephone' },
  ] as { libelle: string; valeur: string; type: TypeColonne }[]).filter(c => c.valeur !== '');

  /* Une valeur deja montree dans le bloc contact (le numero sous « Téléphone » du fichier, l'email
     sous « E-mail »...) n'est pas repetee. On compare les VALEURS, pas les noms de cles : un
     second numero (« Mobile » a cote de « Téléphone ») reste affiche. */
  /* Une cle n'est cachee que si elle DESIGNE le meme champ de contact (« Téléphone », « E-mail »,
     « Prénom »...) ET porte la meme valeur : un « Parrain » qui s'appelle aussi Jean reste. */
  const valeurContact = new Map(contact.map(c => [c.libelle, c]));
  const champDe = (k: string): string | null => {
    const sys = correspondancesSysteme([k]).get(k);
    if (sys === 'prenom') return 'Prénom';
    if (sys === 'nom') return 'Nom';
    if (sys === 'email' || detecterType(k, []) === 'email') return 'Email';
    if (sys === 'telephone' || detecterType(k, []) === 'telephone') return 'Téléphone';
    return null;
  };
  const dejaMontre = (k: string, v: string) => {
    const champ = champDe(k);
    const c = champ ? valeurContact.get(champ) : undefined;
    if (!c) return false;
    if (c.type === 'telephone') {
      const a = normalizePhone(c.valeur).canonical, b = normalizePhone(v).canonical;
      return a !== null && a === b;
    }
    return c.valeur.trim().toLowerCase() === v.trim().toLowerCase();
  };
  const autres = Object.entries(lead.data ?? {})
    .filter(([k, v]) => typeof v === 'string' && v.trim() !== '' && !estCleReservee(k) && !dejaMontre(k, v as string))
    .map(([k, v]) => {
      const r = parCle.get(k);
      return { cle: k, libelle: r?.libelle ?? k, valeur: (v as string).trim(), type: r?.type ?? detecterType(k, [v as string]) };
    })
    .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));

  if (contact.length === 0 && autres.length === 0) {
    return <p className="text-xs" style={{ color: t.text.quaternary }}>Aucune information enregistrée.</p>;
  }

  const ligne = (cle: string, libelle: string, valeur: string, type: TypeColonne) => (
    <div key={cle} className="flex items-start gap-3 py-2" style={{ borderBottom: `1px solid ${t.surface.borderLight}` }}>
      <dt className="text-[11px] w-32 flex-shrink-0 pt-0.5 break-words" style={{ color: t.text.quaternary }}>{libelle}</dt>
      <dd className="min-w-0 flex-1"><ValeurLead valeur={valeur} type={type} tactile /></dd>
    </div>
  );

  return (
    <dl>
      {contact.map(c => ligne('contact:' + c.libelle, c.libelle, c.valeur, c.type))}
      {autres.map(a => ligne(a.cle, a.libelle, a.valeur, a.type))}
    </dl>
  );
}
