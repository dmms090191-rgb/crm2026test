import {
  Mail, Phone, Calendar, ExternalLink, MapPin, Bot,
  MoreHorizontal, ChevronDown, Eye, MessageCircle, CalendarClock,
  LogIn, LayoutTemplate, Pencil, Trash2, User,
} from 'lucide-react';
import type { ThemeTokens } from '../../lib/themeTokensTypes';
import type { ColumnDef } from './useColumnOrder';
import type { MobileColumnEntry } from './mobileColumnTypes';
import { CONTACT_KEYS, STYLE_SPACING } from './smartphonePreviewData';
import type { TableContext } from './smartphonePreviewData';

interface FieldIconMap {
  [key: string]: typeof Mail;
}

const FIELD_ICONS: FieldIconMap = {
  email: Mail,
  telephone: Phone,
  phone: Phone,
  date_ajout: Calendar,
  cree_le: Calendar,
  ia: Bot,
  societe: User,
  vendeur: User,
};

export function renderStatutBadge(value: string) {
  const isNeutral = !value || value === 'Nouveau';
  const label = isNeutral ? 'Sans statut' : value;
  const color = isNeutral ? '#22c55e' : value === 'Contacte' ? '#0ea5e9' : value === 'Interesse' ? '#f59e0b' : '#22c55e';
  const bg = isNeutral ? 'rgba(34,197,94,0.1)' : value === 'Contacte' ? 'rgba(14,165,233,0.1)' : value === 'Interesse' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)';
  const border = isNeutral ? 'rgba(34,197,94,0.2)' : value === 'Contacte' ? 'rgba(14,165,233,0.2)' : value === 'Interesse' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)';
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold" style={{ background: bg, border: `1px solid ${border}`, color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
      {label}
      <ChevronDown className="w-2 h-2" />
    </span>
  );
}

export function renderAccessToggle(value: string, t: ThemeTokens) {
  const isOn = value === 'on' || value === 'Actif';
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px]" style={{ color: t.text.quaternary }}>Acces</span>
      <div className="relative inline-flex items-center rounded-full" style={{ width: 28, height: 14, background: isOn ? t.success.bg : t.surface.hover, border: `1px solid ${isOn ? t.success.border : t.surface.borderLight}` }}>
        <span className="absolute rounded-full" style={{ width: 8, height: 8, left: isOn ? 16 : 3, background: isOn ? t.success.text : t.text.quaternary, boxShadow: isOn ? `0 0 4px ${t.success.text}` : 'none', transition: 'left 0.2s' }} />
      </div>
    </div>
  );
}

export function renderIaToggle(value: string, t: ThemeTokens) {
  const isOn = value === 'on' || value === 'On';
  return (
    <div className="flex items-center gap-1">
      <Bot className="w-2.5 h-2.5" style={{ color: isOn ? '#3b82f6' : t.text.quaternary }} />
      <span className="text-[9px]" style={{ color: t.text.quaternary }}>IA</span>
      <div className="relative inline-flex items-center rounded-full" style={{ width: 28, height: 14, background: isOn ? 'rgba(59,130,246,0.25)' : t.surface.hover, border: `1px solid ${isOn ? 'rgba(59,130,246,0.4)' : t.surface.borderLight}` }}>
        <span className="absolute rounded-full" style={{ width: 8, height: 8, left: isOn ? 16 : 3, background: isOn ? '#3b82f6' : t.text.quaternary, boxShadow: isOn ? '0 0 4px rgba(59,130,246,0.8)' : 'none', transition: 'left 0.2s' }} />
      </div>
    </div>
  );
}

export function renderRoleBadge(value: string) {
  return (
    <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
      {value}
    </span>
  );
}

export function renderField(
  entry: MobileColumnEntry,
  row: Record<string, string>,
  col: ColumnDef | undefined,
  t: ThemeTokens,
  spacing: typeof STYLE_SPACING['comfort'],
) {
  const key = entry.key;
  const val = row[key];
  if (!val && key !== 'actions') return null;

  if (key === 'actions') return null;
  if (key === 'statut') return <span key={key}>{renderStatutBadge(val)}</span>;
  if (key === 'acces') return <span key={key}>{renderAccessToggle(val, t)}</span>;
  if (key === 'ia') return <span key={key}>{renderIaToggle(val, t)}</span>;
  if (key === 'role') return <span key={key}>{renderRoleBadge(val)}</span>;

  if (key === 'site' || col?.fieldType === 'url') {
    return (
      <span key={key} className="inline-flex items-center gap-0.5 font-semibold" style={{ color: '#0ea5e9' }}>
        <ExternalLink className="w-2.5 h-2.5" />
        <span className={spacing.textSize}>{val}</span>
      </span>
    );
  }
  if (key === 'maps') {
    return (
      <span key={key} className="inline-flex items-center gap-0.5 font-semibold" style={{ color: '#f59e0b' }}>
        <MapPin className="w-2.5 h-2.5" />
        <span className={spacing.textSize}>{val}</span>
      </span>
    );
  }

  if (CONTACT_KEYS.has(key)) {
    const Icon = FIELD_ICONS[key] ?? Mail;
    return (
      <div key={key} className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 flex-shrink-0" style={{ color: t.table?.cellIcon ?? t.text.tertiary }} />
        <span className={`${spacing.textSize} truncate`} style={{ color: t.table?.cellTextMuted ?? t.text.secondary }}>{val}</span>
      </div>
    );
  }

  const Icon = FIELD_ICONS[key];
  const label = col?.label ?? key;
  return (
    <div key={key} className="flex items-center gap-1">
      {Icon && <Icon className="w-2.5 h-2.5 flex-shrink-0" style={{ color: t.table?.cellIcon ?? t.text.tertiary }} />}
      <span className={`${spacing.labelSize} flex-shrink-0`} style={{ color: t.text.quaternary }}>{label} :</span>
      <span className={`${spacing.textSize} truncate`} style={{ color: t.text.secondary }}>{val}</span>
    </div>
  );
}

export function getActionsForContext(ctx: TableContext, t: ThemeTokens) {
  switch (ctx) {
    case 'sa_liste_admins':
    case 'admin_crm':
      return (
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}>
          <MoreHorizontal className="w-3 h-3" />Actions
        </button>
      );
    case 'vendor_leads':
      return (
        <div className="grid grid-cols-4 gap-1">
          <span className="flex items-center justify-center gap-0.5 py-1.5 rounded-lg text-[9px] font-semibold" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}>
            <Eye className="w-2.5 h-2.5" />Detail
          </span>
          <span className="flex items-center justify-center gap-0.5 py-1.5 rounded-lg text-[9px] font-semibold" style={{ background: t.warning?.bg ?? 'rgba(245,158,11,0.08)', border: `1px solid ${t.warning?.border ?? 'rgba(245,158,11,0.2)'}`, color: t.warning?.text ?? '#f59e0b' }}>
            <MessageCircle className="w-2.5 h-2.5" />Msg
          </span>
          <span className="flex items-center justify-center gap-0.5 py-1.5 rounded-lg text-[9px] font-semibold" style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.18)', color: '#22d3ee' }}>
            <CalendarClock className="w-2.5 h-2.5" />RDV
          </span>
          <span className="flex items-center justify-center gap-0.5 py-1.5 rounded-lg text-[9px] font-semibold" style={{ background: t.success.bg, border: `1px solid ${t.success.border}`, color: t.success.text }}>
            <LogIn className="w-2.5 h-2.5" />Go
          </span>
        </div>
      );
    case 'sa_crm_societe':
      return (
        <div className="flex items-center gap-1">
          <span className="flex-1 flex items-center justify-center gap-0.5 py-1.5 rounded-lg text-[9px] font-semibold" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', color: '#0ea5e9' }}>
            <Eye className="w-2.5 h-2.5" />Detail
          </span>
          <span className="flex-1 flex items-center justify-center gap-0.5 py-1.5 rounded-lg text-[9px] font-semibold" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', color: '#0ea5e9' }}>
            <LayoutTemplate className="w-2.5 h-2.5" />Site
          </span>
          <span className="flex-1 flex items-center justify-center gap-0.5 py-1.5 rounded-lg text-[9px] font-semibold" style={{ background: t.surface.hover, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
            <Pencil className="w-2.5 h-2.5" />Modif.
          </span>
          <span className="flex-1 flex items-center justify-center gap-0.5 py-1.5 rounded-lg text-[9px] font-semibold" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', color: '#ef4444' }}>
            <Trash2 className="w-2.5 h-2.5" />Suppr.
          </span>
        </div>
      );
    default:
      return (
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}>
          <MoreHorizontal className="w-3 h-3" />Actions
        </button>
      );
  }
}
