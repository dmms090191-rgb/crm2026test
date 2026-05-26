import type { GlassConfig } from '../../contexts/ThemeContext';

interface Props { config: GlassConfig; }

const BLUR_MAP = { low: '10px', medium: '16px', high: '24px' };
const CARD_ALPHA_DARK = { low: '0.55', medium: '0.68', high: '0.80' };
const CARD_ALPHA_LIGHT = { low: '0.42', medium: '0.58', high: '0.72' };

export default function GlassPreviewMockup({ config }: Props) {
  const blur = BLUR_MAP[config.blur];
  const isDark = config.overlayMode === 'dark';
  const cardAlpha = isDark ? CARD_ALPHA_DARK[config.cardTransparency] : CARD_ALPHA_LIGHT[config.cardTransparency];

  const bright = config.brightness ?? 0.55;
  const sat = config.saturation ?? 0.6;
  const opacity = config.overlayOpacity ?? 0.65;
  const bgBlur = config.backgroundBlur ?? 3;
  const imgFilter = `blur(${bgBlur}px) brightness(${bright}) saturate(${sat})`;

  const showOverlay = opacity > 0.01;
  const overlayGradient = showOverlay
    ? isDark
      ? `linear-gradient(180deg, rgba(5,5,18,${opacity}) 0%, rgba(5,5,18,${opacity * 0.88}) 40%, rgba(5,5,18,${opacity}) 100%)`
      : `linear-gradient(180deg, rgba(230,232,240,${opacity}) 0%, rgba(235,238,248,${opacity * 0.88}) 40%, rgba(225,228,238,${opacity}) 100%)`
    : 'none';

  const textColor = isDark ? '#f0f4ff' : '#111827';
  const mutedColor = isDark ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.35)';
  const cardBg = isDark ? `rgba(10,12,28,${cardAlpha})` : `rgba(255,255,255,${cardAlpha})`;
  const cardBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const sidebarBg = isDark ? 'rgba(8,10,22,0.72)' : 'rgba(22,26,40,0.78)';
  const accent = config.accentColor;

  const fallbackBg = isDark
    ? 'linear-gradient(145deg, #0a0c1a 0%, #141428 40%, #0e1020 100%)'
    : 'linear-gradient(145deg, #c8c4be 0%, #a8a298 40%, #928c82 100%)';

  const glass = (bg: string, extra?: React.CSSProperties): React.CSSProperties => ({
    background: bg,
    backdropFilter: `blur(${blur}) saturate(1.4)`,
    WebkitBackdropFilter: `blur(${blur}) saturate(1.4)`,
    border: `1px solid ${cardBorder}`,
    ...extra,
  });

  return (
    <div
      className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative"
      style={{ border: `1px solid ${cardBorder}`, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
    >
      {config.imageUrl ? (
        <img src={config.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: imgFilter, transform: 'scale(1.05)' }} />
      ) : (
        <div className="absolute inset-0" style={{ background: fallbackBg }} />
      )}
      {showOverlay && <div className="absolute inset-0" style={{ background: overlayGradient }} />}

      <div className="absolute inset-0 flex">
        <div className="w-[26%] h-full p-2.5 flex flex-col gap-2" style={glass(sidebarBg, { borderRight: `1px solid ${cardBorder}`, borderRadius: 0 })}>
          <div className="h-2 w-[60%] rounded-full" style={{ background: accent }} />
          <div className="mt-2 space-y-1.5">
            {[0.7, 0.5, 0.6, 0.4, 0.55].map((w, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: i === 0 ? accent : mutedColor }} />
                <div className="h-1.5 rounded-full" style={{ width: `${w * 100}%`, background: i === 0 ? accent : mutedColor }} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="h-[12%] flex items-center justify-between px-3" style={glass(cardBg, { borderBottom: `1px solid ${cardBorder}`, borderRadius: 0 })}>
            <div className="h-1.5 w-[25%] rounded-full" style={{ background: mutedColor }} />
            <div className="w-4 h-4 rounded-full" style={{ background: `${accent}40`, border: `1px solid ${accent}` }} />
          </div>

          <div className="flex-1 p-3 space-y-2.5">
            <div className="flex gap-2">
              {[accent, '#34d399', '#3b82f6'].map((c, i) => (
                <div key={i} className="flex-1 rounded-lg p-2" style={glass(cardBg)}>
                  <div className="h-1 w-[40%] rounded-full mb-1.5" style={{ background: mutedColor }} />
                  <div className="h-2.5 w-[55%] rounded-full" style={{ background: c }} />
                </div>
              ))}
            </div>

            <div className="rounded-lg overflow-hidden" style={glass(cardBg)}>
              <div className="px-2 py-1.5" style={{ borderBottom: `1px solid ${cardBorder}` }}>
                <div className="flex gap-3">
                  {[0.2, 0.3, 0.15, 0.25].map((w, i) => (
                    <div key={i} className="h-1 rounded-full" style={{ width: `${w * 100}%`, background: mutedColor }} />
                  ))}
                </div>
              </div>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="px-2 py-1.5 flex gap-3" style={{ borderBottom: i < 3 ? `1px solid ${cardBorder}` : 'none' }}>
                  {[0.18, 0.28, 0.12, 0.22].map((w, j) => (
                    <div key={j} className="h-1 rounded-full" style={{ width: `${w * 100}%`, background: j === 0 ? textColor : mutedColor, opacity: 0.7 }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
