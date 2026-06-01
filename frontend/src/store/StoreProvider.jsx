import { createContext, useContext, useEffect, useState } from 'react';
import * as store from '../lib/store';
import { requestPersistentStorage } from '../lib/db';
import { seedIfEmpty } from '../lib/seedData';

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

// Memoized so the load+seed sequence runs exactly once, even under React
// StrictMode's double-invoked effects (which would otherwise race two
// concurrent seedIfEmpty() calls and corrupt the in-memory store).
let bootstrapPromise = null;
function bootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await store.loadFromDb();
      await seedIfEmpty();
      requestPersistentStorage();
    })();
  }
  return bootstrapPromise;
}

export default function StoreProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [, forceTick] = useState(0);

  useEffect(() => {
    let active = true;
    bootstrap().then(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const refresh = () => forceTick(t => t + 1);

  if (!ready) return <div className="text-center py-16 text-gray-500">Laden...</div>;
  return <StoreContext.Provider value={{ ...store, refresh }}>{children}</StoreContext.Provider>;
}
