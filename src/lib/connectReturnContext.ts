const STORAGE_KEY = 'crm_connect_return_context';
const CHAT_RETURN_KEY = 'crm_chat_return_context';

export interface ConnectReturnContext {
  fromRole: 'admin' | 'vendor';
  fromTab: string;
  leadId?: string;
  vendorId?: string;
  scrollY: number;
  timestamp: number;
}

export function saveConnectReturnContext(ctx: Omit<ConnectReturnContext, 'timestamp'>) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...ctx, timestamp: Date.now() }));
}

export function consumeConnectReturnContext(forRole: 'admin' | 'vendor'): ConnectReturnContext | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const ctx: ConnectReturnContext = JSON.parse(raw);
    if (ctx.fromRole !== forRole) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    return ctx;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export interface ChatReturnContext {
  source: 'crm';
  leadId: string;
  leadName: string;
  timestamp: number;
}

export function saveChatReturnContext(leadId: string, leadName: string) {
  const ctx: ChatReturnContext = { source: 'crm', leadId, leadName, timestamp: Date.now() };
  sessionStorage.setItem(CHAT_RETURN_KEY, JSON.stringify(ctx));
}

export function peekChatReturnContext(): ChatReturnContext | null {
  const raw = sessionStorage.getItem(CHAT_RETURN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(CHAT_RETURN_KEY);
    return null;
  }
}

export function consumeChatReturnContext(): ChatReturnContext | null {
  const raw = sessionStorage.getItem(CHAT_RETURN_KEY);
  if (!raw) return null;
  try {
    const ctx: ChatReturnContext = JSON.parse(raw);
    sessionStorage.removeItem(CHAT_RETURN_KEY);
    return ctx;
  } catch {
    sessionStorage.removeItem(CHAT_RETURN_KEY);
    return null;
  }
}
