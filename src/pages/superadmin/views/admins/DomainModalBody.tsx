import { Loader2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { CompanyHomePage } from '../../../../lib/companyHomePages';
import { NoSiteState, ChecklistSection, DnsInstructions, DomainLinkBlock, DomainActionButtons, DomainStatusBadge, FeedbackMessage, DOMAIN_STATUS_MAP } from './DomainModalParts';

interface Props {
  loading: boolean;
  page: CompanyHomePage | null;
  domainInput: string;
  setDomainInput: (v: string) => void;
  saving: boolean;
  verifying: boolean;
  removing: boolean;
  testing: boolean;
  autoRechecking: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
  testResult: { ok: boolean; text: string } | null;
  dnsConfig: { aRecord: string; cnameRecord: string } | null;
  inputChanged: boolean;
  onSave: () => void;
  onVerify: () => void;
  onTest: () => void;
  onRemove: () => void;
}

export default function DomainModalBody({
  loading, page, domainInput, setDomainInput,
  saving, verifying, removing, testing, autoRechecking,
  message, testResult, dnsConfig, inputChanged,
  onSave, onVerify, onTest, onRemove,
}: Props) {
  const t = useThemeTokens();

  if (loading) {
    return (
      <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#0ea5e9' }} />
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
        <NoSiteState t={t} />
      </div>
    );
  }

  const status = DOMAIN_STATUS_MAP[page.domain_status ?? 'not_configured'] ?? DOMAIN_STATUS_MAP.not_configured;
  const hasDomain = !!page.custom_domain;
  const isVerified = page.domain_verified && page.domain_status === 'verified';
  const isPending = hasDomain && !isVerified;
  const domainUrl = isVerified ? `https://${page.custom_domain}` : null;

  let vercelAssigned = false;
  if (page.domain_notes) {
    try {
      const notes = JSON.parse(page.domain_notes);
      vercelAssigned = notes.vercel_assigned === true;
    } catch { /* legacy plain text notes */ }
  }

  return (
    <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-5">
      <div>
        <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: t.modal.fieldLabel }}>
          Domaine personnalise
        </label>
        <input
          type="text" value={domainInput}
          onChange={e => setDomainInput(e.target.value)}
          placeholder="monsiteclient.fr"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1 transition-all"
          style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue }}
          onKeyDown={e => { if (e.key === 'Enter') onSave(); }}
        />
      </div>

      {hasDomain && (
        <DomainStatusBadge
          isVerified={!!isVerified} domainStatus={page.domain_status ?? 'not_configured'}
          lastCheckAt={page.last_domain_check_at} autoRechecking={autoRechecking}
          statusLabel={status.label} statusColor={status.color} statusBg={status.bg} statusBorder={status.border}
          t={t}
        />
      )}

      <DomainLinkBlock domainUrl={domainUrl} customDomain={page.custom_domain ?? undefined} hasDomain={hasDomain} t={t} />

      <ChecklistSection hasDomain={hasDomain} vercelAssigned={vercelAssigned} isVerified={!!isVerified} isPending={isPending} domainStatus={page?.domain_status ?? 'not_configured'} t={t} />

      {isPending && <DnsInstructions t={t} dnsConfig={dnsConfig} />}

      {message && <FeedbackMessage type={message.type} text={message.text} />}
      {testResult && <FeedbackMessage type={testResult.ok ? 'success' : 'error'} text={testResult.text} />}

      <DomainActionButtons
        inputChanged={inputChanged} hasDomain={hasDomain} isVerified={!!isVerified} domainInput={domainInput}
        saving={saving} verifying={verifying} removing={removing} testing={testing} autoRechecking={autoRechecking}
        onSave={onSave} onVerify={onVerify} onTest={onTest} onRemove={onRemove} t={t}
      />
    </div>
  );
}
