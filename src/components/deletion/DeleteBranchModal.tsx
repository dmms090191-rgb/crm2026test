import { useState } from 'react';
import { AlertTriangle, X, Loader2, CheckCircle2, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ThemeTokens } from '../../lib/themeTokensTypes';

const CONFIRM_WORD = 'SUPPRIMER';

export interface DeleteTarget {
  /** group_user_id pour un Groupe, company_id pour une Societe. */
  id: string;
  label: string;
}

export interface DeleteReportEntry {
  group_user_id?: string;
  company_id?: string;
  group_label?: string;
  email?: string;
  status: 'ok' | 'partial' | 'error';
  phase?: string;
  error?: string;
  counts?: Record<string, number>;
  auth?: { deleted: number; expected: number };
  clients?: { deleted: string[]; kept_shared: string[] };
  storage?: { removed: number; expected: number };
  domains_left_at_registrar?: { domain_name: string; vercel_order_id?: string }[];
  errors?: unknown[];
}

interface Props {
  targets: DeleteTarget[];
  /** 'delete' = Groupes (group_user_ids) · 'delete_company' = Societes (company_ids) */
  mode: 'delete' | 'delete_company';
  entityLabel: string;        // « Groupe » / « Société »
  entityLabelPlural: string;  // « Groupes » / « Sociétés »
  entityArticle: string;      // « le » / « la »
  tokens: ThemeTokens;
  onClose: () => void;
  onDone: () => void;
}

export default function DeleteBranchModal({
  targets, mode, entityLabel, entityLabelPlural, entityArticle, tokens: t, onClose, onDone,
}: Props) {
  const [word, setWord] = useState('');
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<DeleteReportEntry[] | null>(null);
  const [fatal, setFatal] = useState('');

  const single = targets.length === 1;
  const canRun = word === CONFIRM_WORD && !running;
  const allOk = report !== null && report.every(r => r.status === 'ok');

  const run = async (resume: boolean) => {
    setRunning(true);
    setFatal('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setFatal('Session expirée. Reconnectez-vous.'); setRunning(false); return; }

      const payload = resume
        ? { mode: 'resume' }
        : mode === 'delete'
          ? { mode: 'delete', group_user_ids: targets.map(x => x.id) }
          : { mode: 'delete_company', company_ids: targets.map(x => x.id) };

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-groups`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setFatal(body.error || `Erreur ${res.status}`); setRunning(false); return; }

      setReport(body.report ?? []);
      setRunning(false);
      if (body.ok) onDone();
    } catch (err) {
      setFatal(String(err));
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}` }}>

        <div className="flex items-start gap-3 p-5" style={{ borderBottom: `1px solid ${t.modal.border}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.12)' }}>
            <AlertTriangle className="w-5 h-5" style={{ color: '#ef4444' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold" style={{ color: t.modal.title }}>
              {single
                ? `Supprimer définitivement ${entityArticle} ${entityLabel} ${targets[0].label} ?`
                : `Supprimer définitivement ${targets.length} ${entityLabelPlural} ?`}
            </h2>
            {!single && (
              <p className="text-[11px] mt-1 leading-relaxed" style={{ color: t.text.tertiary }}>
                {targets.map(x => x.label).join(' · ')}
              </p>
            )}
          </div>
          {!running && (
            <button onClick={onClose} className="p-1 rounded-lg flex-shrink-0" style={{ color: t.text.tertiary }}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {report === null ? (
          <div className="p-5 space-y-4">
            <p className="text-xs leading-relaxed" style={{ color: t.text.secondary }}>
              Cette action supprimera définitivement les données appartenant à cette {entityLabel} et ne pourra pas être annulée.
            </p>
            <ul className="text-[11px] space-y-1" style={{ color: t.text.tertiary }}>
              {mode === 'delete'
                ? <li>· Ses Sociétés, leurs Vendeurs, leurs leads et tout le CRM</li>
                : <li>· Son compte Admin, ses Vendeurs, ses leads et tout son CRM</li>}
              <li>· Les messages, rendez-vous, sites, logos et données IA</li>
              <li>· Les comptes de connexion appartenant à cette branche</li>
              <li>· Un Client rattaché ailleurs conserve son compte</li>
              <li>· Un domaine acheté chez le registrar n'est pas résilié</li>
            </ul>

            <div>
              <label className="block text-[10px] font-bold tracking-[0.12em] uppercase mb-1.5"
                style={{ color: t.text.quaternary }}>
                Tapez {CONFIRM_WORD} pour confirmer
              </label>
              <input
                value={word}
                onChange={e => setWord(e.target.value)}
                disabled={running}
                placeholder={CONFIRM_WORD}
                autoFocus
                className="w-full px-3 py-2 rounded-lg text-sm outline-none tracking-[0.15em]"
                style={{ background: t.input.bg, border: `1px solid ${word === CONFIRM_WORD ? '#ef4444' : t.input.border}`, color: t.input.text }}
              />
            </div>

            {fatal && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>{fatal}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} disabled={running}
                className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                style={{ background: t.surface.hover, color: t.text.secondary }}>
                Annuler
              </button>
              <button onClick={() => run(false)} disabled={!canRun}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-40"
                style={{ background: canRun ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(239,68,68,0.3)' }}>
                {running && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {running ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            {allOk ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)' }}>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#22c55e' }} />
                <p className="text-xs font-semibold" style={{ color: '#22c55e' }}>Suppression terminée</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)' }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
                <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>Nettoyage incomplet — détail ci-dessous</p>
              </div>
            )}

            {report.map((r, i) => (
              <div key={i} className="rounded-lg p-3 space-y-1.5"
                style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold truncate" style={{ color: t.text.primary }}>
                    {r.group_label || r.email || r.company_id || r.group_user_id}
                  </p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: r.status === 'ok' ? 'rgba(34,197,94,0.12)' : r.status === 'partial' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                      color: r.status === 'ok' ? '#22c55e' : r.status === 'partial' ? '#f59e0b' : '#ef4444',
                    }}>
                    {r.status}
                  </span>
                </div>

                {r.error && <p className="text-[11px]" style={{ color: '#f87171' }}>{r.phase ? `[${r.phase}] ` : ''}{r.error}</p>}

                {r.counts && (
                  <p className="text-[10px] leading-relaxed" style={{ color: t.text.tertiary }}>
                    {Object.entries(r.counts).filter(([, n]) => n > 0).map(([k, n]) => `${k}: ${n}`).join(' · ') || 'aucune donnée'}
                  </p>
                )}

                {r.clients?.kept_shared?.length ? (
                  <p className="text-[10px]" style={{ color: t.text.tertiary }}>
                    Clients conservés (rattachés ailleurs) : {r.clients.kept_shared.join(', ')}
                  </p>
                ) : null}

                {r.domains_left_at_registrar?.length ? (
                  <div className="flex items-start gap-1.5 px-2 py-1.5 rounded" style={{ background: 'rgba(245,158,11,0.06)' }}>
                    <Globe className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                    <p className="text-[10px]" style={{ color: '#f59e0b' }}>
                      Domaines toujours enregistrés chez le registrar, à traiter manuellement :{' '}
                      {r.domains_left_at_registrar.map(d => d.domain_name).join(', ')}
                    </p>
                  </div>
                ) : null}
              </div>
            ))}

            <div className="flex gap-2 pt-1">
              <button onClick={() => { onDone(); onClose(); }}
                className="flex-1 py-2.5 rounded-lg text-xs font-semibold"
                style={{ background: t.surface.hover, color: t.text.secondary }}>
                Fermer
              </button>
              {!allOk && (
                <button onClick={() => run(true)} disabled={running}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold text-white disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  {running && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Reprendre le nettoyage
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
