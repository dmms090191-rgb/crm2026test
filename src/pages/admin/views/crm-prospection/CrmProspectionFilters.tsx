import { Search, X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import {
  SANS_STATUT, FILTRES_VIDES, filtresActifs,
  type FiltresProspection, type StatutProspection,
} from '../../../../lib/crmProspectionRecherche';

/**
 * LA BARRE DE FILTRES — « toujours visible et identique », mot pour mot la demande.
 *
 * Elle ne se replie pas, ne change pas de forme selon la largeur, et ne disparait pas
 * quand la liste est vide : une barre qui s'escamote oblige a se rappeler ou elle etait,
 * et une barre absente sur liste vide empeche justement de RELACHER le filtre qui a vide
 * la liste.
 *
 * LES QUATRE CHAMPS SE COMBINENT PAR UN ET. Poser un second filtre reduit toujours la
 * liste, jamais l'inverse — voir `filtrer` dans src/lib/crmProspectionRecherche.ts, ou
 * cette regle est eprouvee.
 *
 * Societe et Poste sont des CHAMPS DE SAISIE, pas des listes deroulantes, et c'est la
 * convention du CRM Leads (filterNom, filterPrenom, filterEmail, filterTel sont des
 * champs ; seul le statut a une liste). Une liste deroulante alimentee par les valeurs
 * deja saisies se remplirait de fautes de frappe et grandirait sans fin.
 */

interface Props {
  filtres: FiltresProspection;
  onChange: (f: FiltresProspection) => void;
  statuts: readonly StatutProspection[];
  /** Le compte affiche / le compte total : dit pourquoi la liste est courte. */
  nbAffiches: number;
  nbTotal: number;
}

export default function CrmProspectionFilters({ filtres, onChange, statuts, nbAffiches, nbTotal }: Props) {
  const t = useThemeTokens();
  const actifs = filtresActifs(filtres);

  const champStyle = {
    background: t.input.bg,
    border: `1px solid ${t.input.border}`,
    color: t.input.text,
  };

  return (
    <div
      data-testid="crm-prospection-filtres"
      className="rounded-xl p-3 mb-4"
      style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}
    >
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
        {/* La recherche globale, en premier et la plus large : c'est le geste le plus frequent. */}
        <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: t.input.placeholder }} />
          <input
            type="search"
            data-testid="crm-prospection-recherche"
            value={filtres.recherche}
            onChange={(e) => onChange({ ...filtres, recherche: e.target.value })}
            placeholder="Rechercher : nom, prénom, e-mail, société, poste"
            aria-label="Recherche globale"
            className="w-full h-10 pl-9 pr-3 rounded-lg text-sm outline-none"
            style={champStyle}
          />
        </div>

        <select
          data-testid="crm-prospection-filtre-statut"
          value={filtres.statut}
          onChange={(e) => onChange({ ...filtres, statut: e.target.value })}
          aria-label="Filtrer par statut"
          className="h-10 px-3 rounded-lg text-sm outline-none sm:w-44"
          style={champStyle}
        >
          <option value="">Tous les statuts</option>
          {/* « Sans statut » n'est pas une ligne de la table statuts : c'est l'absence de
              statut_id. Son jeton ne peut donc pas etre la chaine vide, qui veut deja dire
              « tous » — deux sens dans la meme liste donneraient un filtre inerte. */}
          <option value={SANS_STATUT}>Sans statut</option>
          {statuts.map((s) => (
            <option key={s.id} value={s.id}>{s.nom}</option>
          ))}
        </select>

        {/* « Societe » a l'ecran, `entreprise` en base : ici c'est l'employeur du prospect,
            pas la Societe Talvex. Voir le commentaire de la migration. */}
        <input
          type="text"
          data-testid="crm-prospection-filtre-entreprise"
          value={filtres.entreprise}
          onChange={(e) => onChange({ ...filtres, entreprise: e.target.value })}
          placeholder="Société"
          aria-label="Filtrer par société"
          className="h-10 px-3 rounded-lg text-sm outline-none sm:w-40"
          style={champStyle}
        />

        <input
          type="text"
          data-testid="crm-prospection-filtre-poste"
          value={filtres.poste}
          onChange={(e) => onChange({ ...filtres, poste: e.target.value })}
          placeholder="Poste"
          aria-label="Filtrer par poste"
          className="h-10 px-3 rounded-lg text-sm outline-none sm:w-40"
          style={champStyle}
        />

        {/*
          REINITIALISER EST TOUJOURS LA, mais inerte quand il n'y a rien a reinitialiser.
          Le faire APPARAITRE deplacerait les trois champs voisins au moment ou on tape —
          et on cliquerait sur le mauvais.
        */}
        <button
          type="button"
          data-testid="crm-prospection-reinitialiser"
          onClick={() => onChange(FILTRES_VIDES)}
          disabled={!actifs}
          className="h-10 px-3 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 transition-opacity"
          style={{
            background: t.surface.secondary,
            border: `1px solid ${t.surface.border}`,
            color: actifs ? t.text.primary : t.label.muted,
            opacity: actifs ? 1 : 0.5,
            cursor: actifs ? 'pointer' : 'not-allowed',
          }}
        >
          <X className="w-3.5 h-3.5" />
          Réinitialiser
        </button>
      </div>

      {/*
        LE COMPTE, ET POURQUOI IL COMPTE. Sans lui, une liste vide a cause d'un filtre
        oublie est indiscernable d'un CRM vide. La phrase ne s'affiche que lorsqu'un
        filtre masque quelque chose : le reste du temps elle n'apprendrait rien.
      */}
      {actifs && (
        <p data-testid="crm-prospection-compte" className="text-xs mt-2" style={{ color: t.label.muted }}>
          {nbAffiches} ligne{nbAffiches > 1 ? 's' : ''} affichée{nbAffiches > 1 ? 's' : ''} sur {nbTotal}
        </p>
      )}
    </div>
  );
}
