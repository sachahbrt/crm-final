import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthCard from "../components/AuthCard";
import { useAuth } from "../context/useAuth";
import { API_BASE } from "../api";

const inputClass =
  "w-full rounded-lg border border-ink-300 px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Connexion" subtitle="Accède à ton réseau de contacts">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Email</label>
          <input type="email" required className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-ink-700">Mot de passe</label>
            <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:underline">
              Oublié ?
            </Link>
          </div>
          <input type="password" required className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button
          type="submit"
          disabled={submitting}
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
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-ink-300 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-100"
      >
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
