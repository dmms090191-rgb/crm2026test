import type { getThemeTokens } from '../../lib/themeTokens';

export interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  deleted?: boolean;
  read?: boolean;
  created_at: string;
  vendor_auth_id?: string;
  client_auth_id?: string;
  vendor_id?: string;
  _pending?: boolean;
  _failed?: boolean;
}

export type UserRole = 'admin' | 'vendor' | 'client';

export interface ChatContact {
  id: string;
  displayName: string;
  subtitle?: string;
  initial: string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSender?: string;
}

export interface MessagingPanelProps {
  contacts: ChatContact[];
  selectedContactId: string | null;
  onSelectContact: (id: string) => void;
  messages: ChatMessage[];
  currentRole: UserRole;
  currentUserId: string;
  displayName: string;
  accentColor: string;
  accentRgb: string;
  onSendMessage: (content: string, file?: { url: string; name: string; type: string }) => Promise<void>;
  onDeleteMessage: (id: string) => Promise<void>;
  onResetChat?: () => Promise<void>;
  isAdmin?: boolean;
  loading: boolean;
  contactLoading?: boolean;
  returnContactId?: string | null;
  onReturnClick?: () => void;
  sidebarSelectable?: boolean;
  sidebarSelectMode?: boolean;
  onSidebarToggleSelectMode?: () => void;
  sidebarSelectedIds?: Set<string>;
  onSidebarToggleSelect?: (id: string) => void;
  onSidebarSelectAll?: (all: boolean) => void;
  onSidebarDeleteSelected?: () => void;
}

export const SENDER_STYLES: Record<string, { gradient: string; glow: string; bubbleGradient: string; bubbleSolid: (tokens: ReturnType<typeof getThemeTokens>) => React.CSSProperties }> = {
  admin: {
    gradient: 'linear-gradient(135deg,#0ea5e9,#2563eb)',
    glow: 'rgba(14,165,233,0.35)',
    bubbleGradient: 'linear-gradient(135deg,#0ea5e9,#2563eb)',
    bubbleSolid: (tokens) => ({ background: tokens.chat.messageBubbleOther, border: `1px solid ${tokens.chat.border}` }),
  },
  vendor: {
    gradient: 'linear-gradient(135deg,#0ea5e9,#22d3ee)',
    glow: 'rgba(34,211,238,0.35)',
    bubbleGradient: 'linear-gradient(135deg,#0ea5e9,#22d3ee)',
    bubbleSolid: (tokens) => ({ background: tokens.chat.messageBubbleOther, border: `1px solid ${tokens.chat.border}` }),
  },
  client: {
    gradient: 'linear-gradient(135deg,#34d399,#059669)',
    glow: 'rgba(52,211,153,0.35)',
    bubbleGradient: 'linear-gradient(135deg,#34d399,#059669)',
    bubbleSolid: (tokens) => ({ background: tokens.chat.messageBubbleOther, border: `1px solid ${tokens.chat.border}` }),
  },
};

export const SENDER_LABELS: Record<string, string> = {
  admin: 'Admin',
  vendor: 'Vendeur',
  client: 'Client',
};

export function formatTime(iso: string, tz?: string) {
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };
  if (tz) options.timeZone = tz;
  return new Date(iso).toLocaleString('fr-FR', options);
}
