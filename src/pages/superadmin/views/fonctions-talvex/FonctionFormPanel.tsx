import { useState, useEffect, useRef } from 'react';
import { X, Save, ChevronDown, Check, Settings2 } from 'lucide-react';
import type { TalvexFonction, TalvexCategorie, FonctionEtat } from './fonctionsTalvexTypes';
import { ETAT_CONFIG } from './fonctionsTalvexTypes';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Props {
  categories: TalvexCategorie[];
  initial?: TalvexFonction | null;
  defaultCategoryId?: string;
  onSave: (data: Omit<TalvexFonction, 'id' | 'updatedAt'>) => void;
  onCancel: () => void;
}

type FormData = Omit<TalvexFonction, 'id' | 'updatedAt'>;

const EMPTY: FormData = {
  categoryId: '',
  titre: '',
  descriptionCourte: '',
  descriptionDetaillee: '',
  roleTalvex: '',
  utilisateurs: '',
  etat: 'actif',
  notesTechniques: '',
};

const INPUT_CLS = 'w-full rounded-lg px-3 py-2 text-xs outline-none transition-colors';
const TEXTAREA_CLS = `${INPUT_CLS} resize-none`;

export default function FonctionFormPanel({ categories, initial, defaultCategoryId, onSave, onCancel }: Props) {
  const t = useThemeTokens();
  const [form, setForm] = useState<FormData>(EMPTY);
  const [description, setDescription] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (initial) {
      const { id: _id, updatedAt: _u, ...rest } = initial;
      setForm(rest);
      setDescription(rest.descriptionDetaillee || rest.descriptionCourte || '');
      const hasAdvanced = !!(rest.roleTalvex || rest.utilisateurs || rest.notesTechniques);
      setAdvancedOpen(hasAdvanced);
    } else {
      setForm({ ...EMPTY, categoryId: defaultCategoryId || categories[0]?.id || '' });
      setDescription('');
      setAdvancedOpen(false);
    }
  }, [initial, defaultCategoryId, categories]);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm(prev => ({ ...prev, [k]: v }));
  const fieldStyle = { background: t.input.bg, color: t.input.text, border: `1px solid ${t.input.border}`, caretColor: t.input.text };

  const handleSubmit = () => {
    if (!form.titre.trim() || !form.categoryId) return;
    const firstLine = description.split('\n')[0] || '';
    const courte = firstLine.length > 150 ? firstLine.slice(0, 150) + '...' : firstLine;
    onSave({ ...form, descriptionCourte: form.descriptionCourte || courte, descriptionDetaillee: description });
  };

  const isEdit = !!initial;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
        <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>
          {isEdit ? 'Modifier la fonction' : 'Nouvelle fonction'}
        </h3>
        <button onClick={onCancel} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-80" style={{ color: t.text.tertiary }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <Field label="Titre" t={t}>
          <input value={form.titre} onChange={e => set('titre', e.target.value)} placeholder="Nom de la fonction" className={INPUT_CLS} style={fieldStyle} />
        </Field>

        <Field label="Categorie" t={t}>
          <CategoryDropdown categories={categories} value={form.categoryId} onChange={v => set('categoryId', v)} t={t} />
        </Field>

        <Field label="Etat" t={t}>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(ETAT_CONFIG) as FonctionEtat[]).map(e => (
              <button key={e} type="button" onClick={() => set('etat', e)}
                className="text-[10px] font-semibold rounded-full px-3 py-1 transition-all"
                style={{ background: form.etat === e ? ETAT_CONFIG[e].bg : t.input.bg, color: form.etat === e ? ETAT_CONFIG[e].color : t.text.tertiary, border: `1px solid ${form.etat === e ? ETAT_CONFIG[e].color : t.input.border}` }}>
                {ETAT_CONFIG[e].label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Description" t={t}>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6} placeholder="Decrivez la fonction librement..." className={TEXTAREA_CLS} style={fieldStyle} />
        </Field>

        {/* Collapsible advanced fields */}
        <button type="button" onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex items-center gap-1.5 text-[10px] font-medium transition-colors hover:opacity-80 pt-1"
          style={{ color: t.text.tertiary }}>
          <Settings2 className="w-3 h-3" />
          Options avancees
          <ChevronDown className={`w-3 h-3 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
        </button>

        {advancedOpen && (
          <div className="space-y-3 pl-1" style={{ borderLeft: `2px solid ${t.surface.border}` }}>
            <Field label="Role dans Talvex" t={t}>
              <textarea value={form.roleTalvex} onChange={e => set('roleTalvex', e.target.value)} rows={2} placeholder="Pourquoi cette fonction existe" className={TEXTAREA_CLS} style={fieldStyle} />
            </Field>
            <Field label="Utilisateurs concernes" t={t}>
              <input value={form.utilisateurs} onChange={e => set('utilisateurs', e.target.value)} placeholder="Ex: Super Admin, Admin, Vendeur" className={INPUT_CLS} style={fieldStyle} />
            </Field>
            <Field label="Notes techniques" t={t}>
              <textarea value={form.notesTechniques} onChange={e => set('notesTechniques', e.target.value)} rows={2} placeholder="Tables, edge functions, details techniques..." className={TEXTAREA_CLS} style={fieldStyle} />
            </Field>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-4 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${t.surface.border}` }}>
        <button onClick={onCancel} className="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80" style={{ color: t.text.secondary }}>
          Annuler
        </button>
        <button onClick={handleSubmit} disabled={!form.titre.trim() || !form.categoryId}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40"
          style={{ background: '#f59e0b' }}>
          <Save className="w-3.5 h-3.5" />
          {isEdit ? 'Enregistrer' : 'Ajouter'}
        </button>
      </div>
    </div>
  );
}

function CategoryDropdown({ categories, value, onChange, t }: { categories: TalvexCategorie[]; value: string; onChange: (v: string) => void; t: ReturnType<typeof useThemeTokens> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = categories.find(c => c.id === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs outline-none text-left transition-colors"
        style={{ background: t.input.bg, color: t.input.text, border: `1px solid ${open ? t.input.borderFocus : t.input.border}` }}
      >
        <span className={selected ? '' : 'opacity-50'}>{selected?.label ?? 'Choisir une categorie'}</span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: t.text.tertiary }} />
      </button>
      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 rounded-lg py-1 max-h-52 overflow-y-auto shadow-xl"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
        >
          {categories.map(c => {
            const isActive = c.id === value;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.id); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                style={{
                  background: isActive ? 'rgba(245,158,11,0.10)' : 'transparent',
                  color: isActive ? '#f59e0b' : t.text.primary,
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget.style.background = t.surface.hover); }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget.style.background = 'transparent'); }}
              >
                {isActive && <Check className="w-3 h-3 flex-shrink-0" />}
                <span className={isActive ? 'font-semibold' : ''}>{c.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, children, t }: { label: string; children: React.ReactNode; t: ReturnType<typeof useThemeTokens> }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: t.text.tertiary }}>{label}</label>
      {children}
    </div>
  );
}
