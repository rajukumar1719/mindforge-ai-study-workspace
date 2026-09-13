import type { UserSession } from '../types';

/**
 * Temporary Client-Side Session Storage.
 *
 * NOTE & ARCHITECTURAL LIMITATION:
 * This mechanism uses sessionStorage strictly for transient display-name retention
 * across page transitions within the current browser tab.
 *
 * - It is NOT an authentication or authorization system.
 * - No sensitive data, secrets, or tokens are stored here.
 * - Sessions are discarded when the tab is closed.
 * - True multi-user identity and room membership validation will be handled
 *   authoritatively by the backend in the WebSocket collaboration phase.
 */

const SESSION_KEY = 'syncdraw_session_user';

export function getUserSession(): UserSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserSession;
    if (parsed && typeof parsed.displayName === 'string' && parsed.displayName.trim().length > 0) {
      return { displayName: parsed.displayName.trim() };
    }
    return null;
  } catch {
    return null;
  }
}

export function setUserSession(displayName: string): void {
  try {
    const session: UserSession = { displayName: displayName.trim() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Gracefully handle storage quota or privacy mode blocking
  }
}

export function clearUserSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Gracefully handle storage error
  }
}
