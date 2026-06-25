import { createContext, useContext } from 'react';

/** Lets anything inside the app open the runtime AI Settings dialog (provider/model/key). */
export const AiSettingsContext = createContext<{ openSettings: () => void }>({
  openSettings: () => {},
});

export const useAiSettings = () => useContext(AiSettingsContext);
