// Session tokens live in localStorage so a reload keeps the user signed in.
// The access token is short lived (15 min); the refresh token rotates on every use.
export interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

export const AUTH_STORAGE_KEY = "placeintel.auth";

export function readSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    return parsed.accessToken && parsed.refreshToken
      ? { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken }
      : null;
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession): void {
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // storage blocked (private mode): the session just will not survive a reload
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const isSignedIn = (): boolean => readSession() !== null;
