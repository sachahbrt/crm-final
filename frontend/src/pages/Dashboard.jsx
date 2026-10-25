import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { apiFetch } from "../api";
import { useAuth } from "../context/useAuth";

const STATUS_STYLE = {
  actif: "bg-good/10 text-good",
  inactif: "bg-muted/15 text-ink-500",
  "à recontacter": "bg-warning/10 text-warning",
};

function Tile({ label, value }) {
  return (
    <div className="rounded-xl border border-ink-300/60 bg-white p-5">
      <div className="text-sm text-ink-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-ink-900">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentContacts, setRecentContacts] = useState(null);

  useEffect(() => {
    apiFetch("/api/stats")
      .then(setStats)
      .catch((err) => toast.error(err.message));
    apiFetch("/api/contacts?limit=5")
      .then((data) => setRecentContacts(data.contacts))
      .catch((err) => toast.error(err.message));
  }, []);

  const totalContacts = stats?.byCategory.reduce((sum, c) => sum + c.count, 0) ?? 0;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const addedThisMonth = stats?.byMonth.find((m) => m.month === currentMonth)?.count ?? 0;
  const topCategory = stats?.byCategory.reduce((best, c) => (!best || c.count > best.count ? c : best), null);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-900">Bonjour, {user?.firstName} 👋</h1>

      {!stats ? (
        <div className="text-sm text-ink-500">Chargement…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Contacts au total" value={totalContacts} />
          <Tile label="À recontacter" value={stats.toRecontact.count} />
          <Tile label="Ajoutés ce mois-ci" value={addedThisMonth} />
          <Tile label="Catégorie principale" value={topCategory ? topCategory.category : "—"} />
        </div>
      )}

      <div className="rounded-xl border border-ink-300/60 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Contacts récents</h2>
          <Link to="/contacts" className="text-sm font-medium text-brand-600 hover:underline">
            Voir plus
          </Link>
        </div>

        {!recentContacts ? (
          <div className="text-sm text-ink-500">Chargement…</div>
        ) : recentContacts.length === 0 ? (
          <div className="text-sm text-ink-500">Aucun contact pour l'instant.</div>
        ) : (
          <ul className="divide-y divide-ink-300/40">
            {recentContacts.map((c) => (
              <li key={c._id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-ink-100 text-ink-500">
                    {c.photoUrl ? (
                      <img src={c.photoUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold">
                        {c.firstName?.[0]}
                        {c.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-ink-900">
                      {c.firstName} {c.lastName}
                    </div>
                    <div className="text-xs text-ink-500">{c.category || "—"}</div>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[c.status] || "bg-ink-100 text-ink-500"}`}>
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
