import { FolderOpen, PenTool } from 'lucide-react';

interface Props {
  onLoadSave: () => void;
  onNewLogo: () => void;
}

export default function CalquerLogoWelcome({ onLoadSave, onNewLogo }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(145deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.85) 100%)' }}>
      <div className="w-full max-w-xl flex flex-col items-center gap-8">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold tracking-tight"
            style={{ color: 'rgba(226,232,240,0.95)' }}>
            Calquer un logo
          </h1>
          <p className="text-sm max-w-md mx-auto"
            style={{ color: 'rgba(148,163,184,0.65)', lineHeight: '1.6' }}>
            Commencez un nouveau logo ou reprenez une sauvegarde existante.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          <ChoiceCard
            icon={<FolderOpen className="w-7 h-7" />}
            title="Charger un logo"
            description="Reprendre un travail sauvegarde"
            onClick={onLoadSave}
            color="#3b82f6"
          />
          <ChoiceCard
            icon={<PenTool className="w-7 h-7" />}
            title="Modifier un nouveau logo"
            description="Importer un logo et commencer un nouveau travail"
            onClick={onNewLogo}
            color="#22c55e"
          />
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({ icon, title, description, onClick, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-4 p-8 rounded-2xl text-center transition-all duration-300 hover:scale-[1.03]"
      style={{
        background: `linear-gradient(145deg, ${color}08 0%, ${color}04 100%)`,
        border: `1.5px solid ${color}20`,
        boxShadow: `0 4px 24px ${color}08`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${color}40`;
        e.currentTarget.style.boxShadow = `0 8px 32px ${color}15`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = `${color}20`;
        e.currentTarget.style.boxShadow = `0 4px 24px ${color}08`;
      }}
    >
      <div className="p-4 rounded-xl transition-all duration-300"
        style={{ background: `${color}10`, color }}>
        {icon}
      </div>
      <div className="space-y-1.5">
        <h2 className="text-sm font-bold" style={{ color: 'rgba(226,232,240,0.9)' }}>
          {title}
        </h2>
        <p className="text-xs" style={{ color: 'rgba(148,163,184,0.5)', lineHeight: '1.5' }}>
          {description}
        </p>
      </div>
    </button>
  );
}
