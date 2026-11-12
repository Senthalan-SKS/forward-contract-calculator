// ---------------------------------------------------------------------------
// Demo auth — no backend. All data lives in localStorage.
// ---------------------------------------------------------------------------

export interface User {
  username: string;
  passwordHash: string; // simple btoa hash — demo only, not secure
}

const USERS_KEY = "fcc_users";
const SESSION_KEY = "fcc_session";

function hashPassword(password: string): string {
  // Not cryptographically secure — demo only
  return btoa(encodeURIComponent(password));
}

function getUsers(): User[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as User[];
  } catch {
    return [];
  }
}

function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function register(username: string, password: string): { ok: boolean; error?: string } {
  const trimmed = username.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Username is required." };
  if (password.length < 4) return { ok: false, error: "Password must be at least 4 characters." };
  const users = getUsers();
  if (users.some((u) => u.username === trimmed)) {
    return { ok: false, error: "Username already taken." };
  }
  users.push({ username: trimmed, passwordHash: hashPassword(password) });
  saveUsers(users);
  sessionStorage.setItem(SESSION_KEY, trimmed);
  return { ok: true };
}

export function login(username: string, password: string): { ok: boolean; error?: string } {
  const trimmed = username.trim().toLowerCase();
  const users = getUsers();
  const user = users.find((u) => u.username === trimmed);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return { ok: false, error: "Invalid username or password." };
  }
  sessionStorage.setItem(SESSION_KEY, trimmed);
  return { ok: true };
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

