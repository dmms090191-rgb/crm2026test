import { useState, useMemo, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import {
  toutesLesColonnes, deplacer, cleColonne, nomDejaPris, nomHeurteSysteme,
  type Colonne, type ReglageLocal,
} from '../../../../lib/crmImmoColonnes';
import { COLONNES_SYSTEME, TYPES_COLONNE, type ColonneImmo, type TypeColonne } from './crmImmoTypes';
import CrmImmoColonneRow from './CrmImmoColonneRow';
import { useFermetureModale } from './useFermetureModale';
import { useGlisserColonnes } from './useGlisserColonnes';

/**
 * L'organisateur de colonnes du module.
 *
 * ---------- POURQUOI UNE COPIE ET NON UNE EXTENSION DE ColumnOrganizerModal ----------
 *
 * Le dépôt a déjà un organisateur, dans src/components/table/. Il est monté par QUATRE
 * modules (Crm, SACrmSociete, SAAdmins, VendorLeads) et sa liste de types de champ est
 * partagée : y ajouter « Nombre », « Date » ou « Oui/Non » les ferait apparaître dans le
 * formulaire des quatre autres, dont la base — `custom_columns.field_type` — ne les
 * attend pas. Et comme le typecheck n'est pas dans le build, une signature élargie
 * passerait Vercel sans un mot.
 *
 * On copie donc, et on reste chez soi. C'est la règle que David a posée pour tout le
 * chantier : aucun autre module modifié.
 *
 * ---------- DEUX PERSISTANCES DANS UN SEUL ÉCRAN ----------
 *
 * L'ordre et le masquage des colonnes PERSONNALISÉES partent en base, où toute la
 * Société les partage. Ceux des colonnes SYSTÈME restent dans le navigateur : elles
 * n'ont pas de ligne où ranger un rang. L'utilisateur ne voit qu'une liste ; les deux
 * familles s'enregistrent chacune à sa place.
 */

interface Props {
  perso: ColonneImmo[];
  reglage: ReglageLocal;
  erreur: string;
  onFermer: () => void;
  onAjouter: (nom: string, type: TypeColonne) => void;
  onRenommer: (id: string, nom: string) => void;
  onBasculerMasquagePerso: (id: string, masquee: boolean) => void;
  onSupprimerPerso: (id: string) => void;
  onReordonnerPerso: (ordre: ColonneImmo[]) => void;
  onReglage: (r: ReglageLocal) => void;
}

export default function CrmImmoColonnesModal({
  perso, reglage, erreur, onFermer, onAjouter, onRenommer,
  onBasculerMasquagePerso, onSupprimerPerso, onReordonnerPerso, onReglage,
}: Props) {
  const t = useThemeTokens();
  const [nouveauNom, setNouveauNom] = useState('');
  const [nouveauType, setNouveauType] = useState<TypeColonne>('texte');

  const colonnes = useMemo(
    () => toutesLesColonnes({ systeme: COLONNES_SYSTEME, perso, reglage }),
    [perso, reglage],
  );
  const sys = colonnes.filter(c => c.famille === 'systeme');
  const pers = colonnes.filter(c => c.famille === 'perso');

  /* Le nom est refuse AVANT l'aller-retour, avec la meme regle que l'index unique de la
     base — insensible a la casse et aux espaces de bord — plus le heurt avec un libelle
     systeme, que la base ne connait pas mais qui ferait deux en-tetes identiques. */
  const problemeNom = useMemo(() => {
    const n = nouveauNom.trim();
    if (n === '') return '';
    if (nomDejaPris(n, perso)) return `Une colonne « ${n} » existe déjà.`;
    if (nomHeurteSysteme(n, COLONNES_SYSTEME)) return `« ${n} » est déjà le nom d'une colonne système.`;
    return '';
  }, [nouveauNom, perso]);

  function deplacerSysteme(de: number, vers: number) {
    const ordre = deplacer(sys, de, vers).map(c => cleColonne(c));
    onReglage({ ...reglage, ordreSysteme: ordre });
  }

  function basculerMasquageSysteme(c: Colonne) {
    const cle = cleColonne(c);
    const deja = new Set(reglage.masqueesSysteme);
    if (deja.has(cle)) deja.delete(cle); else deja.add(cle);
    /* On memorise aussi l'ordre courant : sans ca, masquer une colonne apres l'avoir
       deplacee perdrait le deplacement au prochain chargement. */
    onReglage({ ordreSysteme: sys.map(x => cleColonne(x)), masqueesSysteme: [...deja] });
  }

  function deplacerPerso(de: number, vers: number) {
    const ids = deplacer(pers, de, vers).map(c => cleColonne(c));
    const parId = new Map(perso.map(c => [c.id, c]));
    onReordonnerPerso(ids.map(id => parId.get(id)!).filter(Boolean));
  }

  /*
   * LE GLISSEMENT, FAMILLE PAR FAMILLE.
   *
   * Deux instances et non une : une colonne systeme ne peut pas se deposer parmi les
   * personnalisees, parce que son rang part dans localStorage et celui des autres en
   * base. Chaque instance ne voit que ses lignes, et borne le geste a sa propre bande.
   *
   * Les deux partagent le MEME scroller — la zone defilante ci-dessous — parce que c'est
   * lui qui defile quand on tient une ligne contre un bord, et lui dont il faut
   * compenser le defilement pour que l'apercu ne derive pas.
   */
  const corps = useRef<HTMLDivElement>(null);
  const glisseSys = useGlisserColonnes({ famille: 'systeme', scroller: corps, onDeplacer: deplacerSysteme });
  const glissePers = useGlisserColonnes({ famille: 'perso', scroller: corps, onDeplacer: deplacerPerso });

  /*
   * Tout ce qui est fait dans cette modale part en base immediatement : ajouter,
   * renommer, masquer, reordonner. Le seul etat qui vivrait une fermeture est le nom
   * en cours de frappe — d ou le second geste quand le champ n est pas vide.
   */
  const fermeture = useFermetureModale({ onFermer, aPerdre: nouveauNom.trim() !== '' });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: t.modal.overlayBg }} data-testid="crm-immo-colonnes-modal"
      {...fermeture.proprietesDuFond}>
      <div className="w-full sm:max-w-lg max-h-[92dvh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}>

        <div className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: `1px solid ${t.modal.border}` }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: t.modal.title }}>Colonnes du tableau</h2>
            <p className="text-xs" style={{ color: t.modal.subtitle }}>
              Réordonnez, masquez, ajoutez vos propres colonnes.
            </p>
          </div>
          <button type="button" onClick={onFermer} title="Fermer"
            aria-label="Fermer les colonnes du tableau"
            data-testid="crm-immo-colonnes-fermer"
            /* Mesure a 375 px : 28 x 28. Meme traitement que la modale Dossier. */
            className="relative p-1.5 rounded-lg max-md:before:absolute max-md:before:content-[''] max-md:before:-inset-2"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={corps} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {erreur !== '' && (
            <p className="text-xs m-3 px-3 py-2 rounded-lg break-words" data-testid="crm-immo-colonnes-erreur"
              style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
              {erreur}
            </p>
          )}

          <h3 className="text-[11px] font-semibold uppercase tracking-wide px-3 pt-3 pb-1.5" style={{ color: t.label.hint }}>
            Colonnes système
          </h3>
          {sys.map((c, i) => (
            <CrmImmoColonneRow key={cleColonne(c)} colonne={c}
              premier={i === 0} dernier={i === sys.length - 1}
              onMonter={() => deplacerSysteme(i, i - 1)}
              onDescendre={() => deplacerSysteme(i, i + 1)}
              onBasculerMasquage={() => basculerMasquageSysteme(c)}
              onRenommer={() => { /* un libelle systeme ne se renomme pas en V1 */ }}
              onSupprimer={() => { /* structurellement impossible : pas de bouton */ }}
              glisse={glisseSys.pourLigne(i)}
            />
          ))}

          <h3 className="text-[11px] font-semibold uppercase tracking-wide px-3 pt-4 pb-1.5" style={{ color: t.label.hint }}>
            Vos colonnes
          </h3>
          {pers.length === 0 && (
            <p className="text-xs px-3 pb-2" style={{ color: t.label.muted }}>
              Aucune pour l’instant. Ajoutez « Montant du loyer », « Adresse du bien », ce que vous voulez.
            </p>
          )}
          {pers.map((c, i) => (
            <CrmImmoColonneRow key={cleColonne(c)} colonne={c}
              premier={i === 0} dernier={i === pers.length - 1}
              onMonter={() => deplacerPerso(i, i - 1)}
              onDescendre={() => deplacerPerso(i, i + 1)}
              onBasculerMasquage={() => onBasculerMasquagePerso(cleColonne(c), !c.masquee)}
              onRenommer={(nom) => onRenommer(cleColonne(c), nom)}
              onSupprimer={() => onSupprimerPerso(cleColonne(c))}
              glisse={glissePers.pourLigne(i)}
            />
          ))}
        </div>

        <div className="px-3 py-3 shrink-0 flex flex-col gap-2"
          style={{ borderTop: `1px solid ${t.modal.border}`, paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={nouveauNom}
              onChange={e => { setNouveauNom(e.target.value); fermeture.reinitialiser(); }}
              placeholder="Nom de la colonne"
              data-testid="crm-immo-colonne-nouveau-nom"
              /* 16 px sous 768 px : sous ce seuil, iOS Safari agrandit la page au
                 toucher du champ, et la modale deborde a droite. */
              className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm max-md:text-base outline-none"
              style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
            />
            <select
              value={nouveauType}
              onChange={e => setNouveauType(e.target.value as TypeColonne)}
              data-testid="crm-immo-colonne-nouveau-type"
              className="px-3 py-2 rounded-lg text-sm max-md:text-base outline-none shrink-0"
              style={{ background: t.selectBg, border: `1px solid ${t.input.border}`, color: t.input.text }}>
              {TYPES_COLONNE.map(x => <option key={x.valeur} value={x.valeur}>{x.libelle}</option>)}
            </select>
            <button type="button"
              onClick={() => { onAjouter(nouveauNom, nouveauType); setNouveauNom(''); }}
              disabled={nouveauNom.trim() === '' || problemeNom !== ''}
              data-testid="crm-immo-colonne-ajouter"
              /* Mesure a 375 px : 349 x 36. Large, mais trop court au doigt. */
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 max-md:py-3 rounded-lg text-sm font-semibold shrink-0 disabled:opacity-50"
              style={{ background: t.accent.solid, color: t.text.inverse }}>
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>
          {fermeture.confirmationDemandee && (
            <p className="text-xs px-3 py-2 rounded-lg break-words" data-testid="crm-immo-colonnes-confirmer-fermeture"
              style={{ background: t.warning.bg, border: `1px solid ${t.warning.border}`, color: t.warning.text }}>
              Le nom que vous tapez sera perdu. Appuyez de nouveau sur Échap, ou cliquez de nouveau à côté, pour fermer.
            </p>
          )}
          {problemeNom !== '' && (
            <p className="text-xs px-3 py-2 rounded-lg" data-testid="crm-immo-colonne-probleme"
              style={{ background: t.warning.bg, border: `1px solid ${t.warning.border}`, color: t.warning.text }}>
              {problemeNom}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
