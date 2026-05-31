import { useState, useRef } from 'react';
import { GripVertical, Eye, EyeOff, Plus, Lock, Menu, Home, Briefcase, ListOrdered, Tag, Calendar, ShieldCheck, Mail, PanelBottom, BarChart3, Lightbulb, Calculator, Award, CircleUser as UserCircle, HeartHandshake, Star, Info } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import type { SectionConfig } from './templateSectionsConfig';

const ICON_MAP: Record<string, React.ReactNode> = {
  Menu: <Menu className="w-3.5 h-3.5" />,
  Home: <Home className="w-3.5 h-3.5" />,
  Briefcase: <Briefcase className="w-3.5 h-3.5" />,
  ListOrdered: <ListOrdered className="w-3.5 h-3.5" />,
  Tag: <Tag className="w-3.5 h-3.5" />,
  Calendar: <Calendar className="w-3.5 h-3.5" />,
  ShieldCheck: <ShieldCheck className="w-3.5 h-3.5" />,
  Mail: <Mail className="w-3.5 h-3.5" />,
  PanelBottom: <PanelBottom className="w-3.5 h-3.5" />,
  BarChart3: <BarChart3 className="w-3.5 h-3.5" />,
  Lightbulb: <Lightbulb className="w-3.5 h-3.5" />,
  Calculator: <Calculator className="w-3.5 h-3.5" />,
  Award: <Award className="w-3.5 h-3.5" />,
  UserCircle: <UserCircle className="w-3.5 h-3.5" />,
  HeartHandshake: <HeartHandshake className="w-3.5 h-3.5" />,
  Star: <Star className="w-3.5 h-3.5" />,
  Info: <Info className="w-3.5 h-3.5" />,
};

interface Props {
  sections: SectionConfig[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  visibleSections: Set<string>;
  onToggleVisibility: (key: string) => void;
  sectionOrder: string[];
  onReorder: (order: string[]) => void;
  t: ThemeTokens;
}

export default function StudioSectionsList({
  sections, selectedKey, onSelect, visibleSections,
  onToggleVisibility, sectionOrder, onReorder, t,
}: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const orderedSections = sectionOrder
    .map(key => sections.find(s => s.key === key))
    .filter(Boolean) as SectionConfig[];

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragRef.current = idx;
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    const fromIdx = dragRef.current;
    if (fromIdx !== null && fromIdx !== toIdx) {
      const next = [...sectionOrder];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      onReorder(next);
    }
    setDragIdx(null);
    setOverIdx(null);
    dragRef.current = null;
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
    dragRef.current = null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: 'rgba(14,165,233,0.1)' }}
        >
          <span className="text-[10px] font-black" style={{ color: '#0ea5e9' }}>1</span>
        </div>
        <h3 className="text-xs font-bold" style={{ color: t.text.primary }}>Sections du site</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {orderedSections.map((section, idx) => {
          const isSelected = selectedKey === section.key;
          const isVisible = visibleSections.has(section.key);
          const isDragging = dragIdx === idx;
          const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx;

          return (
            <div
              key={section.key}
              draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={e => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className="flex items-center gap-1.5 px-2 py-2 rounded-lg transition-all cursor-pointer group"
              style={{
                background: isSelected
                  ? 'rgba(14,165,233,0.12)'
                  : isOver ? 'rgba(14,165,233,0.06)' : 'transparent',
                border: isSelected
                  ? '1px solid rgba(14,165,233,0.3)'
                  : isOver ? '1px solid rgba(14,165,233,0.15)' : '1px solid transparent',
                opacity: isDragging ? 0.4 : isVisible ? 1 : 0.4,
              }}
              onClick={() => onSelect(section.key)}
            >
              <GripVertical
                className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-50 transition-opacity cursor-grab"
                style={{ color: t.text.quaternary }}
              />

              <span
                className="flex-shrink-0"
                style={{ color: isSelected ? '#0ea5e9' : t.text.tertiary }}
              >
                {ICON_MAP[section.icon] ?? <Star className="w-3.5 h-3.5" />}
              </span>

              <span
                className="text-[11px] font-semibold flex-1 truncate"
                style={{
                  color: isSelected ? '#0ea5e9' : t.text.secondary,
                  textDecoration: isVisible ? 'none' : 'line-through',
                }}
              >
                {section.label}
              </span>

              <button
                onClick={e => { e.stopPropagation(); onToggleVisibility(section.key); }}
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: isVisible ? t.text.quaternary : '#ef4444' }}
              >
                {isVisible
                  ? <Eye className="w-3 h-3" />
                  : <EyeOff className="w-3 h-3" />}
              </button>
            </div>
          );
        })}
      </div>

      <div className="px-2 py-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
        <button
          disabled
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all opacity-40 cursor-not-allowed"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.tertiary }}
          title="Bientot disponible"
        >
          <Plus className="w-3 h-3" />
          Ajouter une section
          <Lock className="w-2.5 h-2.5 ml-1" />
        </button>
      </div>
    </div>
  );
}
