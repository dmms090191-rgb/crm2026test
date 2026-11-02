import { ExternalLink, MessageSquareText } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
/*
 * getStatutCfg VIENT DU CRM LEADS, ET C'EST UN CHOIX, PAS UNE FACILITE.
 *
 * Trois routes existaient. (1) Recopier la fonction ici : deux pastilles qui divergent au
 * premier ajustement de couleur. (2) La promouvoir dans src/components/ : il faudrait
 * alors modifier les imports du CRM Leads, c'est-a-dire toucher la vue que David a
 * demande de laisser INCHANGEE. (3) L'importer telle quelle : le nouveau module depend du
 * dossier crm/, et une retouche la-bas se propage ici.
 *
 * On prend la troisieme, parce que c'est la seule qui ne touche rien et que la fonction
 * est PURE — elle prend une couleur et rend des couleurs. Si elle devait un jour bouger,
 * c'est le moment de la promouvoir, avec les deux CRM dans le meme commit.
 */
import { getStatutCfg, FALLBACK_COLOR } from '../crm/utils';
import {
  lienOuvrable, hoteDuLien, apercuCommentaire, commentaireTronque,
  type StatutProspection,
} from '../../../../lib/crmProspectionRecherche';

/**
 * LES TROIS CELLULES QUI NE SONT PAS DU TEXTE : le statut, le lien, le commentaire.
 *
 * Elles vivent ici parce que le tableau (bureau) et les cartes (telephone) doivent en
 * rendre exactement les memes. Deux copies divergeraient, et la divergence ne se verrait
 * que sur l'appareil qu'on ne regarde pas.
 */

/* ----------------------------------------------------------------- STATUT */

export function PastilleStatut({ statutId, statuts }: {
  statutId: string | null;
  statuts: readonly StatutProspection[];
}) {
  const t = useThemeTokens();
  const statut = statutId === null ? undefined : statuts.find((s) => s.id === statutId);

  /*
   * TROIS ETATS, ET LE TROISIEME EST CELUI QU'ON OUBLIE.
   *
   *   pas de statut_id      -> « Sans statut », en gris neutre. C'est l'etat normal
   *                            d'une ligne neuve, et il est explicite plutot que vide.
   *   statut_id connu       -> le nom et la couleur du catalogue.
   *   statut_id INTROUVABLE -> ne devrait pas arriver : la cle etrangere composee
   *                            garantit que le statut existe ET appartient a la Societe,
   *                            et sa suppression remet statut_id a NULL. Mais la liste
   *                            des statuts et celle des leads sont chargees par deux
   *                            requetes : entre les deux, un statut peut avoir disparu.
   *                            On le DIT, au lieu d'afficher une pastille muette.
   */
  if (statutId !== null && statut === undefined) {
    return (
      <span data-testid="statut-introuvable" className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
        style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
        Statut introuvable
      </span>
    );
  }

  const cfg = getStatutCfg(statut?.couleur ?? FALLBACK_COLOR, statut === undefined);
  return (
    <span data-testid="crm-prospection-statut" className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
      {statut?.nom ?? 'Sans statut'}
    </span>
  );
}

/* ------------------------------------------------------------------- LIEN */

export function CelluleLien({ lien }: { lien: string | null }) {
  const t = useThemeTokens();
  if (!lien) return <span style={{ color: t.table.cellTextMuted }}>—</span>;

  /*
   * UN LIEN QUI N'EST NI http NI https N'EST PAS RENDU COMME UN LIEN.
   *
   * La base le refuse deja (contrainte crm_prospection_leads_lien_http), et c'est elle
   * l'autorite. Mais une ligne peut arriver par un chemin que la contrainte n'a pas vu —
   * une restauration de sauvegarde, une ecriture directe. Poser `javascript:...` dans un
   * href en ferait du code execute AU CLIC, avec le jeton et les droits du lecteur. On
   * affiche alors le texte brut : visible, corrigeable, inoffensif.
   */
  if (!lienOuvrable(lien)) {
    return (
      <span data-testid="crm-prospection-lien-inerte" className="text-xs break-all" style={{ color: t.danger.text }}
        title="Ce lien n'est pas une adresse http(s) : il n'est pas ouvrable.">
        {lien}
      </span>
    );
  }

  return (
    <a
      href={lien}
      target="_blank"
      /* noopener : sans lui, la page ouverte recoit window.opener et peut rediriger
         l'onglet de Talvex. noreferrer : elle n'apprend pas d'ou vient le clic. */
      rel="noopener noreferrer"
      data-testid="crm-prospection-lien"
      title={lien}
      className="inline-flex items-center gap-1 text-xs hover:underline"
      style={{ color: t.accent.text }}
    >
      <ExternalLink className="w-3 h-3 shrink-0" />
      {hoteDuLien(lien)}
    </a>
  );
}

/* ------------------------------------------------------------ COMMENTAIRE */

/**
 * LE COMMENTAIRE NE DOIT PAS FAIRE GRANDIR LA LIGNE — demande explicite de David.
 *
 * Les retours a la ligne sont ecrases en espaces et le texte est coupe a 60 caracteres :
 * sans cela, un commentaire sur quatre lignes donne une ligne de tableau quatre fois plus
 * haute, et la liste devient illisible des le troisieme lead.
 *
 * ET LE TEXTE ENTIER RESTE ATTEIGNABLE, par un bouton. Pas une infobulle : une infobulle
 * n'existe pas au doigt, donc pas sur l'iPhone de David, et c'est precisement la ou il
 * relit ses leads.
 */
export function CelluleCommentaire({ commentaire, onVoir }: {
  commentaire: string | null;
  onVoir: () => void;
}) {
  const t = useThemeTokens();
  const texte = (commentaire ?? '').trim();
  if (texte === '') return <span style={{ color: t.table.cellTextMuted }}>—</span>;

  if (!commentaireTronque(texte)) {
    return <span className="text-xs" style={{ color: t.table.cellText }}>{apercuCommentaire(texte)}</span>;
  }

  return (
    <button
      type="button"
      onClick={onVoir}
      data-testid="crm-prospection-voir-commentaire"
      title="Voir le commentaire entier"
      className="inline-flex items-start gap-1.5 text-left text-xs hover:opacity-80 transition-opacity"
      style={{ color: t.table.cellText }}
    >
      <MessageSquareText className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: t.accent.text }} />
      <span>{apercuCommentaire(texte)}</span>
    </button>
  );
}
