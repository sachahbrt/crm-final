import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthCard from "../components/AuthCard";
import { useAuth } from "../context/useAuth";
import { API_BASE, apiFetch } from "../api";

const inputClass =
  "w-full rounded-lg border border-ink-300 px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

export default function Login() {
  const { login, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState("credentials"); // "credentials" | "code"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [preAuthToken, setPreAuthToken] = useState(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await login(email, password);
      if (data?.twoFactorRequired) {
        setPreAuthToken(data.preAuthToken);
        setStep("code");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCodeSubmit(e) {
    e.preventDefault();
    setVerifying(true);
    try {
      const data = await apiFetch("/api/auth/login/verify-2fa", {
        method: "POST",
        body: { code },
        token: preAuthToken,
      });
      await loginWithToken(data.token);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVerifying(false);
    }
  }

  // Native implicit submission-on-Enter can be swallowed by the password
  // field (e.g. a password-manager extension intercepting the keydown), so
  // submit explicitly instead of relying on it.
  function handleEnterKey(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  if (step === "code") {
    return (
      <AuthCard title="Vérification" subtitle="Entre le code reçu par email pour terminer la connexion">
        <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
          <input
            autoFocus
            required
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="000000"
            className="w-full rounded-lg border border-ink-300 px-3 py-2 text-center text-lg font-bold tracking-[0.4em] text-ink-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <button
            type="submit"
            disabled={verifying || code.length !== 6}
            className="mt-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {verifying ? "Vérification…" : "Confirmer"}
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Connexion" subtitle="Accède à ton réseau de contacts">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Email</label>
          <input
            type="email"
            required
            tabIndex={1}
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleEnterKey}
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-ink-700">Mot de passe</label>
            {/* tabIndex after the fields below so Tab from Email goes straight
                to Password instead of here (DOM order would otherwise put
                this link first, since it's visually above the input). */}
            <Link to="/forgot-password" tabIndex={4} className="text-sm font-medium text-brand-600 hover:underline">
              Oublié ?
            </Link>
          </div>
          <input
            type="password"
            required
            tabIndex={2}
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleEnterKey}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          tabIndex={3}
          className="mt-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          Se connecter
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-ink-500">
        <div className="h-px flex-1 bg-ink-300/60" />
        ou
        <div className="h-px flex-1 bg-ink-300/60" />
      </div>

      <a
        href={`${API_BASE}/api/auth/google`}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-ink-300 px-4 py-2.5 text-sm font-semibold text-ink-700 transition-all duration-200 hover:scale-[1.02] hover:border-ink-400 hover:bg-ink-100 hover:shadow-sm"
      >
        <GoogleLogo className="size-4" />
        Continuer avec Google
      </a>

      <p className="mt-6 text-center text-sm text-ink-500">
        Pas encore de compte ?{" "}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">
          Créer un compte
        </Link>
      </p>
    </AuthCard>
  );
}

// Official 4-color "G" mark, inlined as SVG so the Google button has no
// external image/API dependency — a static, offline asset like the rest of
// the icons in this app.
function GoogleLogo(props) {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
