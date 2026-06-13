import { Building2, ArrowRight } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import SAProjectHealthCard from './dashboard/SAProjectHealthCard';
import type { SAView } from '../SuperAdminSidebar';
import { useVCElement } from '../../../components/visualCustomize/useVCElement';

interface SADashboardProps {
  onNavigate?: (view: SAView) => void;
  onNavigateToAudit?: () => void;
  adminCount?: number;
  adminsLoading?: boolean;
}

export default function SADashboard(props: SADashboardProps) {
  return <SADashboardInner {...props} />;
}

function SADashboardInner({ onNavigate, onNavigateToAudit, adminCount = 0, adminsLoading }: SADashboardProps) {
  const t = useThemeTokens();
  const enterpriseBg = `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`;

  const titleVC = useVCElement<HTMLHeadingElement>('sa-dashboard-title', 'text', 'Titre Dashboard', {
    color: t.text.primary,
  });
  const subtitleVC = useVCElement<HTMLParagraphElement>('sa-dashboard-subtitle', 'text', 'Sous-titre', {
    color: t.text.secondary,
  });
  const enterpriseCardVC = useVCElement<HTMLDivElement>('sa-dashboard-card-enterprises', 'card', 'Carte Entreprises', {
    background: enterpriseBg,
    border: `1px solid ${t.surface.border}`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  });
  const adminsBtnVC = useVCElement<HTMLButtonElement>('sa-dashboard-btn-admins', 'button', 'Bouton Voir admins', {
    color: t.accent.text,
  });
  const entIconVC = useVCElement<HTMLDivElement>('sa-dashboard-ent-icon', 'text', 'Icone Entreprises', { color: '#ffffff' });
  const entTitleVC = useVCElement<HTMLSpanElement>('sa-dashboard-ent-title', 'text', 'Titre ENTREPRISES', { color: t.text.tertiary });
  const entCountVC = useVCElement<HTMLSpanElement>('sa-dashboard-ent-count', 'text', 'Nombre Entreprises', { color: t.text.primary });
  const entCaptionVC = useVCElement<HTMLParagraphElement>('sa-dashboard-ent-caption', 'text', 'Texte Societes clientes', { color: t.text.tertiary });

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6 max-w-5xl">
      <div>
        <h1 ref={titleVC.ref} className="text-lg md:text-2xl font-bold" style={titleVC.style}>
          Dashboard Rois Admin
        </h1>
        <p ref={subtitleVC.ref} className="text-xs md:text-sm mt-0.5 md:mt-1" style={subtitleVC.style}>
          Vue globale de la plateforme Talvex.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <div ref={enterpriseCardVC.ref} className="rounded-2xl overflow-hidden" style={enterpriseCardVC.style}>
          <div className="p-3 md:p-5">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="flex items-center gap-2">
                <div
                  ref={entIconVC.ref}
                  className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    boxShadow: '0 0 20px rgba(37,99,235,0.25)',
                    ...entIconVC.style,
                  }}
                >
                  <Building2 className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]" />
                </div>
                <span ref={entTitleVC.ref} className="text-[10px] md:text-xs font-semibold uppercase tracking-wider" style={entTitleVC.style}>
                  Entreprises
                </span>
              </div>
            </div>

            {adminsLoading ? (
              <div className="flex items-end gap-2 mb-1 md:mb-2">
                <div className="h-8 md:h-10 w-10 md:w-12 rounded-lg animate-pulse" style={{ background: t.surface.tertiary }} />
              </div>
            ) : (
              <div className="flex items-end gap-2 mb-1 md:mb-2">
                <span
                  ref={entCountVC.ref}
                  className="text-2xl md:text-4xl font-extrabold tabular-nums leading-none"
                  style={entCountVC.style}
                >
                  {adminCount}
                </span>
              </div>
            )}

            <p ref={entCaptionVC.ref} className="text-[10px] md:text-xs" style={entCaptionVC.style}>
              {adminCount === 1 ? 'Societe cliente active' : 'Societes clientes actives'} dans Talvex
            </p>
          </div>

          <div style={{ height: '1px', background: t.surface.borderLight }} />

          <button
            ref={adminsBtnVC.ref}
            onClick={() => onNavigate?.('admins')}
            className="w-full flex items-center justify-between px-3 md:px-5 py-2 md:py-3 text-[11px] md:text-xs font-medium transition-all"
            style={adminsBtnVC.style}
            onMouseEnter={e => { if (!adminsBtnVC.style?.background) e.currentTarget.style.background = t.surface.hover; }}
            onMouseLeave={e => { if (!adminsBtnVC.style?.background) e.currentTarget.style.background = 'transparent'; }}
          >
            Voir la liste des admins
            <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
          </button>
        </div>
      </div>

      <SAProjectHealthCard onNavigateToAudit={onNavigateToAudit} />
    </div>
  );
}
