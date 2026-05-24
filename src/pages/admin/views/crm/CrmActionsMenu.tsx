import { useState } from 'react';
import { Eye, LogIn, MessageCircle, CalendarClock, Settings2 } from 'lucide-react';
import { useActionMenuOrder } from '../../../../components/action-menu/useActionMenuOrder';
import ActionMenuReorderPanel, { type ActionMenuItem } from '../../../../components/action-menu/ActionMenuReorderPanel';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import type { ThemeTokens } from '../../../../lib/themeTokens';

const DEFAULT_ORDER = ['detail', 'connect', 'chat', 'rdv'];

function buildItems(tokens: ThemeTokens): ActionMenuItem[] {
  return [
    { id: 'detail', label: 'Detail', icon: <Eye className="w-3.5 h-3.5" />, color: tokens.accent.text },
    { id: 'connect', label: 'Connect', icon: <LogIn className="w-3.5 h-3.5" />, color: tokens.success.text },
    { id: 'chat', label: 'Chat', icon: <MessageCircle className="w-3.5 h-3.5" />, color: tokens.warning.text },
    { id: 'rdv', label: 'RDV', icon: <CalendarClock className="w-3.5 h-3.5" />, color: '#22d3ee' },
  ];
}

function getButtonStyle(id: string, tokens: ThemeTokens) {
  switch (id) {
    case 'detail': return { background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text };
    case 'connect': return { background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text };
    case 'chat': return { background: tokens.warning.bg, border: `1px solid ${tokens.warning.border}`, color: tokens.warning.text };
    case 'rdv': return { background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.18)', color: '#22d3ee' };
    default: return {};
  }
}

interface Props {
  handlers: Record<string, () => void>;
  tokens: ThemeTokens;
  buttonPadding?: string;
}

export default function CrmActionsMenu({ handlers, tokens, buttonPadding = 'py-2' }: Props) {
  const [reorderMode, setReorderMode] = useState(false);
  const companyId = useCompanyId();
  const storageKey = `action_menu_order_admin_crm_${companyId}`;
  const { order, save } = useActionMenuOrder(storageKey, DEFAULT_ORDER);
  const items = buildItems(tokens);
  const sortedItems = order.map(id => items.find(i => i.id === id)).filter(Boolean) as ActionMenuItem[];

  return (
    <>
      <div className="flex items-center justify-end mb-2">
        <button
          onClick={() => setReorderMode(r => !r)}
          className="w-5 h-5 rounded-md flex items-center justify-center transition-all"
          style={reorderMode ? { background: tokens.accent.bg, color: tokens.accent.text } : { background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}
          title="Reorganiser"
        >
          <Settings2 className="w-3 h-3" />
        </button>
      </div>
      {reorderMode ? (
        <ActionMenuReorderPanel
          items={items}
          order={order}
          onSave={(o) => { save(o); setReorderMode(false); }}
          onCancel={() => setReorderMode(false)}
          tokens={tokens}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {sortedItems.map(item => (
            <button
              key={item.id}
              onClick={handlers[item.id]}
              className={`flex items-center gap-2 w-full px-3 ${buttonPadding} rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95`}
              style={getButtonStyle(item.id, tokens)}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
