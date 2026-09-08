import CalquerLogoWelcome from './CalquerLogoWelcome';
import CalquerLogoLoadModal from './CalquerLogoLoadModal';
import type { useCalquerSaves } from './useCalquerSaves';

interface Props {
  handleWelcomeLoad: () => void;
  resetEditor: () => void;
  setMode: (m: 'welcome' | 'editor') => void;
  loadModalOpen: boolean;
  setLoadModalOpen: (v: boolean) => void;
  saves: ReturnType<typeof useCalquerSaves>;
  handleOpenSave: (id: string) => void;
}

/** Ecran d'accueil du calqueur. Extrait tel quel. */
export default function CalquerLogoWelcomeScreen({
  handleWelcomeLoad, resetEditor, setMode, loadModalOpen, setLoadModalOpen, saves, handleOpenSave,
}: Props) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <CalquerLogoWelcome onLoadSave={handleWelcomeLoad} onNewLogo={() => { resetEditor(); setMode('editor'); }} />
      <CalquerLogoLoadModal open={loadModalOpen} onClose={() => setLoadModalOpen(false)}
        sessions={saves.sessions} loading={saves.loading}
        onOpen={handleOpenSave} onDelete={saves.handleDelete} onRename={saves.handleRename} />
    </div>
  );
}
