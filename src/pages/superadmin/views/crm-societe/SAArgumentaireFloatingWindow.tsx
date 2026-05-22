import { useState, useEffect } from 'react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import SAArgumentaireMobileDock from './SAArgumentaireMobileDock';
import SAArgumentaireDesktopFloat from './SAArgumentaireDesktopFloat';

interface Props {
  title: string;
  content: string;
  onClose: () => void;
}

export default function SAArgumentaireFloatingWindow({ title, content, onClose }: Props) {
  const t = useThemeTokens();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) {
    return (
      <SAArgumentaireMobileDock
        title={title} content={content} onClose={onClose}
        collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)}
        t={t}
      />
    );
  }

  return <SAArgumentaireDesktopFloat title={title} content={content} onClose={onClose} t={t} />;
}
