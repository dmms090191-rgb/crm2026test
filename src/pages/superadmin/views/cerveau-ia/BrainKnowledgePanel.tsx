import { useState } from 'react';
import { BookOpen, Plus, Pencil, Trash2, GripVertical, ChevronDown, ChevronRight, LayoutGrid as Layout, Users, Shield, UserCog, Briefcase, UserCheck, Database, MessageCircle, Calendar, Globe, Bell, Brain, Palette, Headphones, MessagesSquare, AlertTriangle, Ban, Folder } from 'lucide-react';
import { D } from './brainTheme';
import type { KnowledgeSection, AiCompanyBrain } from './brainTypes';

const ICON_MAP: Record<string, typeof BookOpen> = {
  layout: Layout, users: Users, shield: Shield, 'user-cog': UserCog,
  briefcase: Briefcase, 'user-check': UserCheck, database: Database,
  'message-circle': MessageCircle, calendar: Calendar, globe: Globe,
  bell: Bell, brain: Brain, palette: Palette, headphones: Headphones,
  'messages-square': MessagesSquare, 'alert-triangle': AlertTriangle,
  ban: Ban, folder: Folder, 'book-open': BookOpen,
};

const DEFAULT_SECTIONS: { key: string; title: string; icon: string }[] = [
  { key: 'presentation', title: 'Presentation Talvex', icon: 'layout' },
  { key: 'roles', title: 'Panels et roles', icon: 'users' },
  { key: 'super-admin', title: 'Super Admin', icon: 'shield' },
  { key: 'admin', title: 'Admin', icon: 'user-cog' },
  { key: 'vendeur', title: 'Vendeur', icon: 'briefcase' },
  { key: 'client', title: 'Client', icon: 'user-check' },
  { key: 'crm', title: 'CRM et leads', icon: 'database' },
  { key: 'messages', title: 'Messages', icon: 'message-circle' },
  { key: 'agenda', title: 'Agenda et rendez-vous', icon: 'calendar' },
  { key: 'sites', title: 'Sites et domaines', icon: 'globe' },
  { key: 'notifications', title: 'Notifications telephone', icon: 'bell' },
  { key: 'ia', title: 'IA et Cerveau IA', icon: 'brain' },
  { key: 'templates', title: 'Templates site', icon: 'palette' },
  { key: 'support', title: 'Support Talvex', icon: 'headphones' },
  { key: 'reponses-types', title: 'Reponses types Talvex', icon: 'messages-square' },
  { key: 'sensibles', title: 'Demandes sensibles', icon: 'alert-triangle' },
  { key: 'interdictions', title: 'Ce que l\'IA ne doit jamais inventer', icon: 'ban' },
];

interface Props {
  brain: AiCompanyBrain;
  onChange: (fields: Partial<AiCompanyBrain>) => void;
}

export default function BrainKnowledgePanel({ brain, onChange }: Props) {
  const sections = brain.knowledge_sections ?? [];
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [addMode, setAddMode] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState('folder');

  const existingKeys = new Set(sections.map(s => s.key));
  const missingSuggestions = DEFAULT_SECTIONS.filter(d => !existingKeys.has(d.key));

  function updateSections(updated: KnowledgeSection[]) {
    onChange({ knowledge_sections: updated });
  }

  function addSection(key: string, title: string, icon: string) {
    const newSec: KnowledgeSection = { key, title, icon, content: '', position: sections.length };
    updateSections([...sections, newSec]);
    setExpandedKey(key);
    setEditingKey(key);
    setEditContent('');
    setAddMode(false);
    setNewTitle('');
  }

  function addCustomSection() {
    if (!newTitle.trim()) return;
    const key = 'custom-' + Date.now();
    addSection(key, newTitle.trim(), newIcon);
  }

  function startEdit(sec: KnowledgeSection) {
    setEditingKey(sec.key);
    setEditContent(sec.content);
    setExpandedKey(sec.key);
  }

  function saveEdit() {
    if (!editingKey) return;
    updateSections(sections.map(s => s.key === editingKey ? { ...s, content: editContent } : s));
    setEditingKey(null);
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditContent('');
  }

  function removeSection(key: string) {
    updateSections(sections.filter(s => s.key !== key).map((s, i) => ({ ...s, position: i })));
    if (expandedKey === key) setExpandedKey(null);
    if (editingKey === key) cancelEdit();
  }

  function moveSection(key: string, direction: -1 | 1) {
    const idx = sections.findIndex(s => s.key === key);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const arr = [...sections];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    updateSections(arr.map((s, i) => ({ ...s, position: i })));
  }

  const filledCount = sections.filter(s => s.content.trim().length > 0).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: D.accentBg, border: `1px solid ${D.accentBorder}` }}>
            <BookOpen className="w-5 h-5" style={{ color: D.accent }} />
          </div>
          <div>
            <h2 className="text-[14px] font-bold" style={{ color: D.text }}>Base de connaissances Talvex</h2>
            <p className="text-[11px] font-medium" style={{ color: D.textMuted }}>
              {filledCount}/{sections.length} sections documentees
            </p>
          </div>
        </div>
      </div>

      {/* Sections list */}
      <div className="space-y-2">
        {sections.map(sec => {
          const isExpanded = expandedKey === sec.key;
          const isEditing = editingKey === sec.key;
          const IconComp = ICON_MAP[sec.icon] ?? Folder;
          const hasCont = sec.content.trim().length > 0;

          return (
            <div key={sec.key} className="rounded-xl overflow-hidden transition-all duration-200" style={{ background: D.card, border: `1px solid ${isExpanded ? D.accentBorder : D.cardBorder}` }}>
              {/* Row */}
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none" onClick={() => { if (!isEditing) setExpandedKey(isExpanded ? null : sec.key); }}>
                <button className="flex-shrink-0 cursor-grab" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                  <GripVertical className="w-3.5 h-3.5" style={{ color: D.textDim }} />
                </button>

                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: hasCont ? D.accentBg : `${D.textDim}10`, border: `1px solid ${hasCont ? D.accentBorder : `${D.textDim}15`}` }}>
                  <IconComp className="w-4 h-4" style={{ color: hasCont ? D.accent : D.textDim }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold truncate" style={{ color: D.text }}>{sec.title}</p>
                  {hasCont && !isExpanded && (
                    <p className="text-[10px] truncate mt-0.5 font-medium" style={{ color: D.textMuted }}>
                      {sec.content.substring(0, 80)}...
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {hasCont && (
                    <span className="w-2 h-2 rounded-full" style={{ background: D.green }} />
                  )}
                  <button onClick={e => { e.stopPropagation(); moveSection(sec.key, -1); }} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ color: D.textDim }} title="Monter">
                    <ChevronDown className="w-3 h-3 rotate-180" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); moveSection(sec.key, 1); }} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ color: D.textDim }} title="Descendre">
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); startEdit(sec); }} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ color: D.accent }} title="Modifier">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); removeSection(sec.key); }} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ color: D.red }} title="Supprimer">
                    <Trash2 className="w-3 h-3" />
                  </button>
                  {isExpanded ? <ChevronDown className="w-4 h-4" style={{ color: D.accent }} /> : <ChevronRight className="w-4 h-4" style={{ color: D.textDim }} />}
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4" style={{ borderTop: `1px solid ${D.surfaceBorder}` }}>
                  <div className="pt-3">
                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={8}
                          placeholder={`Decrivez ici tout ce que l'IA doit savoir sur "${sec.title}"...\n\nExemple :\n- Fonctionnalites\n- Comment ca marche\n- Limites\n- Conseils`}
                          className="w-full rounded-lg px-4 py-3 text-[12px] font-medium outline-none resize-y leading-relaxed"
                          style={{ background: D.inputBg, border: `1px solid ${D.inputBorder}`, color: D.text }}
                          onFocus={e => { e.currentTarget.style.borderColor = `${D.accent}50`; }}
                          onBlur={e => { e.currentTarget.style.borderColor = D.inputBorder; }}
                          autoFocus
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-medium" style={{ color: D.textDim }}>
                            {editContent.length} caracteres
                          </p>
                          <div className="flex gap-2">
                            <button onClick={cancelEdit} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: `${D.textDim}10`, color: D.textSecondary, border: `1px solid ${D.textDim}15` }}>
                              Annuler
                            </button>
                            <button onClick={saveEdit} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${D.accent}, ${D.accentMuted})` }}>
                              Valider
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : hasCont ? (
                      <div>
                        <p className="text-[12px] font-medium leading-relaxed whitespace-pre-wrap" style={{ color: D.textSecondary }}>
                          {sec.content}
                        </p>
                        <button onClick={() => startEdit(sec)} className="mt-3 flex items-center gap-1.5 text-[11px] font-bold" style={{ color: D.accent }}>
                          <Pencil className="w-3 h-3" /> Modifier
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-[11px] font-medium mb-2" style={{ color: D.textDim }}>Aucun contenu pour cette section</p>
                        <button onClick={() => startEdit(sec)} className="px-4 py-2 rounded-lg text-[11px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${D.accent}, ${D.accentMuted})` }}>
                          Ajouter du contenu
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick add suggestions */}
      {missingSuggestions.length > 0 && !addMode && (
        <div className="rounded-xl p-4" style={{ background: D.card, border: `1px solid ${D.cardBorder}` }}>
          <p className="text-[11px] font-bold mb-3" style={{ color: D.textSecondary }}>Sections suggerees</p>
          <div className="flex flex-wrap gap-2">
            {missingSuggestions.map(sug => {
              const IconComp = ICON_MAP[sug.icon] ?? Folder;
              return (
                <button key={sug.key} onClick={() => addSection(sug.key, sug.title, sug.icon)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:brightness-110" style={{ background: D.accentBg, border: `1px solid ${D.accentBorder}`, color: D.accent }}>
                  <IconComp className="w-3 h-3" />
                  {sug.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add all / add custom */}
      <div className="flex flex-wrap gap-2">
        {missingSuggestions.length > 0 && (
          <button
            onClick={() => {
              const newSections = [...sections];
              for (const sug of missingSuggestions) {
                newSections.push({ key: sug.key, title: sug.title, icon: sug.icon, content: '', position: newSections.length });
              }
              updateSections(newSections);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold transition-all hover:brightness-110"
            style={{ background: D.accentBg, border: `1px solid ${D.accentBorder}`, color: D.accent }}
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter toutes les sections
          </button>
        )}

        {!addMode ? (
          <button onClick={() => setAddMode(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold transition-all" style={{ background: `${D.textDim}08`, border: `1px solid ${D.textDim}15`, color: D.textSecondary }}>
            <Plus className="w-3.5 h-3.5" /> Section personnalisee
          </button>
        ) : (
          <div className="flex items-center gap-2 w-full rounded-xl p-3" style={{ background: D.card, border: `1px solid ${D.cardBorder}` }}>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Nom de la section..." className="flex-1 px-3 py-2 rounded-lg text-[12px] font-medium outline-none" style={{ background: D.inputBg, border: `1px solid ${D.inputBorder}`, color: D.text }} onKeyDown={e => { if (e.key === 'Enter') addCustomSection(); }} autoFocus />
            <select value={newIcon} onChange={e => setNewIcon(e.target.value)} className="px-2 py-2 rounded-lg text-[11px] font-medium outline-none" style={{ background: D.inputBg, border: `1px solid ${D.inputBorder}`, color: D.text }}>
              {Object.keys(ICON_MAP).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <button onClick={addCustomSection} className="px-3 py-2 rounded-lg text-[11px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${D.accent}, ${D.accentMuted})` }}>
              Ajouter
            </button>
            <button onClick={() => { setAddMode(false); setNewTitle(''); }} className="px-3 py-2 rounded-lg text-[11px] font-semibold" style={{ background: `${D.textDim}10`, color: D.textSecondary }}>
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
