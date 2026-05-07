import { FileText } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { getSectionColor } from './docGeneraleTypes';

export function ContentRenderer({ content, sectionId }: { content: string; sectionId: string }) {
  const tokens = useThemeTokens();
  const colors = getSectionColor(sectionId);

  const lines = content.split('\n');

  return (
    <div className="flex flex-col">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (trimmed === '---') {
          return (
            <div
              key={i}
              className="my-5"
              style={{ height: 1, background: tokens.surface.borderLight }}
            />
          );
        }

        if (trimmed === '') {
          return <div key={i} className="h-3" />;
        }

        if (/^#{1,3}\s/.test(trimmed)) {
          const level = trimmed.match(/^#+/)?.[0].length ?? 1;
          const text = trimmed.replace(/^#+\s*/, '');
          if (level === 1) {
            return (
              <div key={i} className="mt-6 mb-3 first:mt-0">
                <h4
                  className="text-sm font-bold"
                  style={{ color: tokens.text.primary, letterSpacing: '-0.01em' }}
                >
                  {text}
                </h4>
                <div
                  className="mt-2 rounded-full"
                  style={{ height: 2, width: 32, background: colors.accent, opacity: 0.4 }}
                />
              </div>
            );
          }
          return (
            <p
              key={i}
              className="text-xs font-semibold mt-5 mb-2 first:mt-0 uppercase tracking-wider"
              style={{ color: colors.accent, opacity: 0.8 }}
            >
              {text}
            </p>
          );
        }

        if (/^\s*-\s/.test(line)) {
          const text = line.replace(/^\s*-\s*/, '');
          return (
            <div key={i} className="flex items-start gap-3 py-1 ml-1">
              <span
                className="mt-[9px] w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: colors.accent, opacity: 0.5 }}
              />
              <p
                className="text-[13px]"
                style={{ color: tokens.text.secondary, lineHeight: '1.75' }}
              >
                {text}
              </p>
            </div>
          );
        }

        const isGroupHeader = /^[A-Z]/.test(trimmed) && trimmed.endsWith(')') && /\(\d+/.test(trimmed);
        if (isGroupHeader) {
          return (
            <div key={i} className="mt-5 mb-2 first:mt-0">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-1.5 h-5 rounded-full flex-shrink-0"
                  style={{ background: colors.accent, opacity: 0.35 }}
                />
                <p
                  className="text-xs font-bold tracking-wide uppercase"
                  style={{ color: tokens.text.tertiary }}
                >
                  {trimmed}
                </p>
              </div>
            </div>
          );
        }

        const isIndentedDetail = /^\s{2,}/.test(line);
        if (isIndentedDetail) {
          return (
            <p
              key={i}
              className="text-xs py-0.5 ml-7"
              style={{ color: tokens.text.quaternary, lineHeight: '1.7' }}
            >
              {trimmed}
            </p>
          );
        }

        return (
          <p
            key={i}
            className="text-[13px] py-0.5"
            style={{ color: tokens.text.secondary, lineHeight: '1.8' }}
          >
            {line}
          </p>
        );
      })}
    </div>
  );
}


export function EmptyPlaceholder() {
  const tokens = useThemeTokens();
  return (
    <div className="flex items-center gap-3 py-4 px-2">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.borderLight}` }}
      >
        <FileText className="w-3.5 h-3.5" style={{ color: tokens.text.quaternary, opacity: 0.6 }} />
      </div>
      <p className="text-sm italic" style={{ color: tokens.text.quaternary }}>
        Vide pour le moment
      </p>
    </div>
  );
}
