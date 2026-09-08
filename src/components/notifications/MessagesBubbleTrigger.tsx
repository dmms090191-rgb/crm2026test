import { MessageSquare } from 'lucide-react';
import { NotifBadge } from './MessageBubblePopover';

/**
 * Capsule « Messages » de la topbar, partagee par les panels Talvex et Groupe.
 * Rendu unique : toute evolution visuelle s'applique aux deux en meme temps.
 */
export default function MessagesBubbleTrigger({ count, onClick, mutedColor, innerRef, vcStyle }: {
  count: number;
  onClick: () => void;
  mutedColor: string;
  innerRef?: React.RefObject<HTMLButtonElement | null>;
  vcStyle?: React.CSSProperties;
}) {
  const color = vcStyle?.color ?? (count > 0 ? '#f59e0b' : mutedColor);

  return (
    <button
      ref={innerRef as React.Ref<HTMLButtonElement>}
      onClick={onClick}
      className="relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl transition-all duration-200"
      style={{
        background: count > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.04)',
        border: `1px solid ${count > 0 ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.1)'}`,
        ...vcStyle,
      }}
    >
      <MessageSquare className="w-4 h-4 flex-shrink-0" style={{ color }} />
      <span className="text-[11px] font-medium hidden sm:inline" style={{ color }}>Messages</span>
      <NotifBadge count={count} />
    </button>
  );
}
