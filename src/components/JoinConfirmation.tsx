import { createContext, ReactNode, useContext } from 'react';
import { Activity } from '../data/activities';

const JoinContext = createContext<(activity: Activity) => Promise<boolean>>(async () => true);
export const useJoinConfirmation = () => useContext(JoinContext);

export function JoinConfirmationProvider({ children }: { children: ReactNode }) {
  return <JoinContext.Provider value={async () => true}>{children}</JoinContext.Provider>;
}
