import { useEffect, useRef, useState } from 'react';
import { listSearchExtensions, searchSelectedExtensions } from '../../../../lib/domainSearch';
import { chunkExtensions, missingExtensions, toggleExtension } from '../../../../lib/domainFilterModel';
import { retryText, type SearchRow } from '../../../../lib/domainSearchModel';

/*
 * Filtre « Filtrer par extension » de la recherche de domaine.
 * - Catalogue : noms des extensions vendues, lus sur le serveur Talvex (search_extensions) a l'ouverture du menu,
 *   relus apres 10 min ; le serveur les sert depuis son cache du catalogue Hostinger (aucune liste en dur ici).
 * - Extension choisie pas encore verifiee : verification ciblee de CES extensions seulement (10 max par appel),
 *   regroupees apres un court delai pour que plusieurs cases cochees d'affilee partent en une seule requete.
 * - Le nom recherche n'est jamais modifie ; une nouvelle recherche annule les verifications en cours.
 */
export type CatalogStatus = 'idle' | 'loading' | 'ok' | 'error';

export interface ExtensionCatalogState {
  status: CatalogStatus;
  tlds: string[];
  message: string | null;
  loadedAt: number;
}

interface Options {
  companyId: string;
  /* Requete telle qu'elle a ete recherchee (« popolera » ou « popolera.fr »). */
  searched: string | null;
  /* 1re page reussie et aucune nouvelle recherche en cours. */
  ready: boolean;
  rows: SearchRow[];
  onRows: (rows: SearchRow[]) => void;
}

const IDLE: ExtensionCatalogState = { status: 'idle', tlds: [], message: null, loadedAt: 0 };
const CATALOG_REFRESH_MS = 10 * 60 * 1000;
const CHECK_DELAY_MS = 450;

export function useDomainExtensionFilter({ companyId, searched, ready, rows, onRows }: Options) {
  const [catalog, setCatalog] = useState<ExtensionCatalogState>(IDLE);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [failed, setFailed] = useState<string[]>([]);
  const [failMessage, setFailMessage] = useState<string | null>(null);
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const onRowsRef = useRef(onRows);
  onRowsRef.current = onRows;
  const catalogAbort = useRef<AbortController | null>(null);
  const checkAbort = useRef<AbortController | null>(null);

  const cancelChecks = () => {
    checkAbort.current?.abort();
    checkAbort.current = null;
    setPending([]);
    setFailed([]);
    setFailMessage(null);
  };

  useEffect(() => {
    catalogAbort.current?.abort();
    cancelChecks();
    setCatalog(IDLE);
    setSelected([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => () => {
    catalogAbort.current?.abort();
    checkAbort.current?.abort();
  }, []);

  const loadCatalog = async (force = false) => {
    const current = catalogRef.current;
    if (current.status === 'loading') return;
    if (!force && current.status === 'ok' && Date.now() - current.loadedAt < CATALOG_REFRESH_MS) return;
    catalogAbort.current?.abort();
    const controller = new AbortController();
    catalogAbort.current = controller;
    // Rafraichissement d'une liste deja affichee : elle reste visible pendant la relecture.
    if (current.status !== 'ok') setCatalog({ ...IDLE, status: 'loading' });
    try {
      const result = await listSearchExtensions(companyId, controller.signal);
      if (controller.signal.aborted) return;
      if (result.status === 'ok') {
        setCatalog({ status: 'ok', tlds: result.tlds, message: null, loadedAt: Date.now() });
      } else {
        setCatalog(previous => previous.status === 'ok' ? previous : {
          ...IDLE, status: 'error', message: `Impossible de charger les extensions. ${retryText(result.reason, result.retry_after_seconds)}`,
        });
      }
    } catch {
      // Lecture remplacee par une plus recente.
    }
  };

  const runChecks = async (query: string, tlds: string[]) => {
    if (!checkAbort.current) checkAbort.current = new AbortController();
    const controller = checkAbort.current;
    setPending(previous => [...previous, ...tlds]);
    const notChecked: string[] = [];
    let message: string | null = null;
    try {
      for (const chunk of chunkExtensions(tlds)) {
        if (message) {
          notChecked.push(...chunk);
          continue;
        }
        const page = await searchSelectedExtensions(companyId, query, chunk, controller.signal);
        if (controller.signal.aborted) return;
        if (page.status === 'ok') {
          onRowsRef.current(page.results);
          const received = new Set(page.results.map(row => row.tld));
          notChecked.push(...chunk.filter(tld => !received.has(tld)));
        } else {
          message = `Impossible de vérifier ces extensions pour le moment. ${retryText(page.reason, page.retry_after_seconds)}`;
          notChecked.push(...chunk);
        }
      }
    } catch {
      return; // Nouvelle recherche : verification abandonnee.
    }
    setPending(previous => previous.filter(tld => !tlds.includes(tld)));
    if (notChecked.length > 0) {
      setFailed(previous => [...new Set([...previous, ...notChecked])]);
      setFailMessage(message ?? "Certaines extensions n'ont pas pu être vérifiées.");
    }
  };

  // Verifie uniquement les extensions choisies qui ne sont pas encore chargees.
  useEffect(() => {
    if (!searched || !ready || selected.length === 0) return;
    const missing = missingExtensions(selected, rows, pending, failed);
    if (missing.length === 0) return;
    const timer = window.setTimeout(() => void runChecks(searched, missing), CHECK_DELAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searched, ready, selected, rows, pending, failed]);

  const toggle = (tld: string) => {
    setSelected(previous => toggleExtension(previous, tld));
    setFailed(previous => previous.filter(item => item !== tld));
  };

  const clear = () => {
    setSelected([]);
    setFailed([]);
    setFailMessage(null);
  };

  const retryFailed = () => {
    setFailed([]);
    setFailMessage(null);
  };

  return { catalog, selected, pending, failed, failMessage, loadCatalog, toggle, clear, retryFailed, cancelChecks };
}

export type DomainExtensionFilter = ReturnType<typeof useDomainExtensionFilter>;
