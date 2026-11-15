import { http, isNetworkError, isUnauthorized, setUnauthorizedHandler } from '../services/http';
import { syncNow } from '../offline/outbox';

/*
 * Session state for the single shared login.
 *
 * The session itself lives on the server (HttpOnly cookie, invisible to JavaScript):
 *   - browser tab ("web"): valid for at most 1 day after login
 *   - installed PWA ("pwa"): renewed while the app is used, so it stays logged in
 *
 * A copy of the session info (no secret in it) is kept in localStorage only so the PWA can
 * open offline; it is never trusted past its expiry date.
 */

export interface SessionInfo {
  user_id: number;
  username: string;
  client: 'web' | 'pwa';
  expires_at: string;
}

export interface AuthState {
  status: 'checking' | 'authenticated' | 'anonymous';
  session: SessionInfo | null;
  /** The last session ended on its own (expired / revoked), not through "Sair" */
  expired: boolean;
}

const STORAGE_KEY = 'auth-session';

let state: AuthState = { status: 'checking', session: null, expired: false };
const listeners = new Set<() => void>();

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const authStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => state,
};

/** Installed app (home screen / standalone window) or a normal browser tab. */
export function clientType(): 'web' | 'pwa' {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone ? 'pwa' : 'web';
}

function save(session: SessionInfo | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked: offline start just won't be possible
  }
}

function stored(): SessionInfo | null {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as SessionInfo | null;
    return s && new Date(s.expires_at).getTime() > Date.now() ? s : null;
  } catch {
    return null;
  }
}

/** Drops every trace of the session on this device (cached API data included). */
async function clearLocal() {
  save(null);
  try {
    await caches.delete('api-reads');
  } catch {
    // Cache Storage unavailable (e.g. plain http): nothing to clear
  }
}

function endSession(expired: boolean) {
  if (state.status === 'anonymous') return;
  void clearLocal();
  setState({ status: 'anonymous', session: null, expired });
}

/** Asks the server whether the cookie still holds a valid session. Runs at startup. */
export async function checkSession(): Promise<void> {
  try {
    const { data } = await http.get<{ data: SessionInfo }>('/auth/session');
    save(data.data);
    setState({ status: 'authenticated', session: data.data, expired: false });
    void syncNow();
  } catch (err) {
    if (isUnauthorized(err)) {
      const hadSession = stored() !== null;
      await clearLocal();
      setState({ status: 'anonymous', session: null, expired: hadSession });
    } else if (isNetworkError(err) && stored()) {
      // Offline: open with the last known session until its expiry (PWA works offline)
      setState({ status: 'authenticated', session: stored(), expired: false });
    } else {
      setState({ status: 'anonymous', session: null, expired: false });
    }
  }
}

export async function login(username: string, password: string): Promise<void> {
  const { data } = await http.post<{ data: SessionInfo }>('/auth/login', {
    username,
    password,
    client: clientType(),
  });
  save(data.data);
  setState({ status: 'authenticated', session: data.data, expired: false });
  // Writes queued while logged out (or offline) can go now
  void syncNow();
}

export async function logout(): Promise<void> {
  try {
    await http.post('/auth/logout');
  } catch {
    // Offline: the cookie stays on the server until it expires, but this device forgets it
  }
  await clearLocal();
  setState({ status: 'anonymous', session: null, expired: false });
}

// Any 401 from the API means the session ended (expired, password changed...)
setUnauthorizedHandler(() => endSession(true));
