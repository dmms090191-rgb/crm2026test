import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Bell } from 'lucide-react';
import VendorNotificationDetail from './VendorNotificationDetail';
import type { VendorNotifData } from './vendorNotifCategories';
import type { HubCardDef } from '../../../../components/notifications/hub/notifHubTypes';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { formatTodayInTz } from '../../../../lib/timezone';

/**
 * Cloche Notifications du Commercial, version mobile.
 *
 * Elle ne connait plus la liste des categories : elle recoit les memes cartes
 * que le hub desktop, dans le meme ordre personnalise, avec le meme masquage,
 * et delegue le detail au meme composant. Desktop et mobile ne peuvent donc
 * plus diverger.
 */
interface Props {
  open: boolean;
  setOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  category: string | null;
  setCategory: (v: string | null) => void;
  totalNotifCount: number;
  /** Cartes dans leur ordre par defaut, compteurs reels inclus. */
  cards: HubCardDef[];
  /** Ordre personnalise et libelles renommes par le titulaire du panel. */
  cardOrder?: string[];
  cardLabels?: Record<string, string>;
  /** Categories masquees par Talvex : invisibles ici comme sur desktop. */
  hiddenCards?: Set<string>;
  data: VendorNotifData;
  timezone: string;
  tokens: ThemeTokens;
  containerRef: React.RefObject<HTMLDivElement>;
  panelRef?: React.RefObject<HTMLDivElement>;
}

function visibleCards(cards: HubCardDef[], order?: string[], hidden?: Set<string>): HubCardDef[] {
  const byKey = new Map(cards.map(c => [c.key, c]));
  const keys = order && order.length > 0
    ? [...order.filter(k => byKey.has(k)), ...cards.map(c => c.key).filter(k => !order.includes(k))]
    : cards.map(c => c.key);
  return keys.filter(k => !hidden?.has(k)).map(k => byKey.get(k)!).filter(Boolean);
}

export default function VendorMobileBellMenu({
  open, setOpen, category, setCategory, totalNotifCount,
  cards, cardOrder, cardLabels, hiddenCards, data,
  timezone, tokens, containerRef, panelRef: externalPanelRef,
}: Props) {
  const internalPanelRef = useRef<HTMLDivElement>(null);
  const panelRef = externalPanelRef ?? internalPanelRef;
  const list = visibleCards(cards, cardOrder, hiddenCards);
  const current = list.find(c => c.key === category);
  const close = () => { setOpen(false); setCategory(null); };

  return (
    <div className="relative md:hidden" ref={containerRef}>
      <button
        onClick={() => { setOpen((prev: boolean) => !prev); setCategory(null); }}
        className="relative p-2 rounded-lg transition-colors"
        style={{ color: tokens.topbar.notifIcon }}
      >
        <Bell className="w-5 h-5" />
        {totalNotifCount > 0 && (
          <span
            className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              boxShadow: '0 0 6px rgba(239,68,68,0.4)',
            }}
          />
        )}
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed right-3 top-[3.75rem] w-[calc(100vw-24px)] max-w-72 rounded-xl overflow-hidden"
          style={{
            zIndex: 99999,
            background: tokens.dropdown.bg,
            border: `1px solid ${tokens.dropdown.border}`,
            boxShadow: `${tokens.dropdown.shadow}, 0 25px 50px -12px rgba(0,0,0,0.5)`,
          }}
        >
          {!current ? (
            <>
              <div className="px-3 py-2 border-b" style={{ borderColor: tokens.dropdown.border }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: tokens.topbar.notifIcon }}>
                  Notifications
                </p>
                <p className="text-[11px] mt-0.5 capitalize" style={{ color: tokens.dropdown.itemText }}>
                  {formatTodayInTz(timezone)}
                </p>
              </div>
              {list.map(card => (
                <button
                  key={card.key}
                  type="button"
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors hover-token"
                  style={{ '--hover-bg': tokens.dropdown.itemBgHover } as React.CSSProperties}
                  onClick={() => setCategory(card.key)}
                >
                  <span style={{ color: tokens.topbar.notifIcon }}>{card.icon}</span>
                  <span className="text-sm flex-1" style={{ color: tokens.dropdown.itemText }}>
                    {cardLabels?.[card.key] || card.label}
                  </span>
                  {card.count > 0 && (
                    <span
                      className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white"
                      style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        boxShadow: '0 0 6px rgba(239,68,68,0.4)',
                      }}
                    >
                      {card.count > 99 ? '99+' : card.count}
                    </span>
                  )}
                </button>
              ))}
            </>
          ) : (
            <>
              <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: tokens.dropdown.border }}>
                <button onClick={() => setCategory(null)} className="text-xs" style={{ color: tokens.topbar.notifIcon }}>
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                </button>
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: tokens.topbar.notifIcon }}>
                  {cardLabels?.[current.key] || current.label}
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <VendorNotificationDetail category={current.key} d={data} tokens={tokens} onClose={close} />
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
