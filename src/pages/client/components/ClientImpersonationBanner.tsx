import { ArrowLeft } from 'lucide-react';
import type { ImpersonatedClientInfo } from '../ClientDashboard';
import type { ClientActiveView } from '../ClientDashboard';
import type { ThemeTokens } from '../../../lib/themeTokensTypes';
import DemoEmitterLayer from '../../../components/demo/DemoEmitterLayer';

interface Props {
  impersonatedClient: ImpersonatedClientInfo;
  onBackToAdmin: () => void;
  backLabel: string;
  isSAViewing?: boolean;
  demoStatus: 'idle' | 'pending' | 'active';
  clientName: string;
  activeView: ClientActiveView;
  breadcrumb: string;
  tokens: ThemeTokens;
}

export default function ClientImpersonationBanner({
  impersonatedClient, onBackToAdmin, backLabel, isSAViewing, demoStatus,
  clientName, activeView, breadcrumb, tokens,
}: Props) {
  return (
    <div
      className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 md:px-5 py-2"
      style={{ background: isSAViewing && demoStatus === 'active' ? 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(245,158,11,0.06) 100%)' : 'rgba(14,165,233,0.06)', borderBottom: `1px solid ${isSAViewing && demoStatus === 'active' ? 'rgba(245,158,11,0.25)' : 'rgba(14,165,233,0.15)'}` }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {(!isSAViewing || demoStatus !== 'active') && (
          <button
            onClick={onBackToAdmin}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all hover:scale-105 flex-shrink-0 whitespace-nowrap"
            style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', color: '#0ea5e9' }}
          >
            <ArrowLeft className="w-3 h-3 flex-shrink-0" />
            {backLabel}
          </button>
        )}
        <span className="text-xs truncate" style={{ color: isSAViewing && demoStatus === 'active' ? '#f59e0b' : tokens.text.quaternary }}>
          {isSAViewing && demoStatus === 'active' ? (
            <>Demo en direct active avec <span className="font-medium">{clientName}</span></>
          ) : isSAViewing && demoStatus === 'pending' ? (
            <>Invitation demo envoyee a <span className="font-medium">{clientName}</span></>
          ) : (
            <>Vue client de <span className="font-medium" style={{ color: tokens.text.secondary }}>{clientName}</span></>
          )}
        </span>
      </div>
      {isSAViewing && (
        <DemoEmitterLayer
          activeView={activeView}
          viewLabel={breadcrumb}
          targetUserId={impersonatedClient.id}
          targetRole="client"
          targetName={[impersonatedClient.prenom, impersonatedClient.nom].filter(Boolean).join(' ') || impersonatedClient.email}
          companyId={null}
          tokens={tokens}
        />
      )}
    </div>
  );
}
