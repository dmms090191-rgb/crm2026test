import { Globe, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { VERCEL_DNS_RECORDS } from '../sites/domainTypes';
import CopyButton from '../../../../components/CopyButton';

type Tokens = ReturnType<typeof useThemeTokens>;

export function NoSiteState({ t }: { t: Tokens }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 px-2 text-center">
      <Globe className="w-8 h-8" style={{ color: t.text.quaternary }} />
      <p className="text-xs" style={{ color: t.text.tertiary }}>
        Aucun site pour cette societe. Creez d'abord un site via "Site" avant d'attribuer un domaine.
      </p>
    </div>
  );
}

export function ChecklistSection({ hasDomain, vercelAssigned, isVerified, isPending, domainStatus, t }: {
  hasDomain: boolean; vercelAssigned: boolean; isVerified: boolean; isPending: boolean; domainStatus: string;
  t: Tokens;
}) {
  const assignFailed = hasDomain && !vercelAssigned && domainStatus === 'error';
  const steps = [
    { id: 1, label: 'Enregistrer le domaine dans Talvex', done: hasDomain },
    { id: 2, label: 'Domaine assigne au projet Vercel', done: hasDomain && vercelAssigned, warn: assignFailed },
    { id: 3, label: 'Configurer le DNS chez Hostinger', done: hasDomain && vercelAssigned && (isVerified || isPending) },
    { id: 4, label: 'Verifier la propagation DNS', done: isVerified },
    { id: 5, label: 'Tester l\'acces au site', done: isVerified },
  ];

  return (
    <div className="rounded-xl p-4 space-y-2" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: t.text.quaternary }}>
        Checklist de configuration
      </p>
      {steps.map(step => (
        <div key={step.id} className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: step.done ? 'rgba(22,163,106,0.12)' : step.warn ? 'rgba(239,68,68,0.08)' : 'rgba(107,114,128,0.08)',
              border: `1px solid ${step.done ? 'rgba(22,163,106,0.25)' : step.warn ? 'rgba(239,68,68,0.15)' : 'rgba(107,114,128,0.15)'}`,
            }}>
            {step.done ? <CheckCircle2 className="w-3 h-3" style={{ color: '#16a34a' }} /> :
              step.warn ? <AlertCircle className="w-3 h-3" style={{ color: '#ef4444' }} /> :
              <span className="text-[9px] font-bold" style={{ color: '#6b7280' }}>{step.id}</span>}
          </div>
          <span className="text-xs" style={{ color: step.done ? t.text.primary : step.warn ? '#ef4444' : t.text.tertiary }}>
            {step.label}{step.warn ? ' (echoue)' : ''}
          </span>
        </div>
      ))}
      {assignFailed && (
        <div className="flex items-start gap-2 mt-2 px-2 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}>
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} />
          <p className="text-[10px] leading-relaxed" style={{ color: '#ef4444' }}>
            Le domaine n'est pas encore rattache au projet Vercel. Talvex tente de l'ajouter automatiquement lors de la verification.
            Si l'erreur persiste, verifiez que VERCEL_PROJECT_ID correspond au bon projet et que le domaine n'est pas deja utilise sur un autre projet Vercel.
          </p>
        </div>
      )}
    </div>
  );
}

function buildDnsRecords(dnsConfig: { aRecord: string; cnameRecord: string } | null) {
  const fallback = VERCEL_DNS_RECORDS;
  const aValue = dnsConfig?.aRecord || fallback[0].value;
  const cnameValue = dnsConfig?.cnameRecord || fallback[1].value;
  console.log('[DnsInstructions] dnsConfig used:', dnsConfig, '-> A:', aValue, 'CNAME:', cnameValue);
  return [
    { type: 'A', name: '@', value: aValue, desc: 'Pour le domaine principal' },
    { type: 'CNAME', name: 'www', value: cnameValue, desc: 'Pour www' },
  ];
}

export function DnsInstructions({ t, dnsConfig }: { t: Tokens; dnsConfig?: { aRecord: string; cnameRecord: string } | null }) {
  const records = buildDnsRecords(dnsConfig ?? null);
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)' }}>
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#f59e0b' }}>
        Configuration DNS chez Hostinger
      </p>
      <div className="space-y-2">
        {records.map(r => (
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
