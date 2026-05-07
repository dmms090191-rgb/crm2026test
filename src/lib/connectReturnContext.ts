const STORAGE_KEY = 'crm_connect_return_context';

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
