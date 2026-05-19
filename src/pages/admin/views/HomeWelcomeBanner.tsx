import { useState, useEffect } from 'react';
import { useCompanyId } from '../../../hooks/useCompanyId';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { getHomePageByCompanyId, type CompanyHomePage } from '../../../lib/companyHomePages';

export default function HomeWelcomeBanner() {
  const companyId = useCompanyId();
  const tokens = useThemeTokens();
  const [page, setPage] = useState<CompanyHomePage | null>(null);

  useEffect(() => {
    if (!companyId) return;
    getHomePageByCompanyId(companyId)
      .then(data => { if (data?.is_active) setPage(data); })
      .catch(() => {});
  }, [companyId]);

  if (!page) return null;

  const mainColor = page.main_color || '#0ea5e9';
  const secondaryColor = page.secondary_color || '#10b981';

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 sm:p-6"
      style={{
        background: `linear-gradient(135deg, ${mainColor}12 0%, ${secondaryColor}08 100%)`,
        border: `1px solid ${mainColor}20`,
      }}
    >
      {/* Decorative gradient blob */}
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${mainColor}, ${secondaryColor})` }}
      />

      {/* Hero image background */}
      {page.hero_image_url && (
        <div
          className="absolute inset-0 opacity-[0.04] bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url(${page.hero_image_url})` }}
        />
      )}

      <div className="relative flex items-start gap-4">
        {/* Logo */}
        {page.logo_url && (
          <img
            src={page.logo_url}
            alt=""
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover flex-shrink-0"
            style={{ border: `1px solid ${mainColor}30`, boxShadow: `0 2px 12px ${mainColor}15` }}
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Title */}
          {page.title && (
            <h3
              className="text-base sm:text-lg font-bold leading-tight"
              style={{ color: tokens.heading.primary }}
            >
              {page.title}
            </h3>
          )}

          {/* Subtitle */}
          {page.subtitle && (
            <p
              className="text-xs sm:text-sm mt-0.5"
              style={{ color: mainColor }}
            >
              {page.subtitle}
            </p>
          )}

          {/* Welcome message */}
          {page.welcome_message && (
            <p
              className="text-xs sm:text-sm mt-2 leading-relaxed"
              style={{ color: tokens.text.secondary }}
            >
              {page.welcome_message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
