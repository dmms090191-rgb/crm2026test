import { LayoutGrid, Info } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { SiteTemplate } from '../../../../lib/companyHomePages';
import type { TemplateEntry } from '../../../../lib/siteWorkspaceModel';
import SiteTemplateCard from './SiteTemplateCard';
import { EmptyPanel, SITE_ACCENT } from './SiteUiParts';

/*
 * TEMPLATES : bibliotheque des templates auxquels l'entreprise ciblee a acces.
 * Un template n'est qu'un modele d'apparence : chaque entreprise garde son propre site,
 * son domaine, ses formulaires, son CRM, ses leads, clients, RDV et boutiques.
 */
interface Props {
  t: ThemeTokens;
  entries: TemplateEntry[];
  targetName: string;
  actorIsTalvex: boolean;
  isPlatformSite: boolean;
  onPreview: (template: SiteTemplate) => void;
  onUse: (template: SiteTemplate) => void;
}

export default function SiteTemplateLibrary({ t, entries, targetName, actorIsTalvex, isPlatformSite, onPreview, onUse }: Props) {
  if (entries.length === 0) {
    return (
      <EmptyPanel
        t={t}
        icon={<LayoutGrid className="w-6 h-6" />}
        title="Aucun template disponible"
        text={`Aucun template n'est encore attribué à ${targetName}. L'équipe Talvex peut vous en attribuer un.`}
      />
    );
  }

  const showAssignment = actorIsTalvex && !isPlatformSite;

  return (
    <div className="space-y-3" data-testid="site-template-library">
      <div className="rounded-2xl px-4 py-3 flex items-start gap-2.5"
        style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.18)' }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: SITE_ACCENT }} />
        <div className="space-y-1">
          <p className="text-sm sm:text-xs leading-relaxed" style={{ color: t.text.primary }}>
            Un template définit l'apparence de votre site. Vos contenus, votre domaine, vos contacts, clients, rendez-vous et boutiques restent ceux de {targetName}.
          </p>
          {showAssignment && (
            <p className="text-sm sm:text-xs leading-relaxed" style={{ color: t.text.secondary }}>
              Espace Talvex : vous voyez tous les templates. Utiliser un template « Non attribué » l'attribue automatiquement à cette entreprise.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {entries.map(entry => (
          <SiteTemplateCard
            key={entry.template.id}
            t={t}
            entry={entry}
            showAssignment={showAssignment}
            onPreview={onPreview}
            onUse={onUse}
          />
        ))}
      </div>
    </div>
  );
}
