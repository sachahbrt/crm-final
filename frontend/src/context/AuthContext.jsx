import { useEffect, useState } from "react";
import { apiFetch, getToken } from "../api";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    apiFetch("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await apiFetch("/api/auth/login", { method: "POST", body: { email, password } });
    // 2FA on: no session yet, just a short-lived preAuthToken — let the
    // caller (Login page) switch to the code step instead of logging in.
    if (data.twoFactorRequired) return data;
    localStorage.setItem("token", data.token);
    setUser(data.user);
  }

  async function register(firstName, lastName, email, password) {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: { firstName, lastName, email, password },
    });
    localStorage.setItem("token", data.token);
    setUser(data.user);
  }

  // Used after the Google OAuth redirect hands back a token.
  async function loginWithToken(token) {
    localStorage.setItem("token", token);
    const data = await apiFetch("/api/auth/me");
    setUser(data.user);
  }

  function updateUser(partial) {
    setUser((u) => ({ ...u, ...partial }));
  }

  async function logout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore: we clear local state regardless
    }
    localStorage.removeItem("token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithToken, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
