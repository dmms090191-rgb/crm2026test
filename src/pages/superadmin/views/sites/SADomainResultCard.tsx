import { useState } from 'react';
import { Loader2, ShoppingCart, Check, XCircle, CheckCircle2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { type DomainResult, formatPrice } from './domainTypes';

interface CardProps {
  result: DomainResult;
  onBuy: (domain: string) => void;
  purchased?: boolean;
}

export function DomainTopCard({ result, onBuy, purchased }: CardProps) {
  const t = useThemeTokens();
  const [hovered, setHovered] = useState(false);
  const { domain, available, price, loading } = result;
  const isAvailable = available === true && price;
  const isUnavailable = available === false;

  const dotIdx = domain.indexOf('.');
  const baseName = dotIdx > 0 ? domain.substring(0, dotIdx) : domain;
  const tld = dotIdx > 0 ? domain.substring(dotIdx) : '';

  return (
    <div
      className="relative rounded-xl p-4 flex flex-col justify-between transition-all duration-200"
      style={{
        background: t.card.bg,
        border: `1px solid ${hovered && isAvailable ? 'rgba(14,165,233,0.4)' : t.surface.border}`,
        opacity: isUnavailable ? 0.45 : 1,
        boxShadow: hovered && isAvailable ? '0 4px 20px rgba(14,165,233,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        transform: hovered && isAvailable ? 'translateY(-1px)' : 'none',
        minHeight: 120,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="min-w-0">
        <p className="text-sm font-bold truncate leading-tight" style={{ color: t.text.primary }}>
          {baseName}<span style={{ color: '#0ea5e9' }}>{tld}</span>
        </p>

        {loading && (
          <div className="flex items-center gap-1.5 mt-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: t.text.tertiary }} />
            <span className="text-[10px]" style={{ color: t.text.tertiary }}>Verification...</span>
          </div>
        )}

        {isAvailable && (
          <>
            <div className="flex items-center gap-1 mt-2">
              <CheckCircle2 className="w-3 h-3" style={{ color: '#10b981' }} />
              <span className="text-[10px] font-semibold" style={{ color: '#10b981' }}>Disponible</span>
            </div>
            <p className="text-sm font-bold mt-1" style={{ color: t.text.primary }}>
              {formatPrice(price.purchase.displayPrice, price.currency, price.years)}
            </p>
          </>
        )}

        {isUnavailable && (
          <div className="flex items-center gap-1 mt-2.5">
            <XCircle className="w-3 h-3" style={{ color: t.text.tertiary }} />
            <span className="text-[10px] font-medium" style={{ color: t.text.tertiary }}>Indisponible</span>
          </div>
        )}

        {result.yearsWarning && (
          <p className="text-[10px] font-medium mt-2.5" style={{ color: '#f59e0b' }}>Duree non disponible</p>
        )}
      </div>

      <div className="flex justify-end mt-3">
        {isAvailable && !purchased && (
          <button
            onClick={() => onBuy(domain)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: hovered ? '#0ea5e9' : 'rgba(14,165,233,0.1)',
              color: hovered ? '#fff' : '#0ea5e9',
              border: '1px solid rgba(14,165,233,0.2)',
            }}
          >
            <ShoppingCart className="w-3 h-3" />
            <span className="hidden sm:inline">Acheter</span>
          </button>
        )}
        {purchased && (
          <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#10b981' }}>
            <Check className="w-3.5 h-3.5" /> Achete
          </span>
        )}
      </div>
    </div>
  );
}

export function DomainResultRow({ result, onBuy, purchased }: CardProps) {
  const t = useThemeTokens();
  const [hovered, setHovered] = useState(false);
  const { domain, available, price, loading } = result;
  const isAvailable = available === true && price;
  const isUnavailable = available === false;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors duration-150"
      style={{
        borderBottom: `1px solid ${t.surface.borderLight}`,
        background: hovered ? t.surface.hover : 'transparent',
        opacity: isUnavailable ? 0.45 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <p className="text-xs font-semibold flex-1 min-w-0 truncate" style={{ color: t.text.primary }}>
        {domain}
      </p>

      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" style={{ color: t.text.tertiary }} />}

      {isAvailable && (
        <span className="text-[11px] font-bold flex-shrink-0 tabular-nums" style={{ color: t.text.primary }}>
          {formatPrice(price.purchase.displayPrice, price.currency, price.years)}
        </span>
      )}

      {isUnavailable && (
        <span className="flex items-center gap-1 text-[10px] font-medium flex-shrink-0" style={{ color: t.text.tertiary }}>
          <XCircle className="w-3 h-3" /> Indisponible
        </span>
      )}

      {result.yearsWarning && (
        <span className="text-[10px] font-medium flex-shrink-0" style={{ color: '#f59e0b' }}>N/A</span>
      )}

      <div className="flex-shrink-0 flex justify-end" style={{ minWidth: 80 }}>
        {isAvailable && !purchased ? (
          <button
            onClick={() => onBuy(domain)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200 hover:opacity-80 active:scale-95"
            style={{ background: 'rgba(14,165,233,0.08)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.15)' }}
          >
            <ShoppingCart className="w-3 h-3" /> Acheter
          </button>
        ) : purchased ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#10b981' }}>
            <Check className="w-3.5 h-3.5" /> Achete
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function DomainResultMobileCard({ result, onBuy, purchased }: CardProps) {
  const t = useThemeTokens();
  const { domain, available, price, loading } = result;
  const isAvailable = available === true && price;
  const isUnavailable = available === false;

  return (
    <div
      className="rounded-xl p-3.5 transition-all"
      style={{
        background: t.card.bg,
        border: `1px solid ${t.surface.border}`,
        opacity: isUnavailable ? 0.45 : 1,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold truncate min-w-0" style={{ color: t.text.primary }}>{domain}</p>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" style={{ color: t.text.tertiary }} />}
        {isAvailable && (
          <span className="flex items-center gap-1 text-[10px] font-semibold flex-shrink-0" style={{ color: '#10b981' }}>
            <CheckCircle2 className="w-3 h-3" /> Disponible
          </span>
        )}
        {isUnavailable && (
          <span className="text-[10px] font-medium flex-shrink-0" style={{ color: t.text.tertiary }}>Indisponible</span>
        )}
      </div>
      {isAvailable && (
        <div className="flex items-center justify-between mt-2.5 pt-2.5" style={{ borderTop: `1px solid ${t.surface.borderLight}` }}>
          <span className="text-sm font-bold" style={{ color: t.text.primary }}>
            {formatPrice(price.purchase.displayPrice, price.currency, price.years)}
          </span>
          {!purchased ? (
            <button
              onClick={() => onBuy(domain)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
              style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.2)' }}
            >
              <ShoppingCart className="w-3 h-3" /> Acheter
            </button>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#10b981' }}>
              <Check className="w-3.5 h-3.5" /> Achete
            </span>
          )}
        </div>
      )}
      {result.yearsWarning && (
        <p className="text-[10px] font-medium mt-2" style={{ color: '#f59e0b' }}>Duree non disponible pour cette extension</p>
      )}
    </div>
  );
}
