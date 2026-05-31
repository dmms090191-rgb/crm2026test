import { useState, useEffect } from 'react';
import { useDemoReceiver } from './useDemoReceiver';
import DemoInviteModal from './DemoInviteModal';
import DemoBanner from './DemoBanner';
import DemoCursorOverlay from './DemoCursorOverlay';
import DemoTouchOverlay from './DemoTouchOverlay';
import DemoNavigationToast from './DemoNavigationToast';

interface Props {
  userId: string | null;
  onViewChange?: (view: string) => void;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

export default function DemoReceiverLayer({ userId, onViewChange }: Props) {
  const {
    pendingInvite,
    activeSession,
    cursor,
    clickRipple,
    remoteViewLabel,
    acceptInvite,
    rejectInvite,
    endSession,
  } = useDemoReceiver(userId, onViewChange);

  const isMobile = useIsMobile();

  return (
    <>
      {pendingInvite && (
        <DemoInviteModal
          saName={pendingInvite.sa_display_name}
          onAccept={acceptInvite}
          onReject={rejectInvite}
        />
      )}

      {activeSession && (
        <>
          <DemoBanner saName={activeSession.sa_display_name} deviceType={activeSession.device_type} onStop={endSession} />
          <DemoNavigationToast saName={activeSession.sa_display_name} viewLabel={remoteViewLabel} />
          {isMobile ? (
            <DemoTouchOverlay
              key="touch"
              cursor={cursor}
              clickRipple={clickRipple}
              saName={activeSession.sa_display_name}
            />
          ) : (
            <DemoCursorOverlay
              key="cursor"
              cursor={cursor}
              clickRipple={clickRipple}
              saName={activeSession.sa_display_name}
            />
          )}
        </>
      )}
    </>
  );
}
