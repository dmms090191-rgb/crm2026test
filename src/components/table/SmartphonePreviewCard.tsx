import type { ThemeTokens } from '../../lib/themeTokensTypes';
import type { ColumnDef } from './useColumnOrder';
import type { MobileColumnEntry, MobileCardStyle } from './mobileColumnTypes';
import { AVATAR_KEYS, CONTACT_KEYS, STYLE_SPACING, getAvatarGradient } from './smartphonePreviewData';
import type { SampleRow, TableContext } from './smartphonePreviewData';
import { renderField, getActionsForContext } from './SmartphonePreviewRenderers';

interface PreviewCardProps {
  row: SampleRow;
  idx: number;
  columns: ColumnDef[];
  visibleFields: MobileColumnEntry[];
  hasActions: boolean;
  cardStyle: MobileCardStyle;
  ctx: TableContext;
  t: ThemeTokens;
}

export default function PreviewCard({
  row, idx, columns, visibleFields, hasActions, cardStyle, ctx, t,
}: PreviewCardProps) {
  const colMap = new Map(columns.map(c => [c.key, c]));
  const spacing = STYLE_SPACING[cardStyle];

  const avatarFields = visibleFields.filter(e => AVATAR_KEYS.has(e.key));
  const avatarVals = avatarFields.map(e => row[e.key] ?? '').filter(Boolean);
  const initials = (ctx === 'sa_crm_societe')
    ? (row.societe ?? row.nom ?? '').split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
    : `${(avatarVals[0] ?? '')[0] ?? ''}${(avatarVals[1] ?? '')[0] ?? ''}`.toUpperCase();

  let cardTitle: string;
  if (ctx === 'sa_crm_societe') {
    cardTitle = row.societe || row.nom || 'Sans nom';
  } else {
    const nameVals = visibleFields
      .filter(e => ['prenom', 'first_name', 'manager_first_name', 'nom', 'last_name', 'name', 'manager_last_name'].includes(e.key))
      .map(e => row[e.key] ?? '')
      .filter(Boolean);
    cardTitle = nameVals.slice(0, 2).join(' ') || 'Sans nom';
  }

  const bodyFields = visibleFields.filter(e => e.key !== 'actions');
  const contactEntries = bodyFields.filter(e => CONTACT_KEYS.has(e.key));
  const otherEntries = bodyFields.filter(e => !CONTACT_KEYS.has(e.key));

  return (
    <div
      className={`rounded-xl overflow-hidden ${spacing.cardPy}`}
      style={{
        background: ctx === 'sa_crm_societe' ? t.surface.primary : 'transparent',
        border: ctx === 'sa_crm_societe' ? `1px solid ${t.surface.borderLight}` : 'none',
        borderBottom: ctx !== 'sa_crm_societe' ? `1px solid ${t.table?.rowBorder ?? t.surface.border}` : undefined,
        boxShadow: ctx === 'sa_crm_societe' ? '0 1px 3px rgba(0,0,0,0.06)' : undefined,
      }}
    >
      <div className="flex items-center gap-2.5 px-3 mb-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[9px] font-bold flex-shrink-0"
          style={{ background: getAvatarGradient(ctx, idx), boxShadow: '0 2px 6px rgba(0,0,0,0.2)', color: '#fff' }}
        >
          {initials || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold truncate" style={{ color: t.table?.cellText ?? t.text.primary }}>{cardTitle}</p>
        </div>
      </div>

      {contactEntries.length > 0 && (
        <div className={`rounded-lg mx-3 px-2.5 py-2 mb-2 ${spacing.gapY}`} style={{ background: t.surface.hover }}>
          {contactEntries.map(e => renderField(e, row, colMap.get(e.key), t, spacing))}
        </div>
      )}

      {otherEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 px-3 mb-2">
          {otherEntries.map(e => renderField(e, row, colMap.get(e.key), t, spacing))}
        </div>
      )}

      {hasActions && (
        <div
          className="px-3"
          style={ctx === 'sa_crm_societe' ? { borderTop: `1px solid ${t.surface.borderLight}`, paddingTop: 8 } : undefined}
        >
          {getActionsForContext(ctx, t)}
        </div>
      )}
    </div>
  );
}
