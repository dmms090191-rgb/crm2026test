import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Clock, User, Phone, Mail, Pencil, Trash2, Check, X, ChevronDown, Plus, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface RdvProposal {
  id: string;
  vendor_id: string | null;
  lead_id: string | null;
  lead_name: string;
  lead_phone: string;
  lead_email: string;
  proposed_date: string;
  proposed_time: string;
  notes: string;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'En attente',  color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)'  },
  confirmed: { label: 'Confirmé',    color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)'  },
  cancelled: { label: 'Annulé',      color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  done:      { label: 'Terminé',     color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
};

const FILTERS = ['Tous', 'En attente', 'Confirmé', 'Annulé', 'Terminé'];
const filterToStatus: Record<string, string> = {
  'En attente': 'pending',
  'Confirmé': 'confirmed',
  'Annulé': 'cancelled',
  'Terminé': 'done',
};

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateFull(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

interface EditModalProps {
  rdv: RdvProposal;
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ rdv, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState({
    lead_name: rdv.lead_name,
    lead_phone: rdv.lead_phone,
    lead_email: rdv.lead_email,
    proposed_date: rdv.proposed_date,
    proposed_time: rdv.proposed_time,
    notes: rdv.notes,
    status: rdv.status,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.lead_name.trim() || !form.proposed_date) {
      setError('Le nom du contact et la date sont obligatoires.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('rdv_proposals').update({
      lead_name: form.lead_name.trim(),
      lead_phone: form.lead_phone.trim(),
      lead_email: form.lead_email.trim(),
      proposed_date: form.proposed_date,
      proposed_time: form.proposed_time,
      notes: form.notes.trim(),
      status: form.status,
    }).eq('id', rdv.id);
    setSaving(false);
    if (err) { setError('Erreur lors de l\'enregistrement.'); return; }
    onSaved();
    onClose();
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all';
  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0d1420 0%, #0a1019 100%)',
          border: '1px solid rgba(56,189,248,0.12)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <p className="text-white font-semibold text-sm">Modifier le rendez-vous</p>
            <p className="text-slate-600 text-xs">{rdv.lead_name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Nom du contact *</label>
            <input type="text" value={form.lead_name} onChange={e => set('lead_name', e.target.value)} className={inputCls} style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Téléphone</label>
              <input type="tel" value={form.lead_phone} onChange={e => set('lead_phone', e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Email</label>
              <input type="email" value={form.lead_email} onChange={e => set('lead_email', e.target.value)} className={inputCls} style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Date *</label>
              <input type="date" value={form.proposed_date} onChange={e => set('proposed_date', e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Heure</label>
              <input type="time" value={form.proposed_time} onChange={e => set('proposed_time', e.target.value)} className={inputCls} style={inputStyle} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Statut</label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              className={inputCls + ' cursor-pointer'}
              style={{ ...inputStyle, appearance: 'none' }}
            >
              {Object.entries(statusConfig).map(([k, v]) => (
                <option key={k} value={k} style={{ background: '#0a0f1a' }}>{v.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className={inputCls + ' resize-none'}
              style={inputStyle}
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50 hover:scale-105"
              style={{ background: 'linear-gradient(90deg, #0ea5e9, #22d3ee)', boxShadow: '0 0 16px rgba(34,211,238,0.2)' }}
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VendorPropositionsRdv() {
  const [rdvs, setRdvs] = useState<RdvProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Tous');
  const [editRdv, setEditRdv] = useState<RdvProposal | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState({
    lead_name: '', lead_phone: '', lead_email: '',
    proposed_date: new Date().toISOString().split('T')[0],
    proposed_time: '10:00', notes: '', status: 'pending',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('rdv_proposals')
      .select('*')
      .order('proposed_date', { ascending: true })
      .order('proposed_time', { ascending: true });
    if (data) setRdvs(data as RdvProposal[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rdvs.filter(r => {
    if (filter === 'Tous') return true;
    return r.status === filterToStatus[filter];
  });

  async function handleDelete(id: string) {
    await supabase.from('rdv_proposals').delete().eq('id', id);
    setRdvs(prev => prev.filter(r => r.id !== id));
  }

  async function handleStatusChange(id: string, status: string) {
    await supabase.from('rdv_proposals').update({ status }).eq('id', id);
    setRdvs(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }

  const setNew = (k: string, v: string) => setNewForm(f => ({ ...f, [k]: v }));

  async function handleAdd() {
    if (!newForm.lead_name.trim() || !newForm.proposed_date) return;
    setSaving(true);
    await supabase.from('rdv_proposals').insert({
      lead_name: newForm.lead_name.trim(),
      lead_phone: newForm.lead_phone.trim(),
      lead_email: newForm.lead_email.trim(),
      proposed_date: newForm.proposed_date,
      proposed_time: newForm.proposed_time,
      notes: newForm.notes.trim(),
      status: newForm.status,
    });
    setSaving(false);
    setShowAdd(false);
    setNewForm({ lead_name: '', lead_phone: '', lead_email: '', proposed_date: new Date().toISOString().split('T')[0], proposed_time: '10:00', notes: '', status: 'pending' });
    load();
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all';
  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-bold">Propositions RDV</h2>
          <p className="text-slate-600 text-xs mt-0.5">{rdvs.length} proposition{rdvs.length !== 1 ? 's' : ''} au total</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
          style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)', color: '#22d3ee' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nouvelle proposition
        </button>
      </div>

      {showAdd && (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.04) 0%, rgba(14,165,233,0.02) 100%)', border: '1px solid rgba(34,211,238,0.12)' }}
        >
          <p className="text-white text-sm font-semibold">Nouvelle proposition de rendez-vous</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Nom du contact *</label>
              <input type="text" value={newForm.lead_name} onChange={e => setNew('lead_name', e.target.value)} className={inputCls} style={inputStyle} placeholder="Jean Dupont" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Téléphone</label>
              <input type="tel" value={newForm.lead_phone} onChange={e => setNew('lead_phone', e.target.value)} className={inputCls} style={inputStyle} placeholder="06 00 00 00 00" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Email</label>
              <input type="email" value={newForm.lead_email} onChange={e => setNew('lead_email', e.target.value)} className={inputCls} style={inputStyle} placeholder="jean@email.com" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Statut</label>
              <select value={newForm.status} onChange={e => setNew('status', e.target.value)} className={inputCls + ' cursor-pointer'} style={{ ...inputStyle, appearance: 'none' }}>
                {Object.entries(statusConfig).map(([k, v]) => (
                  <option key={k} value={k} style={{ background: '#0a0f1a' }}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Date *</label>
              <input type="date" value={newForm.proposed_date} onChange={e => setNew('proposed_date', e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Heure</label>
              <input type="time" value={newForm.proposed_time} onChange={e => setNew('proposed_time', e.target.value)} className={inputCls} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Notes</label>
            <textarea value={newForm.notes} onChange={e => setNew('notes', e.target.value)} rows={2} className={inputCls + ' resize-none'} style={inputStyle} placeholder="Informations complémentaires..." />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAdd}
              disabled={saving || !newForm.lead_name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50 hover:scale-105"
              style={{ background: 'linear-gradient(90deg, #0ea5e9, #22d3ee)', boxShadow: '0 0 16px rgba(34,211,238,0.2)' }}
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 px-5 py-3.5 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {FILTERS.map(f => {
            const active = filter === f;
            const statusKey = filterToStatus[f];
            const cfg = statusKey ? statusConfig[statusKey] : null;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                style={active
                  ? { background: cfg ? cfg.bg : 'rgba(255,255,255,0.08)', color: cfg ? cfg.color : '#fff', border: `1px solid ${cfg ? cfg.border : 'rgba(255,255,255,0.15)'}` }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.05)' }
                }
              >
                {f}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <CalendarDays className="w-5 h-5 text-slate-700" />
            </div>
            <p className="text-slate-600 text-sm">Aucune proposition de RDV</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Contact', 'Date & Heure', 'Coordonnées', 'Statut', 'Notes', 'Actions'].map(col => (
                    <th key={col} className="px-5 py-3 text-left text-[10px] font-bold tracking-[0.15em] uppercase text-slate-600">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((rdv, idx) => {
                  const cfg = statusConfig[rdv.status] ?? statusConfig.pending;
                  const isPast = rdv.proposed_date < todayStr;
                  return (
                    <tr
                      key={rdv.id}
                      className="group transition-all duration-150"
                      style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #22d3ee, #2563eb)' }}
                          >
                            {rdv.lead_name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-white">{rdv.lead_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div>
                          <p className={`text-sm font-medium ${isPast && rdv.status !== 'done' ? 'text-slate-500' : 'text-white'}`}>
                            {formatDate(rdv.proposed_date)}
                          </p>
                          {rdv.proposed_time && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-600" />
                              <span className="text-xs text-slate-500">{rdv.proposed_time}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          {rdv.lead_phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-600 flex-shrink-0" />
                              <span className="text-xs text-slate-400">{rdv.lead_phone}</span>
                            </div>
                          )}
                          {rdv.lead_email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-slate-600 flex-shrink-0" />
                              <span className="text-xs text-slate-400">{rdv.lead_email}</span>
                            </div>
                          )}
                          {!rdv.lead_phone && !rdv.lead_email && <span className="text-xs text-slate-700">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          value={rdv.status}
                          onChange={e => handleStatusChange(rdv.id, e.target.value)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold focus:outline-none cursor-pointer transition-all"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, appearance: 'none' }}
                        >
                          {Object.entries(statusConfig).map(([k, v]) => (
                            <option key={k} value={k} style={{ background: '#0a0f1a', color: v.color }}>{v.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3.5 max-w-[180px]">
                        <p className="text-xs text-slate-500 truncate">{rdv.notes || '—'}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditRdv(rdv)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                            style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', color: '#60a5fa' }}
                          >
                            <Pencil className="w-3 h-3" />
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(rdv.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171' }}
                          >
                            <Trash2 className="w-3 h-3" />
                            Suppr.
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs text-slate-700">{filtered.length} proposition{filtered.length !== 1 ? 's' : ''} affichée{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>

      {editRdv && (
        <EditModal rdv={editRdv} onClose={() => setEditRdv(null)} onSaved={load} />
      )}
    </div>
  );
}
