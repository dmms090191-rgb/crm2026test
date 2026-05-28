import { createContext, useContext } from 'react';

interface SessionTimeoutContextValue {
  onTimeoutChanged: (minutes: number) => void;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextValue>({
  onTimeoutChanged: () => {},
});

export const SessionTimeoutProvider = SessionTimeoutContext.Provider;

export function useSessionTimeoutConfig() {
  return useContext(SessionTimeoutContext);
}
