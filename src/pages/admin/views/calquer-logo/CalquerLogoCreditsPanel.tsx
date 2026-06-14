import { useState } from 'react';
import { CreditCard, Clock, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';

export interface CreditSnapshot {
  creditsBefore: number | null;
  creditsAfter: number | null;
  creditsUsed: number | null;
  timestamp: string;
  logoTitle?: string;
}

interface Props {
  currentCredits: number | null;
  loadingCredits: boolean;
  lastSnapshot: CreditSnapshot | null;
  history: CreditSnapshot[];
  onRefreshCredits: () => void;
}

const STORAGE_KEY = 'calquer-logo-credit-history';

export function loadCreditHistory(): CreditSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveCreditHistory(history: CreditSnapshot[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 20))); }
  catch { /* */ }
}

export default function CalquerLogoCreditsPanel({ currentCredits, loadingCredits, lastSnapshot, history, onRefreshCredits }: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'rgba(148,163,184,0.6)' }}>
          Consommation Vectorizer.AI
        </h3>
        <button onClick={onRefreshCredits} disabled={loadingCredits}
          className="p-1 rounded hover:bg-white/5 transition-colors disabled:opacity-40"
          title="Actualiser les credits">
          {loadingCredits
            ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'rgba(148,163,184,0.4)' }} />
            : <CreditCard className="w-3 h-3" style={{ color: 'rgba(148,163,184,0.4)' }} />}
        </button>
      </div>

      <div className="rounded-lg p-2.5 space-y-1.5"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>

        <CreditRow label="Credit actuel" value={formatCredit(currentCredits)} loading={loadingCredits} />

        {lastSnapshot && (
          <>
            <div className="h-px my-1" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <CreditRow label="Avant" value={formatCredit(lastSnapshot.creditsBefore)} />
            <CreditRow label="Apres" value={formatCredit(lastSnapshot.creditsAfter)} />
            <CreditRow label="Utilise" value={formatCredit(lastSnapshot.creditsUsed)} highlight />
            <CreditRow label="Derniere vectorisation" value={formatDate(lastSnapshot.timestamp)} small />
          </>
        )}

        {!lastSnapshot && currentCredits === null && !loadingCredits && (
          <div className="flex items-center gap-1.5 py-1">
            <AlertCircle className="w-3 h-3 shrink-0" style={{ color: 'rgba(148,163,184,0.35)' }} />
            <p className="text-[9px]" style={{ color: 'rgba(148,163,184,0.35)' }}>
              Credit non disponible
            </p>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="space-y-1">
          <button onClick={() => setHistoryOpen(v => !v)}
            className="flex items-center gap-1.5 text-[10px] font-medium w-full hover:bg-white/3 rounded px-1 py-0.5 transition-colors"
            style={{ color: 'rgba(148,163,184,0.5)' }}>
            <Clock className="w-3 h-3" />
            Historique ({history.length})
            {historyOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
          </button>

          {historyOpen && (
            <div className="space-y-1 max-h-[140px] overflow-y-auto">
              {history.map((h, i) => (
                <div key={i} className="rounded-md px-2 py-1.5"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-medium" style={{ color: 'rgba(226,232,240,0.7)' }}>
                      {h.logoTitle || 'Logo'}
                    </p>
                    <p className="text-[9px]" style={{ color: 'rgba(148,163,184,0.4)' }}>
                      {formatCredit(h.creditsUsed)} credit{(h.creditsUsed ?? 0) > 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="text-[8px]" style={{ color: 'rgba(148,163,184,0.3)' }}>
                    {formatDate(h.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreditRow({ label, value, loading, highlight, small }: {
  label: string; value: string; loading?: boolean; highlight?: boolean; small?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={small ? 'text-[8px]' : 'text-[10px]'}
        style={{ color: 'rgba(148,163,184,0.5)' }}>{label}</span>
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'rgba(148,163,184,0.3)' }} />
      ) : (
        <span className={`${small ? 'text-[8px]' : 'text-[10px]'} font-mono tabular-nums font-medium`}
          style={{ color: highlight ? '#f59e0b' : 'rgba(226,232,240,0.8)' }}>
          {value}
        </span>
      )}
    </div>
  );
}

function formatCredit(v: number | null): string {
  if (v === null || v === undefined) return '--';
  return v.toLocaleString('fr-FR');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
