import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import { apiFetch } from "../api";

export default function ConfirmEmail() {
  const { token } = useParams();
  const [state, setState] = useState("loading");

  useEffect(() => {
    apiFetch(`/api/auth/confirm-email/${token}`, { method: "POST" })
      .then(() => setState("success"))
      .catch(() => setState("error"));
  }, [token]);

  return (
    <AuthCard title="Confirmation de l'email">
      {state === "loading" && <p className="text-sm text-ink-500">Vérification du lien…</p>}
      {state === "success" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-700">Ton email a bien été mis à jour, tu peux te connecter.</p>
          <Link to="/login" className="rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600">
            Se connecter
          </Link>
        </div>
      )}
      {state === "error" && <p className="text-sm text-red-600">Lien invalide ou expiré.</p>}
    </AuthCard>
  );
}
