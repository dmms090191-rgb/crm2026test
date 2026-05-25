import { useState, useCallback, useMemo } from 'react';
import type { MobileColumnConfig, MobileColumnEntry, MobileCardStyle } from './mobileColumnTypes';
import { autoLayoutMobile, mergeNewColumns, migrateLegacyRoles } from './mobileColumnTypes';
import type { ColumnDef } from './useColumnOrder';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function persistJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export interface UseColumnOrderMobileReturn {
  mobileOrder: MobileColumnEntry[];
  cardStyle: MobileCardStyle;
  saveMobile: (config: MobileColumnConfig) => void;
  resetMobile: () => void;
}

export default function useColumnOrderMobile(
  storageKey: string,
  columns: ColumnDef[],
): UseColumnOrderMobileReturn {
  const mobileStorageKey = `${storageKey}_mobile`;
  const allKeys = useMemo(() => columns.map(c => c.key), [columns]);
  const fieldTypes = useMemo(() => new Map(columns.map(c => [c.key, c.fieldType])), [columns]);

  const [mobileOrder, setMobileOrder] = useState<MobileColumnEntry[]>(() => {
    const saved = loadJson<MobileColumnEntry[] | null>(`${mobileStorageKey}_order`, null);
    if (saved && saved.length > 0) {
      const migrated = migrateLegacyRoles(saved);
      return mergeNewColumns(migrated, allKeys, fieldTypes);
    }
    return autoLayoutMobile(allKeys, fieldTypes);
  });

  const [cardStyle, setCardStyle] = useState<MobileCardStyle>(() =>
    loadJson<MobileCardStyle>(`${mobileStorageKey}_style`, 'comfort')
  );

  const saveMobile = useCallback((config: MobileColumnConfig) => {
    setMobileOrder(config.order);
    setCardStyle(config.cardStyle);
    persistJson(`${mobileStorageKey}_order`, config.order);
    persistJson(`${mobileStorageKey}_style`, config.cardStyle);
  }, [mobileStorageKey]);

  const resetMobile = useCallback(() => {
    const fresh = autoLayoutMobile(allKeys, fieldTypes);
    setMobileOrder(fresh);
    setCardStyle('comfort');
    persistJson(`${mobileStorageKey}_order`, fresh);
    persistJson(`${mobileStorageKey}_style`, 'comfort');
  }, [allKeys, fieldTypes, mobileStorageKey]);

  return { mobileOrder, cardStyle, saveMobile, resetMobile };
}
