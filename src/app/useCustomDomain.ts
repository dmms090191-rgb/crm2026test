import { useState, useRef, useEffect } from 'react';
import { getHomePageByDomain } from '../lib/companyHomePages';

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
  const [customDomainSlug, setCustomDomainSlug] = useState<string | null>(null);
  const [customDomainNotFound, setCustomDomainNotFound] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    const hostname = window.location.hostname;
    if (isKnownHost(hostname)) return;
    getHomePageByDomain(hostname)
      .then(page => {
        if (page?.slug) setCustomDomainSlug(page.slug);
        else setCustomDomainNotFound(true);
      })
      .catch(() => setCustomDomainNotFound(false));
  }, []);

  return { customDomainSlug, customDomainNotFound };
}
