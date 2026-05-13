import { useState, useRef } from 'react';
import { ArrowUp, ArrowDown, GripVertical, Check, X, ArrowUpDown, Minus } from 'lucide-react';
import { ThemeTokens } from '../../../../lib/themeTokens';
import { Tab, TabId, SaveStatus, ActiveSection, SidebarItem, isSeparator, SEPARATOR_ID } from './docCrmTypes';

interface DocSidebarSectionsProps {
  items: SidebarItem[];
  activeSection: ActiveSection;
  saveStatus: Record<TabId, SaveStatus>;
  setActiveSection: (section: ActiveSection) => void;
  onReorder: (reordered: SidebarItem[]) => void;
  tokens: ThemeTokens;
}

export default function DocSidebarSections({
  items,
  activeSection,
  saveStatus,
  setActiveSection,
  onReorder,
  tokens,
}: DocSidebarSectionsProps) {
  const [reordering, setReordering] = useState(false);
  const [draft, setDraft] = useState<SidebarItem[]>([]);
  const dragIdx = useRef<number | null>(null);

  function startReorder() {
    setDraft([...items]);
    setReordering(true);
  }

  function cancelReorder() {
    setReordering(false);
    setDraft([]);
  }

  function confirmReorder() {
    onReorder(draft);
    setReordering(false);
    setDraft([]);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= draft.length) return;
    const next = [...draft];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setDraft(next);
  }

  function handleDragStart(idx: number) {
    dragIdx.current = idx;
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) return;
    move(dragIdx.current, idx);
    dragIdx.current = idx;
  }

  function handleDragEnd() {
    dragIdx.current = null;
  }

  const displayItems = reordering ? draft : items;

  return (
    <>
      <p
        className="px-4 mb-2 text-xs font-semibold tracking-widest uppercase"
        style={{ color: tokens.tab.sectionLabel }}
      >
        Documentation CRM
      </p>
      <nav className="flex flex-col gap-0.5 px-2">
        {displayItems.map((item, idx) => {
          if (reordering) {
            if (isSeparator(item)) {
              return (
                <div
                  key={SEPARATOR_ID}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className="relative flex items-center gap-1 py-1 rounded-lg text-xs font-medium w-full transition-all duration-150 cursor-grab active:cursor-grabbing select-none"
                  style={{
                    paddingLeft: '6px',
                    paddingRight: '4px',
                    background: tokens.surface.secondary,
                    border: `1px dashed ${tokens.surface.borderLight}`,
                    marginBottom: '2px',
                  }}
                >
                  <GripVertical className="w-3.5 h-3.5 flex-shrink-0 opacity-50" style={{ color: tokens.text.quaternary }} />
                  <Minus className="w-3.5 h-3.5 flex-shrink-0" style={{ color: tokens.text.quaternary }} />
                  <span className="flex-1 truncate text-[10px] opacity-60" style={{ color: tokens.text.quaternary }}>Separateur</span>
                  <button
                    onClick={() => move(idx, idx - 1)}
                    disabled={idx === 0}
                    className="p-0.5 rounded hover-token disabled:opacity-20 transition-opacity"
                    style={{ '--hover-bg': tokens.surface.hover, color: tokens.text.tertiary } as React.CSSProperties}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => move(idx, idx + 1)}
                    disabled={idx === draft.length - 1}
                    className="p-0.5 rounded hover-token disabled:opacity-20 transition-opacity"
                    style={{ '--hover-bg': tokens.surface.hover, color: tokens.text.tertiary } as React.CSSProperties}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              );
            }

            const tab = item as Tab;
            return (
              <div
                key={tab.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className="relative flex items-center gap-1 py-1.5 rounded-lg text-xs font-medium w-full transition-all duration-150 cursor-grab active:cursor-grabbing select-none"
                style={{
                  color: tokens.tab.inactiveText,
                  borderLeft: '2px solid transparent',
                  paddingLeft: '6px',
                  paddingRight: '4px',
                  background: tokens.surface.secondary,
                  border: `1px solid ${tokens.surface.borderLight}`,
                  marginBottom: '2px',
                }}
              >
                <GripVertical className="w-3.5 h-3.5 flex-shrink-0 opacity-50" style={{ color: tokens.text.quaternary }} />
                <span className="flex-shrink-0" style={{ color: tokens.tab.inactiveIcon }}>
                  {tab.icon}
                </span>
                <span className="flex-1 truncate">{tab.label}</span>
                <button
                  onClick={() => move(idx, idx - 1)}
                  disabled={idx === 0}
                  className="p-0.5 rounded hover-token disabled:opacity-20 transition-opacity"
                  style={{ '--hover-bg': tokens.surface.hover, color: tokens.text.tertiary } as React.CSSProperties}
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => move(idx, idx + 1)}
                  disabled={idx === draft.length - 1}
                  className="p-0.5 rounded hover-token disabled:opacity-20 transition-opacity"
                  style={{ '--hover-bg': tokens.surface.hover, color: tokens.text.tertiary } as React.CSSProperties}
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
            );
          }

          if (isSeparator(item)) {
            return (
              <div
                key={SEPARATOR_ID}
                className="my-1.5 mx-2"
                style={{ borderTop: `1px solid ${tokens.surface.borderLight}`, opacity: 0.6 }}
              />
            );
          }

          const tab = item as Tab;
          const isActive = activeSection.kind === 'doc' && activeSection.tabId === tab.id;
          const tabStatus = saveStatus[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection({ kind: 'doc', tabId: tab.id })}
              className="relative flex items-center gap-2.5 py-2 rounded-lg text-xs font-medium w-full text-left transition-all duration-150"
              style={
                isActive
                  ? {
                      background: tokens.tab.activeBg,
                      color: tokens.tab.activeText,
                      borderLeft: `2px solid ${tokens.tab.activeBorder}`,
                      paddingLeft: '10px',
                      paddingRight: '8px',
                    }
                  : {
                      color: tokens.tab.inactiveText,
                      borderLeft: '2px solid transparent',
                      paddingLeft: '10px',
                      paddingRight: '8px',
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = tokens.tab.inactiveTextHover;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = tokens.tab.inactiveText;
              }}
            >
              <span
                className="flex-shrink-0"
                style={{ color: isActive ? tokens.tab.activeIcon : tokens.tab.inactiveIcon }}
              >
                {tab.icon}
              </span>
              <span className="flex-1 truncate">{tab.label}</span>
              {tabStatus === 'saving' && (
                <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: tokens.accent.text }} />
              )}
              {tabStatus === 'saved' && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tokens.success.text }} />
              )}
              {tabStatus === 'error' && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tokens.danger.text }} />
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-2 mt-3">
        {reordering ? (
          <div className="flex gap-1.5">
            <button
              onClick={confirmReorder}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}
            >
              <Check className="w-3.5 h-3.5" />
              Valider
            </button>
            <button
              onClick={cancelReorder}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
            >
              <X className="w-3.5 h-3.5" />
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={startReorder}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-[1.02]"
            style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.borderLight}`, color: tokens.text.tertiary }}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Reorganiser
          </button>
        )}
      </div>
    </>
  );
}
