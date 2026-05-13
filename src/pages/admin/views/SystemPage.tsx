import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import SystemView from './system/SystemView';
import type { SystemItem, SystemCategory, SystemStatus } from './system/types';

export default function SystemPage() {
  const tokens = useThemeTokens();
  const [items, setItems] = useState<SystemItem[]>([]);
  const [categories, setCategories] = useState<SystemCategory[]>([]);
  const [statuses, setStatuses] = useState<SystemStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: itemsData }, { data: catsData }, { data: statusesData }] = await Promise.all([
      supabase.from('crm_system_items').select('*').order('position', { ascending: true }),
      supabase.from('crm_system_categories').select('*').order('position', { ascending: true }),
      supabase.from('crm_system_statuses').select('*').order('position', { ascending: true }),
    ]);
    if (itemsData) setItems(itemsData as SystemItem[]);
    if (catsData) setCategories(catsData as SystemCategory[]);
    if (statusesData) setStatuses(statusesData as SystemStatus[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: tokens.accent.border }} />
      </div>
    );
  }

  return (
    <SystemView
      items={items}
      categories={categories}
      statuses={statuses}
      onItemsChange={setItems}
      onCategoriesChange={setCategories}
      onStatusesChange={setStatuses}
    />
  );
}
