import { useEffect, useRef, useState } from 'react';
import type { ThemeTokens } from '../../lib/themeTokensTypes';

/** Une conversation non lue, quel que soit le panel (Groupe, Societe, Talvex). */
export interface BubbleEntry {
  id: string;
  name: string;
  /**
   * Identite secondaire, plus discrete que `name` — par exemple le nom de la
   * Societe sous le nom de son responsable. Optionnel : un panel qui ne le
   * fournit pas rend exactement la meme ligne qu'avant.
   */
  subtitle?: string;
  preview: string;
  at: string;
  unread: number;
}

function initialOf(name: string): string {
  const c = name.trim().charAt(0);
  return c ? c.toUpperCase() : '?';
}

function hourOf(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Badge numerique. La valeur represente un nombre de CONVERSATIONS non lues,
 * jamais un nombre de messages. Petite animation d'echelle quand il augmente.
 */
export function NotifBadge({ count, className = '' }: { count: number; className?: string }) {
  const [pulse, setPulse] = useState(false);
  const prev = useRef(count);

  useEffect(() => {
    const grew = count > prev.current;
    prev.current = count;
    if (!grew) return;
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 220);
    return () => clearTimeout(timer);
  }, [count]);

  if (count <= 0) return null;

  return (
    <span
      className={`min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white flex-shrink-0 ${className}`}
      style={{
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        boxShadow: '0 2px 8px rgba(245,158,11,0.45)',
        transform: pulse ? 'scale(1.15)' : 'scale(1)',
        transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export type DropdownTokens = ThemeTokens['dropdown'];

/** Ligne de notification partagee par les panels Talvex, Groupe et Societe. */
export function BubbleRow({ name, subtitle, preview, at, unread, onClick, d }: {
  name: string; subtitle?: string; preview: string; at: string; unread: number;
  onClick: () => void; d: DropdownTokens;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors duration-150"
      style={{ background: 'transparent' }}
      onMouseEnter={e => { e.currentTarget.style.background = d.itemBgHover; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 2px 8px rgba(245,158,11,0.25)' }}
      >
        {initialOf(name)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold truncate" style={{ color: d.itemText }}>{name}</p>
          <span className="text-[10px] flex-shrink-0" style={{ color: d.itemTextHover }}>{hourOf(at)}</span>
        </div>
        {subtitle && (
          <p className="text-[10px] font-medium truncate" style={{ color: d.itemTextHover, opacity: 0.75 }}>{subtitle}</p>
        )}
        {preview && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: d.itemTextHover }}>{preview}</p>
        )}
        <p className="text-[10px] mt-0.5" style={{ color: d.itemTextHover }}>
          {unread} message{unread > 1 ? 's' : ''} non lu{unread > 1 ? 's' : ''}
        </p>
      </div>

      <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#f59e0b' }} />
    </button>
  );
}

interface Props {
  entries: BubbleEntry[];
  onEntryClick: (id: string) => void;
  tokens: ThemeTokens;
}

export default function MessageBubblePopover({ entries, onEntryClick, tokens }: Props) {
  const d = tokens.dropdown;

  return (
    <div
      className="fixed right-3 left-3 sm:left-auto sm:absolute sm:right-0 sm:w-80 top-14 sm:top-full sm:mt-2 rounded-2xl overflow-hidden z-50"
      style={{ background: d.bg, border: `1px solid ${d.border}`, boxShadow: d.shadow, backdropFilter: 'blur(16px)' }}
    >
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: `1px solid ${d.border}` }}>
        <p className="text-xs font-semibold" style={{ color: d.itemText }}>Messages non lus</p>
        <NotifBadge count={entries.length} />
      </div>

      <div className="max-h-72 overflow-y-auto py-1">
        {entries.length === 0 ? (
          <p className="px-4 py-6 text-xs text-center" style={{ color: d.itemText }}>Aucun message non lu</p>
        ) : entries.map(entry => (
          <BubbleRow
            key={entry.id}
            name={entry.name}
            subtitle={entry.subtitle}
            preview={entry.preview}
            at={entry.at}
            unread={entry.unread}
            d={d}
            onClick={() => onEntryClick(entry.id)}
          />
        ))}
      </div>
    </div>
  );
}
