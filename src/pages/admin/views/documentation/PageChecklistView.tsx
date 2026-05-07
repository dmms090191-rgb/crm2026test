import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Circle, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { ChecklistItem, SECTIONS, SECTION_COLORS } from './pageChecklistConstants';

interface Props {
  pageKey: string;
}

export default function PageChecklistView({ pageKey }: Props) {
  const tokens = useThemeTokens();

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabels, setNewLabels] = useState<Record<string, string>>({});
  const [addingSection, setAddingSection] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('crm_page_checklist_items')
      .select('*')
      .eq('page_key', pageKey)
      .order('position', { ascending: true });
    if (data) setItems(data as ChecklistItem[]);
    setLoading(false);
  }, [pageKey]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const toggleItem = useCallback(async (id: string, currentChecked: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !currentChecked } : i));
    await supabase
      .from('crm_page_checklist_items')
      .update({ checked: !currentChecked })
      .eq('id', id);
  }, []);

  const addItem = useCallback(async (section: string) => {
    const label = (newLabels[section] || '').trim();
    if (!label) return;

    const sectionItems = items.filter(i => i.section === section);
    const maxPos = sectionItems.length > 0
      ? Math.max(...sectionItems.map(i => i.position))
      : -1;

    const { data } = await supabase
      .from('crm_page_checklist_items')
      .insert({
        page_key: pageKey,
        section,
        label,
        position: maxPos + 1,
        is_custom: true,
      })
      .select()
      .maybeSingle();

    if (data) {
      setItems(prev => [...prev, data as ChecklistItem]);
    }

    setNewLabels(prev => ({ ...prev, [section]: '' }));
    setAddingSection(null);
  }, [items, newLabels, pageKey]);

  const deleteItem = useCallback(async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase
      .from('crm_page_checklist_items')
      .delete()
      .eq('id', id);
  }, []);

  const totalCount = items.length;
  const checkedCount = items.filter(i => i.checked).length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: tokens.accent.text }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 flex-1 min-h-0 overflow-y-auto pr-1">
      <div
        className="rounded-xl p-4 flex items-center gap-4"
        style={{
          background: tokens.card.bg,
          border: `1px solid ${tokens.card.border}`,
        }}
      >
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold" style={{ color: tokens.text.secondary }}>Progression globale</p>
            <p className="text-sm font-bold" style={{ color: progressPercent === 100 ? '#34d399' : tokens.accent.text }}>
              {progressPercent}%
            </p>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: tokens.surface.borderLight }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progressPercent}%`,
                background: progressPercent === 100
                  ? 'linear-gradient(90deg, #34d399, #2dd4bf)'
                  : 'linear-gradient(90deg, #22d3ee, #0ea5e9)',
              }}
            />
          </div>
          <p className="text-xs mt-1.5" style={{ color: tokens.text.quaternary }}>
            {checkedCount} / {totalCount} elements completes
          </p>
        </div>
      </div>

      {SECTIONS.map(({ key, label }) => {
        const sectionItems = items.filter(i => i.section === key);
        const sectionChecked = sectionItems.filter(i => i.checked).length;
        const colors = SECTION_COLORS[key];

        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: colors.accent }}
                />
                <h3 className="text-xs font-bold tracking-wider uppercase" style={{ color: colors.accent }}>
                  {label}
                </h3>
                <span className="text-xs" style={{ color: tokens.text.quaternary }}>
                  {sectionChecked}/{sectionItems.length}
                </span>
              </div>
              <button
                onClick={() => setAddingSection(addingSection === key ? null : key)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all"
                style={{
                  background: addingSection === key ? colors.bg : 'transparent',
                  border: addingSection === key ? `1px solid ${colors.border}` : '1px solid transparent',
                  color: addingSection === key ? colors.accent : tokens.text.quaternary,
                }}
                onMouseEnter={(e) => {
                  if (addingSection !== key) {
                    e.currentTarget.style.color = colors.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (addingSection !== key) {
                    e.currentTarget.style.color = tokens.text.quaternary;
                  }
                }}
              >
                <Plus className="w-3 h-3" />
                Ajouter
              </button>
            </div>

            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: tokens.surface.primary,
                border: `1px solid ${colors.border}`,
              }}
            >
              {sectionItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2.5 transition-colors"
                  style={{
                    borderBottom: `1px solid ${tokens.surface.borderLight}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = tokens.surface.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <button
                    onClick={() => toggleItem(item.id, item.checked)}
                    className="flex-shrink-0 transition-transform active:scale-90"
                  >
                    {item.checked ? (
                      <CheckCircle className="w-4.5 h-4.5" style={{ color: colors.accent }} />
                    ) : (
                      <Circle className="w-4.5 h-4.5" style={{ color: tokens.text.quaternary }} />
                    )}
                  </button>
                  <span
                    className="flex-1 text-sm transition-all"
                    style={{
                      color: item.checked ? tokens.text.quaternary : tokens.text.secondary,
                      textDecoration: item.checked ? 'line-through' : 'none',
                    }}
                  >
                    {item.label}
                  </span>
                  {item.is_custom && (
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="flex-shrink-0 p-1 rounded-md transition-colors"
                      style={{ color: tokens.text.quaternary }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#f87171';
                        e.currentTarget.style.background = 'rgba(248,113,113,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = tokens.text.quaternary;
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {sectionItems.length === 0 && (
                <div className="px-3 py-3 text-xs" style={{ color: tokens.text.quaternary }}>
                  Aucun element
                </div>
              )}

              {addingSection === key && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5"
                  style={{ borderTop: `1px solid ${tokens.surface.border}` }}
                >
                  <Circle className="w-4.5 h-4.5 flex-shrink-0" style={{ color: tokens.text.quaternary }} />
                  <input
                    type="text"
                    value={newLabels[key] || ''}
                    onChange={(e) => setNewLabels(prev => ({ ...prev, [key]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addItem(key);
                      if (e.key === 'Escape') setAddingSection(null);
                    }}
                    placeholder="Nouvel element..."
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: tokens.input.text, caretColor: colors.accent }}
                    autoFocus
                  />
                  <button
                    onClick={() => addItem(key)}
                    disabled={!(newLabels[key] || '').trim()}
                    className="px-2.5 py-1 rounded-md text-xs font-medium transition-all disabled:opacity-30"
                    style={{
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      color: colors.accent,
                    }}
                  >
                    Ajouter
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
