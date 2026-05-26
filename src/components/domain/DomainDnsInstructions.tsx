import { AlertTriangle } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import CopyButton from '../CopyButton';

const DNS_RECORDS = [
  { type: 'A', name: '@', value: '76.76.21.21', desc: 'Pour le domaine principal' },
  { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com', desc: 'Pour www' },
];

export default function DomainDnsInstructions() {
  const t = useThemeTokens();

  return (
    <div className="space-y-3">
      {/* Warning about email records */}
      <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
          <p className="text-[10px] leading-relaxed" style={{ color: '#f87171' }}>
            Ne supprimez pas les enregistrements email Hostinger : MX, SPF, DKIM, DMARC, autodiscover, autoconfig. Supprimez/modifiez seulement les anciens A, AAAA ou CNAME qui pointent vers le parking Hostinger.
          </p>
        </div>
      </div>

      {/* DNS records */}
      <div className="space-y-2">
        {DNS_RECORDS.map(r => (
          <div key={r.name} className="rounded-lg px-3 py-2.5" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
            <p className="text-[10px] mb-1.5" style={{ color: t.text.tertiary }}>{r.desc}</p>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="block text-[9px] uppercase font-bold" style={{ color: t.text.quaternary }}>Type</span>
                <span className="font-semibold" style={{ color: t.text.primary }}>{r.type}</span>
              </div>
              <div className="flex items-end gap-1">
                <div className="min-w-0">
                  <span className="block text-[9px] uppercase font-bold" style={{ color: t.text.quaternary }}>Nom</span>
                  <span className="font-mono font-semibold" style={{ color: t.text.primary }}>{r.name}</span>
                </div>
                <CopyButton value={r.name} label="Copier le nom" />
              </div>
              <div className="flex items-end gap-1">
                <div className="min-w-0 overflow-hidden">
                  <span className="block text-[9px] uppercase font-bold" style={{ color: t.text.quaternary }}>Valeur</span>
                  <span className="font-mono font-semibold truncate block" style={{ color: t.text.primary }}>{r.value}</span>
                </div>
                <CopyButton value={r.value} label="Copier la valeur" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px]" style={{ color: t.text.tertiary }}>
        La propagation DNS peut prendre de 5 minutes a 48h.
      </p>
    </div>
  );
}
