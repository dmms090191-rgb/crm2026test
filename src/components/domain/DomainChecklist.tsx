import { useState } from 'react';
import { CheckCircle2, Circle, AlertCircle, Loader2, Globe, Server, Settings2, RefreshCw, ExternalLink, ShieldCheck } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { callManageDomain } from '../../pages/superadmin/views/sites/domainTypes';
import DomainDnsInstructions from './DomainDnsInstructions';

type DomainStatus = 'not_configured' | 'pending' | 'verified' | 'error';

interface Props {
  domain: string | null;
  domainStatus: DomainStatus;
  domainVerified: boolean;
  domainNotes: string | null;
  pageId: string;
  readOnly?: boolean;
  onRefresh?: () => void;
}

type StepState = 'done' | 'active' | 'todo' | 'error';

interface StepDef {
  num: number;
  title: string;
  state: StepState;
  detail?: string;
}

function resolveSteps(domain: string | null, status: DomainStatus, verified: boolean, notes: string | null): StepDef[] {
  const hasDomain = !!domain;
  const addedToVercel = hasDomain && status !== 'not_configured';
  const isError = status === 'error';
  const isVerified = verified && status === 'verified';
  const isPending = hasDomain && !isVerified && !isError;

  return [
    {
      num: 1,
      title: 'Domaine attribue',
      state: hasDomain ? 'done' : 'active',
      detail: hasDomain ? domain! : 'Aucun domaine saisi.',
    },
    {
      num: 2,
      title: 'Domaine ajoute a Vercel',
      state: !hasDomain ? 'todo' : isError ? 'error' : addedToVercel ? 'done' : 'todo',
      detail: isError && notes ? notes : !hasDomain ? 'En attente du domaine.' : addedToVercel ? 'Le domaine est enregistre sur Vercel.' : undefined,
    },
    {
      num: 3,
      title: 'DNS a configurer chez Hostinger',
      state: !addedToVercel ? 'todo' : isVerified ? 'done' : 'active',
      detail: isVerified ? 'DNS configure correctement.' : !addedToVercel ? 'Ajoutez d\'abord le domaine.' : undefined,
    },
    {
      num: 4,
      title: 'Verification DNS',
      state: !addedToVercel ? 'todo' : isVerified ? 'done' : isPending ? 'active' : isError ? 'error' : 'todo',
      detail: isVerified ? 'DNS verifie avec succes.' : isError && notes ? notes : isPending ? 'Cliquez pour verifier la propagation DNS.' : undefined,
    },
    {
      num: 5,
      title: 'Domaine actif',
      state: isVerified ? 'done' : 'todo',
      detail: isVerified ? `Le site est accessible sur https://${domain}` : 'Le domaine sera actif apres verification.',
    },
  ];
}

export default function DomainChecklist({ domain, domainStatus, domainVerified, domainNotes, pageId, readOnly, onRefresh }: Props) {
  const t = useThemeTokens();
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const steps = resolveSteps(domain, domainStatus, domainVerified, domainNotes);

  async function handleVerify() {
    if (!domain) return;
    setVerifying(true);
    setVerifyMsg(null);
    try {
      const res = await callManageDomain('verify', domain, pageId);
      if (res.error) {
        setVerifyMsg({ type: 'error', text: res.error });
      } else if (res.verified) {
        setVerifyMsg({ type: 'success', text: 'Domaine verifie avec succes !' });
        onRefresh?.();
      } else {
        setVerifyMsg({ type: 'error', text: res.health_note || 'DNS pas encore propage. Reessayez dans quelques minutes.' });
        onRefresh?.();
      }
    } catch (e) {
      setVerifyMsg({ type: 'error', text: String(e) });
    } finally {
      setVerifying(false);
      setTimeout(() => setVerifyMsg(null), 5000);
    }
  }

  async function handleHealthCheck() {
    if (!domain) return;
    setTesting(true);
    setTestMsg(null);
    try {
      const res = await callManageDomain('health-check', domain, pageId);
      if (res.error) {
        setTestMsg({ type: 'error', text: res.error });
      } else if (res.is_really_active) {
        setTestMsg({ type: 'success', text: 'Le site est accessible et fonctionne correctement !' });
        onRefresh?.();
      } else if (res.is_parked_page) {
        setTestMsg({ type: 'error', text: 'Le domaine pointe vers une page parking (Hostinger/registrar). Configurez les DNS pour pointer vers Vercel.' });
        onRefresh?.();
      } else {
        setTestMsg({ type: 'error', text: 'Le site n\'est pas encore accessible. Verifiez vos DNS et reessayez.' });
        onRefresh?.();
      }
    } catch (e) {
      setTestMsg({ type: 'error', text: String(e) });
    } finally {
      setTesting(false);
      setTimeout(() => setTestMsg(null), 8000);
    }
  }

  const isVerified = domainVerified && domainStatus === 'verified';
  const showDns = !!domain && domainStatus !== 'not_configured' && !isVerified;
  const canVerify = !!domain && !isVerified && domainStatus !== 'not_configured' && !readOnly;
  const canTest = !!domain && domainStatus !== 'not_configured' && !readOnly;

  return (
    <div className="space-y-1">
      {steps.map((step) => (
        <StepRow key={step.num} step={step} t={t}>
          {/* Step 3: DNS instructions */}
          {step.num === 3 && showDns && step.state === 'active' && (
            <div className="mt-2.5">
              <DomainDnsInstructions />
            </div>
          )}

          {/* Step 4: Verify button */}
          {step.num === 4 && canVerify && (
            <div className="mt-2.5 space-y-2">
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 hover:scale-[1.01]"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}
              >
                {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Verifier maintenant
              </button>
              {verifyMsg && (
                <p className="text-[11px] px-2.5 py-1.5 rounded-lg" style={{
                  background: verifyMsg.type === 'success' ? 'rgba(22,163,106,0.08)' : 'rgba(239,68,68,0.08)',
                  color: verifyMsg.type === 'success' ? '#16a34a' : '#f87171',
                }}>{verifyMsg.text}</p>
              )}
            </div>
          )}

          {/* Step 5: Test button + Active link */}
          {step.num === 5 && canTest && (
            <div className="mt-2.5 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleHealthCheck}
                  disabled={testing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 hover:scale-[1.01]"
                  style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', color: '#0ea5e9' }}
                >
                  {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                  Tester l'acces
                </button>
                {isVerified && domain && (
                  <a
                    href={`https://${domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.01]"
                    style={{ background: 'rgba(22,163,106,0.06)', border: '1px solid rgba(22,163,106,0.15)', color: '#16a34a' }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {domain}
                  </a>
                )}
              </div>
              {testMsg && (
                <p className="text-[11px] px-2.5 py-1.5 rounded-lg" style={{
                  background: testMsg.type === 'success' ? 'rgba(22,163,106,0.08)' : 'rgba(239,68,68,0.08)',
                  color: testMsg.type === 'success' ? '#16a34a' : '#f87171',
                }}>{testMsg.text}</p>
              )}
            </div>
          )}
        </StepRow>
      ))}
    </div>
  );
}

const STEP_ICON_MAP: Record<number, typeof Globe> = {
  1: Globe,
  2: Server,
  3: Settings2,
  4: RefreshCw,
  5: ShieldCheck,
};

const STATE_COLORS: Record<StepState, { icon: string; line: string; bg: string; border: string }> = {
  done: { icon: '#16a34a', line: 'rgba(22,163,106,0.3)', bg: 'rgba(22,163,106,0.06)', border: 'rgba(22,163,106,0.15)' },
  active: { icon: '#0ea5e9', line: 'rgba(14,165,233,0.3)', bg: 'rgba(14,165,233,0.06)', border: 'rgba(14,165,233,0.15)' },
  error: { icon: '#ef4444', line: 'rgba(239,68,68,0.3)', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)' },
  todo: { icon: '#6b7280', line: 'rgba(107,114,128,0.15)', bg: 'rgba(107,114,128,0.04)', border: 'rgba(107,114,128,0.1)' },
};

function StepRow({ step, t, children }: { step: StepDef; t: ReturnType<typeof useThemeTokens>; children?: React.ReactNode }) {
  const colors = STATE_COLORS[step.state];
  const StepIcon = STEP_ICON_MAP[step.num] ?? Globe;

  return (
    <div className="flex gap-3 relative">
      {/* Vertical line */}
      {step.num < 5 && (
        <div
          className="absolute left-[13px] top-[32px] w-[2px]"
          style={{ background: colors.line, height: 'calc(100% - 24px)' }}
        />
      )}

      {/* Icon circle */}
      <div
        className="w-[28px] h-[28px] rounded-lg flex items-center justify-center flex-shrink-0 z-10"
        style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
      >
        {step.state === 'done' ? (
          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: colors.icon }} />
        ) : step.state === 'error' ? (
          <AlertCircle className="w-3.5 h-3.5" style={{ color: colors.icon }} />
        ) : step.state === 'active' ? (
          <StepIcon className="w-3.5 h-3.5" style={{ color: colors.icon }} />
        ) : (
          <Circle className="w-3.5 h-3.5" style={{ color: colors.icon }} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.icon }}>
            Etape {step.num}
          </span>
          {step.state === 'done' && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'rgba(22,163,106,0.08)', color: '#16a34a' }}>
              Fait
            </span>
          )}
          {step.state === 'error' && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
              Erreur
            </span>
          )}
        </div>
        <p className="text-xs font-semibold mt-0.5" style={{ color: t.text.primary }}>{step.title}</p>
        {step.detail && (
          <p className="text-[11px] mt-0.5 break-all" style={{ color: step.state === 'error' ? '#f87171' : t.text.tertiary }}>
            {step.detail}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
