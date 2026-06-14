import { Loader2, Check, AlertTriangle } from 'lucide-react';

export function WorkflowHeader({ stepNum }: { stepNum: number }) {
  const steps = ['Isoler', 'Vectoriser', 'Ameliorer'];
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'rgba(148,163,184,0.6)' }}>Workflow IA</h3>
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{
                background: i < stepNum ? 'rgba(34,197,94,0.2)' : i === stepNum ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${i < stepNum ? 'rgba(34,197,94,0.4)' : i === stepNum ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: i < stepNum ? '#22c55e' : i === stepNum ? '#60a5fa' : 'rgba(148,163,184,0.4)',
              }}>
              {i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className="w-3 h-px" style={{ background: i < stepNum ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StepButton({ label, desc, icon, onClick, loading, disabled, done, color }: {
  label: string; desc: string; icon: React.ReactNode; onClick: () => void;
  loading: boolean; disabled: boolean; done: boolean; color: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:scale-[1.01]"
      style={{
        background: done ? `${color}12` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${done ? `${color}30` : 'rgba(255,255,255,0.06)'}`,
      }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" style={{ color }} /> :
         done ? <Check className="w-4 h-4" style={{ color }} /> :
         <span style={{ color }}>{icon}</span>}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: done ? color : 'rgba(226,232,240,0.9)' }}>{label}</p>
        <p className="text-[9px] truncate" style={{ color: 'rgba(148,163,184,0.5)' }}>{loading ? 'En cours...' : desc}</p>
      </div>
    </button>
  );
}

export function WarningBox({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg"
      style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: '#f59e0b' }} />
      <p className="text-[10px]" style={{ color: '#f59e0b' }}>{text}</p>
    </div>
  );
}
