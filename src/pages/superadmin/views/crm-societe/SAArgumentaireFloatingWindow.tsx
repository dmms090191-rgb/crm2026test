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

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isMobile) {
    return <SAArgumentaireMobileDock key="mobile" title={title} content={content} onClose={onClose} t={t} />;
  }

  return <SAArgumentaireDesktopFloat key="desktop" title={title} content={content} onClose={onClose} t={t} />;
}
