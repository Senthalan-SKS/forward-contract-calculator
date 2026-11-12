import { useState, FormEvent } from "react";
import { useAuth } from "./AuthContext";

type Mode = "login" | "register";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = mode === "login" ? login(username, password) : register(username, password);
    setLoading(false);
    if (!result.ok) setError(result.error ?? "Something went wrong.");
  };

  return (
    <div className="auth-backdrop">
      <div className="auth-card">
        <div className="auth-logo">📈</div>
        <h1 className="auth-title">Forward Contract Calculator</h1>
        <p className="auth-subtitle">
          {mode === "login" ? "Sign in to track your calculations" : "Create an account to save your contracts"}
        </p>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => { setMode("login"); setError(null); }}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => { setMode("register"); setError(null); }}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={submit} noValidate>
          <label className="auth-field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. trader_jane"
              required
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "Min. 4 characters" : ""}
              required
            />
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="auth-demo-note">
          🔒 Demo only — data stored in your browser's localStorage. No server involved.
        </p>
      </div>
    </div>
  );
}

