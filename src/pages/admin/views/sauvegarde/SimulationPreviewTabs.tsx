import { useMemo } from 'react';
import {
  type Tokens, TabHeader, Overflow, MobileCard, StatutBadge, RdvStatusBadge,
  IdBadge, Muted, Th, Td, str, formatDate,
} from './previewHelpers';

export function LeadsTab({ rows, tokens: t, allTables }: { rows: Record<string, unknown>[]; tokens: Tokens; allTables: Record<string, unknown[]> }) {
  const vendorMap = useMemo(() => {
    const vendors = (allTables['vendors'] ?? []) as Record<string, unknown>[];
    const map = new Map<string, string>();
    for (const v of vendors) {
      map.set(String(v.id ?? ''), `${v.first_name ?? ''} ${v.last_name ?? ''}`.trim());
    }
    return map;
  }, [allTables]);

  return (
    <div className="min-w-0">
      <TabHeader t={t} count={rows.length} label="lead" limit={100} />
      <div className="hidden md:block overflow-x-auto rounded-xl" style={{ border: `1px solid ${t.surface.border}` }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: t.table.headerBg }}>
              <Th t={t}>Prenom</Th><Th t={t}>Nom</Th><Th t={t}>Email</Th>
              <Th t={t}>Telephone</Th><Th t={t}>Statut</Th><Th t={t}>Vendeur</Th><Th t={t}>Import</Th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((row, i) => (
              <tr key={i} className="transition-colors duration-100" style={{ borderBottom: `1px solid ${t.table.rowBorder}` }}>
                <Td t={t}><span className="font-medium">{str(row.prenom)}</span></Td>
                <Td t={t}><span className="font-medium">{str(row.nom)}</span></Td>
                <Td t={t}><span className="font-mono text-[11px]" style={{ color: t.text.tertiary }}>{str(row.email)}</span></Td>
                <Td t={t}><span className="font-mono text-[11px]" style={{ color: t.text.tertiary }}>{str(row.telephone)}</span></Td>
                <Td t={t}><StatutBadge t={t} value={str(row.statut)} /></Td>
                <Td t={t}>{vendorMap.get(String(row.vendor_id ?? '')) || <Muted t={t}>—</Muted>}</Td>
                <Td t={t}><span style={{ color: t.text.tertiary }}>{formatDate(row.imported_at)}</span></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-2">
        {rows.slice(0, 100).map((row, i) => (
          <MobileCard key={i} t={t}>
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <span className="text-xs font-semibold truncate" style={{ color: t.text.primary }}>{str(row.prenom)} {str(row.nom)}</span>
              <StatutBadge t={t} value={str(row.statut)} />
            </div>
            <div className="space-y-0.5 text-[11px] min-w-0" style={{ color: t.text.tertiary }}>
              {str(row.email) && <p className="font-mono truncate">{str(row.email)}</p>}
              {str(row.telephone) && <p className="font-mono">{str(row.telephone)}</p>}
              {vendorMap.get(String(row.vendor_id ?? '')) && <p className="truncate">Vendeur: {vendorMap.get(String(row.vendor_id ?? ''))}</p>}
            </div>
          </MobileCard>
        ))}
      </div>
      <Overflow t={t} total={rows.length} limit={100} />
    </div>
  );
}

export function VendeursTab({ rows, tokens: t }: { rows: Record<string, unknown>[]; tokens: Tokens }) {
  return (
    <div className="min-w-0">
      <TabHeader t={t} count={rows.length} label="vendeur" />
      <div className="hidden md:block overflow-x-auto rounded-xl" style={{ border: `1px solid ${t.surface.border}` }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: t.table.headerBg }}>
              <Th t={t}>Prenom</Th><Th t={t}>Nom</Th><Th t={t}>Email</Th><Th t={t}>Telephone</Th><Th t={t}>Cree le</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="transition-colors duration-100" style={{ borderBottom: `1px solid ${t.table.rowBorder}` }}>
                <Td t={t}><span className="font-medium">{str(row.first_name)}</span></Td>
                <Td t={t}><span className="font-medium">{str(row.last_name)}</span></Td>
                <Td t={t}><span className="font-mono text-[11px]" style={{ color: t.text.tertiary }}>{str(row.email)}</span></Td>
                <Td t={t}><span className="font-mono text-[11px]" style={{ color: t.text.tertiary }}>{str(row.phone)}</span></Td>
                <Td t={t}><span style={{ color: t.text.tertiary }}>{formatDate(row.created_at)}</span></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-2">
        {rows.map((row, i) => (
          <MobileCard key={i} t={t}>
            <p className="text-xs font-semibold truncate" style={{ color: t.text.primary }}>{str(row.first_name)} {str(row.last_name)}</p>
            <div className="space-y-0.5 text-[11px] mt-1 min-w-0" style={{ color: t.text.tertiary }}>
              {str(row.email) && <p className="font-mono truncate">{str(row.email)}</p>}
              {str(row.phone) && <p className="font-mono">{str(row.phone)}</p>}
            </div>
          </MobileCard>
        ))}
      </div>
    </div>
  );
}

export function StatutsTab({ rows, tokens: t }: { rows: Record<string, unknown>[]; tokens: Tokens }) {
  return (
    <div className="min-w-0">
      <TabHeader t={t} count={rows.length} label="statut" />
      <div className="flex flex-wrap gap-2 sm:gap-2.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
            <div
              className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full flex-shrink-0"
              style={{ background: str(row.couleur) || '#06b6d4', boxShadow: `0 0 0 2px ${t.surface.secondary}, 0 0 0 3.5px ${str(row.couleur) || '#06b6d4'}, 0 0 10px ${str(row.couleur) || '#06b6d4'}50` }}
            />
            <span className="text-[11px] sm:text-xs font-semibold" style={{ color: t.text.primary }}>{str(row.nom)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MessagesTab({ rows, tokens: t }: { rows: Record<string, unknown>[]; tokens: Tokens }) {
  return (
    <div className="min-w-0">
      <TabHeader t={t} count={rows.length} label="message" limit={50} />
      <div className="space-y-2 max-h-[40vh] overflow-auto pr-1">
        {rows.slice(0, 50).map((row, i) => (
          <div key={i} className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl min-w-0" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: t.accent.bg, color: t.accent.text, border: `1px solid ${t.accent.border}` }}>
                {str(row.sender) || 'inconnu'}
              </span>
              <span className="text-[10px]" style={{ color: t.text.tertiary }}>{formatDate(row.created_at)}</span>
              {str(row.client_auth_id) && <IdBadge t={t} label="client" value={str(row.client_auth_id)} />}
              {str(row.vendor_id) && <IdBadge t={t} label="vendor" value={str(row.vendor_id)} />}
            </div>
            <p className="text-xs leading-relaxed break-words" style={{ color: t.text.secondary }}>{str(row.content) || '(vide)'}</p>
          </div>
        ))}
      </div>
      <Overflow t={t} total={rows.length} limit={50} />
    </div>
  );
}

export function RdvTab({ rows, tokens: t }: { rows: Record<string, unknown>[]; tokens: Tokens }) {
  return (
    <div className="min-w-0">
      <TabHeader t={t} count={rows.length} label="proposition RDV" limit={50} />
      <div className="hidden md:block overflow-x-auto rounded-xl" style={{ border: `1px solid ${t.surface.border}` }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: t.table.headerBg }}>
              <Th t={t}>Lead</Th><Th t={t}>Date</Th><Th t={t}>Heure</Th><Th t={t}>Statut</Th><Th t={t}>Lead ID</Th><Th t={t}>Vendor ID</Th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((row, i) => (
              <tr key={i} className="transition-colors duration-100" style={{ borderBottom: `1px solid ${t.table.rowBorder}` }}>
                <Td t={t}><span className="font-medium">{str(row.lead_name) || <Muted t={t}>—</Muted>}</span></Td>
                <Td t={t}>{str(row.proposed_date) || <Muted t={t}>—</Muted>}</Td>
                <Td t={t}>{str(row.proposed_time) || <Muted t={t}>—</Muted>}</Td>
                <Td t={t}><RdvStatusBadge t={t} value={str(row.status)} /></Td>
                <Td t={t}>{str(row.lead_id) ? <IdBadge t={t} label="" value={str(row.lead_id)} /> : <Muted t={t}>—</Muted>}</Td>
                <Td t={t}>{str(row.vendor_id) ? <IdBadge t={t} label="" value={str(row.vendor_id)} /> : <Muted t={t}>—</Muted>}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-2">
        {rows.slice(0, 50).map((row, i) => (
          <MobileCard key={i} t={t}>
            <div className="flex items-center justify-between mb-1 gap-2">
              <span className="text-xs font-semibold truncate" style={{ color: t.text.primary }}>{str(row.lead_name) || 'Sans nom'}</span>
              <RdvStatusBadge t={t} value={str(row.status)} />
            </div>
            <p className="text-[11px]" style={{ color: t.text.tertiary }}>{str(row.proposed_date)} a {str(row.proposed_time)}</p>
          </MobileCard>
        ))}
      </div>
      <Overflow t={t} total={rows.length} limit={50} />
    </div>
  );
}

export function CommentairesTab({ rows, tokens: t }: { rows: Record<string, unknown>[]; tokens: Tokens }) {
  return (
    <div className="min-w-0">
      <TabHeader t={t} count={rows.length} label="commentaire" limit={50} />
      <div className="space-y-2 max-h-[40vh] overflow-auto pr-1">
        {rows.slice(0, 50).map((row, i) => (
          <div key={i} className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl min-w-0" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
            <span className="text-[10px]" style={{ color: t.text.tertiary }}>{formatDate(row.created_at)}</span>
            <p className="text-xs leading-relaxed mt-1 break-words" style={{ color: t.text.secondary }}>{str(row.content) || '(vide)'}</p>
          </div>
        ))}
      </div>
      <Overflow t={t} total={rows.length} limit={50} />
    </div>
  );
}
