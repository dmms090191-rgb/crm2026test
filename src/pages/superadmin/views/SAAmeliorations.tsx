import { useState, useEffect, useCallback } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import AmeliorationsView from '../../admin/views/ameliorations/AmeliorationsView';
import type { Amelioration, AmeliorationCategory } from '../../admin/views/ameliorations/types';

export default function SAAmeliorations() {
  const t = useThemeTokens();
  const [ameliorations, setAmeliorations] = useState<Amelioration[]>([]);
  const [categories, setCategories] = useState<AmeliorationCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [{ data: items }, { data: cats }] = await Promise.all([
      supabase.from('crm_ameliorations').select('*').order('position', { ascending: true }),
      supabase.from('crm_amelioration_categories').select('*').order('position', { ascending: true }),
    ]);
    if (items) setAmeliorations(items as Amelioration[]);
    if (cats) setCategories(cats as AmeliorationCategory[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#d97706' }} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 flex flex-col h-full min-h-0">
      <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 min-h-0">
        <div
          className="rounded-2xl p-5 sm:p-6 mb-5 flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
            border: `1px solid ${t.surface.border}`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
              }}
            >
              <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight" style={{ color: t.heading.primary }}>
                Ameliorations
              </h2>
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: t.label.muted }}>
                Suivez les ameliorations apportees a la plateforme
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl flex flex-col flex-1 min-h-0 p-4 sm:p-5"
          style={{
            background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
            border: `1px solid ${t.surface.border}`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <AmeliorationsView
            ameliorations={ameliorations}
            categories={categories}
            onAmeliorationsChange={setAmeliorations}
            onCategoriesChange={setCategories}
          />
        </div>
      </div>
    </div>
  );
}
