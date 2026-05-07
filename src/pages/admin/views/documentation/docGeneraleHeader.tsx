import { BookOpen, Copy, CheckCircle, Layers, RefreshCw } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokens';

interface DocGeneraleHeaderProps {
  tokens: ThemeTokens;
  copied: boolean;
  handleCopy: () => void;
  handleRefresh: () => void;
  totalSections: number;
}

export function DocGeneraleHeader({
  tokens,
  copied,
  handleCopy,
  handleRefresh,
  totalSections,
}: DocGeneraleHeaderProps) {
  return (
    <div className="flex-shrink-0 mb-6 md:mb-8">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-0">
        <div className="flex items-center gap-3 md:gap-4">
          <div
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(34,211,238,0.05) 100%)',
              border: '1px solid rgba(34,211,238,0.20)',
              boxShadow: '0 0 30px rgba(34,211,238,0.08)',
            }}
          >
            <BookOpen className="w-4 h-4 md:w-5 md:h-5" style={{ color: tokens.accent.text }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <h1
                className="text-base md:text-xl font-extrabold tracking-tight whitespace-nowrap"
                style={{ color: tokens.text.primary, letterSpacing: '-0.03em' }}
              >
                Documentation CRM
              </h1>
              <span
                className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg"
                style={{
                  background: tokens.success.bg,
                  color: tokens.success.text,
                  border: `1px solid ${tokens.success.border}`,
                }}
              >
                auto-generee
              </span>
            </div>
            <p className="text-[11px] md:text-xs mt-1" style={{ color: tokens.text.quaternary }}>
              Resume complet de la documentation interne — copiable pour ChatGPT
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 self-start md:self-auto">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
            style={{
              background: tokens.surface.secondary,
              border: `1px solid ${tokens.surface.borderLight}`,
              color: tokens.text.secondary,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = tokens.surface.tertiary;
              e.currentTarget.style.borderColor = tokens.accent.border;
              e.currentTarget.style.color = tokens.accent.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = tokens.surface.secondary;
              e.currentTarget.style.borderColor = tokens.surface.borderLight;
              e.currentTarget.style.color = tokens.text.secondary;
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mettre a jour</span>
            <span className="sm:hidden">MAJ</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex-shrink-0"
            style={
              copied
                ? {
                    background: tokens.success.bg,
                    border: `1px solid ${tokens.success.border}`,
                    color: tokens.success.text,
                    boxShadow: `0 0 20px ${tokens.success.bg}`,
                  }
                : {
                    background: tokens.accent.bg,
                    border: `1px solid ${tokens.accent.border}`,
                    color: tokens.accent.text,
                  }
            }
            onMouseEnter={(e) => {
              if (!copied) {
                e.currentTarget.style.background = tokens.accent.bgHover;
                e.currentTarget.style.boxShadow = `0 0 20px ${tokens.accent.bg}`;
              }
            }}
            onMouseLeave={(e) => {
              if (!copied) {
                e.currentTarget.style.background = tokens.accent.bg;
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {copied ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Copie !
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copier tout
              </>
            )}
          </button>
        </div>
      </div>

      {totalSections > 0 && (
        <div className="flex items-center gap-3 mt-4 md:mt-5 flex-wrap">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" style={{ color: tokens.text.quaternary }} />
            <span className="text-xs font-medium" style={{ color: tokens.text.quaternary }}>
              {totalSections} section{totalSections > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
