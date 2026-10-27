import type { ReactNode } from 'react';
import type { LayoutDefaultSection, LayoutPanel } from '../lib/sidebarLayout';
/*
 * Les definitions de navigation, et non les composants qui les rendent. Trois panels les
 * ont vues sortir de leur barre laterale le 27/10/2026, pour cette raison precise. Talvex
 * Administrateur les expose encore depuis son composant : c'est anterieur a ce chantier, et
 * ses deux avertissements react-refresh avec — a reprendre a part.
 */
import { ICONS as SA_ICONS, LAYOUT_SECTIONS as SA_SECTIONS } from '../pages/superadmin/SuperAdminSidebar';
import { PROTECTED_TAB_IDS } from '../pages/superadmin/useSAHiddenTabs';
import { ICONS as ADMIN_ICONS, LAYOUT_SECTIONS as ADMIN_SECTIONS } from '../pages/admin/navigationAdmin';
import { ICONS as VENDOR_ICONS, LAYOUT_SECTIONS as VENDOR_SECTIONS } from '../pages/vendor/navigationVendor';
import { BASE_SECTIONS as CLIENT_BASE_SECTIONS } from '../pages/client/navigationClient';
import type { RoleTelephone } from './navigationMobile';

export type UserRole = RoleTelephone;

/*
 * ============ LA SOURCE DE NAVIGATION, UNE PAR ROLE, ET AUCUNE DE PLUS ============
 *
 * pwaMobileShellConfig.tsx portait deux listes d'onglets ECRITES EN DUR (getTabsForRole,
 * getMoreTabs). Elles sont supprimees. A leur place, le role designe la MEME source que sa
 * barre laterale de bureau : ses sections, ses icones, son panel de configuration.
 *
 * Masquer un onglet sur le bureau le retire donc du telephone. Le renommer le renomme. Le
 * deplacer le deplace. Sans une ligne de code de plus — c'etait tout l'enjeu.
 *
 * Ce module est separe du fichier de vues pour une raison que le greffon de rafraichissement
 * a signalee plutot que devinee : un fichier .tsx qui exporte a la fois des composants et des
 * constantes casse le Fast Refresh (react-refresh/only-export-components). Les deux
 * responsabilites etaient melangees ; elles ne le sont plus.
 *
 * ---------- L'IDENTITE DES TABLEAUX EST STABLE, ET CE N'EST PAS COSMETIQUE ----------
 *
 * Ces sections sont des constantes de module, donc la MEME reference a chaque rendu. C'est
 * obligatoire : useSidebarLayout calcule `defaults = useMemo(..., [sections])` et son effet
 * de chargement depend de `defaults`. Un tableau reconstruit a chaque rendu relancerait
 * l'effet en boucle — une panne invisible a l'ecran, visible seulement au reseau. C'est
 * ecrit noir sur blanc dans crmImmoSidebar.ts, et la raison vaut ici a l'identique.
 *
 * Seul le panel Societe compose ses sections au vol, pour y injecter CRM Immo selon le droit
 * reel. La coquille le fait avec un useMemo dont la dependance est le seul BOOLEEN, jamais
 * l'etat a quatre valeurs du droit.
 */

export interface SourceNav {
  /** Cle de configuration : `v2:<panel>`. La confondre ferait lire a une Societe la barre de Talvex. */
  panel: LayoutPanel;
  sections: LayoutDefaultSection[];
  /** Onglets qu'aucune reorganisation ne peut masquer. */
  protectedIds: readonly string[];
  /** Icones par id — EXACTEMENT celles du bureau, jamais un second jeu. */
  icons: Record<string, ReactNode>;
}

/** Aucun onglet protege hors de Talvex : les trois autres panels n'en declarent pas. */
const AUCUN_PROTEGE: readonly string[] = [];

/*
 * LE CLIENT N'A PAS DE layout.visible — ET LE TYPE LE DIT.
 *
 * `LayoutPanel` vaut 'company_super_admin' | 'admin' | 'super_admin' | 'vendor'. Il n'y a
 * pas de panel 'client' : ClientSidebar tourne encore sur l'ancien moteur de masquage
 * (usePanelHiddenTabs). Le porter en V2 est un chantier a part, explicitement hors de
 * celui-ci.
 *
 * Mais on ne garde pas pour autant une liste en dur pour lui : ses sections viennent de
 * BASE_SECTIONS, la source de SA barre laterale, convertie a la forme commune. Son masquage
 * reste assure par son moteur a lui, et la coquille lit la MEME cle que ClientSidebar
 * (panel 'client', companyId null). Meme principe, autre moteur — et plus aucune liste
 * parallele.
 *
 * `suivi-corporel` n'est pas ici : il vit dans WELLNESS_SECTION, conditionne a
 * useIsWellnessClient, et sa vue n'est pas declaree rendable sur telephone a cette etape.
 */
export const CLIENT_SECTIONS: LayoutDefaultSection[] = CLIENT_BASE_SECTIONS.map(s => ({
  title: s.title,
  items: s.items.map(i => ({ id: i.id, label: i.label })),
}));

export const CLIENT_ICONS: Record<string, ReactNode> = Object.fromEntries(
  CLIENT_BASE_SECTIONS.flatMap(s => s.items.map(i => [i.id, i.icon])),
);

export const SOURCES_NAV: Record<UserRole, SourceNav> = {
  super_admin: { panel: 'super_admin', sections: SA_SECTIONS, protectedIds: PROTECTED_TAB_IDS, icons: SA_ICONS },
  admin: { panel: 'admin', sections: ADMIN_SECTIONS, protectedIds: AUCUN_PROTEGE, icons: ADMIN_ICONS },
  vendor: { panel: 'vendor', sections: VENDOR_SECTIONS, protectedIds: AUCUN_PROTEGE, icons: VENDOR_ICONS },
  /* Jamais lu par useSidebarLayout : la coquille passe `actif: false` pour le client, ce qui
     rend le crochet inerte. Le panel est renseigne pour que le type reste total. */
  client: { panel: 'admin', sections: CLIENT_SECTIONS, protectedIds: AUCUN_PROTEGE, icons: CLIENT_ICONS },
};
