import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../api";
import ContactModal from "./ContactModal";
import MiniNetworkGraph from "../components/MiniNetworkGraph";
import Select from "../components/Select";
import { brandfetchLogoUrl, resolveCompanyDomains } from "../lib/networkGraph";

// Small circular company logo (Brandfetch), used wherever a company name is
// listed. Renders nothing — not a broken-image icon — if there's no URL or
// the image fails to load, so a missing/unresolved logo never looks broken.
function CompanyLogo({ company, domain }) {
  const [failed, setFailed] = useState(false);
  const url = company ? brandfetchLogoUrl(company, domain) : null;
  if (!url || failed) return null;
  return (
    <img
      src={url}
      alt=""
      className="size-4 shrink-0 rounded-full bg-white object-contain ring-1 ring-ink-300/60"
      onError={() => setFailed(true)}
    />
  );
}

// Clickable column header: arrow shows nothing when this column isn't the
// active sort, ▲/▼ once it is. "Entreprise"/"Catégorie" sort A→Z then Z→A;
// "Statut" instead orders à recontacter → inactif → actif, then reversed —
// that distinction lives in the backend sort, this button is just the toggle.
function SortButton({ field, sortBy, sortDir, onClick, children }) {
  const active = sortBy === field;
  return (
    <button type="button" onClick={() => onClick(field)} className="flex items-center gap-1 hover:text-ink-900">
      {children}
      <span className="text-[10px] text-ink-500">{active ? (sortDir === "asc" ? "▲" : "▼") : ""}</span>
    </button>
  );
}

const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "actif", label: "Actif" },
  { value: "inactif", label: "Inactif" },
  { value: "à recontacter", label: "À recontacter" },
];

const LIMIT = 10;

// Same rounded-rectangle chip, same brand color, for every category/status
// value — matches the site's other rounded elements (buttons use rounded-lg)
// instead of the previous full pill shape.
// ink-900 is the site's dark navy blue (same shade as the sidebar) — there's
// no separate "blue" token in the palette. Outlined, not filled: border +
// text in that color, no background fill.
const BADGE_CLASS = "rounded-lg border border-ink-900 px-2.5 py-1 text-xs font-medium text-ink-900";
const STATUS_BADGE_CLASS = `${BADGE_CLASS} uppercase`;

// Builds a compact page-number list with an ellipsis, e.g. 1 2 3 … 31,
// instead of rendering every page button when there are many.
function pageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, contact = edit
  const [selected, setSelected] = useState(null); // contact shown in the docked side panel
  const [refreshKey, setRefreshKey] = useState(0);
  const [categoryStats, setCategoryStats] = useState(null); // [{category,count}] for the tab bar
  const [allContacts, setAllContacts] = useState(null); // unpaginated, for the side panel's mini network graph
  const [companyDomains, setCompanyDomains] = useState(new Map()); // resolved via Brand Search, for CompanyLogo
  const [sortBy, setSortBy] = useState(null); // "company" | "category" | "status" | null
  const [sortDir, setSortDir] = useState("asc");

  // Clicking a sortable column: switches to it ascending, or flips direction
  // if it's already the active column.
  function toggleSort(field) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  }

  useEffect(() => {
    const names = contacts.map((c) => c.company?.trim()).filter(Boolean);
    if (names.length === 0) return;
    resolveCompanyDomains(names).then((resolved) =>
      setCompanyDomains((prev) => new Map([...prev, ...resolved]))
    );
  }, [contacts]);

  useEffect(() => {
    apiFetch("/api/contacts?limit=1000")
      .then((data) => setAllContacts(data.contacts))
      .catch(() => setAllContacts([]));
  }, [refreshKey]);

  useEffect(() => {
    const timeout = setTimeout(() => setPage(1), 0);
    return () => clearTimeout(timeout);
  }, [search, category, status, sortBy, sortDir]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (status) params.set("status", status);
      if (sortBy) {
        params.set("sortBy", sortBy);
        params.set("sortDir", sortDir);
      }
      apiFetch(`/api/contacts?${params}`)
        .then((data) => {
          setContacts(data.contacts);
          setTotal(data.total);
          setSelected((prev) =>
            prev && data.contacts.some((c) => c._id === prev._id) ? prev : data.contacts[0] || null
          );
        })
        .catch((err) => toast.error(err.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search, category, status, page, sortBy, sortDir, refreshKey]);

  useEffect(() => {
    apiFetch("/api/stats")
      .then((data) => setCategoryStats(data.byCategory))
      .catch(() => setCategoryStats([]));
  }, [refreshKey]);

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
  const allCount = categoryStats ? categoryStats.reduce((sum, c) => sum + c.count, 0) : null;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Contacts</h1>
          <p className="text-sm text-ink-500">Suivez vos relations personnelles et professionnelles, bien gardées au même endroit.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({})}
          className="flex h-[42px] items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-4">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Ajouter un contact
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="flex flex-col gap-4 rounded-2xl border border-ink-300/60 bg-white p-5">
          <div className="flex gap-5 overflow-x-auto border-b border-ink-100 text-sm">
            <button
              type="button"
              onClick={() => setCategory("")}
              className={`shrink-0 whitespace-nowrap border-b-2 pb-3 font-semibold ${
                category === "" ? "border-brand-500 text-ink-900" : "border-transparent text-ink-500"
              }`}
            >
              Tous les contacts {allCount !== null && <span className="text-ink-500">{allCount}</span>}
            </button>
            {(categoryStats || []).map((c) => (
              <button
                key={c.category || "—"}
                type="button"
                onClick={() => setCategory(c.category || "")}
                className={`shrink-0 whitespace-nowrap border-b-2 pb-3 font-semibold ${
                  category === c.category ? "border-brand-500 text-ink-900" : "border-transparent text-ink-500"
                }`}
              >
                {c.category || "Sans catégorie"} <span>{c.count}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex min-w-[160px] flex-1 items-center gap-2 rounded-lg border border-ink-300 bg-ink-100/60 px-3 py-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 shrink-0 text-ink-500">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Rechercher un nom…"
                className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select className="w-44" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </div>

          <div className="overflow-hidden rounded-xl border border-ink-300/60">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-ink-300/60 bg-ink-100/60 text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      <SortButton field="name" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort}>
                        Contact
                      </SortButton>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <SortButton field="company" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort}>
                        Entreprise
                      </SortButton>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <SortButton field="category" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort}>
                        Catégorie
                      </SortButton>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <SortButton field="status" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort}>
                        Statut
                      </SortButton>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && contacts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-ink-500">
                        Aucun contact ne correspond à ces critères.
                      </td>
                    </tr>
                  )}
                  {contacts.map((c) => (
                    <tr
                      key={c._id}
                      onClick={() => setSelected(c)}
                      className={`cursor-pointer border-b border-ink-300/40 last:border-0 ${
                        selected?._id === c._id ? "bg-brand-50/60" : "hover:bg-ink-100/40"
                      }`}
                    >
                      <td className="flex items-center gap-3 px-4 py-3">
                        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-100 text-ink-500">
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
                      <td className="px-4 py-3 text-ink-700">
                        {c.company ? (
                          <span className="flex items-center gap-2">
                            <CompanyLogo company={c.company} domain={companyDomains.get(c.company)} />
                            {c.company}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.category ? <span className={BADGE_CLASS}>{c.category}</span> : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={STATUS_BADGE_CLASS}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-500">
            <span>
              {total} contact{total > 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Page précédente"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex size-8 items-center justify-center rounded-lg border border-ink-300 disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="size-3.5">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              {pageList(page, totalPages).map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="px-1 text-ink-500">
                    …
                  </span>
                ) : (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPage(p)}
                    className={`flex size-8 items-center justify-center rounded-lg text-sm font-semibold ${
                      p === page ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-ink-100"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                type="button"
                aria-label="Page suivante"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex size-8 items-center justify-center rounded-lg border border-ink-300 disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="size-3.5">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <ContactPreviewCard
          contact={selected}
          allContacts={allContacts}
          onEdit={(c) => setEditing(c)}
          onDelete={handleDelete}
          onUpdated={setSelected}
        />
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
    </div>
  );
}

function ContactPreviewCard({ contact, allContacts, onEdit, onDelete, onUpdated }) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(contact?.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  // Reset the draft when a different contact is selected (not when the same
  // contact's notes change, e.g. right after saving) — the render-time state
  // adjustment pattern, since an effect here would cause an extra render.
  const [shownContactId, setShownContactId] = useState(contact?._id);
  if (contact?._id !== shownContactId) {
    setShownContactId(contact?._id);
    setEditingNotes(false);
    setNotesDraft(contact?.notes || "");
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      const { contact: updated } = await apiFetch(`/api/contacts/${contact._id}`, { method: "PUT", body: { notes: notesDraft } });
      onUpdated(updated);
      setEditingNotes(false);
      toast.success("Notes mises à jour");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingNotes(false);
    }
  }

  if (!contact) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-2xl border border-ink-300/60 bg-white p-6 text-center text-sm text-ink-500">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-8 text-ink-300">
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" strokeLinecap="round" />
        </svg>
        Sélectionnez un contact pour voir sa fiche.
      </div>
    );
  }

  const meeting = [contact.meetingPlace, contact.meetingDate ? new Date(contact.meetingDate).toLocaleDateString("fr-FR") : null]
    .filter(Boolean)
    .join(" · ");
  const socials = (contact.socialNetworks || []).filter((sn) => sn.url);

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-ink-300/60 bg-white p-6">
      <span className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Fiche contact</span>

      <div className="flex flex-col items-center gap-2.5 text-center">
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-brand-500 text-xl font-extrabold text-white">
          {contact.photoUrl ? (
            <img src={contact.photoUrl} alt="" className="size-full object-cover" />
          ) : (
            <>
              {contact.firstName?.[0]}
              {contact.lastName?.[0]}
            </>
          )}
        </div>
        <div>
          <div className="font-display text-lg font-extrabold text-ink-900">
            {contact.firstName} {contact.lastName}
          </div>
          {(contact.jobTitle || contact.company) && (
            <div className="text-sm text-ink-500">{[contact.jobTitle, contact.company].filter(Boolean).join(" · ")}</div>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {contact.category && <span className={BADGE_CLASS}>{contact.category}</span>}
          {contact.status && <span className={STATUS_BADGE_CLASS}>{contact.status}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <a
          href={contact.email ? `mailto:${contact.email}` : undefined}
          aria-disabled={!contact.email}
          className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold ${
            contact.email ? "bg-brand-500 text-white hover:bg-brand-600" : "cursor-not-allowed bg-ink-100 text-ink-500"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
          E-mail
        </a>
        <a
          href={contact.phone ? `tel:${contact.phone}` : undefined}
          aria-disabled={!contact.phone}
          className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-semibold ${
            contact.phone ? "border-ink-300 text-ink-900 hover:bg-ink-100" : "cursor-not-allowed border-ink-300 text-ink-500"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z" />
          </svg>
          Appeler
        </a>
      </div>

      <div className="flex flex-col gap-2.5 border-t border-ink-100 pt-4 text-sm">
        {contact.email && (
          <div className="flex items-center gap-2.5 text-ink-900">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 shrink-0 text-ink-500">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            <span className="truncate">{contact.email}</span>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-2.5 text-ink-900">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 shrink-0 text-ink-500">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z" />
            </svg>
            <span>{contact.phone}</span>
          </div>
        )}
        {meeting && (
          <div className="flex items-center gap-2.5 text-ink-900">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 shrink-0 text-ink-500">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M3 10h18M8 2v4M16 2v4" />
            </svg>
            <span>{meeting}</span>
          </div>
        )}
        {socials.map((sn, i) => (
          <div key={i} className="flex items-center gap-2.5 text-ink-900">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 shrink-0 text-ink-500">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18" />
            </svg>
            <a href={sn.url} target="_blank" rel="noreferrer" className="truncate text-brand-600 hover:underline">
              {sn.platform || "Réseau social"}
            </a>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink-500">Notes libres</span>
          {!editingNotes && (
            <button
              type="button"
              onClick={() => setEditingNotes(true)}
              className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5">
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Modifier
            </button>
          )}
        </div>
        {editingNotes ? (
          <div className="flex flex-col gap-2">
            <textarea
              autoFocus
              rows={4}
              className="w-full resize-none rounded-xl border border-ink-300 bg-white p-3.5 text-sm leading-relaxed text-ink-900 outline-none focus:border-brand-500"
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingNotes(false);
                  setNotesDraft(contact.notes || "");
                }}
                className="rounded-lg border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={saveNotes}
                disabled={savingNotes}
                className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                Enregistrer
              </button>
            </div>
          </div>
        ) : contact.notes ? (
          <div className="whitespace-pre-wrap rounded-xl border border-ink-300/60 bg-ink-100/60 p-3.5 text-sm leading-relaxed text-ink-900">
            {contact.notes}
          </div>
        ) : (
          <span className="text-sm text-ink-500">Aucune note.</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-ink-100 pt-4">
        <span className="text-xs font-bold text-ink-500">Réseau</span>
        {allContacts === null ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-ink-500">Chargement…</div>
        ) : (
          <MiniNetworkGraph contacts={allContacts} contact={contact} />
        )}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-ink-100 pt-4 text-sm">
        <button type="button" onClick={() => onEdit(contact)} className="font-medium text-ink-700 hover:underline">
          Modifier
        </button>
        <button type="button" onClick={() => onDelete(contact)} className="font-medium text-red-600 hover:underline">
          Supprimer
        </button>
      </div>
    </div>
  );
}
