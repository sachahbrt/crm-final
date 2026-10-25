import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../api";
import ContactModal from "./ContactModal";
import ContactDetailCard from "../components/ContactDetailCard";
import Select from "../components/Select";

const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "actif", label: "Actif" },
  { value: "inactif", label: "Inactif" },
  { value: "à recontacter", label: "À recontacter" },
];

const LIMIT = 10;

const STATUS_STYLE = {
  actif: "bg-good/10 text-good",
  inactif: "bg-muted/15 text-ink-500",
  "à recontacter": "bg-warning/10 text-warning",
};

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, contact = edit
  const [viewing, setViewing] = useState(null); // contact shown in the read-only detail panel
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setPage(1), 0);
    return () => clearTimeout(timeout);
  }, [search, category, status]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (status) params.set("status", status);
      apiFetch(`/api/contacts?${params}`)
        .then((data) => {
          setContacts(data.contacts);
          setTotal(data.total);
        })
        .catch((err) => toast.error(err.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search, category, status, page, refreshKey]);

  async function handleDelete(contact) {
    if (!window.confirm(`Supprimer ${contact.firstName} ${contact.lastName} ?`)) return;
    try {
      await apiFetch(`/api/contacts/${contact._id}`, { method: "DELETE" });
      toast.success("Contact supprimé");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink-900">Contacts</h1>
        <button
          type="button"
          onClick={() => setEditing({})}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Ajouter un contact
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          placeholder="Rechercher par nom…"
          className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 sm:w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          placeholder="Catégorie"
          className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 sm:w-40"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <Select className="sm:w-44" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-300/60 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-ink-300/60 bg-ink-100/60 text-ink-500">
            <tr>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Entreprise</th>
              <th className="px-4 py-3 font-medium">Catégorie</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {!loading && contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-500">
                  Aucun contact ne correspond à ces critères.
                </td>
              </tr>
            )}
            {contacts.map((c) => (
              <tr key={c._id} className="border-b border-ink-300/40 last:border-0 hover:bg-ink-100/40">
                <td
                  className="flex cursor-pointer items-center gap-3 px-4 py-3"
                  onClick={() => setViewing(c)}
                >
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
                    <div className="font-medium text-ink-900">
                      {c.firstName} {c.lastName}
                    </div>
                    <div className="text-xs text-ink-500">{c.email}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-700">{c.company || "—"}</td>
                <td className="px-4 py-3 text-ink-700">{c.category || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[c.status] || "bg-ink-100 text-ink-500"}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => setEditing(c)} className="mr-3 text-sm font-medium text-brand-600 hover:underline">
                    Modifier
                  </button>
                  <button type="button" onClick={() => handleDelete(c)} className="text-sm font-medium text-red-600 hover:underline">
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-500">
        <span>{total} contact{total > 1 ? "s" : ""}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-ink-300 px-3 py-1.5 disabled:opacity-40"
          >
            Précédent
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-ink-300 px-3 py-1.5 disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      </div>

      {editing !== null && (
        <ContactModal
          contact={editing._id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {viewing !== null && (
        <ContactDetailCard
          contact={viewing}
          onClose={() => setViewing(null)}
          onEdit={(c) => {
            setViewing(null);
            setEditing(c);
          }}
          onDelete={(c) => {
            setViewing(null);
            handleDelete(c);
          }}
        />
      )}
    </div>
  );
}
