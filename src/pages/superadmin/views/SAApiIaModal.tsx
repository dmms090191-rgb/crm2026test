import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';

export interface AiApi {
  id: string;
  name: string;
  url: string | null;
  account_email: string | null;
  account_password: string | null;
  api_key: string | null;
  remaining_credit: string | null;
  saas_function: string | null;
  status: string;
  notes: string | null;
  cost: string | null;
  purchase_date: string | null;
  created_at: string;
  updated_at: string;
  last_checked_at: string | null;
}

interface Props {
  api: AiApi | null;
  onClose: () => void;
  onSave: (data: Omit<AiApi, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

export default function SAApiIaModal({ api, onClose, onSave }: Props) {
  const tokens = useThemeTokens();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [credit, setCredit] = useState('');
  const [saasFunction, setSaasFunction] = useState('');
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (api) {
      setName(api.name);
      setUrl(api.url ?? '');
      setEmail(api.account_email ?? '');
      setPassword(api.account_password ?? '');
      setApiKey(api.api_key ?? '');
      setCredit(api.remaining_credit ?? '');
      setSaasFunction(api.saas_function ?? '');
      setStatus(api.status);
      setNotes(api.notes ?? '');
      setCost(api.cost ?? '');
      setPurchaseDate(api.purchase_date ?? '');
    }
  }, [api]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({
      name: name.trim(),
      url: url.trim() || null,
      account_email: email.trim() || null,
      account_password: password || null,
      api_key: apiKey || null,
      remaining_credit: credit.trim() || null,
      saas_function: saasFunction.trim() || null,
      status,
      notes: notes.trim() || null,
      cost: cost.trim() || null,
      purchase_date: purchaseDate.trim() || null,
    });
    setSaving(false);
  };

  const fieldStyle = {
    background: tokens.modal.fieldBg,
    border: `1px solid ${tokens.surface.borderLight}`,
    color: tokens.text.primary,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: tokens.card.bg, border: tokens.card.border }}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="text-base font-bold" style={{ color: tokens.text.primary }}>
            {api ? 'Modifier l\'API' : 'Ajouter une API'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:opacity-70">
            <X className="w-4 h-4" style={{ color: tokens.text.tertiary }} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-3">
          <Field label="Nom de l'API *" tokens={tokens}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: DeepSeek" className="w-full px-3 py-2 rounded-lg text-sm" style={fieldStyle} />
          </Field>

          <Field label="Lien" tokens={tokens}>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-lg text-sm" style={fieldStyle} />
          </Field>

          <Field label="Email du compte" tokens={tokens}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="w-full px-3 py-2 rounded-lg text-sm" style={fieldStyle} />
          </Field>

          <Field label="Mot de passe" tokens={tokens}>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 rounded-lg text-sm"
                style={fieldStyle}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-70"
              >
                {showPwd ? <EyeOff className="w-3.5 h-3.5" style={{ color: tokens.text.tertiary }} /> : <Eye className="w-3.5 h-3.5" style={{ color: tokens.text.tertiary }} />}
              </button>
            </div>
          </Field>

          <Field label="Cle API" tokens={tokens}>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 pr-10 rounded-lg text-sm"
                style={fieldStyle}
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-70"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" style={{ color: tokens.text.tertiary }} /> : <Eye className="w-3.5 h-3.5" style={{ color: tokens.text.tertiary }} />}
              </button>
            </div>
          </Field>

          <Field label="Credit restant" tokens={tokens}>
            <input value={credit} onChange={e => setCredit(e.target.value)} placeholder="Ex: 20 $" className="w-full px-3 py-2 rounded-lg text-sm" style={fieldStyle} />
          </Field>

          <Field label="Fonction dans le SaaS" tokens={tokens}>
            <input value={saasFunction} onChange={e => setSaasFunction(e.target.value)} placeholder="Ex: Reponse automatique IA chat client" className="w-full px-3 py-2 rounded-lg text-sm" style={fieldStyle} />
          </Field>

          <Field label="Cout" tokens={tokens}>
            <input value={cost} onChange={e => setCost(e.target.value)} placeholder="Ex: 20 $" className="w-full px-3 py-2 rounded-lg text-sm" style={fieldStyle} />
          </Field>

          <Field label="Date paiement / achat" tokens={tokens}>
            <input value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} placeholder="Ex: 28/05/2026" className="w-full px-3 py-2 rounded-lg text-sm" style={fieldStyle} />
          </Field>

          <Field label="Statut" tokens={tokens}>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={fieldStyle}>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </Field>

          <Field label="Notes" tokens={tokens}>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={fieldStyle} />
          </Field>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: tokens.surface.hover, border: `1px solid ${tokens.surface.borderLight}`, color: tokens.text.secondary }}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                opacity: !name.trim() || saving ? 0.5 : 1,
              }}
            >
              {saving ? 'Enregistrement...' : api ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, tokens, children }: { label: string; tokens: ReturnType<typeof useThemeTokens>; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-1" style={{ color: tokens.text.tertiary }}>{label}</label>
      {children}
    </div>
  );
}
