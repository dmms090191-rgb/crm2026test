import { useMemo } from 'react';

const CHECKER =
  'repeating-conic-gradient(rgba(255,255,255,0.06) 0% 25%, transparent 0% 50%) 0 0 / 12px 12px';

interface Props {
  svgContent: string;
  bgColor?: string | null;
}

export default function CalquerLogoSvgPreview({ svgContent, bgColor }: Props) {
  const blobUrl = useMemo(() => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    return URL.createObjectURL(blob);
  }, [svgContent]);

  const bgStyle = bgColor ? bgColor : CHECKER;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="p-3 flex items-center justify-center"
        style={{ background: bgStyle, minHeight: 140 }}
      >
        <img
          src={blobUrl}
          alt="SVG vectorise"
          className="max-w-full max-h-[140px] object-contain"
        />
      </div>
    </div>
  );
}
