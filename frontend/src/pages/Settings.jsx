import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { downloadFile, apiFetch } from "../api";
import { useAuth } from "../context/useAuth";

const inputClass =
  "w-full rounded-lg border border-ink-300 px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const labelClass = "mb-1 block text-sm font-medium text-ink-700";

export default function Settings() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [profile, setProfile] = useState({ firstName: user?.firstName || "", lastName: user?.lastName || "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [savingPwd, setSavingPwd] = useState(false);

  const [emailForm, setEmailForm] = useState({ newEmail: "", currentPassword: "" });
  const [savingEmail, setSavingEmail] = useState(false);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const data = await apiFetch("/api/auth/me", { method: "PUT", body: profile });
      updateUser(data.user);
      toast.success("Profil mis à jour");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (pwd.next !== pwd.confirm) {
      toast.error("Les deux mots de passe ne correspondent pas");
      return;
    }
    setSavingPwd(true);
    try {
      await apiFetch("/api/auth/me/password", { method: "PUT", body: { currentPassword: pwd.current, newPassword: pwd.next } });
      toast.success("Mot de passe modifié, un email de confirmation t'a été envoyé");
      setPwd({ current: "", next: "", confirm: "" });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPwd(false);
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setSavingEmail(true);
    try {
      await apiFetch("/api/auth/me/email", { method: "POST", body: emailForm });
      toast.success("Vérifie ta nouvelle adresse pour confirmer — tu recevras un lien de confirmation");
      setEmailForm({ newEmail: "", currentPassword: "" });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingEmail(false);
    }
  }

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
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-900">Paramètres</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-ink-300/60 bg-white p-5">
            <h2 className="mb-1 text-sm font-semibold text-ink-700">Compte</h2>
            <p className="text-sm text-ink-500">
              {user?.firstName} {user?.lastName} · {user?.email}
            </p>
          </div>

          <form onSubmit={handleProfileSubmit} className="rounded-xl border border-ink-300/60 bg-white p-5">
            <h2 className="text-sm font-semibold text-ink-700">Profil</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Prénom</label>
                <input
                  required
                  className={inputClass}
                  value={profile.firstName}
                  onChange={(e) => setProfile((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Nom</label>
                <input
                  required
                  className={inputClass}
                  value={profile.lastName}
                  onChange={(e) => setProfile((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {savingProfile ? "Enregistrement…" : "Enregistrer"}
            </button>
          </form>

          <form onSubmit={handleEmailSubmit} className="rounded-xl border border-ink-300/60 bg-white p-5">
            <h2 className="text-sm font-semibold text-ink-700">Adresse email</h2>
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <label className={labelClass}>Nouvel email</label>
                <input
                  type="email"
                  required
                  className={inputClass}
                  value={emailForm.newEmail}
                  onChange={(e) => setEmailForm((f) => ({ ...f, newEmail: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Mot de passe actuel</label>
                <input
                  type="password"
                  required
                  className={inputClass}
                  value={emailForm.currentPassword}
                  onChange={(e) => setEmailForm((f) => ({ ...f, currentPassword: e.target.value }))}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingEmail}
              className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {savingEmail ? "Envoi…" : "Changer d'email"}
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-6">
          <form onSubmit={handlePasswordSubmit} className="rounded-xl border border-ink-300/60 bg-white p-5">
            <h2 className="text-sm font-semibold text-ink-700">Mot de passe</h2>
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <label className={labelClass}>Mot de passe actuel</label>
                <input
                  type="password"
                  required
                  className={inputClass}
                  value={pwd.current}
                  onChange={(e) => setPwd((f) => ({ ...f, current: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className={inputClass}
                  value={pwd.next}
                  onChange={(e) => setPwd((f) => ({ ...f, next: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className={inputClass}
                  value={pwd.confirm}
                  onChange={(e) => setPwd((f) => ({ ...f, confirm: e.target.value }))}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingPwd}
              className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {savingPwd ? "Modification…" : "Changer le mot de passe"}
            </button>
          </form>

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
      </div>
    </div>
  );
}
