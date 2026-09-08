import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useEditorModeSafe, resolveTextColor } from '../../contexts/EditorModeContext';

function SidebarSkeleton({ collapsed, tokens: t }: { collapsed: boolean; tokens: ReturnType<typeof useThemeTokens> }) {
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

function AdminItem({ entry, isActive, collapsed, onClick, tokens, editorCtx, mergedTextOverrides, itemFontFamily, hideEditMode, isHidden, onToggleHide }: {
  entry: { id: string; label: string; icon: React.ReactNode }; isActive: boolean; collapsed: boolean; onClick: () => void;
  tokens: ReturnType<typeof useThemeTokens>['sidebar'];
  editorCtx: ReturnType<typeof useEditorModeSafe>;
  mergedTextOverrides: Record<string, string>;
  itemFontFamily?: string;
  hideEditMode?: boolean;
  isHidden?: boolean;
  onToggleHide?: () => void;
}) {
  const [eyeHovered, setEyeHovered] = useState(false);
  const textColorOverride = resolveTextColor(`item:${entry.id}`, mergedTextOverrides, editorCtx?.textPreview || {});
  const baseTextColor = isActive ? tokens.activeItemText : tokens.itemText;
  const finalColor = textColorOverride || baseTextColor;
  const dimmed = hideEditMode && isHidden;

  return (
    <div
      data-sidebar-item={entry.id}
      className={`w-full flex items-center rounded-lg transition-all duration-150 group ${collapsed ? 'justify-center py-2.5 px-1' : 'gap-3 px-3 py-2'}`}
      style={{
        ...(isActive && !hideEditMode ? { background: tokens.activeItemBg, boxShadow: tokens.activeItemShadow } : {}),
        opacity: dimmed ? 0.4 : 1,
        cursor: hideEditMode ? 'default' : 'pointer',
      }}
    >
      <button
        onClick={onClick}
        title={collapsed ? entry.label : undefined}
        className={`flex items-center gap-3 min-w-0 flex-1 ${hideEditMode ? 'pointer-events-none' : ''}`}
        tabIndex={hideEditMode ? -1 : 0}
      >
        <span className="flex-shrink-0 transition-all duration-150" style={{ color: dimmed ? tokens.itemIcon : (textColorOverride || (isActive ? tokens.activeItemIcon : tokens.itemIcon)) }}>{entry.icon}</span>
        {!collapsed && <span className="text-sm font-medium truncate transition-colors duration-150" style={{ color: dimmed ? tokens.itemText : finalColor, fontFamily: itemFontFamily ? `"${itemFontFamily}", sans-serif` : undefined }}>{entry.label}</span>}
      </button>
      {!collapsed && isActive && !hideEditMode && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: tokens.activeItemDot, boxShadow: `0 0 6px ${tokens.activeItemDot}` }} />}
      {hideEditMode && !collapsed && (
        <button
          onClick={e => { e.stopPropagation(); onToggleHide?.(); }}
          onMouseEnter={() => setEyeHovered(true)}
          onMouseLeave={() => setEyeHovered(false)}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md ml-auto transition-all duration-150"
          style={{
            background: eyeHovered ? (isHidden ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.10)') : 'transparent',
            color: isHidden ? '#ef4444' : eyeHovered ? '#22c55e' : tokens.itemText,
          }}
          title={isHidden ? 'Afficher' : 'Masquer'}
        >
          {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

export { SidebarSkeleton, AdminItem };
