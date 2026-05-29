import { useThemeTokens } from '../../hooks/useThemeTokens';
import { CHECKER_BG } from './logoEditorHelpers';

interface Props {
  label: string;
  checkerBg?: boolean;
  bgColor?: string;
  children: React.ReactNode;
}

export default function LogoEditorPreviewPanel({ label, checkerBg, bgColor, children }: Props) {
  const t = useThemeTokens();
  return (
    <div>
      <p className="text-[11px] font-semibold mb-2" style={{ color: t.text.secondary }}>{label}</p>
      <div
        className="rounded-xl flex items-center justify-center p-5"
        style={{
          background: bgColor
            ? bgColor
            : checkerBg
              ? CHECKER_BG
              : t.surface.secondary,
          backgroundSize: checkerBg && !bgColor ? '14px 14px' : undefined,
          backgroundPosition: checkerBg && !bgColor ? '0 0, 0 7px, 7px -7px, -7px 0px' : undefined,
          border: `1px solid ${t.surface.border}`,
          minHeight: 170,
        }}
      >
        {children}
      </div>
    </div>
  );
}
