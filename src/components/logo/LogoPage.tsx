import { useThemeTokens } from '../../hooks/useThemeTokens';
import LogoAiTab from './LogoAiTab';

interface Props {
  companyId: string | null;
  title?: string;
  subtitle?: string;
  isSAViewing?: boolean;
  isSA?: boolean;
  appIconSelectionMode?: boolean;
  onAppIconSelected?: () => void;
}

export default function LogoPage({ companyId, title = 'Logo', subtitle = 'Gerez les logos de la plateforme', isSA, appIconSelectionMode, onAppIconSelected }: Props) {
  const t = useThemeTokens();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-5 sm:px-6 pt-3 pb-2.5 flex-shrink-0"
        style={{
          borderBottom: `1px solid ${t.surface.borderLight}`,
          background: `linear-gradient(180deg, rgba(245,158,11,0.015) 0%, transparent 100%)`,
        }}>
        <h2 className="text-[15px] sm:text-base font-extrabold tracking-tight leading-tight" style={{ color: t.heading.primary }}>{title}</h2>
        <p className="text-[10px] sm:text-[11px] font-medium mt-0.5" style={{ color: t.text.quaternary }}>{subtitle}</p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <LogoAiTab companyId={companyId} isSA={isSA} appIconSelectionMode={appIconSelectionMode} onAppIconSelected={onAppIconSelected} />
      </div>
    </div>
  );
}
