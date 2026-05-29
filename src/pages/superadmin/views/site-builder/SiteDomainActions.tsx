import { Save, RefreshCw, CheckCircle2, Trash2, Loader2 } from 'lucide-react';

interface Props {
  hasDomain: boolean;
  isVerified: boolean;
  inputChanged: boolean;
  domainInput: string;
  saving: boolean;
  verifying: boolean;
  testing: boolean;
  removing: boolean;
  autoRechecking: boolean;
  onSave: () => void;
  onVerify: () => void;
  onTestAccess: () => void;
  onRemove: () => void;
}

export default function SiteDomainActions({
  hasDomain, isVerified, inputChanged, domainInput,
  saving, verifying, testing, removing, autoRechecking,
  onSave, onVerify, onTestAccess, onRemove,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {(inputChanged || !hasDomain) && (
        <button onClick={onSave} disabled={saving || !domainInput.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 hover:scale-[1.01]"
          style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', boxShadow: '0 2px 12px rgba(14,165,233,0.3)' }}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Enregistrer le domaine
        </button>
      )}
      {hasDomain && (
        <button onClick={onVerify} disabled={verifying || autoRechecking}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 hover:scale-[1.01]"
          style={isVerified
            ? { background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', color: '#0ea5e9' }
            : { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }
          }>
          {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {isVerified ? 'Re-verifier' : 'Verifier maintenant'}
        </button>
      )}
      {isVerified && (
        <button onClick={onTestAccess} disabled={testing}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 hover:scale-[1.01]"
          style={{ background: 'rgba(22,163,106,0.08)', border: '1px solid rgba(22,163,106,0.15)', color: '#16a34a' }}>
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Tester l'acces
        </button>
      )}
      {hasDomain && (
        <button onClick={onRemove} disabled={removing}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 hover:scale-[1.01]"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}>
          {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Retirer le domaine
        </button>
      )}
    </div>
  );
}
