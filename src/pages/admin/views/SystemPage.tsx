import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useTalixy } from '../../../talixy/useTalixy';
import SystemView from './system/SystemView';
import type { SystemItem, SystemCategory, SystemStatus } from './system/types';

export default function SystemPage() {
  const tokens = useThemeTokens();
  const tx = useTalixy();
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

  const vue = (
    <SystemView
      items={items}
      categories={categories}
      statuses={statuses}
      onItemsChange={setItems}
      onCategoriesChange={setCategories}
      onStatusesChange={setStatuses}
    />
  );

  /*
   * TALIXY — meme vue, memes donnees, memes actions : on ajoute seulement la coquille de page
   * (sur-titre / titre centre / sous-titre) commune aux autres onglets. Hors Talixy, le rendu
   * reste exactement celui d'origine : SystemView seul, sans aucun conteneur supplementaire.
   */
  const chargement = (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: tokens.accent.border }} />
    </div>
  );

  if (tx.active) {
    // L'en-tete de page reste en place pendant le chargement : le titre n'apparait plus d'un coup.
    return (
      <div className="tx-page" data-tx-system>
        <header className="tx-page-head">
          <p className="tx-page-eyebrow">Maintenance</p>
          <h1 className="tx-page-title">Système</h1>
          <p className="tx-page-subtitle">Suivi fonctionnel des modules de la plateforme.</p>
        </header>
        {loading ? chargement : vue}
      </div>
    );
  }

  // Hors Talixy : exactement le comportement d'origine, spinner seul puis la vue.
  return loading ? chargement : vue;
}
