import { useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';

export interface OrphanScanResult {
  orphanIds: string[];
  softDeletedIds: string[];
  totalActive: number;
  totalSoftDeleted: number;
}

export interface LiveCheckResult {
  clientMessagesActive: number;
  clientMessagesDeleted: number;
  vendorAdminMessagesActive: number;
  messages: number;
  conversations: number;
  leads: number;
  vendors: number;
}

type CleanupStatus = 'idle' | 'scanning' | 'scanned' | 'deleting' | 'done' | 'error';

export function useOrphanCleanup() {
  const [status, setStatus] = useState<CleanupStatus>('idle');
  const [scanResult, setScanResult] = useState<OrphanScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletedCount, setDeletedCount] = useState(0);
  const [remainingCount, setRemainingCount] = useState<number | null>(null);
  const [liveCheck, setLiveCheck] = useState<LiveCheckResult | null>(null);
  const [liveCheckLoading, setLiveCheckLoading] = useState(false);

  const scan = useCallback(async () => {
    setStatus('scanning');
    setError(null);
    setScanResult(null);
    setDeletedCount(0);

    try {
      const [{ data: activeMessages }, { data: softDeletedMessages }] = await Promise.all([
        supabase
          .from('client_messages')
          .select('id, client_auth_id')
          .or('deleted.is.null,deleted.eq.false'),
        supabase
          .from('client_messages')
          .select('id')
          .eq('deleted', true),
      ]);

      const active = activeMessages ?? [];
      const softDeleted = softDeletedMessages ?? [];

      if (active.length === 0) {
        setScanResult({
          orphanIds: [],
          softDeletedIds: softDeleted.map(m => m.id),
          totalActive: 0,
          totalSoftDeleted: softDeleted.length,
        });
        setStatus('scanned');
        return;
      }

      const uniqueAuthIds = [...new Set(
        active.map((m: { client_auth_id: string }) => m.client_auth_id).filter(Boolean)
      )];

      let linkedAuthIds: string[] = [];
      if (uniqueAuthIds.length > 0) {
        const { data: leadsData } = await supabase
          .from('leads')
          .select('id, data')
          .eq('actif', true);

        const leadAuthIds = new Set(
          (leadsData ?? []).map((l: { id: string; data: Record<string, string> }) =>
            l.data['AuthId'] ?? l.data['auth_id'] ?? l.id
          )
        );
        linkedAuthIds = uniqueAuthIds.filter(id => leadAuthIds.has(id));
      }

      const linkedSet = new Set(linkedAuthIds);
      const orphanIds = active
        .filter((m: { client_auth_id: string }) => !linkedSet.has(m.client_auth_id))
        .map((m: { id: string }) => m.id);

      setScanResult({
        orphanIds,
        softDeletedIds: softDeleted.map(m => m.id),
        totalActive: active.length,
        totalSoftDeleted: softDeleted.length,
      });
      setStatus('scanned');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'analyse.');
      setStatus('error');
    }
  }, []);

  const verifyDeletion = useCallback(async (): Promise<number> => {
    const { count } = await supabase
      .from('client_messages')
      .select('*', { count: 'exact', head: true })
      .or('deleted.is.null,deleted.eq.false');
    return count ?? 0;
  }, []);

  const deleteOrphans = useCallback(async () => {
    if (!scanResult || scanResult.orphanIds.length === 0) return;
    setStatus('deleting');
    setError(null);

    try {
      const ids = scanResult.orphanIds;
      const batchSize = 200;
      let deleted = 0;

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const { error: err } = await supabase
          .from('client_messages')
          .delete()
          .in('id', batch);
        if (err) throw new Error(err.message);
        deleted += batch.length;
      }

      const remaining = await verifyDeletion();
      setDeletedCount(deleted);
      setRemainingCount(remaining);
      setScanResult(null);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la suppression.');
      setStatus('error');
    }
  }, [scanResult, verifyDeletion]);

  const deleteSoftDeleted = useCallback(async () => {
    if (!scanResult || scanResult.softDeletedIds.length === 0) return;
    setStatus('deleting');
    setError(null);

    try {
      const ids = scanResult.softDeletedIds;
      const batchSize = 200;
      let deleted = 0;

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const { error: err } = await supabase
          .from('client_messages')
          .delete()
          .in('id', batch);
        if (err) throw new Error(err.message);
        deleted += batch.length;
      }

      const remaining = await verifyDeletion();
      setDeletedCount(prev => prev + deleted);
      setRemainingCount(remaining);
      setScanResult(prev => prev ? { ...prev, softDeletedIds: [], totalSoftDeleted: 0 } : null);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la suppression.');
      setStatus('error');
    }
  }, [scanResult, verifyDeletion]);

  const performLiveCheck = useCallback(async () => {
    setLiveCheckLoading(true);
    try {
      const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
        supabase.from('client_messages').select('*', { count: 'exact', head: true }).or('deleted.is.null,deleted.eq.false'),
        supabase.from('client_messages').select('*', { count: 'exact', head: true }).eq('deleted', true),
        supabase.from('vendor_admin_messages').select('*', { count: 'exact', head: true }).or('deleted.is.null,deleted.eq.false'),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('conversations').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('vendors').select('*', { count: 'exact', head: true }),
      ]);
      setLiveCheck({
        clientMessagesActive: r1.count ?? 0,
        clientMessagesDeleted: r2.count ?? 0,
        vendorAdminMessagesActive: r3.count ?? 0,
        messages: r4.count ?? 0,
        conversations: r5.count ?? 0,
        leads: r6.count ?? 0,
        vendors: r7.count ?? 0,
      });
    } catch {
      setLiveCheck(null);
    }
    setLiveCheckLoading(false);
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setScanResult(null);
    setError(null);
    setDeletedCount(0);
    setRemainingCount(null);
    setLiveCheck(null);
  }, []);

  return { status, scanResult, error, deletedCount, remainingCount, liveCheck, liveCheckLoading, scan, deleteOrphans, deleteSoftDeleted, performLiveCheck, reset };
}
