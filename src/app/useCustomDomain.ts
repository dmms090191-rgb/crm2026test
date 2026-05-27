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

function stripWww(hostname: string): string {
  return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
}

export function useCustomDomain() {
  const [customDomainSlug, setCustomDomainSlug] = useState<string | null>(null);
  const [customDomainCompanyId, setCustomDomainCompanyId] = useState<string | null>(null);
  const [customDomainNotFound, setCustomDomainNotFound] = useState(false);
  const [checking, setChecking] = useState(false);
  const checkedRef = useRef(false);

  const isCustomDomainHost = !isKnownHost(window.location.hostname);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    const hostname = stripWww(window.location.hostname);
    if (isKnownHost(hostname)) return;
    setChecking(true);
    getHomePageByDomain(hostname)
      .then(page => {
        if (page?.slug) {
          setCustomDomainSlug(page.slug);
          setCustomDomainCompanyId(page.company_id);
        } else {
          setCustomDomainNotFound(true);
        }
      })
      .catch(() => setCustomDomainNotFound(true))
      .finally(() => setChecking(false));
  }, []);

  return {
    customDomainSlug,
    customDomainCompanyId,
    customDomainNotFound,
    checking: checking && isCustomDomainHost,
  };
}
