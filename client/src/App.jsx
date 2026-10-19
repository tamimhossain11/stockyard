import { useCallback, useEffect, useState } from "react";
import { api, loadSession, saveSession, setUnauthorizedHandler } from "./api.js";
import LoginPage from "./pages/LoginPage.jsx";


// Products, orders and forecast pages are added here as they are built.
const PAGES = {};

function pageFromHash() {
  const name = window.location.hash.replace(/^#\/?/, "");
  return PAGES[name] ? name : "products";
}

export default function App() {
  const [session, setSession] = useState(loadSession);
  const [page, setPage] = useState(pageFromHash);
  const [loginNotice, setLoginNotice] = useState(null);

  const logout = useCallback((message = null) => {
    saveSession(null);
    setSession(null);
    setLoginNotice(message);
  }, []);

  // Any 401 on a logged-in request (expired or invalid token) ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => logout("Your session has expired. Please log in again."));
  }, [logout]);

  // Check the saved token is still valid when the app opens.
  useEffect(() => {
    if (session) api("/auth/me").catch(() => {});
  }, [session]);

  useEffect(() => {
    const onHashChange = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function handleLogin(newSession) {
    saveSession(newSession);
    setSession(newSession);
    setLoginNotice(null);
  }

  if (!session) return <LoginPage onLogin={handleLogin} notice={loginNotice} />;

  const Page = PAGES[page]?.component;

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">StockYard</span>
        <nav>
          {Object.entries(PAGES).map(([name, { label }]) => (
            <a key={name} href={`#/${name}`} className={name === page ? "active" : undefined}>
              {label}
            </a>
          ))}
        </nav>
        <span className="user">
          {session.name} <span className="role">{session.role.toLowerCase()}</span>
          <button type="button" className="link" onClick={() => logout()}>
            Log out
          </button>
        </span>
      </header>
      <main>
        {Page ? <Page session={session} /> : <p className="muted">You're logged in. More pages are on the way.</p>}
      </main>
    </div>
  );
}
