import { ExternalLink, Mail } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useFormatTel } from '../../hooks/useFormatTel';
import { formaterTel } from '../../lib/formatTel';
import { lienSur } from '../../lib/lienSur';
import type { TypeColonne } from '../../lib/entetesImport';
import CopyButton from '../CopyButton';

interface Props {
  valeur: string;
  type: TypeColonne;
  /** Sur une carte mobile : cibles de 44 px, texte sur plusieurs lignes. */
  tactile?: boolean;
}

/*
 * UNE VALEUR IMPORTEE, AFFICHEE SELON SON TYPE.
 *
 * Rien n'est reecrit en base : le type ne change que la presentation. Un lien n'est
 * cliquable que s'il passe `lienSur` (http/https uniquement — jamais `javascript:` ni
 * `data:`), et il s'ouvre dans un nouvel onglet SANS acces a la page d'origine
 * (`noopener noreferrer`). Un telephone est REECRIT dans le format choisi mais n'est jamais
 * un lien d'appel ici : l'appel se fait depuis l'icone des cartes mobiles (decision T13).
 */
export default function ValeurLead({ valeur, type, tactile = false }: Props) {
  const t = useThemeTokens();
  const { format } = useFormatTel();
  const v = valeur.trim();
  if (v === '') return <span className="text-xs" style={{ color: t.text.quaternary }}>{'—'}</span>;

  if (type === 'lien') {
    const l = lienSur(v);
    if (l) {
      return (
        <a
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          title={l.href}
          onClick={e => e.stopPropagation()}
          className={`inline-flex items-center gap-1.5 rounded-full font-semibold max-w-full ${tactile ? 'min-h-[44px] px-3 text-xs' : 'px-2.5 py-1 text-[11px]'}`}
          style={{ background: t.accent.bg, color: t.accent.text, border: `1px solid ${t.accent.border}` }}
        >
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{l.libelle}</span>
        </a>
      );
    }
  }

  if (type === 'email' && v.includes('@')) {
    return (
      <span className="inline-flex items-center gap-1.5 max-w-full">
        <Mail className="w-3 h-3 flex-shrink-0" style={{ color: t.table.cellIcon }} />
        <span className="text-xs truncate" style={{ color: t.table.cellTextMuted }}>{v}</span>
        <CopyButton value={v} />
      </span>
    );
  }

  if (type === 'telephone') {
    return <span className="text-xs tabular-nums whitespace-nowrap" style={{ color: t.table.cellTextMuted }}>{formaterTel(v, format)}</span>;
  }

  if (type === 'nombre') {
    return <span className="text-xs tabular-nums" style={{ color: t.table.cellTextMuted }}>{v}</span>;
  }

  /* Un texte long (un avis, une adresse sur deux lignes) : deux lignes au plus dans le
     tableau, l'integralite au survol et dans la fiche. */
  return (
    <span
      className="text-xs whitespace-pre-line break-words"
      style={{
        color: type === 'entreprise' ? t.table.cellText : t.table.cellTextMuted,
        fontWeight: type === 'entreprise' ? 600 : 400,
        ...(tactile ? {} : { maxWidth: 260, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }),
      }}
      title={v.length > 40 ? v : undefined}
    >
      {v}
    </span>
  );
}
