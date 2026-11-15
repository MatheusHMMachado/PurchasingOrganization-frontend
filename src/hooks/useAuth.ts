import { useSyncExternalStore } from 'react';
import { authStore } from '../auth/auth';

export function useAuth() {
  return useSyncExternalStore(authStore.subscribe, authStore.getSnapshot);
}
