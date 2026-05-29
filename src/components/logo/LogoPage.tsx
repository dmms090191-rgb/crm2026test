import { Wand2 } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import LogoAiTab from './LogoAiTab';

interface Props {
  companyId: string | null;
  title?: string;
  subtitle?: string;
  isSAViewing?: boolean;
  isSA?: boolean;
}

export default function LogoPage({ companyId, title = 'Logo', subtitle = 'Gerez les logos de la plateforme' }: Props) {
  const t = useThemeTokens();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 pt-2.5 sm:pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              boxShadow: '0 4px 16px rgba(245,158,11,0.18)',
            }}>
            <Wand2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-tight leading-tight" style={{ color: t.heading.primary }}>{title}</h2>
            <p className="text-[10px] font-medium" style={{ color: t.text.quaternary }}>{subtitle}</p>
          </div>
        </div>
        <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest"
          style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706', border: '1px solid rgba(245,158,11,0.15)' }}>
          Recraft V4.1
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <LogoAiTab companyId={companyId} />
      </div>
    </div>
  );
}
