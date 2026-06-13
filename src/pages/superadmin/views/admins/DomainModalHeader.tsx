import { ArrowLeft, Globe, X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Props {
  companyName: string;
  onClose: () => void;
  onBack?: () => void;
}

export default function DomainModalHeader({ companyName, onClose, onBack }: Props) {
  const t = useThemeTokens();
  return (
    <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
      {onBack && (
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 hover:scale-105"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      )}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 0 16px rgba(14,165,233,0.3)' }}>
        <Globe className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm" style={{ color: t.modal.title }}>Domaine de la societe</p>
        <p className="text-xs truncate" style={{ color: t.modal.subtitle }}>{companyName}</p>
      </div>
      <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
        style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
