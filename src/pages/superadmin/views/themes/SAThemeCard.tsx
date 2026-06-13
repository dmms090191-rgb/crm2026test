import { useState } from 'react';
import { Eye, EyeOff, Star, ChevronUp, ChevronDown, MoreVertical, Wrench, Crown, Award, Pencil, FolderInput, Check, Share2 } from 'lucide-react';
import { ThemePreview } from '../../../../components/theme/ThemeCard';
import { ALL_THEMES } from '../../../../components/theme/themeData';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { ThemeConfigRow, ThemeStatus } from '../../../../hooks/useThemeConfig';
import { STATUS_META } from './saThemesConstants';

interface Props {
  config: ThemeConfigRow;
  categoryName: string;
  onStatusChange: (status: ThemeStatus) => void;
  onToggleRecommended: () => void;
  onToggleFavorite: () => void;
  onToggleShared: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRename: () => void;
  onMove: () => void;
  isFirst: boolean;
  isLast: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export default function SAThemeCard({ config, categoryName, onStatusChange, onToggleRecommended, onToggleFavorite, onToggleShared, onMoveUp, onMoveDown, onRename, onMove, isFirst, isLast, selectionMode, isSelected, onToggleSelect }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useThemeTokens();
  const themeEntry = ALL_THEMES.find(th => th.value === config.theme_key);
  const colors: [string, string, string] = themeEntry?.colors ?? ['#1a1a2e', '#16213e', '#0f3460'];
  const meta = STATUS_META[config.status];

  return (
    <div
      className="group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: isSelected
          ? 'linear-gradient(135deg, rgba(59,130,246,0.10), rgba(59,130,246,0.04))'
          : `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
        border: isSelected ? `1.5px solid rgba(59,130,246,0.40)` : `1px solid ${t.surface.border}`,
        boxShadow: isSelected
          ? '0 0 0 1px rgba(59,130,246,0.10), 0 4px 20px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
          : 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* Selection checkbox */}
      {selectionMode && (
        <button
          onClick={e => { e.stopPropagation(); onToggleSelect?.(); }}
          className="absolute top-3 left-3 z-20 w-6 h-6 rounded-lg flex items-center justify-center transition-all"
          style={{
            background: isSelected ? '#3b82f6' : 'rgba(0,0,0,0.45)',
            border: isSelected ? '1.5px solid #60a5fa' : '1.5px solid rgba(255,255,255,0.20)',
            boxShadow: isSelected ? '0 2px 8px rgba(59,130,246,0.30)' : 'none',
            backdropFilter: 'blur(8px)',
          }}
        >
          {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
        </button>
      )}

      {/* Recommended / Shared badge */}
      {!selectionMode && (config.is_recommended || config.is_shared) && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1">
          {config.is_recommended && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.30)', color: '#60a5fa' }}>
              <Award className="w-2.5 h-2.5" />
              Recommande
            </div>
          )}
          {config.is_shared && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider" style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.25)', color: '#22d3ee' }}>
              <Share2 className="w-2.5 h-2.5" />
              Partage
            </div>
          )}
        </div>
      )}

      {/* Context menu */}
      {!selectionMode && (
        <div className="absolute top-3 right-3 z-10">
          <button onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }} className="w-7 h-7 rounded-lg flex items-center justify-center bg-black/40 hover:bg-black/60 text-white/50 hover:text-white/80 transition-colors backdrop-blur-sm">
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={e => { e.stopPropagation(); setMenuOpen(false); }} />
              <div className="absolute right-0 top-8 z-30 w-48 rounded-xl py-1.5 shadow-2xl" style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.10)' }}>
                <MenuBtn icon={<Pencil className="w-3.5 h-3.5" />} label="Renommer" onClick={() => { setMenuOpen(false); onRename(); }} />
                <MenuBtn icon={<FolderInput className="w-3.5 h-3.5" />} label="Deplacer vers..." onClick={() => { setMenuOpen(false); onMove(); }} />
                <div className="mx-2 my-1 h-px bg-white/[0.06]" />
                <MenuBtn icon={<Eye className="w-3.5 h-3.5" />} label="Visible" active={config.status === 'visible'} onClick={() => { setMenuOpen(false); onStatusChange('visible'); }} />
                <MenuBtn icon={<EyeOff className="w-3.5 h-3.5" />} label="Masquer" active={config.status === 'hidden'} onClick={() => { setMenuOpen(false); onStatusChange('hidden'); }} />
                <MenuBtn icon={<Wrench className="w-3.5 h-3.5" />} label="A retravailler" active={config.status === 'rework'} onClick={() => { setMenuOpen(false); onStatusChange('rework'); }} />
                <MenuBtn icon={<Crown className="w-3.5 h-3.5" />} label="Premium" active={config.status === 'premium'} onClick={() => { setMenuOpen(false); onStatusChange('premium'); }} />
                <div className="mx-2 my-1 h-px bg-white/[0.06]" />
                <MenuBtn icon={<Award className="w-3.5 h-3.5" />} label={config.is_recommended ? 'Retirer recommande' : 'Recommander'} onClick={() => { setMenuOpen(false); onToggleRecommended(); }} />
                <MenuBtn icon={<Share2 className="w-3.5 h-3.5" />} label={config.is_shared ? 'Retirer le partage' : 'Partager a tous'} active={config.is_shared} onClick={() => { setMenuOpen(false); onToggleShared(); }} />
              </div>
            </>
          )}
        </div>
      )}

      <div className="p-3 pb-0 sm:p-4 sm:pb-0">
        <ThemePreview colors={colors} />
      </div>

      <div className="p-3 pt-3 sm:p-4 sm:pt-3.5 flex flex-col gap-1.5">
        <span className="text-[11px] sm:text-xs font-bold truncate" style={{ color: 'rgba(255,255,255,0.88)' }}>
          {config.label}
        </span>
        <p className="text-[10px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.30)' }}>
          {categoryName}
        </p>

        <div className="flex items-center justify-between mt-1">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold" style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}>
            {config.status === 'visible' && <Eye className="w-2.5 h-2.5" />}
            {config.status === 'hidden' && <EyeOff className="w-2.5 h-2.5" />}
            {config.status === 'rework' && <Wrench className="w-2.5 h-2.5" />}
            {config.status === 'premium' && <Crown className="w-2.5 h-2.5" />}
            {meta.label}
          </span>
          {!selectionMode && (
            <div className="flex items-center gap-1">
              <button onClick={e => { e.stopPropagation(); onToggleFavorite(); }} className="w-6 h-6 rounded-md flex items-center justify-center transition-colors" style={{ color: config.is_favorite ? '#f59e0b' : 'rgba(255,255,255,0.15)' }}>
                <Star className="w-3.5 h-3.5" fill={config.is_favorite ? '#f59e0b' : 'none'} />
              </button>
              <button onClick={e => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} className="w-6 h-6 rounded-md flex items-center justify-center transition-colors disabled:opacity-20" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={e => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} className="w-6 h-6 rounded-md flex items-center justify-center transition-colors disabled:opacity-20" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 20px rgba(255,255,255,0.03)' }} />
    </div>
  );
}

function MenuBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={e => { e.stopPropagation(); onClick(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium transition-colors hover:bg-white/[0.06]" style={{ color: active ? '#60a5fa' : 'rgba(255,255,255,0.65)' }}>
      {icon}
      {label}
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
    </button>
  );
}
