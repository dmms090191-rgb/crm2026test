import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';
import { VENDOR_BASE_COLUMNS } from './types';
import type { VendorColumnConfig } from '../../../../components/table/TabVendorColumns';

const defaultOrder = VENDOR_BASE_COLUMNS.map(c => c.key);

export function useVendorColumnConfig(companyId: string | null) {
  const [vendorColOrder, setVendorColOrder] = useState<string[]>(defaultOrder);
  const [vendorColHidden, setVendorColHidden] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    supabase.from('company_column_config')
      .select('desktop_order, desktop_hidden')
      .eq('company_id', companyId)
      .eq('table_key', 'vendor_leads')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const validKeys = new Set(VENDOR_BASE_COLUMNS.map(c => c.key));
          const order = (data.desktop_order as string[] || []).filter(k => validKeys.has(k));
          const missing = defaultOrder.filter(k => !order.includes(k));
          if (order.length > 0) setVendorColOrder([...order, ...missing]);
          setVendorColHidden((data.desktop_hidden as string[] || []).filter(k => validKeys.has(k)));
        }
        setLoaded(true);
      });
  }, [companyId]);

  const handleSave = useCallback(async (config: VendorColumnConfig) => {
    setVendorColOrder(config.order);
    setVendorColHidden(config.hidden);
    if (!companyId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('company_column_config').upsert({
      company_id: companyId,
      table_key: 'vendor_leads',
      desktop_order: config.order,
      desktop_hidden: config.hidden,
      pushed_by: user.id,
      pushed_at: new Date().toISOString(),
    }, { onConflict: 'company_id,table_key' });
  }, [companyId]);

  const tabConfig = useMemo(() => {
    if (!loaded) return undefined;
    return {
      columns: VENDOR_BASE_COLUMNS,
      order: vendorColOrder,
      hidden: vendorColHidden,
      onSave: handleSave,
    };
  }, [loaded, vendorColOrder, vendorColHidden, handleSave]);

  return tabConfig;
}
