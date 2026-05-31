import type { SavedLogo } from './logoAiTypes';
import { CHECKER_BG, PREVIEW_BG_PRESETS } from './logoAiTypes';

export function makeBgStyle(
  url: string,
  previewBg: string | null,
  surfacePrimary: string,
  surfaceSecondary: string,
): React.CSSProperties {
  const isPng = url?.toLowerCase().includes('.png');
  if (previewBg !== null) return { background: previewBg };
  return {
    background: isPng
      ? CHECKER_BG
      : `linear-gradient(160deg, ${surfacePrimary}, ${surfaceSecondary})`,
    backgroundSize: isPng ? '20px 20px' : undefined,
    backgroundPosition: isPng ? '0 0,0 10px,10px -10px,-10px 0px' : undefined,
  };
}

export function isCustomUnsaved(previewBg: string | null, customColors: string[]): boolean {
  if (previewBg === null) return false;
  const upper = previewBg.toUpperCase();
  return (
    !PREVIEW_BG_PRESETS.some(p => p.value.toUpperCase() === upper) &&
    !customColors.some(c => c.toUpperCase() === upper)
  );
}

export async function downloadLogo(l: SavedLogo) {
  try {
    const res = await fetch(l.url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = l.file_name || 'logo';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch { /* silent */ }
}

export function formatLogoDate(createdAt: string) {
  const d = new Date(createdAt);
  const dateStr = `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  return dateStr;
}
