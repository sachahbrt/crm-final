import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { downloadFile, apiFetch } from "../api";
import { useAuth } from "../context/useAuth";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadFile("/api/auth/me/export", "mes-donnees.json");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Supprimer définitivement ton compte et tous tes contacts ? Cette action est irréversible.")) return;
    setDeleting(true);
    try {
      await apiFetch("/api/auth/me", { method: "DELETE" });
      await logout();
      navigate("/login");
      toast.success("Compte supprimé");
    } catch (err) {
      toast.error(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-900">Paramètres</h1>

      <div className="rounded-xl border border-ink-300/60 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-ink-700">Compte</h2>
        <p className="text-sm text-ink-500">
          {user?.firstName} {user?.lastName} · {user?.email}
        </p>
      </div>

      <div className="rounded-xl border border-ink-300/60 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-700">Mes données</h2>
        <p className="mt-1 text-sm text-ink-500">
          Exporte toutes tes données (profil et contacts) au format JSON, ou supprime définitivement ton compte.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg border border-ink-300 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100 disabled:opacity-60"
          >
            {exporting ? "Export…" : "Exporter mes données"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {deleting ? "Suppression…" : "Supprimer mon compte"}
          </button>
        </div>
      </div>
    </div>
  );
}
