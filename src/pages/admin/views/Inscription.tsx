import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, XCircle, Users, UserPlus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useCompanyId } from '../../../hooks/useCompanyId';
import type { Registration } from './inscription/inscriptionTypes';
import HistoryModal from './inscription/HistoryModal';
import PendingMobileCards from './inscription/PendingMobileCards';
import PendingDesktopTable from './inscription/PendingDesktopTable';

export default function Inscription() {
  const tokens = useThemeTokens();
  const companyId = useCompanyId();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyModal, setHistoryModal] = useState<'accepted' | 'refused' | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const fetch = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from('registrations')
      .select('*')
      .eq('company_id', companyId)
      .order('registered_at', { ascending: false });
    setRegistrations((data ?? []) as Registration[]);
    setLoading(false);
  }, [companyId]);

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
    const registration = registrations.find(r => r.id === id);
    if (!registration) return;
    if (registration.status === 'accepted') return;

    await supabase.from('registrations').update({ status }).eq('id', id);
    setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status } : r));

    if (status === 'accepted') {
      try {
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('data->>Email', registration.email)
          .maybeSingle();

        if (!existing) {
          const { error: insertErr } = await supabase.from('leads').insert({
            data: {
              Prenom: registration.first_name,
              Nom: registration.last_name,
              Email: registration.email,
              Telephone: registration.phone,
              MotDePasse: registration.password,
            },
            import_id: null,
            source: 'inscription',
            ...(companyId ? { company_id: companyId } : {}),
          });
          if (insertErr) console.log('Lead insert error:', insertErr);
        }
      } catch (err) {
        console.log('Lead creation error:', err);
      }
    }
  };

  const deleteRows = async (ids: string[]) => {
    await supabase.from('registrations').delete().in('id', ids);
    setRegistrations(prev => prev.filter(r => !ids.includes(r.id)));
  };

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
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
      label: 'Accepte',
      value: accepted.length,
      icon: <CheckCircle className="w-4 h-4" />,
      color: '#34d399',
      bg: 'rgba(52,211,153,0.1)',
      border: 'rgba(52,211,153,0.2)',
      clickable: true,
      onClick: () => setHistoryModal('accepted'),
    },
    {
      label: 'Refuse',
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
        <div className="flex items-center gap-4 rounded-2xl p-4" style={{ background: tokens.card.bg, border: tokens.card.border }}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)', boxShadow: '0 0 16px rgba(249,115,22,0.3)' }}
          >
            <UserPlus className="w-5 h-5" style={{ color: tokens.text.primary }} />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: tokens.text.primary }}>Inscriptions</h2>
            <p className="text-xs" style={{ color: tokens.text.quaternary }}>Gestion des demandes</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          {stats.map(s => (
            <div
              key={s.label}
              onClick={s.clickable ? s.onClick : undefined}
              className={`rounded-2xl p-3 sm:p-4 transition-all ${s.clickable ? 'cursor-pointer hover:brightness-110' : ''}`}
              style={{ background: tokens.card.bg, border: s.clickable ? `1px solid ${s.border}` : tokens.card.border }}
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-[11px] sm:text-xs font-medium leading-tight" style={{ color: tokens.text.tertiary }}>{s.label}</span>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center flex-shrink-0 ml-2" style={{ background: s.bg, color: s.color }}>
                  {s.icon}
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              {s.clickable && (
                <p className="text-[10px] mt-1" style={{ color: s.color, opacity: 0.6 }}>Voir l'historique</p>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: tokens.card.bg, border: tokens.card.border }}>
          <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: tokens.card.border }}>
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold" style={{ color: tokens.text.primary }}>Demandes en attente</h3>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold ml-auto"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              {pending.length}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: tokens.input.border, borderTopColor: tokens.accent.bg }} />
            </div>
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: tokens.input.bg }}>
                <UserPlus className="w-5 h-5" style={{ color: tokens.text.quaternary }} />
              </div>
              <p className="text-sm" style={{ color: tokens.text.quaternary }}>Aucune demande en attente</p>
            </div>
          ) : (
            <>
              <PendingDesktopTable
                pending={pending}
                tokens={tokens}
                revealedIds={revealedIds}
                onToggleReveal={toggleReveal}
                onUpdateStatus={updateStatus}
              />
              <PendingMobileCards
                pending={pending}
                tokens={tokens}
                revealedIds={revealedIds}
                onToggleReveal={toggleReveal}
                onUpdateStatus={updateStatus}
              />
            </>
          )}
        </div>

        <div className="rounded-2xl p-4" style={{ background: tokens.card.bg, border: tokens.card.border }}>
          <p className="text-[10px] font-bold tracking-[0.1em] uppercase mb-2" style={{ color: tokens.text.quaternary }}>Guide</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs" style={{ color: tokens.text.quaternary }}>
              <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              </div>
              Nouvelle inscription → En attente
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: tokens.text.quaternary }}>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              Valider convertit en lead
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: tokens.text.quaternary }}>
              <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              Refuser archive la demande
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
