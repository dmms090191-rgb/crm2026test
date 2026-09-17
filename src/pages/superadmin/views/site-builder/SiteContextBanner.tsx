import { ChevronRight, Eye } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { SiteContextState } from '../../../../lib/siteContextModel';

interface Props {
  t: ThemeTokens;
  ctx: SiteContextState;
}

/* Rappel compact « qui agit sur quel site ». Responsive : la chaine passe a la ligne sur mobile. */
export default function SiteContextBanner({ t, ctx }: Props) {
  if (ctx.status !== 'ready' || ctx.chain.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-x-1.5 gap-y-1 px-3 py-1.5 text-[11px] sm:text-xs min-w-0"
      style={{ borderBottom: `1px solid ${t.surface.border}`, color: t.text.secondary }}
      aria-label="Site gere"
    >
      {ctx.isVisu && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
          style={{ background: 'rgba(14,165,233,0.10)', color: '#0ea5e9' }}
        >
          <Eye className="w-3 h-3" />
          Visu
        </span>
      )}
      {ctx.chain.map((step, i) => (
        <span key={`${step.kind}-${i}`} className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
          {i > 0 && <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-60" />}
          <span
            className="truncate"
            style={{ color: i === ctx.chain.length - 1 ? t.heading.primary : t.text.secondary, fontWeight: i === ctx.chain.length - 1 ? 700 : 500 }}
          >
            {step.label}
          </span>
        </span>
      ))}
    </div>
  );
}
