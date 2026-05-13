import { ChevronDown } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { DocSection } from './docGeneraleTypes';
import { getSectionColor } from './docGeneraleTypes';
import { ContentRenderer, EmptyPlaceholder } from './docGeneraleRenderers';

export function SectionCard({ section, index, isOpen, onToggle }: { section: DocSection; index: number; isOpen: boolean; onToggle: () => void }) {
  const tokens = useThemeTokens();
  const colors = getSectionColor(section.id);
  const isEmpty = !section.content.trim();

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: tokens.card.bg,
        border: `1px solid ${tokens.card.border}`,
        boxShadow: tokens.card.shadow,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="relative w-full px-4 md:px-7 py-4 md:py-5 text-left cursor-pointer"
        style={{ borderBottom: isOpen ? `1px solid ${tokens.surface.borderLight}` : 'none' }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, ${colors.accent} 0%, transparent 70%)`,
            opacity: 0.5,
          }}
        />

        <div className="flex items-center gap-2.5 md:gap-4">
          <div
            className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: colors.iconBg,
              border: `1px solid ${colors.accentBorder}`,
              boxShadow: `0 0 20px ${colors.accentSoft}`,
            }}
          >
            <span style={{ color: colors.accent }}>{section.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="text-sm md:text-base font-bold tracking-tight"
              style={{ color: tokens.text.primary, letterSpacing: '-0.02em' }}
            >
              {section.label}
            </h3>
            <p className="text-[11px] md:text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>
              Section {index + 1}
            </p>
          </div>
          {isEmpty && (
            <span
              className="text-[9px] md:text-[10px] font-semibold uppercase tracking-widest px-2 md:px-2.5 py-0.5 md:py-1 rounded-md flex-shrink-0 hidden sm:inline-flex"
              style={{
                background: tokens.surface.tertiary,
                color: tokens.text.quaternary,
                border: `1px solid ${tokens.surface.borderLight}`,
              }}
            >
              vide
            </span>
          )}
          <span
            className="text-[9px] md:text-[10px] font-semibold uppercase tracking-widest px-2 md:px-2.5 py-0.5 md:py-1 rounded-md flex-shrink-0 hidden sm:inline-flex"
            style={{
              background: colors.accentSoft,
              color: colors.accent,
              border: `1px solid ${colors.accentBorder}`,
            }}
          >
            {section.id.replace(/-/g, ' ')}
          </span>
          <ChevronDown
            className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 transition-transform duration-300"
            style={{
              color: tokens.text.quaternary,
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      <div
        className="transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden"
        style={{
          maxHeight: isOpen ? '5000px' : '0px',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div className="px-4 md:px-7 py-4 md:py-6">
          {isEmpty ? <EmptyPlaceholder /> : <ContentRenderer content={section.content} sectionId={section.id} />}
        </div>
      </div>
    </div>
  );
}

