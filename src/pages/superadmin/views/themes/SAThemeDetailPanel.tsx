import { Eye, EyeOff, Wrench, Crown, ChevronUp, ChevronDown, Pencil, X, Check, FolderInput, Award, Star, Paintbrush, Share2 } from 'lucide-react';
import type { ThemeConfigRow, ThemeStatus } from '../../../../hooks/useThemeConfig';
import { ALL_THEMES } from '../../../../components/theme/themeData';
import { ThemePreview } from '../../../../components/theme/ThemeCard';
import { STATUS_META } from './saThemesConstants';

interface Props {
  config: ThemeConfigRow;
  categoryName: string;
  onStatusChange: (s: ThemeStatus) => void;
  onToggleRecommended: () => void;
  onToggleFavorite: () => void;
  onToggleShared: () => void;
  onRename: () => void;
  onMove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onClose: () => void;
  displayOrder: number;
  onEditInEditor?: () => void;
}

export default function SAThemeDetailPanel({ config, categoryName, onStatusChange, onToggleRecommended, onToggleFavorite, onToggleShared, onRename, onMove, onMoveUp, onMoveDown, onClose, displayOrder, onEditInEditor }: Props) {
  const themeEntry = ALL_THEMES.find(t => t.value === config.theme_key);
  const colors: [string, string, string] = themeEntry?.colors ?? ['#1a1a2e', '#16213e', '#0f3460'];
  const meta = STATUS_META[config.status];

  return (
    <div className="flex flex-col rounded-2xl lg:rounded-none overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)' }}>
      <div className="p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-white/35 uppercase tracking-[0.15em]">Apercu du theme</span>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl overflow-hidden shadow-lg">
          <ThemePreview colors={colors} />
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white/90 truncate">{config.label}</h3>
            <p className="text-[10px] font-medium mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {categoryName}{themeEntry?.description ? ` \u00b7 ${themeEntry.description}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {config.is_shared && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold" style={{ background: 'rgba(34,211,238,0.10)', border: '1px solid rgba(34,211,238,0.25)', color: '#22d3ee' }}>
                <Share2 className="w-2.5 h-2.5" />
                Partage
              </span>
            )}
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold" style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}>
              {meta.label}
            </span>
          </div>
        </div>

        <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">Categorie</span>
          <div className="mt-2 flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-white/[0.06] text-white/50">{categoryName}</span>
            <button onClick={onMove} className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-blue-400/70 hover:text-blue-400 bg-blue-500/[0.06] hover:bg-blue-500/[0.10] border border-blue-500/10 hover:border-blue-500/20 transition-all flex items-center gap-1">
              <FolderInput className="w-3 h-3" />
              Deplacer
            </button>
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">Statut</span>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {(['visible', 'hidden', 'rework', 'premium'] as ThemeStatus[]).map(s => {
              const m = STATUS_META[s];
              const isActive = config.status === s;
              return (
                <button key={s} onClick={() => onStatusChange(s)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all" style={{ background: isActive ? `${m.color}12` : 'rgba(255,255,255,0.02)', border: isActive ? `1px solid ${m.border}` : '1px solid rgba(255,255,255,0.04)', color: isActive ? m.color : 'rgba(255,255,255,0.40)' }}>
                  {s === 'visible' && <Eye className="w-3.5 h-3.5 flex-shrink-0" />}
                  {s === 'hidden' && <EyeOff className="w-3.5 h-3.5 flex-shrink-0" />}
                  {s === 'rework' && <Wrench className="w-3.5 h-3.5 flex-shrink-0" />}
                  {s === 'premium' && <Crown className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span className="truncate">{m.label}</span>
                  {isActive && <Check className="w-3 h-3 ml-auto flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">Ordre d'affichage</span>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={onMoveUp} className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70">
              <ChevronUp className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-white/60 px-4 py-2 rounded-xl bg-white/[0.04] min-w-[48px] text-center tabular-nums">{displayOrder}</span>
            <button onClick={onMoveDown} className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

        <div className="flex flex-col gap-2">
          {onEditInEditor && (
            <ActionBtn icon={<Paintbrush className="w-3.5 h-3.5" />} label="Modifier dans l'Editeur" onClick={onEditInEditor} accent />
          )}
          <ActionBtn icon={<Pencil className="w-3.5 h-3.5" />} label="Renommer" onClick={onRename} />
          <ActionBtn icon={<FolderInput className="w-3.5 h-3.5" />} label="Deplacer vers..." onClick={onMove} />
          <ActionBtn icon={<Award className="w-3.5 h-3.5" />} label={config.is_recommended ? 'Retirer recommande' : 'Recommander'} onClick={onToggleRecommended} accent={config.is_recommended} />
          <ActionBtn icon={<Star className="w-3.5 h-3.5" />} label={config.is_favorite ? 'Retirer favori' : 'Marquer favori'} onClick={onToggleFavorite} accent={config.is_favorite} />
          <ActionBtn icon={<Share2 className="w-3.5 h-3.5" />} label={config.is_shared ? 'Retirer le partage' : 'Partager a tous'} onClick={onToggleShared} accent={config.is_shared} />
          {config.status !== 'hidden' ? (
            <ActionBtn icon={<EyeOff className="w-3.5 h-3.5" />} label="Masquer le theme" onClick={() => onStatusChange('hidden')} danger />
          ) : (
            <ActionBtn icon={<Eye className="w-3.5 h-3.5" />} label="Rendre visible" onClick={() => onStatusChange('visible')} />
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, danger, accent }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; accent?: boolean }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:scale-[1.01] active:scale-[0.99]" style={{
      background: danger ? 'rgba(239,68,68,0.08)' : accent ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
      border: danger ? '1px solid rgba(239,68,68,0.20)' : accent ? '1px solid rgba(59,130,246,0.20)' : '1px solid rgba(255,255,255,0.06)',
      color: danger ? '#f87171' : accent ? '#60a5fa' : 'rgba(255,255,255,0.55)',
    }}>
      {icon}
      {label}
    </button>
  );
}
