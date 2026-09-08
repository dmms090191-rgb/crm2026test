import { LogOut, ChevronLeft, ArrowUpDown, Check, Settings2 } from 'lucide-react';
import { VisuBlock, SystemButton } from './SidebarFooterParts';
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
  visuBadgeLabel?: string;
  onHideTabs?: () => void;
  hideEditMode?: boolean;
}

export default function SidebarFooterActions({
  collapsed, onLogout, onCollapse, onReorganize, reordering, tokens: t, rdrFontFamily, onBackToRoisAdmin, backLabel, visuBadgeLabel, onHideTabs, hideEditMode,
}: SidebarFooterActionsProps) {
  const hasVisuBlock = onBackToRoisAdmin && visuBadgeLabel;

  return (
    <div className="flex-shrink-0 px-2 pb-2.5 pt-1.5">
      {/* System actions card */}
      <div
        className={`rounded-xl ${collapsed ? 'px-1 py-1.5' : 'px-1.5 py-1.5'}`}
        style={{
          background: `linear-gradient(180deg, ${t.sidebar.bg}00 0%, ${t.sidebar.divider}18 100%)`,
          border: `1px solid ${t.sidebar.divider}`,
        }}
      >
        <div className={`flex flex-col ${collapsed ? 'gap-0.5' : 'gap-0.5'}`}>
          {onReorganize && !reordering && !hideEditMode && (
            <SystemButton
              icon={<ArrowUpDown className="w-3.5 h-3.5" />}
              label="Reorganiser"
              collapsed={collapsed}
              variant="neutral"
              tokens={t}
              onClick={onReorganize}
              fontFamily={rdrFontFamily}
            />
          )}

          {onHideTabs && !reordering && (
            hideEditMode ? (
              <SystemButton
                icon={<Check className="w-3.5 h-3.5" />}
                label="Terminer masquage"
                collapsed={collapsed}
                variant="success"
                tokens={t}
                onClick={onHideTabs}
                fontFamily={rdrFontFamily}
              />
            ) : (
              <SystemButton
                icon={<Settings2 className="w-3.5 h-3.5" />}
                label="Masquer onglets"
                collapsed={collapsed}
                variant="tool"
                tokens={t}
                onClick={onHideTabs}
                fontFamily={rdrFontFamily}
              />
            )
          )}

          <SystemButton
            icon={
              <ChevronLeft
                className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
              />
            }
            label={collapsed ? 'Agrandir' : 'Reduire'}
            collapsed={collapsed}
            variant="muted"
            tokens={t}
            onClick={onCollapse}
            fontFamily={rdrFontFamily}
          />

          {!onBackToRoisAdmin && (
            <SystemButton
              icon={<LogOut className="w-3.5 h-3.5" />}
              label="Deconnexion"
              collapsed={collapsed}
              variant="danger"
              tokens={t}
              onClick={onLogout}
              fontFamily={rdrFontFamily}
            />
          )}
        </div>
      </div>

      {/* Visu supervision block */}
      {hasVisuBlock && (
        <VisuBlock
          collapsed={collapsed}
          visuBadgeLabel={visuBadgeLabel}
          backLabel={backLabel}
          onBack={onBackToRoisAdmin}
          fontFamily={rdrFontFamily}
        />
      )}
    </div>
  );
}

/* ── Visu supervision block ── */

