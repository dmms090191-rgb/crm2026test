import { useState } from 'react';
import { MoreHorizontal, Mail, Phone, Lock, Unlock } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { Vendor } from './vendeurTypes';
import CheckBox from '../crm/CheckBox';
import CopyButton from '../../../../components/CopyButton';
import VendorActionModal from './VendorActionModal';

interface ListeVendeursMobileCardProps {
  vendor: Vendor;
  isSelected: boolean;
  selectMode: boolean;
  onToggleSelect: (id: string) => void;
  onDetail: (vendor: Vendor, fromActions?: boolean) => void;
  onOpenChat?: (vendor: Vendor) => void;
  onConnectAsVendor?: (vendor: Vendor) => void;
  tokens: ThemeTokens;
}

export default function ListeVendeursMobileCard({
  vendor, isSelected, selectMode, onToggleSelect,
  onDetail, onOpenChat, onConnectAsVendor, tokens,
}: ListeVendeursMobileCardProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const initials = `${(vendor.first_name?.[0] ?? '').toUpperCase()}${(vendor.last_name?.[0] ?? '').toUpperCase()}`;
  const unlocked = vendor.can_customize_columns !== false;

  return (
    <div className="px-4 py-4" style={{ borderColor: tokens.table.rowBorder, background: isSelected ? tokens.accent.bg : undefined }}>
      <div className="flex items-start gap-3 mb-3">
        {selectMode && (
          <div className="pt-1">
            <CheckBox checked={isSelected} onChange={() => onToggleSelect(vendor.id)} />
          </div>
        )}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #22d3ee, #2563eb)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', color: '#fff' }}>{initials || '?'}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: tokens.table.cellText }}>{vendor.first_name} {vendor.last_name}</p>
          {vendor.email && (
            <div className="flex items-center gap-1 mt-1">
              <Mail className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
              <span className="text-xs truncate flex-1 min-w-0" style={{ color: tokens.table.cellTextMuted }}>{vendor.email}</span>
              <CopyButton value={vendor.email} />
            </div>
          )}
          {vendor.phone && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Phone className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
              <span className="text-xs" style={{ color: tokens.table.cellTextMuted }}>{vendor.phone}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
          style={unlocked
            ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#16a34a' }
            : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }
          }
        >
          {unlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          Colonnes : {unlocked ? 'Debloquees' : 'Bloquees'}
        </span>
        <button
          onClick={() => setActionsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
          style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />Actions
        </button>
      </div>
      {actionsOpen && (
        <VendorActionModal
          vendor={vendor}
          tokens={tokens}
          onClose={() => setActionsOpen(false)}
          onDetail={() => { setActionsOpen(false); onDetail(vendor, true); }}
          onConnect={() => { setActionsOpen(false); onConnectAsVendor?.(vendor); }}
          onChat={() => { setActionsOpen(false); onOpenChat?.(vendor); }}
        />
      )}
    </div>
  );
}
