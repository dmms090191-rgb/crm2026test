import { Building2, Mail } from 'lucide-react';
import type { useThemeTokens } from '../../../hooks/useThemeTokens';

interface Props {
  fullName: string;
  companyName: string;
  email: string;
  tokens: ReturnType<typeof useThemeTokens>;
}

/**
 * Bloc identite du dashboard Societe.
 *
 * Meme langage visuel que le dashboard Groupe, mais au niveau Societe :
 * le mot « Groupe » n'apparait nulle part ici.
 * Les valeurs viennent de l'identite EFFECTIVE du panel, donc de la Societe
 * visualisee en Visu, jamais du compte JWT.
 */
export default function SocieteIdentityCard({ fullName, companyName, email, tokens: t }: Props) {
  const cards = [
    { icon: Building2, label: 'Société', value: companyName || '—', color: t.accent.text, bg: t.accent.bg, border: t.accent.border },
    { icon: Mail, label: 'Email', value: email || '—', color: t.success.text, bg: t.success.bg, border: t.success.border },
  ];

  return (
    <>
      <div className="rounded-2xl p-5 sm:p-6" style={{
        background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
        border: `1px solid ${t.surface.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0" style={{
            background: `linear-gradient(135deg, ${t.accent.text}, ${t.accent.text}cc)`,
            boxShadow: `0 4px 20px ${t.accent.border}`,
          }}>
            {(fullName || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-base sm:text-lg font-bold truncate" style={{ color: t.text.primary }}>{fullName || '—'}</p>
            <p className="text-xs font-medium truncate" style={{ color: t.accent.text }}>{companyName || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-xl p-4" style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: card.color }} />
                  <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: t.text.quaternary }}>{card.label}</span>
                </div>
                <p className="text-sm font-semibold truncate" style={{ color: card.color }}>{card.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{
        background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
        border: `1px solid ${t.surface.border}`,
      }}>
        <div className="px-5 py-3" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Informations de la société</h3>
        </div>
        <div className="divide-y" style={{ borderColor: t.surface.border }}>
          {[
            ['Nom complet', fullName || '—'],
            ['Société', companyName || '—'],
            ['Email', email || '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="text-xs font-medium flex-shrink-0" style={{ color: t.text.tertiary }}>{label}</span>
              <span className="text-xs font-semibold truncate" style={{ color: t.text.primary }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
