import { Check, LayoutGrid } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { SiteTemplate } from '../../../../lib/companyHomePages';
import type { TemplateEntry } from '../../../../lib/siteWorkspaceModel';
import SiteTemplateLibrary from './SiteTemplateLibrary';
import { SITE_ACCENT } from './SiteUiParts';

/*
 * ETAPE 2 — CHOISIR SON SITE.
 * Meme bibliotheque de templates qu'avant (droits reels de l'entreprise, attributions inchangees) :
 * seule la presentation change, aucun second moteur de templates n'est cree.
 */
interface Props {
  t: ThemeTokens;
  entries: TemplateEntry[];
  targetName: string;
  actorIsTalvex: boolean;
  isPlatformSite: boolean;
  domain: string | null;
  onManageDomain: () => void;
  onPreview: (template: SiteTemplate) => void;
  onUse: (template: SiteTemplate) => void;
}

export default function SiteChooseTemplateStep({ t, entries, targetName, actorIsTalvex, isPlatformSite, domain, onManageDomain, onPreview, onUse }: Props) {
  return (
    <div className="space-y-4" data-testid="site-step-template">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h3 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2.5" style={{ color: t.heading.primary }}>
            <LayoutGrid className="w-5 h-5 flex-shrink-0" style={{ color: SITE_ACCENT }} aria-hidden="true" />
            Choisissez votre site
          </h3>
          <p className="text-sm mt-1.5 leading-relaxed" style={{ color: t.text.secondary }}>
            Sélectionnez l'apparence de votre site. Vous pourrez en changer à tout moment.
          </p>
        </div>
        {domain && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs font-medium min-w-0"
              style={{ background: t.success.bg, border: `1px solid ${t.success.border}`, color: t.success.text }}>
              <Check className="w-3 h-3 flex-shrink-0" strokeWidth={3} aria-hidden="true" />
              <span className="truncate">{domain}</span>
            </span>
            <button type="button" onClick={onManageDomain} data-testid="site-template-change-domain"
              className="inline-flex items-center justify-center min-h-[44px] sm:min-h-[32px] px-3 sm:px-2 rounded-lg text-sm sm:text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              style={{ color: SITE_ACCENT }}>
              Modifier
            </button>
          </div>
        )}
      </div>

      <SiteTemplateLibrary t={t} entries={entries} targetName={targetName} actorIsTalvex={actorIsTalvex}
        isPlatformSite={isPlatformSite} onPreview={onPreview} onUse={onUse} />
    </div>
  );
}
