import { useState } from 'react';
import { LogOut, ChevronLeft, ArrowUpDown } from 'lucide-react';
import type { getThemeTokens } from '../../lib/themeTokens';

interface SidebarFooterActionsProps {
  collapsed: boolean;
  onLogout: () => void;
  onCollapse: () => void;
  onReorganize?: () => void;
  reordering?: boolean;
  tokens: ReturnType<typeof getThemeTokens>;
}

export default function SidebarFooterActions({
  collapsed, onLogout, onCollapse, onReorganize, reordering, tokens: t,
}: SidebarFooterActionsProps) {
  return (
    <div
      className="flex-shrink-0 px-2.5 pb-3 pt-2.5"
      style={{ borderTop: `1px solid ${t.sidebar.divider}` }}
    >
      <div className={`flex flex-col ${collapsed ? 'gap-1' : 'gap-1.5'}`}>
        {onReorganize && !reordering && (
          <FooterButton
            icon={<ArrowUpDown className="w-4 h-4" />}
            label="Reorganiser"
            collapsed={collapsed}
            restColor={t.sidebar.collapseText}
            hoverBg={t.sidebar.activeItemBg}
            hoverColor={t.sidebar.activeItemText}
            hoverShadow={`0 0 12px ${t.sidebar.activeItemDot}22`}
            onClick={onReorganize}
          />
        )}

        <FooterButton
          icon={<LogOut className="w-4 h-4" />}
          label="Deconnexion"
          collapsed={collapsed}
          restColor={t.sidebar.logoutText}
          hoverBg="rgba(239,68,68,0.08)"
          hoverColor={t.sidebar.logoutHover}
          hoverBorder="rgba(239,68,68,0.15)"
          onClick={onLogout}
        />

        <FooterButton
          icon={
            <ChevronLeft
              className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
            />
          }
          label={collapsed ? 'Agrandir' : 'Reduire'}
          collapsed={collapsed}
          restColor={t.sidebar.collapseText}
          hoverBg={`${t.sidebar.collapseHover}14`}
          hoverColor={t.sidebar.collapseHover}
          onClick={onCollapse}
        />
      </div>
    </div>
  );
}

function FooterButton({ icon, label, collapsed, restColor, hoverBg, hoverColor, hoverBorder, hoverShadow, onClick }: {
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  restColor: string;
  hoverBg: string;
  hoverColor: string;
  hoverBorder?: string;
  hoverShadow?: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`w-full flex items-center rounded-xl transition-all duration-200 ${
        collapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3.5 h-10'
      }`}
      style={{
        color: hovered ? hoverColor : restColor,
        background: hovered ? hoverBg : 'transparent',
        border: hovered && hoverBorder ? `1px solid ${hoverBorder}` : '1px solid transparent',
        boxShadow: hovered && hoverShadow ? hoverShadow : 'none',
      }}
    >
      <span className="flex-shrink-0 transition-colors duration-200">{icon}</span>
      {!collapsed && (
        <span className="text-[13px] font-medium transition-colors duration-200">{label}</span>
      )}
    </button>
  );
}
