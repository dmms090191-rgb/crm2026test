import { createPortal } from 'react-dom';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import SiteManagerShell, { type SiteOwnerType } from './SiteManagerShell';

interface Props {
  ownerType: SiteOwnerType;
  title: string;
  subtitle: string;
  companyId?: string | null;
  societeId?: string | null;
  hideDomainTab?: boolean;
  onClose: () => void;
  onBack?: () => void;
}

export default function SiteManagerModal({ ownerType, title, subtitle, companyId, societeId, hideDomainTab, onClose, onBack }: Props) {
  const t = useThemeTokens();

  return createPortal(
    <div
      className="fixed inset-0 flex items-start justify-center p-2 sm:p-4 pt-4 sm:pt-12 overflow-y-auto overflow-x-hidden"
      style={{ zIndex: 99990, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl rounded-2xl p-3 sm:p-5 mb-8 min-w-0"
        style={{ background: t.main.bg, border: `1px solid ${t.card.border}`, boxShadow: '0 16px 64px rgba(0,0,0,0.4)' }}
        onClick={e => e.stopPropagation()}
      >
        <SiteManagerShell
          ownerType={ownerType}
          title={title}
          subtitle={subtitle}
          companyId={companyId}
          societeId={societeId}
          hideDomainTab={hideDomainTab}
          onClose={onClose}
          onBack={onBack}
        />
      </div>
    </div>,
    document.body
  );
}
