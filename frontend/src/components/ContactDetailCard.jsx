import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/useAuth";
import MiniNetworkGraph from "./MiniNetworkGraph";

const STATUS_STYLE = {
  actif: "bg-good/10 text-good",
  inactif: "bg-muted/15 text-ink-500",
  "à recontacter": "bg-warning/10 text-warning",
};

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="text-ink-900">{children}</dd>
    </div>
  );
}

export default function ContactDetailCard({ contact, onClose, onEdit, onDelete }) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [allContacts, setAllContacts] = useState(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    apiFetch("/api/contacts?limit=1000")
      .then((data) => setAllContacts(data.contacts))
      .catch(() => setAllContacts([]));
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 200);
  }

  if (!contact) return null;

  const social = contact.socialNetwork?.url ? contact.socialNetwork : null;
  const meeting = [formatDate(contact.meetingDate), contact.meetingPlace].filter(Boolean).join(" · ");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={handleClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-6 shadow-xl transition-transform duration-200 sm:p-8 ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-ink-900">Détail du contact</h2>
          <button type="button" onClick={handleClose} className="text-ink-500 hover:text-ink-900">
            ✕
          </button>
        </div>

        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex size-24 items-center justify-center overflow-hidden rounded-full bg-ink-100 text-ink-500">
            {contact.photoUrl ? (
              <img src={contact.photoUrl} alt="" className="size-full object-cover" />
            ) : (
              <span className="text-3xl font-semibold">
                {contact.firstName?.[0]}
                {contact.lastName?.[0]}
              </span>
            )}
          </div>
          <div className="text-xl font-semibold text-ink-900">
            {contact.firstName} {contact.lastName}
          </div>
          {(contact.jobTitle || contact.company) && (
            <div className="text-sm text-ink-500">
              {[contact.jobTitle, contact.company].filter(Boolean).join(" · ")}
            </div>
          )}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {contact.category && (
              <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-600">{contact.category}</span>
            )}
            {contact.status && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[contact.status] || "bg-ink-100 text-ink-500"}`}>
                {contact.status}
              </span>
            )}
          </div>
        </div>

        <dl className="flex flex-1 flex-col gap-4 text-sm">
          {contact.email && (
            <Field label="Email">
              <a href={`mailto:${contact.email}`} className="text-brand-600 hover:underline">
                {contact.email}
              </a>
            </Field>
          )}
          {contact.phone && <Field label="Téléphone">{contact.phone}</Field>}
          {meeting && <Field label="Rencontre">{meeting}</Field>}
          {social && (
            <Field label={social.platform || "Réseau social"}>
              <a href={social.url} target="_blank" rel="noreferrer" className="break-all text-brand-600 hover:underline">
                {social.url}
              </a>
            </Field>
          )}
          {contact.notes && (
            <Field label="Notes">
              <p className="whitespace-pre-wrap text-ink-700">{contact.notes}</p>
            </Field>
          )}
        </dl>

        <div className="mt-6 border-t border-ink-300/60 pt-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">Réseau</h3>
          {allContacts === null ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-ink-500">Chargement…</div>
          ) : (
            <MiniNetworkGraph contacts={allContacts} currentUser={user} contact={contact} />
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-ink-300/60 pt-4">
          <button
            type="button"
            onClick={() => onDelete(contact)}
            className="rounded-lg border border-ink-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Supprimer
          </button>
          <button
            type="button"
            onClick={() => onEdit(contact)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Modifier
          </button>
        </div>
      </div>
    </div>
  );
}
