import { useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export default function GlassBackgroundLayer() {
  const { theme, glassConfig } = useTheme();

  const styles = useMemo(() => {
    if (theme !== 'glass') return null;

    const { imageUrl, overlayMode, overlayOpacity, brightness, saturation, backgroundBlur } = glassConfig;
    const isDark = overlayMode === 'dark';
    const blurPx = backgroundBlur ?? 3;
    const bright = brightness ?? 0.55;
    const sat = saturation ?? 0.6;
    const opacity = overlayOpacity ?? 0.65;

    const imgFilter = `blur(${blurPx}px) brightness(${bright}) saturate(${sat})`;

    const showOverlay = opacity > 0.01;
    const overlayGradient = showOverlay
      ? isDark
        ? `linear-gradient(180deg, rgba(5,5,18,${opacity}) 0%, rgba(5,5,18,${opacity * 0.88}) 40%, rgba(5,5,18,${opacity * 0.95}) 70%, rgba(5,5,18,${opacity}) 100%)`
        : `linear-gradient(180deg, rgba(230,232,240,${opacity}) 0%, rgba(235,238,248,${opacity * 0.88}) 40%, rgba(230,232,240,${opacity * 0.95}) 70%, rgba(225,228,238,${opacity}) 100%)`
      : 'none';

    const fallbackBg = isDark
      ? 'linear-gradient(145deg, #0a0c1a 0%, #141428 40%, #0e1020 100%)'
      : 'linear-gradient(145deg, #c8c4be 0%, #a8a298 40%, #928c82 100%)';

    return { imageUrl, imgFilter, overlayGradient, fallbackBg, showOverlay };
  }, [theme, glassConfig]);

  if (!styles) return null;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      {styles.imageUrl ? (
        <img
          src={styles.imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: styles.imgFilter, transform: 'scale(1.05)' }}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: styles.fallbackBg }} />
      )}
      {styles.showOverlay && (
        <div className="absolute inset-0" style={{ background: styles.overlayGradient }} />
      )}
    </div>
  );
}
