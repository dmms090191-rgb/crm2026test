/* eslint-disable react-refresh/only-export-components */
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export type Tokens = ReturnType<typeof useThemeTokens>;

export function TabHeader({ t, count, label, limit }: { t: Tokens; count: number; label: string; limit?: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-medium" style={{ color: t.text.secondary }}>
        {count} {label}{count !== 1 ? 's' : ''}
      </p>
      {limit && count > limit && (
        <span className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: t.surface.secondary, color: t.text.tertiary }}>
          Affichage {limit} / {count}
        </span>
      )}
    </div>
  );
}

export function Overflow({ t, total, limit }: { t: Tokens; total: number; limit: number }) {
  if (total <= limit) return null;
  return (
    <div className="flex justify-center mt-3">
      <span
        className="text-[10px] font-medium px-3 py-1 rounded-full"
        style={{ background: t.surface.secondary, color: t.text.tertiary, border: `1px solid ${t.surface.border}` }}
      >
        {total - limit} entree{total - limit > 1 ? 's' : ''} supplementaire{total - limit > 1 ? 's' : ''} non affichee{total - limit > 1 ? 's' : ''}
      </span>
    </div>
  );
}

export function MobileCard({ t, children }: { t: Tokens; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 rounded-xl" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
      {children}
    </div>
  );
}

export function StatutBadge({ t, value }: { t: Tokens; value: string }) {
  const label = value || 'Nouveau';
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold"
      style={{ background: t.accent.bg, color: t.accent.text, border: `1px solid ${t.accent.border}` }}
    >
      {label}
    </span>
  );
}

export function RdvStatusBadge({ t, value }: { t: Tokens; value: string }) {
  const status = value || 'pending';
  const colors = status === 'confirmed'
    ? { bg: t.success.bg, text: t.success.text, border: t.success.border }
    : status === 'cancelled'
      ? { bg: t.danger.bg, text: t.danger.text, border: t.danger.border }
      : { bg: t.warning.bg, text: t.warning.text, border: t.warning.border };
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold"
      style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
    >
      {status}
    </span>
  );
}

export function IdBadge({ t, label, value }: { t: Tokens; label: string; value: string }) {
  return (
    <span
      className="text-[9px] font-mono px-1.5 py-0.5 rounded"
      style={{ background: t.surface.secondary, color: t.text.tertiary, border: `1px solid ${t.surface.border}` }}
    >
      {label ? `${label}: ` : ''}{value.slice(0, 8)}...
    </span>
  );
}

export function Muted({ t, children }: { t: Tokens; children: React.ReactNode }) {
  return <span style={{ color: t.text.tertiary }}>{children}</span>;
}

export function Th({ t, children }: { t: Tokens; children: React.ReactNode }) {
  return (
    <th
      className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.12em] uppercase sticky top-0"
      style={{ color: t.table.headerText, background: t.table.headerBg, borderBottom: `1px solid ${t.table.headerBorder}` }}
    >
      {children}
    </th>
  );
}

export function Td({ t, children }: { t: Tokens; children: React.ReactNode }) {
  return <td className="px-4 py-3" style={{ color: t.text.primary }}>{children}</td>;
}

export function str(val: unknown): string {
  if (val == null) return '';
  return String(val);
}

export function formatDate(val: unknown): string {
  if (!val) return '—';
  try {
    return new Date(String(val)).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return String(val);
  }
}
