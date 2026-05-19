import type { ThemeTokens } from '../../../../lib/themeTokens';

interface Props {
  count: number;
  tokens: ThemeTokens;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ChatClientDeleteModal({ count, tokens, onCancel, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4" style={{ background: tokens.surface.primary, border: `1px solid ${tokens.surface.border}` }}>
        <p className="text-sm font-semibold" style={{ color: tokens.text.primary }}>
          {count > 1 ? 'Voulez-vous vraiment supprimer ces conversations ?' : 'Voulez-vous vraiment supprimer cette conversation ?'}
        </p>
        <p className="text-xs" style={{ color: tokens.text.tertiary }}>
          Les messages seront supprimés définitivement.
        </p>
        <div className="flex items-center gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: tokens.surface.hover, color: tokens.text.secondary }}>Annuler</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#ef4444' }}>Supprimer</button>
        </div>
      </div>
    </div>
  );
}
