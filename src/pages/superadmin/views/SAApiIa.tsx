import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, RefreshCw, Bot } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { supabase } from '../../../lib/supabase';
import SAApiIaModal, { type AiApi } from './SAApiIaModal';
import type { CreditInfo } from './api-ia/apiIaTypes';
import { fetchProviderBalance, parseCreditResult } from './api-ia/apiIaCreditPolling';
import { ApiTable } from './api-ia/SAApiIaTable';
import { ApiCard } from './api-ia/SAApiIaCard';

const POLL_INTERVAL_MS = 60_000;

export default function SAApiIa() {
  const tokens = useThemeTokens();
  const [apis, setApis] = useState<AiApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; api: AiApi | null }>({ open: false, api: null });
  const [visiblePwd, setVisiblePwd] = useState<Set<string>>(new Set());
  const [visibleKey, setVisibleKey] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [creditMap, setCreditMap] = useState<Record<string, CreditInfo>>({});
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditFlash, setCreditFlash] = useState(false);
  const lastCreditRef = useRef<Record<string, string>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apisRef = useRef(apis);
  apisRef.current = apis;

  const PROVIDER_MAP: Record<string, string> = { DeepSeek: 'deepseek', Recraft: 'recraft', 'Stability AI': 'stability' };

  const load = useCallback(async () => {
    const { data } = await supabase.from('sa_ai_apis').select('*').order('created_at', { ascending: true });
    setApis((data ?? []) as AiApi[]);
    setLoading(false);
  }, []);

  const refreshCredit = useCallback(async () => {
    const providers = apisRef.current.filter(a => PROVIDER_MAP[a.name]);
    if (providers.length === 0) return;

    setCreditLoading(true);
    try {
      const results = await Promise.all(
        providers.map(async (api) => {
          const providerKey = PROVIDER_MAP[api.name];
          const result = await fetchProviderBalance(providerKey);
          const info = parseCreditResult(result, providerKey);
          return { api, info };
        }),
      );

      let anyChanged = false;
      const newMap: Record<string, CreditInfo> = {};

      for (const { api, info } of results) {
        newMap[api.id] = info;

        const prev = lastCreditRef.current[api.id];
        if (prev && prev !== info.credit) anyChanged = true;
        lastCreditRef.current[api.id] = info.credit;

        if (info.credit !== api.remaining_credit || !api.last_checked_at) {
          const payload: Record<string, string> = {
            remaining_credit: info.credit,
            last_checked_at: info.checkedAt,
            updated_at: new Date().toISOString(),
          };
          if (info.status) payload.status = info.status;
          supabase.from('sa_ai_apis').update(payload).eq('id', api.id).then(() => {});
        }
      }

      setCreditMap(prev => ({ ...prev, ...newMap }));

      if (anyChanged) {
        setCreditFlash(true);
        setTimeout(() => setCreditFlash(false), 1200);
      }
    } finally {
      setCreditLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (loading || apis.length === 0) return;

    for (const api of apis) {
      if (api.remaining_credit) {
        lastCreditRef.current[api.id] = api.remaining_credit;
        setCreditMap(prev => ({
          ...prev,
          [api.id]: { credit: api.remaining_credit!, checkedAt: api.last_checked_at ?? '', status: api.status },
        }));
      }
    }

    refreshCredit();

    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(refreshCredit, POLL_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };

    startPolling();

    const handleVisibility = () => {
      if (document.hidden) { stopPolling(); } else { refreshCredit(); startPolling(); }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => { stopPolling(); document.removeEventListener('visibilitychange', handleVisibility); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleSave = async (data: Omit<AiApi, 'id' | 'created_at' | 'updated_at' | 'last_checked_at'>) => {
    if (modal.api) {
      await supabase.from('sa_ai_apis').update({ ...data, updated_at: new Date().toISOString() }).eq('id', modal.api.id);
    } else {
      await supabase.from('sa_ai_apis').insert(data);
    }
    setModal({ open: false, api: null });
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('sa_ai_apis').delete().eq('id', id);
    setDeleteConfirm(null);
    setCreditMap(prev => { const n = { ...prev }; delete n[id]; return n; });
    load();
  };

  const handleCopy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); };
  const togglePwd = (id: string) => setVisiblePwd(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleKey = (id: string) => setVisibleKey(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const cardStyle = {
    background: `linear-gradient(135deg, ${tokens.surface.secondary}, ${tokens.surface.secondary}80)`,
    border: `1px solid ${tokens.surface.border}`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: tokens.text.primary }}>API IA</h2>
          <p className="text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>Gestion des API d'intelligence artificielle</p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={refreshCredit}
            disabled={creditLoading}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: tokens.surface.hover, border: `1px solid ${tokens.surface.borderLight}`, color: tokens.text.secondary }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${creditLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button
            onClick={() => setModal({ open: true, api: null })}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter une API
          </button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-t-amber-400 rounded-full animate-spin" style={{ borderColor: tokens.text.quaternary, borderTopColor: '#f59e0b' }} />
          </div>
        ) : apis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: tokens.modal.fieldBg }}>
              <Bot className="w-5 h-5" style={{ color: tokens.label.hint }} />
            </div>
            <p className="text-sm" style={{ color: tokens.text.quaternary }}>Aucune API configuree</p>
            <p className="text-xs" style={{ color: tokens.label.hint }}>Ajoutez votre premiere API IA</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <ApiTable
                apis={apis} tokens={tokens}
                visiblePwd={visiblePwd} visibleKey={visibleKey}
                copied={copied} deleteConfirm={deleteConfirm}
                creditMap={creditMap} creditLoading={creditLoading} creditFlash={creditFlash}
                onTogglePwd={togglePwd} onToggleKey={toggleKey}
                onCopy={handleCopy} onEdit={api => setModal({ open: true, api })}
                onDeleteConfirm={setDeleteConfirm} onDelete={handleDelete}
              />
            </div>
            <div className="lg:hidden divide-y" style={{ borderColor: tokens.table.rowBorder }}>
              {apis.map(api => (
                <ApiCard
                  key={api.id} api={api} tokens={tokens}
                  pwdVisible={visiblePwd.has(api.id)} keyVisible={visibleKey.has(api.id)}
                  copied={copied === api.id}
                  liveCredit={creditMap[api.id]} creditLoading={creditLoading} creditFlash={creditFlash}
                  onTogglePwd={() => togglePwd(api.id)} onToggleKey={() => toggleKey(api.id)}
                  onCopy={() => api.url && handleCopy(api.url, api.id)}
                  onEdit={() => setModal({ open: true, api })}
                  onDelete={() => handleDelete(api.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {modal.open && (
        <SAApiIaModal api={modal.api} onClose={() => setModal({ open: false, api: null })} onSave={handleSave} />
      )}
    </div>
  );
}
