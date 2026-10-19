import { useState } from "react";
import { api } from "../api.js";
import { useAction } from "../useApi.js";
import { ErrorNotice } from "../components/Notice.jsx";

export default function LoginPage({ onLogin, notice }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useAction();

  async function handleSubmit(event) {
    event.preventDefault();
    const session = await login.run(() => api("/auth/login", { method: "POST", body: { email, password } }));
    if (session) onLogin(session);
  }

  return (
    <main className="login">
      <form className="card" onSubmit={handleSubmit}>
        <h1>StockYard</h1>
        <p className="muted">Orders, stock and restock suggestions for the shop.</p>

        <ErrorNotice message={login.error ?? notice} />

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        <button type="submit" disabled={login.busy}>
          {login.busy ? "Logging in…" : "Log in"}
        </button>
      </form>
    </main>
  );
}
