import { useState } from 'react';
import { LogOut, ChevronLeft, ArrowUpDown, ArrowLeft } from 'lucide-react';
import type { getThemeTokens } from '../../lib/themeTokens';

interface SidebarFooterActionsProps {
  collapsed: boolean;
  onLogout: () => void;
  onCollapse: () => void;
  onReorganize?: () => void;
  reordering?: boolean;
  tokens: ReturnType<typeof getThemeTokens>;
  rdrFontFamily?: string;
  onBackToRoisAdmin?: () => void;
  backLabel?: string;
}

export default function SidebarFooterActions({
  collapsed, onLogout, onCollapse, onReorganize, reordering, tokens: t, rdrFontFamily, onBackToRoisAdmin, backLabel,
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
            fontFamily={rdrFontFamily}
          />
        )}

        {!onBackToRoisAdmin && (
          <FooterButton
            icon={<LogOut className="w-4 h-4" />}
            label="Deconnexion"
            collapsed={collapsed}
            restColor={t.sidebar.logoutText}
            hoverBg="rgba(239,68,68,0.08)"
            hoverColor={t.sidebar.logoutHover}
            hoverBorder="rgba(239,68,68,0.15)"
            onClick={onLogout}
            fontFamily={rdrFontFamily}
          />
        )}

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
          fontFamily={rdrFontFamily}
        />

        {onBackToRoisAdmin && (
          <FooterButton
            icon={<ArrowLeft className="w-4 h-4" />}
            label={backLabel || "Retour Rois Admin"}
            collapsed={collapsed}
            restColor="#f59e0b"
            hoverBg="rgba(245,158,11,0.10)"
            hoverColor="#f59e0b"
            hoverBorder="rgba(245,158,11,0.25)"
            hoverShadow="0 0 12px rgba(245,158,11,0.15)"
            onClick={onBackToRoisAdmin}
            fontFamily={rdrFontFamily}
          />
        )}
      </div>
    </div>
  );
}

function FooterButton({ icon, label, collapsed, restColor, hoverBg, hoverColor, hoverBorder, hoverShadow, onClick, fontFamily }: {
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  restColor: string;
  hoverBg: string;
  hoverColor: string;
  hoverBorder?: string;
  hoverShadow?: string;
  onClick: () => void;
  fontFamily?: string;
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
        <span className="text-[13px] font-medium transition-colors duration-200" style={{ fontFamily: fontFamily ? `"${fontFamily}", sans-serif` : undefined }}>{label}</span>
      )}
    </button>
  );
}
