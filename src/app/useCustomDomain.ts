const KNOWN_PATTERNS = [
  'localhost', '127.0.0.1', '.supabase.co', '.vercel.app',
  '.webcontainer.io', '.local-credentialless.webcontainer.io',
  '.local.webcontainer.io', '.bolt.new', '.stackblitz.io',
  '.cloudworkstations.dev',
];

function isKnownHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  for (const p of KNOWN_PATTERNS) {
    if (hostname.endsWith(p)) return true;
  }
  return hostname.includes('localhost') || hostname.includes('webcontainer') || hostname.includes('stackblitz');
}

export function useCustomDomain() {
  const hostname = window.location.hostname;
  const customDomain = isKnownHost(hostname) ? null : hostname;
  return { customDomain };
}
