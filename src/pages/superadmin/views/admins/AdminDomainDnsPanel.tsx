import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { VERCEL_DNS_RECORDS } from '../../../superadmin/views/sites/domainTypes';
import CopyButton from '../../../../components/CopyButton';

export default function AdminDomainDnsPanel() {
  const t = useThemeTokens();

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)' }}>
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#f59e0b' }}>
        Configuration DNS chez Hostinger
      </p>
      <div className="space-y-2">
        {VERCEL_DNS_RECORDS.map(r => (
          <div key={r.name} className="rounded-lg px-3 py-2.5" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
            <p className="text-[10px] mb-1.5" style={{ color: t.text.tertiary }}>{r.desc}</p>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="block text-[9px] uppercase font-bold" style={{ color: t.text.quaternary }}>Type</span>
                <span style={{ color: t.text.primary }}>{r.type}</span>
              </div>
              <div className="flex items-end gap-1">
                <div className="min-w-0">
                  <span className="block text-[9px] uppercase font-bold" style={{ color: t.text.quaternary }}>Nom</span>
                  <span className="font-mono" style={{ color: t.text.primary }}>{r.name}</span>
                </div>
                <CopyButton value={r.name} label="Copier le nom" />
              </div>
              <div className="flex items-end gap-1">
                <div className="min-w-0 overflow-hidden">
                  <span className="block text-[9px] uppercase font-bold" style={{ color: t.text.quaternary }}>Valeur</span>
                  <span className="font-mono truncate block" style={{ color: t.text.primary }}>{r.value}</span>
                </div>
                <CopyButton value={r.value} label="Copier la valeur" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px]" style={{ color: t.text.tertiary }}>
        La propagation DNS peut prendre jusqu'a 48h.
      </p>
    </div>
  );
}
