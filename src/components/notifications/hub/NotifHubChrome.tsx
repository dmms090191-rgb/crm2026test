import { useState, type ReactNode } from 'react';
import { Bell, ChevronLeft, X, EyeOff, Check, RotateCcw, ArrowUpDown } from 'lucide-react';
import type { ThemeTokens } from '../../../lib/themeTokensTypes';

/**
 * Habillage du hub Notifications : la cloche de la topbar et l'en-tete du modal.
 *
 * Extrait tel quel du panel Societe pour que le panel Commercial affiche
 * exactement la meme chose — meme forme, meme taille, memes couleurs, meme
 * badge. Aucune valeur n'a ete retouchee au passage : la categorie selectionnee
 * est simplement devenue une `string`, pour ne plus dependre des categories
 * d'un panel en particulier.
 */

export function BellButton({ open, hovered, setHovered, totalCount, onClick }: {
  open: boolean; hovered: boolean; setHovered: (v: boolean) => void;
  totalCount: number; onClick: () => void;
}) {
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all duration-200"
      style={{
        background: open ? 'rgba(14,165,233,0.12)' : hovered ? 'rgba(14,165,233,0.08)' : 'rgba(14,165,233,0.04)',
        border: `1px solid ${open ? 'rgba(14,165,233,0.25)' : hovered ? 'rgba(14,165,233,0.18)' : 'rgba(14,165,233,0.10)'}`,
        boxShadow: open ? '0 0 12px rgba(14,165,233,0.08)' : 'none',
      }}>
      <Bell className="w-4 h-4 flex-shrink-0" style={{ color: '#0ea5e9' }} />
      <span className="text-[11px] font-medium hidden lg:inline" style={{ color: '#0ea5e9' }}>Notifications</span>
      {totalCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 0 8px rgba(239,68,68,0.5), 0 1px 3px rgba(0,0,0,0.2)' }}>
          {totalCount > 99 ? '99+' : totalCount}
        </span>
      )}
    </button>
  );
}

export function NotifHeader({ t, selected, setSelected, selectedLabel, totalCount, onClose,
  canHide, hideEditMode, onToggleHideMode,
  canReorder, reorderMode, onStartReorder, onConfirmReorder, onCancelReorder, onResetDefault,
}: {
  t: ThemeTokens; selected: string | null; setSelected: (v: string | null) => void;
  selectedLabel: string; totalCount: number; onClose: () => void;
  canHide?: boolean; hideEditMode?: boolean; onToggleHideMode?: () => void;
  canReorder?: boolean; reorderMode?: boolean;
  onStartReorder?: () => void; onConfirmReorder?: () => void;
  onCancelReorder?: () => void; onResetDefault?: () => void;
}) {
  const [btnHovered, setBtnHovered] = useState('');

  return (
    <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${t.dropdown.border}` }}>
      {selected && (
        <button onClick={() => setSelected(null)}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
          style={{ color: t.dropdown.itemText }}>
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold tracking-wide" style={{ color: t.dropdown.itemTextHover }}>
          {selected ? selectedLabel : 'Notifications'}
        </p>
        {!selected && totalCount > 0 && !hideEditMode && !reorderMode && (
          <p className="text-[11px] mt-0.5" style={{ color: t.dropdown.itemText }}>
            {totalCount} non lue{totalCount > 1 ? 's' : ''}
          </p>
        )}
        {hideEditMode && (
          <p className="text-[11px] mt-0.5" style={{ color: '#f59e0b' }}>
            Cliquez sur une carte pour la masquer ou l'afficher
          </p>
        )}
        {reorderMode && (
          <p className="text-[11px] mt-0.5" style={{ color: '#0ea5e9' }}>
            Glissez ou utilisez les fleches pour reorganiser
          </p>
        )}
      </div>

      {reorderMode ? (
        <div className="flex items-center gap-1.5">
          <HdrBtn label="Par defaut" icon={<RotateCcw className="w-3.5 h-3.5" />}
            bg="rgba(148,163,184,0.08)" border="rgba(148,163,184,0.15)" color="#94a3b8"
            hoverBg="rgba(148,163,184,0.14)" hoverBorder="rgba(148,163,184,0.25)"
            hovered={btnHovered === 'reset'} setHovered={v => setBtnHovered(v ? 'reset' : '')}
            onClick={onResetDefault} />
          <HdrBtn label="Valider" icon={<Check className="w-3.5 h-3.5" />}
            bg="rgba(34,197,94,0.10)" border="rgba(34,197,94,0.20)" color="#22c55e"
            hoverBg="rgba(34,197,94,0.15)" hoverBorder="rgba(34,197,94,0.35)"
            hovered={btnHovered === 'confirm'} setHovered={v => setBtnHovered(v ? 'confirm' : '')}
            onClick={onConfirmReorder} />
          <HdrBtn label="Annuler" icon={<X className="w-3.5 h-3.5" />}
            bg="rgba(248,113,113,0.08)" border="rgba(248,113,113,0.20)" color="#f87171"
            hoverBg="rgba(248,113,113,0.14)" hoverBorder="rgba(248,113,113,0.30)"
            hovered={btnHovered === 'cancel'} setHovered={v => setBtnHovered(v ? 'cancel' : '')}
            onClick={onCancelReorder} />
        </div>
      ) : (
        <>
          {canReorder && (
            <HdrBtn label="Reorganiser" icon={<ArrowUpDown className="w-3.5 h-3.5" />}
              bg="rgba(14,165,233,0.06)" border="rgba(14,165,233,0.12)" color="#0ea5e9"
              hoverBg="rgba(14,165,233,0.12)" hoverBorder="rgba(14,165,233,0.25)"
              hovered={btnHovered === 'reorder'} setHovered={v => setBtnHovered(v ? 'reorder' : '')}
              onClick={onStartReorder} />
          )}
          {canHide && (
            <HdrBtn
              label={hideEditMode ? 'Terminer' : 'Masquer'}
              icon={hideEditMode ? <Check className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              bg={hideEditMode ? 'rgba(34,197,94,0.10)' : 'rgba(148,163,184,0.06)'}
              border={hideEditMode ? 'rgba(34,197,94,0.20)' : 'rgba(148,163,184,0.12)'}
              color={hideEditMode ? '#22c55e' : t.dropdown.itemText}
              hoverBg={hideEditMode ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.12)'}
              hoverBorder={hideEditMode ? 'rgba(34,197,94,0.35)' : 'rgba(148,163,184,0.25)'}
              hovered={btnHovered === 'hide'} setHovered={v => setBtnHovered(v ? 'hide' : '')}
              onClick={onToggleHideMode}
            />
          )}
          {totalCount > 0 && !selected && !hideEditMode && (
            <span className="flex items-center justify-center min-w-[24px] h-[24px] px-1.5 rounded-full text-[10px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 8px rgba(239,68,68,0.3)' }}>
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
        </>
      )}

      {!reorderMode && (
        <button onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10 ml-1"
          style={{ color: t.dropdown.itemText }}>
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function HdrBtn({ label, icon, bg, border, color, hoverBg, hoverBorder, hovered, setHovered, onClick }: {
  label: string; icon: ReactNode; bg: string; border: string; color: string;
  hoverBg: string; hoverBorder: string; hovered: boolean; setHovered: (v: boolean) => void;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200"
      style={{ background: hovered ? hoverBg : bg, border: `1px solid ${hovered ? hoverBorder : border}`, color }}>
      {icon}{label}
    </button>
  );
}
