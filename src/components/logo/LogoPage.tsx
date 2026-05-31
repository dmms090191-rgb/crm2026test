import { Wand2, Cpu } from 'lucide-react';
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

export default function LogoPage({ companyId, title = 'Logo', subtitle = 'Gerez les logos de la plateforme', appIconSelectionMode, onAppIconSelected }: Props) {
  const t = useThemeTokens();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 sm:px-6 pt-4 sm:pt-5 pb-4 sm:pb-5 flex-shrink-0"
        style={{
          borderBottom: `1px solid ${t.surface.borderLight}`,
          background: `linear-gradient(180deg, rgba(245,158,11,0.015) 0%, transparent 100%)`,
        }}>
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #b45309 100%)',
              boxShadow: '0 6px 20px rgba(245,158,11,0.22), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}>
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-[15px] sm:text-base font-extrabold tracking-tight leading-tight" style={{ color: t.heading.primary }}>{title}</h2>
            <p className="text-[10px] sm:text-[11px] font-medium mt-0.5" style={{ color: t.text.quaternary }}>{subtitle}</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(217,119,6,0.08))',
            border: '1px solid rgba(245,158,11,0.12)',
            boxShadow: '0 2px 12px rgba(245,158,11,0.04)',
          }}>
          <div className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #b45309)', boxShadow: '0 2px 6px rgba(245,158,11,0.2)' }}>
            <Cpu className="w-2.5 h-2.5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-bold uppercase tracking-[0.12em] leading-none" style={{ color: '#b45309' }}>
              Moteur IA
            </span>
            <span className="text-[10px] font-extrabold leading-tight" style={{ color: '#d97706' }}>
              Recraft V4.1
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <LogoAiTab companyId={companyId} appIconSelectionMode={appIconSelectionMode} onAppIconSelected={onAppIconSelected} />
      </div>
    </div>
  );
}
