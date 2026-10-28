export interface CandidateUser {
  id: string;
  name: string;
  role: string;
  avatarText: string;
  email: string;
}

export const AUTH_STORAGE_KEY = "placeintel_user";
export const AUTH_CHANGE_EVENT = "placeintel_auth_change";

export function getStoredUser(): CandidateUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredUser(user: CandidateUser): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch {
    // ignore
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch {
    // ignore
  }
}

export function subscribeToAuthChanges(callback: (user: CandidateUser | null) => void): () => void {
  const handler = () => {
    callback(getStoredUser());
  };

  window.addEventListener(AUTH_CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
