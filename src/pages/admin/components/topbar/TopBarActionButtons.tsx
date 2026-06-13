import { Smartphone, Paintbrush, ArrowLeft } from 'lucide-react';

interface PhoneButtonProps {
  open: boolean;
  minimized: boolean;
  onToggleMinimize: () => void;
  onOpen: () => void;
}

export function PhoneButton({ open, minimized, onToggleMinimize, onOpen }: PhoneButtonProps) {
  return (
    <button
      onClick={open ? onToggleMinimize : onOpen}
      className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl transition-all duration-200 flex-shrink-0"
      style={{
        background: open ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.06)',
        border: `1px solid ${open ? 'rgba(14,165,233,0.3)' : 'rgba(14,165,233,0.15)'}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = open ? 'rgba(14,165,233,0.2)' : 'rgba(14,165,233,0.12)'; e.currentTarget.style.borderColor = open ? 'rgba(14,165,233,0.4)' : 'rgba(14,165,233,0.25)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = open ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.06)'; e.currentTarget.style.borderColor = open ? 'rgba(14,165,233,0.3)' : 'rgba(14,165,233,0.15)'; }}
      title={open ? (minimized ? 'Afficher le telephone' : 'Reduire le telephone') : 'Apercu mobile'}
    >
      <Smartphone className="w-4 h-4 flex-shrink-0" style={{ color: '#0ea5e9' }} />
      <span className="text-[11px] font-medium hidden sm:inline" style={{ color: '#0ea5e9' }}>
        {open && minimized ? 'Tel. ouvert' : 'Mobile'}
      </span>
      {open && minimized && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#0ea5e9', boxShadow: '0 0 6px rgba(14,165,233,0.6)' }} />
      )}
    </button>
  );
}

interface EditorButtonProps {
  editorOpen: boolean;
  onToggle: () => void;
}

export function EditorButton({ editorOpen, onToggle }: EditorButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl transition-all duration-200 flex-shrink-0"
      style={{
        background: editorOpen ? 'rgba(234,179,8,0.15)' : 'rgba(234,179,8,0.06)',
        border: `1px solid ${editorOpen ? 'rgba(234,179,8,0.3)' : 'rgba(234,179,8,0.15)'}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = editorOpen ? 'rgba(234,179,8,0.2)' : 'rgba(234,179,8,0.12)'; e.currentTarget.style.borderColor = editorOpen ? 'rgba(234,179,8,0.4)' : 'rgba(234,179,8,0.25)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = editorOpen ? 'rgba(234,179,8,0.15)' : 'rgba(234,179,8,0.06)'; e.currentTarget.style.borderColor = editorOpen ? 'rgba(234,179,8,0.3)' : 'rgba(234,179,8,0.15)'; }}
      title={editorOpen ? 'Fermer l\'editeur' : 'Ouvrir l\'editeur de fonds'}
    >
      <Paintbrush className="w-4 h-4 flex-shrink-0" style={{ color: '#eab308' }} />
      <span className="text-[11px] font-medium hidden sm:inline" style={{ color: '#eab308' }}>
        Editeur
      </span>
      {editorOpen && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#eab308', boxShadow: '0 0 6px rgba(234,179,8,0.6)' }} />
      )}
    </button>
  );
}

interface ImpersonationBannerProps {
  adminName: string;
  demoStatus: 'idle' | 'pending' | 'active';
  demoSlot?: React.ReactNode;
  onBackToSuperAdmin?: () => void;
}

export function ImpersonationBanner({ adminName, demoStatus, demoSlot, onBackToSuperAdmin }: ImpersonationBannerProps) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6 py-2 flex-shrink-0"
      style={{ background: demoStatus === 'active' ? 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(239,68,68,0.06) 100%)' : 'rgba(245,158,11,0.08)', borderBottom: `1px solid rgba(245,158,11,${demoStatus === 'active' ? '0.3' : '0.18'})` }}
    >
      <span className="text-xs font-medium truncate min-w-0" style={{ color: '#f59e0b' }}>
        {demoStatus === 'active' ? (
          <>Demo en direct avec <span className="font-bold">{adminName}</span></>
        ) : demoStatus === 'pending' ? (
          <>Invitation envoyee a <span className="font-bold">{adminName}</span></>
        ) : (
          <><span className="hidden sm:inline">Mode Super Admin — vous visualisez le panel de </span><span className="sm:hidden">Visualisation </span><span className="font-bold">{adminName}</span></>
        )}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {demoSlot}
        {demoStatus !== 'active' && (
          <button
            onClick={onBackToSuperAdmin}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all hover:scale-105 whitespace-nowrap"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
          >
            <ArrowLeft className="w-3 h-3 flex-shrink-0" />
            <span className="hidden sm:inline">Retour Super Admin</span>
            <span className="sm:hidden">Retour</span>
          </button>
        )}
      </div>
    </div>
  );
}
