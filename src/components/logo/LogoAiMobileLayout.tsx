import { ReactNode } from 'react';
import { Eye, Home, ArrowRight, ArrowLeft } from 'lucide-react';

interface Props {
  mobilePage: 0 | 1;
  setMobilePage: (p: 0 | 1) => void;
  configPanel: ReactNode;
  costAndGenerate: ReactNode;
  resultsPreview: ReactNode;
  detailPanel: ReactNode;
  appIconBanner: ReactNode;
  gallerySection: ReactNode;
  showResults: boolean;
  savedCount: number;
  appIconSelectionMode: boolean;
  selectedLogo: unknown;
  detailRef: React.RefObject<HTMLDivElement>;
  surfacePrimary: string;
  surfaceBorder: string;
  surfaceBorderLight: string;
  surfaceSecondary: string;
  textPrimary: string;
  textQuaternary: string;
  textSecondary: string;
}

export default function LogoAiMobileLayout({
  mobilePage, setMobilePage, configPanel, costAndGenerate,
  resultsPreview, detailPanel, appIconBanner, gallerySection,
  showResults, savedCount, appIconSelectionMode, selectedLogo,
  detailRef, surfacePrimary, surfaceBorder, surfaceBorderLight,
  surfaceSecondary, textPrimary, textQuaternary, textSecondary,
}: Props) {
  return (
    <div className="lg:hidden flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${mobilePage * 100}%)` }}>
          {/* Page 0: Create + Results */}
          <div className="w-full flex-shrink-0 flex flex-col min-h-0 overflow-y-auto">
            <div className="px-4 py-3 flex flex-col">{configPanel}</div>
            <div className="px-4 pb-3">{costAndGenerate}</div>
            {showResults && (
              <div className="mt-1">{resultsPreview}</div>
            )}
            {savedCount > 0 && (
              <div className="px-4 py-3">
                <button onClick={() => setMobilePage(1)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.04), rgba(217,119,6,0.06))',
                    border: '1px solid rgba(245,158,11,0.15)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #b45309)', boxShadow: '0 2px 8px rgba(245,158,11,0.20)' }}>
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <span className="text-[12px] font-bold block" style={{ color: textPrimary }}>Apercu & Sauvegardes</span>
                      <span className="text-[9px] font-medium" style={{ color: textQuaternary }}>
                        {savedCount} logo{savedCount > 1 ? 's' : ''} sauvegarde{savedCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" style={{ color: '#d97706' }} />
                </button>
              </div>
            )}
          </div>

          {/* Page 1: Detail + Gallery */}
          <div className="w-full flex-shrink-0 flex flex-col min-h-0 overflow-y-auto">
            <div className="px-4 pt-3 pb-2 flex items-center gap-2 flex-shrink-0">
              {!appIconSelectionMode && (
                <button onClick={() => setMobilePage(0)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                  style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}`, color: textSecondary }}>
                  <ArrowLeft className="w-3.5 h-3.5" /> Creer
                </button>
              )}
              <div className="flex-1" />
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: textQuaternary }}>
                {appIconSelectionMode ? 'Selection icone' : selectedLogo ? 'Apercu' : 'Bibliotheque'}
              </span>
            </div>
            {appIconBanner}
            {!appIconSelectionMode && <div ref={detailRef} className="px-3 pb-2">{detailPanel}</div>}
            <div className="flex-shrink-0 px-4 pt-3 pb-2" style={{ borderTop: `1px solid ${surfaceBorderLight}` }}>
              {gallerySection}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="flex-shrink-0 flex items-center justify-around py-2 px-2"
        style={{ borderTop: `1px solid ${surfaceBorder}`, background: surfacePrimary, boxShadow: '0 -2px 12px rgba(0,0,0,0.04)' }}>
        {[
          { page: 0 as const, icon: <Home className="w-5 h-5" />, label: 'Creer' },
          { page: 1 as const, icon: <Eye className="w-5 h-5" />, label: 'Apercu' },
        ].map(tab => {
          const active = mobilePage === tab.page;
          return (
            <button key={tab.page} onClick={() => setMobilePage(tab.page)}
              className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-all active:scale-95"
              style={{ color: active ? '#d97706' : textQuaternary }}>
              {tab.icon}
              <span className="text-[9px] font-bold" style={{ color: active ? '#d97706' : textQuaternary }}>{tab.label}</span>
              {active && (
                <div className="w-4 h-0.5 rounded-full mt-0.5"
                  style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
