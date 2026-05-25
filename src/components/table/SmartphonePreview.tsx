import { useMemo } from 'react';
import { Smartphone } from 'lucide-react';
import type { ThemeTokens } from '../../lib/themeTokensTypes';
import type { ColumnDef } from './useColumnOrder';
import type { MobileColumnEntry, MobileCardStyle } from './mobileColumnTypes';
import { getTableContext, getSampleRows } from './smartphonePreviewData';
import PreviewCard from './SmartphonePreviewCard';

interface Props {
  columns: ColumnDef[];
  mobileOrder: MobileColumnEntry[];
  cardStyle: MobileCardStyle;
  tableKey: string;
  t: ThemeTokens;
}

export default function SmartphonePreview({ columns, mobileOrder, cardStyle, tableKey, t }: Props) {
  const ctx = getTableContext(tableKey);
  const [row1, row2] = useMemo(() => getSampleRows(ctx), [ctx]);

  const visible = mobileOrder.filter(e => e.role === 'visible' && e.key !== 'actions');
  const hasActions = mobileOrder.some(e => e.key === 'actions' && e.role === 'visible');
  const visibleCount = visible.length + (hasActions ? 1 : 0);

  const showSecondCard = cardStyle !== 'compact';

  return (
    <div className="space-y-3 pt-3" style={{ borderTop: `1px solid ${t.surface.border}` }}>
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <Smartphone className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />
          <span className="text-[11px] font-bold" style={{ color: '#16a34a' }}>Apercu smartphone</span>
        </div>
        <span className="text-[10px]" style={{ color: t.text.tertiary }}>{visibleCount} champs visibles</span>
      </div>
      <p className="text-[10px]" style={{ color: t.text.tertiary }}>
        Voici le rendu reel des cartes sur telephone avec ton theme actif.
      </p>

      <div className="flex justify-center">
        <div
          className="w-[300px] rounded-[28px] overflow-hidden"
          style={{
            background: t.surface.primary,
            border: `3px solid ${t.surface.border}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-20 h-5 rounded-full" style={{ background: t.surface.border }} />
          </div>

          <div className="flex items-center justify-between px-5 pb-1.5">
            <span className="text-[9px] font-bold" style={{ color: t.text.primary }}>9:41</span>
            <div className="flex items-center gap-1">
              <div className="flex gap-px">
                {[0.3, 0.5, 0.7, 1].map((h, i) => (
                  <span key={i} className="w-[3px] rounded-sm" style={{ height: 4 + h * 6, background: t.text.primary, opacity: 0.5 }} />
                ))}
              </div>
              <span className="w-5 h-2.5 rounded-sm" style={{ background: t.text.primary, opacity: 0.4 }} />
            </div>
          </div>

          <div
            className="px-1.5 pb-5 pt-1 overflow-y-auto"
            style={{ background: t.surface.primary, minHeight: showSecondCard ? 320 : 200, maxHeight: 480 }}
          >
            {visibleCount === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-[10px]" style={{ color: t.text.tertiary }}>Aucun champ visible</p>
              </div>
            ) : (
              <div className={cardStyle === 'compact' ? 'space-y-1' : 'space-y-2'}>
                <PreviewCard
                  row={row1} idx={0} columns={columns}
                  visibleFields={visible} hasActions={hasActions}
                  cardStyle={cardStyle} ctx={ctx} t={t}
                />
                {showSecondCard && (
                  <PreviewCard
                    row={row2} idx={1} columns={columns}
                    visibleFields={visible} hasActions={hasActions}
                    cardStyle={cardStyle} ctx={ctx} t={t}
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex justify-center pb-2">
            <div className="w-24 h-1 rounded-full" style={{ background: t.text.tertiary, opacity: 0.3 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
