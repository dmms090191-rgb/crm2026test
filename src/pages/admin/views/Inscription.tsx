import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, XCircle, Users, UserPlus, Trash2, X, Eye, EyeOff, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Registration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  status: 'pending' | 'accepted' | 'refused';
  registered_at: string;
}

const cardBase = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
  border: '1px solid rgba(255,255,255,0.07)',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

interface HistoryModalProps {
  type: 'accepted' | 'refused';
  rows: Registration[];
  onClose: () => void;
  onDelete: (ids: string[]) => void;
}

function HistoryModal({ type, rows, onClose, onDelete }: HistoryModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleAll = () => {
    setSelected(prev => prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id)));
  };

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const isAccepted = type === 'accepted';
  const accentColor = isAccepted ? '#34d399' : '#f87171';
  const accentBg = isAccepted ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)';
  const accentBorder = isAccepted ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '85vh' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
              {isAccepted ? <CheckCircle className="w-4 h-4" style={{ color: accentColor }} /> : <XCircle className="w-4 h-4" style={{ color: accentColor }} />}
            </div>
            <div>
              <h3 className="text-white text-sm font-bold">{isAccepted ? 'Historique — Acceptés' : 'Historique — Refusés'}</h3>
              <p className="text-slate-600 text-xs">{rows.length} enregistrement{rows.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/5">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <p className="text-slate-600 text-sm">Aucun enregistrement</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                onClick={toggleAll}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <Check className="w-3 h-3" />
                {selected.size === rows.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
              {selected.size > 0 && (
                <button
                  onClick={() => { onDelete([...selected]); setSelected(new Set()); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                >
                  <Trash2 className="w-3 h-3" />
                  Supprimer la sélection ({selected.size})
                </button>
              )}
              <button
                onClick={() => onDelete(rows.map(r => r.id))}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ml-auto"
                style={{ background: 'rgba(248,113,113,0.07)', color: 'rgba(248,113,113,0.6)', border: '1px solid rgba(248,113,113,0.12)' }}
              >
                <Trash2 className="w-3 h-3" />
                Vider la liste
              </button>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600 w-8"></th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600">Prénom</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600">Nom</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600">Email</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600">Téléphone</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        background: selected.has(row.id) ? 'rgba(255,255,255,0.03)' : 'transparent',
                      }}
                    >
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggle(row.id)}
                          className="w-3.5 h-3.5 rounded accent-cyan-400 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-slate-300 font-medium">{row.first_name}</td>
                      <td className="px-4 py-2.5 text-slate-300">{row.last_name}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{row.email}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{row.phone || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                        {formatDate(row.registered_at)} {formatTime(row.registered_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Inscription() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyModal, setHistoryModal] = useState<'accepted' | 'refused' | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('registrations')
      .select('*')
      .order('registered_at', { ascending: false });
    setRegistrations((data ?? []) as Registration[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    const channel = supabase
      .channel('registrations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const pending = registrations.filter(r => r.status === 'pending');
  const accepted = registrations.filter(r => r.status === 'accepted');
  const refused = registrations.filter(r => r.status === 'refused');

  const updateStatus = async (id: string, status: 'accepted' | 'refused') => {
    await supabase.from('registrations').update({ status }).eq('id', id);
    setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const deleteRows = async (ids: string[]) => {
    await supabase.from('registrations').delete().in('id', ids);
    setRegistrations(prev => prev.filter(r => !ids.includes(r.id)));
  };

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const stats = [
    {
      label: 'En attente',
      value: pending.length,
      icon: <Clock className="w-4 h-4" />,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
      border: 'rgba(245,158,11,0.2)',
      clickable: false,
    },
    {
      label: 'Accepté',
      value: accepted.length,
      icon: <CheckCircle className="w-4 h-4" />,
      color: '#34d399',
      bg: 'rgba(52,211,153,0.1)',
      border: 'rgba(52,211,153,0.2)',
      clickable: true,
      onClick: () => setHistoryModal('accepted'),
    },
    {
      label: 'Refusé',
      value: refused.length,
      icon: <XCircle className="w-4 h-4" />,
      color: '#f87171',
      bg: 'rgba(248,113,113,0.1)',
      border: 'rgba(248,113,113,0.2)',
      clickable: true,
      onClick: () => setHistoryModal('refused'),
    },
    {
      label: 'Total',
      value: accepted.length,
      icon: <Users className="w-4 h-4" />,
      color: '#60a5fa',
      bg: 'rgba(96,165,250,0.1)',
      border: 'rgba(96,165,250,0.2)',
      clickable: false,
    },
  ];

  return (
    <>
      {historyModal && (
        <HistoryModal
          type={historyModal}
          rows={historyModal === 'accepted' ? accepted : refused}
          onClose={() => setHistoryModal(null)}
          onDelete={async (ids) => { await deleteRows(ids); }}
        />
      )}

      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-2xl p-4" style={cardBase}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)', boxShadow: '0 0 16px rgba(249,115,22,0.3)' }}
          >
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white text-sm font-bold">Inscriptions</h2>
            <p className="text-slate-600 text-xs">Gestion des demandes</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {stats.map(s => (
            <div
              key={s.label}
              onClick={s.clickable ? s.onClick : undefined}
              className={`rounded-2xl p-4 transition-all ${s.clickable ? 'cursor-pointer hover:brightness-110' : ''}`}
              style={{ ...cardBase, ...(s.clickable ? { border: `1px solid ${s.border}` } : {}) }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-500 text-xs font-medium">{s.label}</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: s.bg, color: s.color }}>
                  {s.icon}
                </div>
              </div>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              {s.clickable && (
                <p className="text-[10px] mt-1" style={{ color: s.color, opacity: 0.6 }}>Voir l'historique</p>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden" style={cardBase}>
          <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-white text-sm font-semibold">Demandes en attente</h3>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold ml-auto"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              {pending.length}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
            </div>
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <UserPlus className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-slate-600 text-sm">Aucune demande en attente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Prénom', 'Nom', 'Adresse email', 'Mot de passe', 'Téléphone', 'Date', 'Heure', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pending.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-slate-300 font-medium">{r.first_name}</td>
                      <td className="px-4 py-3 text-slate-300">{r.last_name}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{r.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-xs font-mono tracking-widest">
                            {revealedIds.has(r.id) ? r.password : '••••••'}
                          </span>
                          <button
                            onClick={() => toggleReveal(r.id)}
                            className="text-slate-600 hover:text-slate-400 transition-colors"
                          >
                            {revealedIds.has(r.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.phone || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(r.registered_at)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatTime(r.registered_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateStatus(r.id, 'accepted')}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all hover:brightness-110"
                            style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}
                          >
                            <CheckCircle className="w-3 h-3" />
                            Valider
                          </button>
                          <button
                            onClick={() => updateStatus(r.id, 'refused')}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all hover:brightness-110"
                            style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                          >
                            <XCircle className="w-3 h-3" />
                            Refuser
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl p-4" style={cardBase}>
          <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-slate-600 mb-2">Guide</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              </div>
              Nouvelle inscription → En attente
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              Valider convertit en lead
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              Refuser archive la demande
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
