import { Pencil, Trash2, X, Check, Info, ListTodo, ChevronDown, ChevronUp, CheckCircle, GripVertical } from 'lucide-react';
import type { getThemeTokens } from '../../../../lib/themeTokens';
import type { ContentBlock, BlockTask, BlockInfo, TaskStatus } from './contentBlocksTypes';
import { STATUS_CONFIG, STATUS_ORDER } from './contentBlocksTypes';

interface ContentBlockItemProps {
  block: ContentBlock;
  blockIndex: number;
  tasks: BlockTask[];
  infos: BlockInfo[];
  collapsed: boolean;
  reorderMode: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  editingBlockId: string | null;
  editBlockForm: { title: string; utility: string };
  addingTaskBlockId: string | null;
  newTaskText: string;
  addingInfoBlockId: string | null;
  newInfoText: string;
  editingTaskId: string | null;
  editTaskText: string;
  editingInfoId: string | null;
  editInfoText: string;
  tokens: ReturnType<typeof getThemeTokens>;
  onToggleCollapse: (id: string) => void;
  onStartEditBlock: (block: ContentBlock) => void;
  onSaveEditBlock: () => void;
  onCancelEditBlock: () => void;
  onSetEditBlockForm: (form: { title: string; utility: string }) => void;
  onDeleteBlock: (id: string) => void;
  onStartAddTask: (blockId: string) => void;
  onSetNewTaskText: (text: string) => void;
  onAddTask: (blockId: string) => void;
  onCancelAddTask: () => void;
  onTaskStatusChange: (blockId: string, taskId: string, status: TaskStatus) => void;
  onDeleteTask: (blockId: string, taskId: string) => void;
  onStartEditTask: (task: BlockTask) => void;
  onSaveEditTask: (blockId: string) => void;
  onCancelEditTask: () => void;
  onSetEditTaskText: (text: string) => void;
  onStartAddInfo: (blockId: string) => void;
  onSetNewInfoText: (text: string) => void;
  onAddInfo: (blockId: string) => void;
  onCancelAddInfo: () => void;
  onDeleteInfo: (blockId: string, infoId: string) => void;
  onStartEditInfo: (info: BlockInfo) => void;
  onSaveEditInfo: (blockId: string) => void;
  onCancelEditInfo: () => void;
  onSetEditInfoText: (text: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
}

export default function ContentBlockItem({
  block, blockIndex, tasks, infos, collapsed, reorderMode,
  isDragging, isDragOver,
  editingBlockId, editBlockForm,
  addingTaskBlockId, newTaskText,
  addingInfoBlockId, newInfoText,
  editingTaskId, editTaskText,
  editingInfoId, editInfoText,
  tokens,
  onToggleCollapse, onStartEditBlock, onSaveEditBlock, onCancelEditBlock, onSetEditBlockForm,
  onDeleteBlock, onStartAddTask, onSetNewTaskText, onAddTask, onCancelAddTask,
  onTaskStatusChange, onDeleteTask, onStartEditTask, onSaveEditTask, onCancelEditTask, onSetEditTaskText,
  onStartAddInfo, onSetNewInfoText, onAddInfo, onCancelAddInfo, onDeleteInfo,
  onStartEditInfo, onSaveEditInfo, onCancelEditInfo, onSetEditInfoText,
  onDragStart, onDragOver, onDrop, onDragEnd,
}: ContentBlockItemProps) {
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const remainingCount = tasks.length - doneCount;
  const progressPercent = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;
  const allTasksDone = tasks.length > 0 && doneCount === tasks.length;
  const isEditing = editingBlockId === block.id;

  return (
    <div
      draggable={reorderMode}
      onDragStart={() => onDragStart(blockIndex)}
      onDragOver={(e) => onDragOver(e, blockIndex)}
      onDrop={() => onDrop(blockIndex)}
      onDragEnd={onDragEnd}
      className="rounded-xl overflow-hidden transition-all duration-150"
      style={{
        background: tokens.card.bg,
        border: isDragOver ? '1px solid rgba(251,191,36,0.5)' : reorderMode ? '1px solid rgba(251,191,36,0.18)' : `1px solid ${tokens.card.border}`,
        opacity: isDragging ? 0.4 : 1,
        boxShadow: isDragOver ? '0 0 0 2px rgba(251,191,36,0.15)' : 'none',
      }}
    >
      <div className="px-5 py-4 flex items-start gap-3" style={{ borderBottom: collapsed ? 'none' : `1px solid ${tokens.surface.border}` }}>
        {reorderMode ? (
          <div className="flex-shrink-0 mt-1.5 cursor-grab active:cursor-grabbing p-1 rounded-md" style={{ color: '#fbbf24' }}>
            <GripVertical className="w-4 h-4" />
          </div>
        ) : (
          <button onClick={() => onToggleCollapse(block.id)} className="mt-1.5 flex-shrink-0 transition-colors" style={{ color: tokens.text.quaternary }} onMouseEnter={e => { e.currentTarget.style.color = tokens.text.tertiary; }} onMouseLeave={e => { e.currentTarget.style.color = tokens.text.quaternary; }}>
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        )}

        {isEditing ? (
          <div className="flex-1 flex flex-col gap-2">
            <input type="text" value={editBlockForm.title} onChange={e => onSetEditBlockForm({ ...editBlockForm, title: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') onSaveEditBlock(); if (e.key === 'Escape') onCancelEditBlock(); }} className="w-full bg-transparent text-lg font-bold outline-none px-2 py-1 rounded-md" style={{ border: `1px solid ${tokens.accent.border}`, color: tokens.input.text, caretColor: tokens.accent.solid }} autoFocus />
            <input type="text" value={editBlockForm.utility} onChange={e => onSetEditBlockForm({ ...editBlockForm, utility: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') onSaveEditBlock(); if (e.key === 'Escape') onCancelEditBlock(); }} placeholder="Utilite" className="w-full bg-transparent text-xs outline-none px-2 py-1 rounded-md" style={{ border: `1px solid ${tokens.surface.borderLight}`, color: tokens.text.tertiary, caretColor: tokens.accent.solid }} />
            <div className="flex items-center gap-2 justify-end">
              <button onClick={onCancelEditBlock} className="p-1 rounded-md transition-colors" style={{ color: tokens.text.quaternary }}><X className="w-3.5 h-3.5" /></button>
              <button onClick={onSaveEditBlock} disabled={!editBlockForm.title.trim()} className="p-1 rounded-md transition-colors disabled:opacity-30" style={{ color: tokens.success.text }}><Check className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0 cursor-pointer select-none" onClick={() => onToggleCollapse(block.id)}>
            <div className="flex items-center gap-2.5">
              {reorderMode && (
                <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-md flex-shrink-0" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>{blockIndex + 1}</span>
              )}
              <p className="text-lg font-bold" style={{ color: tokens.text.primary }}>{block.title}</p>
              {allTasksDone && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: tokens.success.bg, color: tokens.success.text, border: `1px solid ${tokens.success.border}` }}>
                  <CheckCircle className="w-3 h-3" />Termine
                </span>
              )}
            </div>
            {block.utility && <p className="text-xs mt-1.5 italic" style={{ color: tokens.text.tertiary }}>{block.utility}</p>}
            {tasks.length > 0 && (
              <div className="flex items-center gap-2.5 mt-2">
                <span className="text-xs font-medium" style={{ color: tokens.text.quaternary }}>{remainingCount} tache{remainingCount !== 1 ? 's' : ''} restante{remainingCount !== 1 ? 's' : ''}</span>
                <span className="text-xs" style={{ color: tokens.text.quaternary }}>·</span>
                <span className="text-xs font-semibold" style={{ color: allTasksDone ? '#34d399' : tokens.text.quaternary }}>{progressPercent}%</span>
              </div>
            )}
          </div>
        )}

        {!isEditing && !reorderMode && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={() => { onStartAddTask(block.id); onSetNewTaskText(''); }} className="p-2 rounded-lg transition-colors" style={{ color: tokens.text.quaternary }} onMouseEnter={e => { e.currentTarget.style.color = '#facc15'; e.currentTarget.style.background = 'rgba(234,179,8,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.color = tokens.text.quaternary; e.currentTarget.style.background = 'transparent'; }} title="Ajouter une tache"><ListTodo className="w-4 h-4" /></button>
            <button onClick={() => { onStartAddInfo(block.id); onSetNewInfoText(''); }} className="p-2 rounded-lg transition-colors" style={{ color: tokens.text.quaternary }} onMouseEnter={e => { e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.background = 'rgba(14,165,233,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.color = tokens.text.quaternary; e.currentTarget.style.background = 'transparent'; }} title="Ajouter une info"><Info className="w-4 h-4" /></button>
            <button onClick={() => onStartEditBlock(block)} className="p-2 rounded-lg transition-colors" style={{ color: tokens.text.quaternary }} onMouseEnter={e => { e.currentTarget.style.color = tokens.accent.text; e.currentTarget.style.background = tokens.accent.bg; }} onMouseLeave={e => { e.currentTarget.style.color = tokens.text.quaternary; e.currentTarget.style.background = 'transparent'; }} title="Modifier"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => onDeleteBlock(block.id)} className="p-2 rounded-lg transition-colors" style={{ color: tokens.text.quaternary }} onMouseEnter={e => { e.currentTarget.style.color = tokens.danger.text; e.currentTarget.style.background = tokens.danger.bg; }} onMouseLeave={e => { e.currentTarget.style.color = tokens.text.quaternary; e.currentTarget.style.background = 'transparent'; }} title="Supprimer"><Trash2 className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-5 pt-1 pb-5">
          {addingTaskBlockId === block.id && (
            <div className="flex items-center gap-2.5 mt-3 mb-2">
              <ListTodo className="w-4 h-4 flex-shrink-0" style={{ color: '#facc15' }} />
              <input type="text" value={newTaskText} onChange={e => onSetNewTaskText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onAddTask(block.id); if (e.key === 'Escape') onCancelAddTask(); }} placeholder="Texte de la tache..." className="flex-1 bg-transparent text-sm outline-none px-3 py-2 rounded-lg" style={{ border: '1px solid rgba(234,179,8,0.25)', color: tokens.input.text, caretColor: '#facc15' }} autoFocus />
              <button onClick={() => onAddTask(block.id)} disabled={!newTaskText.trim()} className="p-1.5 rounded-lg transition-colors disabled:opacity-30" style={{ color: '#4ade80' }}><Check className="w-4 h-4" /></button>
              <button onClick={onCancelAddTask} className="p-1.5 rounded-lg" style={{ color: tokens.text.quaternary }}><X className="w-4 h-4" /></button>
            </div>
          )}

          {tasks.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2.5 mb-3">
                <ListTodo className="w-3.5 h-3.5" style={{ color: 'rgba(250,204,21,0.7)' }} />
                <p className="text-sm font-bold tracking-wide uppercase" style={{ color: tokens.text.secondary }}>Taches</p>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(250,204,21,0.08)', color: 'rgba(250,204,21,0.6)' }}>{tasks.length}</span>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="rounded-full overflow-hidden" style={{ width: 60, height: 4, background: 'rgba(250,204,21,0.1)' }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%`, background: allTasksDone ? '#34d399' : '#facc15' }} />
                  </div>
                  <span className="text-xs font-semibold tabular-nums" style={{ color: allTasksDone ? '#34d399' : 'rgba(250,204,21,0.6)', minWidth: 28, textAlign: 'right' }}>{progressPercent}%</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group" style={{ background: tokens.surface.tertiary }} onMouseEnter={e => { e.currentTarget.style.background = tokens.surface.hover; }} onMouseLeave={e => { e.currentTarget.style.background = tokens.surface.tertiary; }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_CONFIG[task.status].dot }} />
                    {editingTaskId === task.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input type="text" value={editTaskText} onChange={e => onSetEditTaskText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onSaveEditTask(block.id); if (e.key === 'Escape') onCancelEditTask(); }} className="flex-1 bg-transparent text-sm outline-none px-2 py-1 rounded-md" style={{ border: `1px solid ${tokens.accent.border}`, color: tokens.input.text, caretColor: tokens.accent.solid }} autoFocus />
                        <button onClick={() => onSaveEditTask(block.id)} disabled={!editTaskText.trim()} className="p-1 disabled:opacity-30" style={{ color: '#4ade80' }}><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={onCancelEditTask} className="p-1" style={{ color: tokens.text.quaternary }}><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <>
                        <p className="flex-1 text-sm min-w-0" style={{ color: task.status === 'done' ? tokens.text.quaternary : tokens.text.secondary, textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.text}</p>
                        <select value={task.status} onChange={e => onTaskStatusChange(block.id, task.id, e.target.value as TaskStatus)} className="text-xs font-bold px-3 py-1.5 rounded-lg outline-none cursor-pointer flex-shrink-0 transition-colors" style={{ background: STATUS_CONFIG[task.status].bg, border: `1px solid ${STATUS_CONFIG[task.status].border}`, color: STATUS_CONFIG[task.status].accent }}>
                          {STATUS_ORDER.map(s => (<option key={s} value={s} style={{ background: tokens.selectBg }}>{STATUS_CONFIG[s].label}</option>))}
                        </select>
                        <button onClick={() => onStartEditTask(task)} className="p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100" style={{ color: tokens.text.quaternary }} onMouseEnter={e => { e.currentTarget.style.color = tokens.accent.text; }} onMouseLeave={e => { e.currentTarget.style.color = tokens.text.quaternary; }}><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onDeleteTask(block.id, task.id)} className="p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100" style={{ color: tokens.text.quaternary }} onMouseEnter={e => { e.currentTarget.style.color = tokens.danger.text; }} onMouseLeave={e => { e.currentTarget.style.color = tokens.text.quaternary; }}><Trash2 className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {addingInfoBlockId === block.id && (
            <div className="flex items-center gap-2.5 mt-3 mb-2">
              <Info className="w-4 h-4 flex-shrink-0" style={{ color: '#38bdf8' }} />
              <input type="text" value={newInfoText} onChange={e => onSetNewInfoText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onAddInfo(block.id); if (e.key === 'Escape') onCancelAddInfo(); }} placeholder="Texte de l'info..." className="flex-1 bg-transparent text-sm outline-none px-3 py-2 rounded-lg" style={{ border: '1px solid rgba(14,165,233,0.25)', color: tokens.input.text, caretColor: '#38bdf8' }} autoFocus />
              <button onClick={() => onAddInfo(block.id)} disabled={!newInfoText.trim()} className="p-1.5 rounded-lg transition-colors disabled:opacity-30" style={{ color: '#4ade80' }}><Check className="w-4 h-4" /></button>
              <button onClick={onCancelAddInfo} className="p-1.5 rounded-lg" style={{ color: tokens.text.quaternary }}><X className="w-4 h-4" /></button>
            </div>
          )}

          {infos.length > 0 && (
            <div className={tasks.length > 0 ? 'mt-5 pt-5' : 'mt-5'} style={tasks.length > 0 ? { borderTop: `1px solid ${tokens.surface.borderLight}` } : undefined}>
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-3.5 h-3.5" style={{ color: tokens.text.quaternary }} />
                <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: tokens.text.quaternary }}>Infos</p>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-md" style={{ background: tokens.surface.tertiary, color: tokens.text.quaternary }}>{infos.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {infos.map(info => (
                  <div key={info.id} className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group" style={{ background: tokens.surface.tertiary }} onMouseEnter={e => { e.currentTarget.style.background = tokens.surface.hover; }} onMouseLeave={e => { e.currentTarget.style.background = tokens.surface.tertiary; }}>
                    <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: tokens.text.quaternary }} />
                    {editingInfoId === info.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input type="text" value={editInfoText} onChange={e => onSetEditInfoText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onSaveEditInfo(block.id); if (e.key === 'Escape') onCancelEditInfo(); }} className="flex-1 bg-transparent text-sm outline-none px-2 py-1 rounded-md" style={{ border: '1px solid rgba(14,165,233,0.25)', color: tokens.input.text, caretColor: '#38bdf8' }} autoFocus />
                        <button onClick={() => onSaveEditInfo(block.id)} disabled={!editInfoText.trim()} className="p-1 disabled:opacity-30" style={{ color: '#4ade80' }}><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={onCancelEditInfo} className="p-1" style={{ color: tokens.text.quaternary }}><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <>
                        <p className="flex-1 text-sm min-w-0" style={{ color: tokens.text.tertiary }}>{info.text}</p>
                        <button onClick={() => onStartEditInfo(info)} className="p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100" style={{ color: tokens.text.quaternary }} onMouseEnter={e => { e.currentTarget.style.color = tokens.accent.text; }} onMouseLeave={e => { e.currentTarget.style.color = tokens.text.quaternary; }}><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onDeleteInfo(block.id, info.id)} className="p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100" style={{ color: tokens.text.quaternary }} onMouseEnter={e => { e.currentTarget.style.color = tokens.danger.text; }} onMouseLeave={e => { e.currentTarget.style.color = tokens.text.quaternary; }}><Trash2 className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && infos.length === 0 && addingTaskBlockId !== block.id && addingInfoBlockId !== block.id && (
            <p className="text-xs py-4 text-center" style={{ color: tokens.text.quaternary }}>Aucune tache ou info. Utilisez les boutons ci-dessus pour en ajouter.</p>
          )}
        </div>
      )}
    </div>
  );
}
