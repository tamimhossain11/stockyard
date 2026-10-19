
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const SESSION_KEY = "stockyard.session";

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function saveSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export async function api(path, { method = "GET", body } = {}) {
  const token = loadSession()?.token;
  let res;

  try {
    res = await fetch(API_URL + "/api" + path, {
      method,
      headers: {
        ...(body && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body && JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection, or wait a minute if it's waking up.");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new Error(data?.message ?? `Request failed (${res.status})`);
  }

  return data;
}
