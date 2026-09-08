import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useEditorModeSafe, resolveTextColor } from '../../contexts/EditorModeContext';

function SASidebarSkeleton({ collapsed, tokens: t }: { collapsed: boolean; tokens: ReturnType<typeof useThemeTokens> }) {
  const rows = collapsed ? [1,2,3,4,5,6] : [1,2,3,4,5,6,7,8];
  return (
    <div className="flex-1 overflow-hidden py-3 px-2 space-y-1.5">
      {rows.map(i => (
        <div key={i} className={`flex items-center rounded-lg ${collapsed ? 'justify-center py-2.5 px-1' : 'gap-3 px-3 py-2'}`}>
          <div className="w-4 h-4 rounded flex-shrink-0" style={{ background: t.sidebar.divider, opacity: 0.4 }} />
          {!collapsed && <div className="h-3 rounded flex-1" style={{ background: t.sidebar.divider, opacity: 0.3, maxWidth: `${50 + (i % 3) * 20}%` }} />}
        </div>
      ))}
    </div>
  );
}


function SAItem({ id, label, icon, isActive, collapsed, onClick, tokens, editorCtx, mergedTextOverrides, itemFontFamily, hideEditMode, isHidden, isProtected: locked, onToggleHide, badgeCount }: {
  id: string; label: string; icon: React.ReactNode; isActive: boolean; collapsed: boolean; onClick: () => void;
  tokens: ReturnType<typeof useThemeTokens>['sidebar'];
  editorCtx: ReturnType<typeof useEditorModeSafe>;
  mergedTextOverrides: Record<string, string>;
  itemFontFamily?: string;
  hideEditMode?: boolean;
  isHidden?: boolean;
  isProtected?: boolean;
  onToggleHide?: () => void;
  badgeCount?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [eyeHovered, setEyeHovered] = useState(false);
  const textColorOverride = resolveTextColor(`item:${id}`, mergedTextOverrides, editorCtx?.textPreview || {});
  const baseColor = isActive ? tokens.activeItemText : hovered ? tokens.itemTextHover : tokens.itemText;
  const finalColor = textColorOverride || baseColor;

  const dimmed = hideEditMode && isHidden;

  return (
    <div
      className={`w-full flex items-center rounded-lg transition-all duration-150 mb-0.5 ${collapsed ? 'justify-center px-2 py-2' : 'px-2.5 py-[7px]'}`}
      style={{
        background: isActive && !hideEditMode ? tokens.activeItemBg : hovered && !hideEditMode ? 'rgba(255,255,255,0.04)' : hideEditMode ? 'transparent' : 'transparent',
        opacity: dimmed ? 0.4 : 1,
        boxShadow: isActive && !hideEditMode ? tokens.activeItemShadow : 'none',
        cursor: hideEditMode ? 'default' : 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        title={collapsed ? label : undefined}
        data-testid={id === 'admins' ? 'liste-admins-tab' : undefined}
        data-sidebar-item={id}
        className={`flex items-center gap-2.5 min-w-0 flex-1 ${hideEditMode ? 'pointer-events-none' : ''}`}
        style={{ color: dimmed ? tokens.itemText : finalColor }}
        tabIndex={hideEditMode ? -1 : 0}
      >
        <span className="flex-shrink-0 relative">
          {icon}
          {collapsed && !!badgeCount && badgeCount > 0 && !hideEditMode && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white bg-red-500 shadow-sm">{badgeCount > 99 ? '99+' : badgeCount}</span>
          )}
        </span>
        {!collapsed && <span className="text-[12.5px] font-medium truncate" style={{ fontFamily: itemFontFamily ? `"${itemFontFamily}", sans-serif` : undefined }}>{label}</span>}
        {!collapsed && !!badgeCount && badgeCount > 0 && !hideEditMode && (
          <span className="ml-auto flex-shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold text-white bg-red-500 shadow-sm">{badgeCount > 99 ? '99+' : badgeCount}</span>
        )}
      </button>

      {hideEditMode && !collapsed && (
        locked ? (
          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md ml-1" style={{ color: tokens.itemText, opacity: 0.35 }} title="Protege">
            <Lock className="w-3.5 h-3.5" />
          </span>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onToggleHide?.(); }}
            onMouseEnter={() => setEyeHovered(true)}
            onMouseLeave={() => setEyeHovered(false)}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md ml-1 transition-all duration-150"
            style={{
              background: eyeHovered ? (isHidden ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.10)') : 'transparent',
              color: isHidden ? '#ef4444' : eyeHovered ? '#22c55e' : tokens.itemText,
            }}
            title={isHidden ? 'Afficher' : 'Masquer'}
          >
            {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )
      )}

      {hideEditMode && collapsed && (
        !locked ? (
          <button
            onClick={e => { e.stopPropagation(); onToggleHide?.(); }}
            className="absolute right-0.5 top-0.5 w-4 h-4 flex items-center justify-center rounded-full transition-colors"
            style={{
              background: isHidden ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)',
              color: isHidden ? '#ef4444' : '#22c55e',
            }}
            title={isHidden ? 'Afficher' : 'Masquer'}
          >
            {isHidden ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
          </button>
        ) : null
      )}
    </div>
  );
}



export { SASidebarSkeleton, SAItem };
