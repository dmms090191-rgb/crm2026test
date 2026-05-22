import { useState } from 'react';
import { AlertTriangle, ShoppingCart, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { type DomainResult, type BuyResult, callRegistrar, formatDuration, safeFixed } from './domainTypes';

interface Props {
  result: DomainResult;
  homePageId: string;
  onClose: () => void;
  onPurchased: () => void;
}

export default function SADomainBuyConfirmModal({ result, homePageId, onClose, onPurchased }: Props) {
  const t = useThemeTokens();
  const price = result.price!;
  const domain = result.domain;

  const [confirmText, setConfirmText] = useState('');
  const [buying, setBuying] = useState(false);
  const [buyResult, setBuyResult] = useState<BuyResult | null>(null);
  const [error, setError] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);

  const matches = confirmText.trim().toLowerCase() === domain;

  const handleBuy = async () => {
    setBuying(true);
    setError('');
    try {
      const res: BuyResult = await callRegistrar('buy', {
        domain,
        home_page_id: homePageId,
        expectedPrice: price.purchase.vercelPrice,
        renewalPrice: price.renewal.vercelPrice,
      });
      if (res.error) { setError(res.error); setBuyResult(res); }
      else { setBuyResult(res); onPurchased(); }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBuying(false); }
  };

  const handleCheckStatus = async () => {
    if (!buyResult?.orderId) return;
    setCheckingStatus(true);
    setError('');
    try {
      const res = await callRegistrar('order-status', { orderId: buyResult.orderId });
      if (res.error) setError(res.error);
      else {
        setBuyResult(prev => prev ? { ...prev, vercelOrderStatus: res.currentStatus } : prev);
        if (res.currentStatus === 'completed') onPurchased();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setCheckingStatus(false); }
  };

  const purchased = buyResult?.success;
  const orderStatus = buyResult?.vercelOrderStatus;
  const isPurchasing = orderStatus === 'purchasing' || orderStatus === 'draft';
  const isCompleted = orderStatus === 'completed';
  const isFailed = orderStatus === 'failed';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: t.card.bg, border: `1px solid ${t.surface.border}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3" style={{ background: t.surface.primary, borderBottom: `1px solid ${t.surface.border}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <AlertTriangle className="w-5 h-5" style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: t.text.primary }}>Confirmer l'achat</p>
            <p className="text-[10px] font-medium" style={{ color: t.text.tertiary }}>Super Admin uniquement</p>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Warning */}
          <div className="px-3.5 py-2.5 rounded-xl text-[11px] font-medium leading-relaxed" style={{ background: 'rgba(245,158,11,0.06)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.12)' }}>
            Cette action va acheter reellement le domaine via Vercel. Cette operation est irreversible.
          </div>

          {/* Domain card */}
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${t.surface.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: t.surface.primary }}>
              <p className="text-sm font-bold" style={{ color: t.text.primary }}>{domain}</p>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.15)' }}>
                {formatDuration(price.years)}
              </span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: t.card.bg }}>
              <span className="text-[11px] font-medium" style={{ color: t.text.tertiary }}>Achat initial</span>
              <span className="text-base font-bold tabular-nums" style={{ color: t.text.primary }}>
                {safeFixed(price.purchase.displayPrice)} {price.currency}
              </span>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: `1px solid ${t.surface.borderLight}`, background: t.card.bg }}>
              <span className="text-[11px] font-medium" style={{ color: t.text.tertiary }}>Renouvellement</span>
              <span className="text-xs font-semibold tabular-nums" style={{ color: t.text.secondary }}>
                {safeFixed(price.renewal.displayPrice)} {price.currency} / {formatDuration(price.years)}
              </span>
            </div>
          </div>

          {purchased ? (
            <PurchaseStatus
              t={t} domain={domain} buyResult={buyResult!}
              isCompleted={isCompleted} isFailed={isFailed} isPurchasing={isPurchasing}
              checkingStatus={checkingStatus} onCheckStatus={handleCheckStatus}
            />
          ) : (
            <>
              {/* Confirm input */}
              <div>
                <p className="text-[11px] font-semibold mb-2" style={{ color: t.text.secondary }}>
                  Tapez le domaine pour confirmer :
                </p>
                <input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder={domain}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none transition-all"
                  style={{
                    background: t.surface.primary,
                    color: t.text.primary,
                    border: `1.5px solid ${matches ? '#10b981' : t.surface.border}`,
                    boxShadow: matches ? '0 0 0 3px rgba(16,185,129,0.1)' : 'none',
                  }}
                  autoFocus
                />
                {confirmText.length > 0 && !matches && (
                  <p className="text-[10px] mt-1.5" style={{ color: t.text.tertiary }}>
                    Attendu : <span className="font-mono font-bold" style={{ color: '#f59e0b' }}>{domain}</span>
                  </p>
                )}
              </div>

              {error && (
                <div className="px-3.5 py-2.5 rounded-xl text-[11px] font-medium" style={{ background: 'rgba(239,68,68,0.06)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.12)' }}>
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: t.surface.primary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleBuy}
                  disabled={!matches || buying}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-30 hover:opacity-90 active:scale-[0.98]"
                  style={{ background: '#0ea5e9', boxShadow: matches ? '0 2px 10px rgba(14,165,233,0.3)' : 'none' }}
                >
                  {buying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                  {buying ? 'Achat en cours...' : "Confirmer l'achat"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PurchaseStatus({ t, domain, buyResult, isCompleted, isFailed, isPurchasing, checkingStatus, onCheckStatus }: {
  t: ReturnType<typeof useThemeTokens>; domain: string; buyResult: BuyResult;
  isCompleted: boolean; isFailed: boolean; isPurchasing: boolean;
  checkingStatus: boolean; onCheckStatus: () => void;
}) {
  const statusColor = isCompleted ? '#10b981' : isFailed ? '#ef4444' : '#f59e0b';
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl" style={{
        background: `${statusColor}08`,
        border: `1px solid ${statusColor}20`,
      }}>
        {isCompleted && <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#10b981' }} />}
        {isFailed && <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#ef4444' }} />}
        {isPurchasing && <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" style={{ color: '#f59e0b' }} />}
        <div>
          <p className="text-xs font-bold" style={{ color: t.text.primary }}>
            {isCompleted ? 'Domaine achete' : isFailed ? "Echec de l'achat" : 'Achat en cours'}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: t.text.tertiary }}>
            {domain} — Commande : {buyResult.vercelOrderId || 'en attente'}
          </p>
        </div>
      </div>
      {buyResult.addedToProject && (
        <p className="text-[10px] font-semibold flex items-center gap-1" style={{ color: '#10b981' }}>
          <CheckCircle2 className="w-3 h-3" /> Domaine ajoute au projet Vercel
        </p>
      )}
      {isPurchasing && (
        <button
          onClick={onCheckStatus}
          disabled={checkingStatus}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-semibold transition-all disabled:opacity-50 hover:opacity-80"
          style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.15)' }}
        >
          {checkingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Verifier le statut
        </button>
      )}
    </div>
  );
}
