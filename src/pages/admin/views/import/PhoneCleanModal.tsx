import { useState, useMemo } from 'react';
import { X, Phone, PenLine, Check, CheckSquare, Square, Info } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { ProcessedRow } from '../../../../lib/csvImportPipeline';

interface PhoneCleanModalProps {
  allColumns: string[];
  processedRows: ProcessedRow[];
  detectedPhoneCol: string | null;
  onApply: (changes: Map<number, string>, col: string) => void;
  onClose: () => void;
}

type CleanAction = 'simple' | 'prefix_add' | 'prefix_remove' | 'prefix_replace';

function cleanPhone(phone: string, action: CleanAction, value: string, rw: string): string {
  if (action === 'simple') return phone.replace(/[\s\-()]/g, '');
  if (action === 'prefix_add') return value ? value + phone : phone;
  if (action === 'prefix_remove' && value && phone.startsWith(value)) return phone.slice(value.length).trimStart();
  if (action === 'prefix_replace' && value && phone.startsWith(value)) return rw + phone.slice(value.length).trimStart();
  return phone;
}

const ACTIONS: { key: CleanAction; label: string; desc: string; example: (pv: string, rw: string) => string }[] = [
  { key: 'simple', label: 'Nettoyage simple', desc: 'Supprime espaces, tirets et parentheses', example: () => '+33 6 12-34-56-78  \u2192  +33612345678' },
  { key: 'prefix_add', label: 'Ajouter un prefixe', desc: 'Ajoute un texte au debut du numero', example: (pv) => pv ? `612345678  \u2192  ${pv}612345678` : '612345678  \u2192  0612345678' },
  { key: 'prefix_remove', label: 'Supprimer un prefixe', desc: 'Retire un texte au debut du numero', example: (pv) => pv ? `${pv}612345678  \u2192  612345678` : '+33612345678  \u2192  612345678' },
  { key: 'prefix_replace', label: 'Remplacer un prefixe', desc: 'Remplace le debut par autre chose', example: (pv, rw) => pv ? `${pv}612345678  \u2192  ${rw || '?'}612345678` : '+33612345678  \u2192  0612345678' },
];

const PHONE_PATTERNS = /^(t[ée]l[ée]phone|tel|phone|mobile|portable|cell|num[ée]ro|fax)$/i;
function isPhoneLikeColumn(col: string): boolean {
  return PHONE_PATTERNS.test(col.trim().replace(/[_\-.\s]+/g, ''));
}

export default function PhoneCleanModal({ allColumns, processedRows, detectedPhoneCol, onApply, onClose }: PhoneCleanModalProps) {
  const tokens = useThemeTokens();
  const phoneCols = useMemo(() => allColumns.filter(isPhoneLikeColumn), [allColumns]);

  const [phoneCol, setPhoneCol] = useState<string>(detectedPhoneCol || (phoneCols.length === 1 ? phoneCols[0] : ''));
  const [selected, setSelected] = useState<Set<number>>(() => new Set(processedRows.map(r => r.index)));
  const [action, setAction] = useState<CleanAction>('simple');
  const [prefixValue, setPrefixValue] = useState('');
  const [replaceWith, setReplaceWith] = useState('');

  const leads = useMemo(() => {
    if (!phoneCol) return [];
    return processedRows.filter(r => r.raw[phoneCol]).map(r => ({ index: r.index, prenom: r.prenom, nom: r.nom, phone: r.raw[phoneCol] }));
  }, [processedRows, phoneCol]);

  const allSelected = leads.length > 0 && selected.size >= leads.length;
  const toggleAll = () => { if (allSelected) setSelected(new Set()); else setSelected(new Set(leads.map(l => l.index))); };
  const toggleOne = (idx: number) => { const n = new Set(selected); if (n.has(idx)) n.delete(idx); else n.add(idx); setSelected(n); };

  const previews = useMemo(() => leads.map(l => {
    const nw = selected.has(l.index) ? cleanPhone(l.phone, action, prefixValue, replaceWith) : l.phone;
    return { ...l, newPhone: nw, changed: selected.has(l.index) && nw !== l.phone };
  }), [leads, selected, action, prefixValue, replaceWith]);

  const changedCount = previews.filter(p => p.changed).length;
  const handleApply = () => {
    if (!phoneCol || changedCount === 0) return;
    const changes = new Map<number, string>();
    for (const p of previews) { if (p.changed) changes.set(p.index, p.newPhone); }
    onApply(changes, phoneCol);
    onClose();
  };

  const currentAction = ACTIONS.find(a => a.key === action)!;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden" style={{ background: tokens.card.bg, border: tokens.card.border }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: tokens.card.border }}>
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4" style={{ color: tokens.accent.text }} />
            <h2 className="text-sm font-bold" style={{ color: tokens.text.primary }}>Corriger les leads</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80" style={{ background: tokens.surface.tertiary, color: tokens.text.tertiary }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section: Telephones */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-1 shrink-0">
          <Phone className="w-3.5 h-3.5" style={{ color: tokens.accent.text }} />
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.accent.text }}>Telephones</h3>
        </div>

        {/* Column picker */}
        <div className="flex items-center gap-3 px-5 py-3 shrink-0 flex-wrap" style={{ borderBottom: tokens.card.border }}>
          <label className="text-[11px] font-semibold shrink-0" style={{ color: tokens.text.tertiary }}>Colonne :</label>
          {phoneCols.length > 0 ? (
            <select value={phoneCol} onChange={e => { setPhoneCol(e.target.value); setSelected(new Set(processedRows.map(r => r.index))); }}
              className="px-2.5 py-1.5 rounded-lg text-xs max-w-[200px]" style={{ background: tokens.surface.tertiary, color: tokens.text.primary, border: tokens.card.border }}>
              <option value="">-- Choisir --</option>
              {phoneCols.map(col => <option key={col} value={col}>{col}{col === detectedPhoneCol ? ' (auto)' : ''}</option>)}
            </select>
          ) : (
            <span className="text-[11px]" style={{ color: '#fb923c' }}>Aucune colonne telephone detectee</span>
          )}
        </div>

        {/* Rules */}
        {phoneCol && (
          <div className="px-5 py-4 space-y-3 shrink-0" style={{ borderBottom: tokens.card.border }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ACTIONS.map(a => (
                <button key={a.key} onClick={() => setAction(a.key)} className="text-left px-3 py-2 rounded-xl text-[11px] font-semibold transition-all"
                  style={action === a.key ? { background: 'rgba(34,211,238,0.12)', color: tokens.accent.text, border: '1px solid rgba(34,211,238,0.3)' } : { background: tokens.surface.tertiary, color: tokens.text.tertiary, border: '1px solid transparent' }}>
                  {a.label}
                </button>
              ))}
            </div>
            <p className="text-[11px]" style={{ color: tokens.text.tertiary }}>{currentAction.desc}</p>
            {action !== 'simple' && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-semibold" style={{ color: tokens.text.tertiary }}>{action === 'prefix_add' ? 'Prefixe a ajouter' : action === 'prefix_remove' ? 'Prefixe a supprimer' : 'Remplacer'}</label>
                  <input type="text" value={prefixValue} onChange={e => setPrefixValue(e.target.value)} placeholder="ex: +33"
                    className="px-2.5 py-1.5 rounded-lg text-xs w-24" style={{ background: tokens.surface.tertiary, color: tokens.text.primary, border: tokens.card.border }} />
                </div>
                {action === 'prefix_replace' && (
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-semibold" style={{ color: tokens.text.tertiary }}>Par</label>
                    <input type="text" value={replaceWith} onChange={e => setReplaceWith(e.target.value)} placeholder="ex: 0"
                      className="px-2.5 py-1.5 rounded-lg text-xs w-24" style={{ background: tokens.surface.tertiary, color: tokens.text.primary, border: tokens.card.border }} />
                  </div>
                )}
              </div>
            )}
            {/* Dynamic example */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: tokens.surface.tertiary }}>
              <span className="text-[10px] font-semibold shrink-0" style={{ color: tokens.text.quaternary }}>Exemple :</span>
              <span className="text-[11px] font-mono" style={{ color: tokens.accent.text }}>{currentAction.example(prefixValue, replaceWith)}</span>
            </div>
          </div>
        )}

        {/* Select all bar + status */}
        {phoneCol && leads.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-2.5 shrink-0 flex-wrap" style={{ borderBottom: tokens.card.border }}>
            <button onClick={toggleAll} className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: tokens.accent.text }}>
              {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              {allSelected ? 'Tout decocher' : 'Tout selectionner'}
            </button>
            <span className="text-[10px]" style={{ color: tokens.text.quaternary }}>{selected.size}/{leads.length}</span>
            {changedCount === 0 && (
              <span className="flex items-center gap-1 text-[10px] ml-auto" style={{ color: '#fb923c' }}>
                <Info className="w-3 h-3" /> Aucun changement detecte
              </span>
            )}
            {changedCount > 0 && (
              <span className="text-[10px] ml-auto font-semibold" style={{ color: '#34d399' }}>{changedCount} modifie{changedCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}

        {/* Preview list */}
        {phoneCol && leads.length > 0 && (
          <div className="overflow-auto flex-1 min-h-0">
            {/* Desktop */}
            <table className="w-full text-xs hidden sm:table" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: tokens.table.headerBg, borderBottom: tokens.table.headerBorder }}>
                  <th className="px-3 py-2.5 w-10"><button onClick={toggleAll}>{allSelected ? <CheckSquare className="w-4 h-4" style={{ color: tokens.accent.text }} /> : <Square className="w-4 h-4" style={{ color: tokens.text.quaternary }} />}</button></th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: tokens.table.headerText }}>Lead</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: tokens.table.headerText }}>Avant</th>
                  <th className="px-3 py-2.5 text-center text-[10px]" style={{ color: tokens.text.quaternary }}></th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: tokens.table.headerText }}>Apres</th>
                </tr>
              </thead>
              <tbody>
                {previews.map(p => (
                  <tr key={p.index} style={{ borderBottom: tokens.table.rowBorder, opacity: p.changed ? 1 : 0.5 }}>
                    <td className="px-3 py-2"><button onClick={() => toggleOne(p.index)}>{selected.has(p.index) ? <CheckSquare className="w-4 h-4" style={{ color: tokens.accent.text }} /> : <Square className="w-4 h-4" style={{ color: tokens.text.quaternary }} />}</button></td>
                    <td className="px-3 py-2" style={{ color: tokens.table.cellText }}>{p.prenom || '\u2014'} {p.nom || ''}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: p.changed ? tokens.text.tertiary : tokens.text.quaternary }}>{p.phone}</td>
                    <td className="px-1 py-2 text-center text-[10px]" style={{ color: p.changed ? '#34d399' : tokens.text.quaternary }}>{p.changed ? '\u2192' : '='}</td>
                    <td className="px-3 py-2 font-mono font-semibold" style={{ color: p.changed ? '#34d399' : tokens.text.quaternary }}>
                      {p.newPhone}{p.changed && <Check className="w-3 h-3 inline ml-1" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y" style={{ borderColor: tokens.table.rowBorder }}>
              {previews.map(p => (
                <div key={p.index} className="px-4 py-3 flex items-start gap-3" style={{ opacity: p.changed ? 1 : 0.5 }}>
                  <button onClick={() => toggleOne(p.index)} className="mt-0.5 shrink-0">{selected.has(p.index) ? <CheckSquare className="w-4 h-4" style={{ color: tokens.accent.text }} /> : <Square className="w-4 h-4" style={{ color: tokens.text.quaternary }} />}</button>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs font-semibold truncate" style={{ color: tokens.text.primary }}>{p.prenom || '\u2014'} {p.nom || ''}</p>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 text-[11px] font-mono">
                      <span className="truncate" style={{ color: tokens.text.tertiary }}>{p.phone}</span>
                      <span style={{ color: p.changed ? '#34d399' : tokens.text.quaternary }}>{p.changed ? '\u2192' : '='}</span>
                      <span className="truncate font-semibold" style={{ color: p.changed ? '#34d399' : tokens.text.quaternary }}>
                        {p.newPhone}{p.changed && <Check className="w-3 h-3 inline ml-1" />}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {phoneCol && leads.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-10">
            <p className="text-xs" style={{ color: tokens.text.quaternary }}>Aucune donnee dans la colonne selectionnee</p>
          </div>
        )}
        {!phoneCol && (
          <div className="flex-1 flex items-center justify-center py-10">
            <p className="text-xs" style={{ color: tokens.text.quaternary }}>Selectionnez une colonne telephone pour commencer</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderTop: tokens.card.border }}>
          <span className="text-[11px]" style={{ color: changedCount > 0 ? '#34d399' : tokens.text.quaternary }}>
            {changedCount > 0 ? `${changedCount} telephone${changedCount !== 1 ? 's' : ''} modifie${changedCount !== 1 ? 's' : ''}` : 'Aucun changement'}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ color: tokens.text.tertiary, background: tokens.surface.tertiary }}>Annuler</button>
            <button onClick={handleApply} disabled={changedCount === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)', color: '#050a10' }}>
              {changedCount > 0 ? `Appliquer (${changedCount})` : 'Appliquer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
