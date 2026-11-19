import { Columns3, Link2, Phone, Mail, Hash, Building2, CalendarDays, Type, Lock } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { TypeColonne } from '../../../../lib/entetesImport';
import { libelleSysteme, type ApercuColonne } from './useImportLeads';

const ICONES: Record<TypeColonne, React.FC<{ className?: string }>> = {
  texte: Type, lien: Link2, telephone: Phone, email: Mail, nombre: Hash, entreprise: Building2, date: CalendarDays,
};

const LIBELLE_TYPE: Record<TypeColonne, string> = {
  texte: 'Texte', lien: 'Lien', telephone: 'Téléphone', email: 'Email', nombre: 'Nombre', entreprise: 'Entreprise', date: 'Date',
};

interface Props {
  colonnes: ApercuColonne[];
  ongletExistant: boolean;
  propositionsRefusees: Set<string>;
  onBasculerProposition: (entete: string) => void;
}

/*
 * TOUTES LES COLONNES DU FICHIER, ET CE QU'ELLES DEVIENDRONT.
 *
 * Aucune colonne n'est perdue : chacune est soit une colonne standard du CRM (Prenom, Nom,
 * Email, Telephone), soit une colonne de l'onglet — deja connue ou nouvelle. Les seules
 * exceptions sont les cles reservees (PIN client, identifiants de connexion), signalees ici
 * plutot que jetees en silence.
 *
 * Un rapprochement par les seuls accents (« Categorie » / « Catégorie ») est PROPOSE, coche
 * par defaut, et l'utilisateur peut le refuser : il obtient alors une colonne a part.
 */
export default function ColonnesApercu({ colonnes, ongletExistant, propositionsRefusees, onBasculerProposition }: Props) {
  const t = useThemeTokens();
  const badge = (texte: string, couleur: string, fond: string) => (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: couleur, background: fond }}>{texte}</span>
  );
  const nouvelles = colonnes.filter(c => c.statut === 'nouvelle' || (c.statut === 'proposee' && propositionsRefusees.has(c.entete))).length;

  return (
    <section className="rounded-2xl overflow-hidden" style={{ background: t.card.bg, border: t.card.border }} aria-labelledby="titre-colonnes-apercu">
      <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 flex-wrap" style={{ borderBottom: t.table.headerBorder }}>
        <Columns3 className="w-4 h-4 flex-shrink-0" style={{ color: t.accent.text }} />
        <h3 id="titre-colonnes-apercu" className="text-sm font-semibold" style={{ color: t.text.primary }}>Colonnes du fichier ({colonnes.length})</h3>
        <span className="text-[11px] ml-auto" style={{ color: t.text.quaternary }}>
          {nouvelles} nouvelle{nouvelles > 1 ? 's' : ''}{ongletExistant ? ', ajoutée' + (nouvelles > 1 ? 's' : '') + ' à droite' : ''}
        </span>
      </div>
      <ul className="divide-y max-h-[360px] overflow-y-auto" style={{ borderColor: t.table.rowBorder }}>
        {colonnes.map(c => {
          const Icone = ICONES[c.type];
          return (
            <li key={c.entete} className="flex items-center gap-3 px-4 sm:px-5 py-2.5 flex-wrap" style={{ borderColor: t.table.rowBorder }}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: t.surface.tertiary, color: t.text.tertiary }} title={LIBELLE_TYPE[c.type]}>
                {c.statut === 'reservee' ? <Lock className="w-3.5 h-3.5" /> : <Icone className="w-3.5 h-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate" style={{ color: t.text.secondary }}>{c.entete}</p>
                <p className="text-[10px]" style={{ color: t.text.quaternary }}>
                  {LIBELLE_TYPE[c.type]} · {c.remplies} valeur{c.remplies > 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {c.statut === 'standard' && c.cleSysteme && badge(`Colonne ${libelleSysteme(c.cleSysteme)}`, t.accent.text, t.accent.bg)}
                {c.statut === 'existante' && badge(c.dansOnglet ? 'Déjà dans l\'onglet' : 'Colonne connue', t.success.text, t.success.bg)}
                {c.statut === 'nouvelle' && badge('Nouvelle', '#a78bfa', 'rgba(167,139,250,0.12)')}
                {c.statut === 'reservee' && badge('Réservée — non importée comme colonne', t.text.tertiary, t.surface.tertiary)}
                {c.vide && c.statut !== 'reservee' && badge('Vide — masquée', t.text.tertiary, t.surface.tertiary)}
                {c.masquee && !c.vide && badge('Masquée — sera réaffichée', '#fbbf24', 'rgba(251,191,36,0.1)')}
                {c.statut === 'proposee' && c.registre && (
                  <label className="inline-flex items-center gap-1.5 text-[10px] cursor-pointer px-2 py-1 rounded-lg" style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <input
                      type="checkbox"
                      checked={!propositionsRefusees.has(c.entete)}
                      onChange={() => onBasculerProposition(c.entete)}
                      className="w-3.5 h-3.5"
                    />
                    Fusionner avec « {c.registre.libelle} »
                  </label>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
