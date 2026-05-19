import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Check } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import { Task, TaskStatus, NewTaskForm, STATUS_CONFIG, STATUS_ORDER } from './pageTasksConstants';
import TaskAddForm from './TaskAddForm';

interface Props {
  pageKey: string;
}

export default function PageTasksView({ pageKey }: Props) {
  const tokens = useThemeTokens();
  const companyId = useCompanyId();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<NewTaskForm>({ title: '', description: '', status: 'todo' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ title: string; description: string }>({ title: '', description: '' });

  const fetchTasks = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from('crm_tasks')
      .select('*')
      .eq('page_key', pageKey)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (data) setTasks(data as Task[]);
    setLoading(false);
  }, [pageKey, companyId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAdd = useCallback(async () => {
    if (!formData.title.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from('crm_tasks')
      .insert({
        page_key: pageKey,
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: formData.status,
        ...(companyId ? { company_id: companyId } : {}),
      })
      .select()
      .maybeSingle();
    if (data) {
      setTasks(prev => [data as Task, ...prev]);
    }
    setFormData({ title: '', description: '', status: 'todo' });
    setShowForm(false);
    setSaving(false);
  }, [formData, pageKey]);

  const handleStatusChange = useCallback(async (id: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    await supabase.from('crm_tasks').update({ status: newStatus }).eq('id', id);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('crm_tasks').delete().eq('id', id);
  }, []);

  const handleStartEdit = useCallback((task: Task) => {
    setEditingId(task.id);
    setEditData({ title: task.title, description: task.description });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editData.title.trim()) return;
    const updates = { title: editData.title.trim(), description: editData.description.trim() };
    setTasks(prev => prev.map(t => t.id === editingId ? { ...t, ...updates } : t));
    setEditingId(null);
    await supabase.from('crm_tasks').update(updates).eq('id', editingId);
  }, [editingId, editData]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditData({ title: '', description: '' });
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: tokens.accent.text }} />
      </div>
    );
  }

  const grouped = STATUS_ORDER.map(status => ({
    status,
    config: STATUS_CONFIG[status],
    items: tasks.filter(t => t.status === status),
  }));

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto pr-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium" style={{ color: tokens.text.quaternary }}>
          {tasks.length} tache{tasks.length !== 1 ? 's' : ''}
        </p>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
            style={{
              background: tokens.accent.bg,
              border: `1px solid ${tokens.accent.border}`,
              color: tokens.accent.text,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = tokens.accent.bgHover;
              e.currentTarget.style.borderColor = tokens.accent.border;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = tokens.accent.bg;
              e.currentTarget.style.borderColor = tokens.accent.border;
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter une tache
          </button>
        )}
      </div>

      {showForm && (
        <TaskAddForm
          formData={formData}
          setFormData={setFormData}
          onAdd={handleAdd}
          onClose={() => setShowForm(false)}
          saving={saving}
          tokens={tokens}
        />
      )}

      {tasks.length === 0 && !showForm && (
        <div
          className="flex-1 flex flex-col items-center justify-center rounded-xl py-12"
          style={{
            background: tokens.surface.primary,
            border: `1px solid ${tokens.surface.border}`,
          }}
        >
          <p className="text-sm font-medium" style={{ color: tokens.text.tertiary }}>Aucune tache</p>
          <p className="text-xs mt-1" style={{ color: tokens.text.quaternary }}>
            Cliquez sur "Ajouter une tache" pour commencer
          </p>
        </div>
      )}

      {tasks.length > 0 && grouped.map(({ status, config, items }) => {
        if (items.length === 0) return null;
        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: config.dot }} />
              <h3 className="text-xs font-bold tracking-wider uppercase" style={{ color: config.accent }}>
                {config.label}
              </h3>
              <span className="text-xs" style={{ color: tokens.text.quaternary }}>
                {items.length}
              </span>
            </div>
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: tokens.surface.primary,
                border: `1px solid ${config.border}`,
              }}
            >
              {items.map((task) => (
                <div
                  key={task.id}
                  className="px-3 py-2.5 transition-colors"
                  style={{ borderBottom: `1px solid ${tokens.surface.borderLight}` }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = tokens.surface.hover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {editingId === task.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={editData.title}
                        onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }}
                        className="w-full bg-transparent text-sm outline-none px-2 py-1 rounded-md"
                        style={{ border: `1px solid ${tokens.accent.border}`, color: tokens.input.text, caretColor: tokens.accent.text }}
                        autoFocus
                      />
                      <textarea
                        value={editData.description}
                        onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                        className="w-full bg-transparent text-xs outline-none px-2 py-1 rounded-md resize-none"
                        style={{ border: `1px solid ${tokens.input.border}`, color: tokens.text.secondary, caretColor: tokens.accent.text }}
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 rounded-md transition-colors"
                          style={{ color: tokens.text.tertiary }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = tokens.text.tertiary; }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={!editData.title.trim()}
                          className="p-1 rounded-md transition-colors disabled:opacity-30"
                          style={{ color: '#22c55e' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.1)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: status === 'done' ? tokens.text.tertiary : tokens.text.secondary, textDecoration: status === 'done' ? 'line-through' : 'none' }}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs mt-0.5" style={{ color: tokens.text.tertiary }}>
                            {task.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                          className="text-xs font-medium px-2 py-1 rounded-md outline-none cursor-pointer"
                          style={{
                            background: STATUS_CONFIG[task.status].bg,
                            border: `1px solid ${STATUS_CONFIG[task.status].border}`,
                            color: STATUS_CONFIG[task.status].accent,
                          }}
                        >
                          {STATUS_ORDER.map(s => (
                            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleStartEdit(task)}
                          className="p-1 rounded-md transition-colors"
                          style={{ color: tokens.text.quaternary }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = tokens.accent.text; e.currentTarget.style.background = tokens.accent.bg; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = tokens.text.quaternary; e.currentTarget.style.background = 'transparent'; }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-1 rounded-md transition-colors"
                          style={{ color: tokens.text.quaternary }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = tokens.text.quaternary; e.currentTarget.style.background = 'transparent'; }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
