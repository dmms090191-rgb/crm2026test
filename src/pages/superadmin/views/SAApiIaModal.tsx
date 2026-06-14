import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Mail } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';

export interface AiApi {
  id: string;
  name: string;
  url: string | null;
  account_email: string | null;
  account_password: string | null;
  api_id: string | null;
  api_key: string | null;
  remaining_credit: string | null;
  saas_function: string | null;
  status: string;
  notes: string | null;
  cost: string | null;
  purchase_date: string | null;
  gmail_login: boolean;
  created_at: string;
  updated_at: string;
  last_checked_at: string | null;
}

interface Props {
  api: AiApi | null;
  onClose: () => void;
  onSave: (data: Omit<AiApi, 'id' | 'created_at' | 'updated_at' | 'last_checked_at'>) => Promise<void>;
}

export default function SAApiIaModal({ api, onClose, onSave }: Props) {
  const t = useThemeTokens();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [gmailLogin, setGmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiId, setApiId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [cost, setCost] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (api) {
      setName(api.name);
      setUrl(api.url ?? '');
      setGmailLogin(api.gmail_login ?? false);
      setEmail(api.account_email ?? '');
      setPassword(api.account_password ?? '');
      setApiId(api.api_id ?? '');
      setApiKey(api.api_key ?? '');
      setCost(api.cost ?? '');
      setPurchaseDate(api.purchase_date ?? '');
      setNotes(api.notes ?? '');
    }
  }, [api]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({
      name: name.trim(),
      url: url.trim() || null,
      account_email: email.trim() || null,
      account_password: gmailLogin ? null : (password || null),
      api_id: apiId.trim() || null,
      api_key: apiKey || null,
      remaining_credit: api?.remaining_credit ?? null,
      saas_function: api?.saas_function ?? null,
      status: api?.status ?? 'active',
      notes: notes.trim() || null,
      cost: cost.trim() || null,
      purchase_date: purchaseDate.trim() || null,
      gmail_login: gmailLogin,
    });
    setSaving(false);
  };

  const fs = { background: t.modal.fieldBg, border: `1px solid ${t.surface.borderLight}`, color: t.text.primary };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: t.card.bg, border: t.card.border }}>
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="text-base font-bold" style={{ color: t.text.primary }}>
            {api ? 'Modifier l\'API' : 'Ajouter une API'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:opacity-70">
            <X className="w-4 h-4" style={{ color: t.text.tertiary }} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-3">
          <Field label="Nom de l'API *" t={t}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: DeepSeek" className="w-full px-3 py-2 rounded-lg text-sm" style={fs} />
          </Field>

          <Field label="Lien" t={t}>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-lg text-sm" style={fs} />
          </Field>

          <Field label="Connexion avec Gmail ?" t={t}>
            <div className="flex gap-2">
              <GmailToggle active={gmailLogin} label="Oui" onClick={() => setGmailLogin(true)} t={t} />
              <GmailToggle active={!gmailLogin} label="Non" onClick={() => setGmailLogin(false)} t={t} />
            </div>
          </Field>

          {gmailLogin ? (
            <Field label="Email Gmail" t={t}>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: t.text.quaternary }} />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="dmms090191@gmail.com" className="w-full pl-9 pr-3 py-2 rounded-lg text-sm" style={fs} />
              </div>
            </Field>
          ) : (
            <>
              <Field label="Email / ID" t={t}>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="w-full px-3 py-2 rounded-lg text-sm" style={fs} />
              </Field>
              <Field label="Mot de passe" t={t}>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 pr-10 rounded-lg text-sm" style={fs} />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-70">
                    {showPwd ? <EyeOff className="w-3.5 h-3.5" style={{ color: t.text.tertiary }} /> : <Eye className="w-3.5 h-3.5" style={{ color: t.text.tertiary }} />}
                  </button>
                </div>
              </Field>
            </>
          )}

          <Field label="ID API" t={t}>
            <input value={apiId} onChange={e => setApiId(e.target.value)} placeholder="Ex: app_xxx, org-xxx..." className="w-full px-3 py-2 rounded-lg text-sm" style={fs} />
          </Field>

          <Field label="Cle API" t={t}>
            <div className="relative">
              <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." className="w-full px-3 py-2 pr-10 rounded-lg text-sm" style={fs} />
              <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-70">
                {showKey ? <EyeOff className="w-3.5 h-3.5" style={{ color: t.text.tertiary }} /> : <Eye className="w-3.5 h-3.5" style={{ color: t.text.tertiary }} />}
              </button>
            </div>
          </Field>

          <Field label="Cout" t={t}>
            <input value={cost} onChange={e => setCost(e.target.value)} placeholder="Ex: 20 $, 13270 unites API" className="w-full px-3 py-2 rounded-lg text-sm" style={fs} />
          </Field>

          <Field label="Date de paiement / achat" t={t}>
            <input value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} placeholder="Ex: 28/05/2026" className="w-full px-3 py-2 rounded-lg text-sm" style={fs} />
          </Field>

          <Field label="Notes" t={t}>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Notes libres sur l'API..." className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={fs} />
          </Field>

          <div className="flex items-center gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all" style={{ background: t.surface.hover, border: `1px solid ${t.surface.borderLight}`, color: t.text.secondary }}>
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={!name.trim() || saving} className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', opacity: !name.trim() || saving ? 0.5 : 1 }}>
              {saving ? 'Enregistrement...' : api ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, t, children }: { label: string; t: ReturnType<typeof useThemeTokens>; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-1" style={{ color: t.text.tertiary }}>{label}</label>
      {children}
    </div>
  );
}

function GmailToggle({ active, label, onClick, t }: { active: boolean; label: string; onClick: () => void; t: ReturnType<typeof useThemeTokens> }) {
  return (
    <button onClick={onClick} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all" style={{
      background: active ? 'rgba(245,158,11,0.12)' : t.surface.hover,
      border: `1.5px solid ${active ? 'rgba(245,158,11,0.4)' : t.surface.borderLight}`,
      color: active ? '#f59e0b' : t.text.quaternary,
    }}>
      {label}
    </button>
  );
}
