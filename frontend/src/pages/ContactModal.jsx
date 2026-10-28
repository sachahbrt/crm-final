import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../api";
import Select from "../components/Select";
import DatePicker from "../components/DatePicker";

const inputClass =
  "w-full rounded-lg border border-ink-300 px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const labelClass = "mb-1 block text-sm font-medium text-ink-700";

const STATUSES = ["actif", "inactif", "à recontacter"];
const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: s }));

const KNOWN_PLATFORMS = ["LinkedIn", "Instagram", "Twitter / X", "Facebook", "TikTok", "YouTube", "GitHub", "Site web"];
const OTHER_PLATFORM = "__other__";
const PLATFORM_OPTIONS = [...KNOWN_PLATFORMS.map((p) => ({ value: p, label: p })), { value: OTHER_PLATFORM, label: "Autre…" }];

function emptyForm() {
  return {
    firstName: "",
    lastName: "",
    photoUrl: "",
    birthday: "",
    meetingDate: "",
    meetingPlace: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
    socialNetworks: [],
    category: "",
    notes: "",
    status: "actif",
  };
}

function toForm(contact) {
  if (!contact) return emptyForm();
  return {
    ...emptyForm(),
    ...contact,
    birthday: contact.birthday ? contact.birthday.slice(0, 10) : "",
    meetingDate: contact.meetingDate ? contact.meetingDate.slice(0, 10) : "",
    socialNetworks: (contact.socialNetworks || []).map((sn) => ({
      platform: sn.platform || "",
      url: sn.url || "",
      custom: Boolean(sn.platform) && !KNOWN_PLATFORMS.includes(sn.platform),
    })),
  };
}

export default function ContactModal({ contact, onClose, onSaved }) {
  const [form, setForm] = useState(() => toForm(contact));
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);
  const isEdit = Boolean(contact);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function setValue(field) {
    return (value) => setForm((f) => ({ ...f, [field]: value }));
  }

  function addSocialNetwork() {
    setForm((f) => ({ ...f, socialNetworks: [...f.socialNetworks, { platform: "", url: "", custom: false }] }));
  }

  function updateSocialNetwork(i, patch) {
    setForm((f) => ({
      ...f,
      socialNetworks: f.socialNetworks.map((sn, idx) => (idx === i ? { ...sn, ...patch } : sn)),
    }));
  }

  function removeSocialNetwork(i) {
    setForm((f) => ({ ...f, socialNetworks: f.socialNetworks.filter((_, idx) => idx !== i) }));
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("photo", file);
      const data = await apiFetch("/api/contacts/upload-photo", { method: "POST", body, raw: true });
      setForm((f) => ({ ...f, photoUrl: data.url }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      photoUrl: form.photoUrl,
      birthday: form.birthday || undefined,
      meetingDate: form.meetingDate || undefined,
      meetingPlace: form.meetingPlace,
      email: form.email,
      phone: form.phone,
      company: form.company,
      jobTitle: form.jobTitle,
      socialNetworks: form.socialNetworks
        .filter((sn) => sn.platform || sn.url)
        .map(({ platform, url }) => ({ platform, url })),
      category: form.category,
      notes: form.notes,
      status: form.status,
    };
    try {
      if (isEdit) {
        await apiFetch(`/api/contacts/${contact._id}`, { method: "PUT", body: payload });
        toast.success("Contact mis à jour");
      } else {
        await apiFetch("/api/contacts", { method: "POST", body: payload });
        toast.success("Contact ajouté");
      }
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">{isEdit ? "Modifier le contact" : "Ajouter un contact"}</h2>
          <button type="button" onClick={onClose} className="text-ink-500 hover:text-ink-900">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-ink-100 text-ink-500">
              {form.photoUrl ? (
                <img src={form.photoUrl} alt="" className="size-full object-cover" />
              ) : (
                <span className="text-xl">{form.firstName?.[0] || "?"}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100 disabled:opacity-60"
            >
              {uploading ? "Envoi…" : "Changer la photo"}
            </button>
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Prénom <span className="text-red-600">*</span></label>
              <input required className={inputClass} value={form.firstName} onChange={set("firstName")} />
            </div>
            <div>
              <label className={labelClass}>Nom <span className="text-red-600">*</span></label>
              <input required className={inputClass} value={form.lastName} onChange={set("lastName")} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" className={inputClass} value={form.email} onChange={set("email")} />
            </div>
            <div>
              <label className={labelClass}>Téléphone</label>
              <input className={inputClass} value={form.phone} onChange={set("phone")} />
            </div>
            <div>
              <label className={labelClass}>Entreprise</label>
              <input className={inputClass} value={form.company} onChange={set("company")} />
            </div>
            <div>
              <label className={labelClass}>Poste occupé</label>
              <input className={inputClass} value={form.jobTitle} onChange={set("jobTitle")} />
            </div>
            <div>
              <label className={labelClass}>Date de naissance</label>
              <DatePicker value={form.birthday} onChange={setValue("birthday")} />
            </div>
            <div>
              <label className={labelClass}>Date de rencontre</label>
              <DatePicker value={form.meetingDate} onChange={setValue("meetingDate")} />
            </div>
            <div>
              <label className={labelClass}>Lieu de rencontre</label>
              <input className={inputClass} value={form.meetingPlace} onChange={set("meetingPlace")} />
            </div>
            <div>
              <label className={labelClass}>Catégorie <span className="text-red-600">*</span></label>
              <input required list="categories" placeholder="Pro, Perso, Réseau…" className={inputClass} value={form.category} onChange={set("category")} />
              <datalist id="categories">
                <option value="Pro" />
                <option value="Perso" />
                <option value="Réseau" />
              </datalist>
            </div>
            <div>
              <label className={labelClass}>Statut</label>
              <Select value={form.status} onChange={setValue("status")} options={STATUS_OPTIONS} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Réseaux sociaux</label>
            <div className="flex flex-col gap-2">
              {form.socialNetworks.map((sn, i) => (
                <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <div className="sm:w-48 sm:shrink-0">
                    <Select
                      value={sn.custom ? OTHER_PLATFORM : sn.platform}
                      onChange={(val) =>
                        updateSocialNetwork(i, val === OTHER_PLATFORM ? { custom: true, platform: "" } : { custom: false, platform: val })
                      }
                      options={PLATFORM_OPTIONS}
                    />
                    {sn.custom && (
                      <input
                        autoFocus
                        placeholder="Nom du réseau"
                        className={`${inputClass} mt-2`}
                        value={sn.platform}
                        onChange={(e) => updateSocialNetwork(i, { platform: e.target.value })}
                      />
                    )}
                  </div>
                  <input
                    placeholder="Lien du profil"
                    className={`${inputClass} flex-1`}
                    value={sn.url}
                    onChange={(e) => updateSocialNetwork(i, { url: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removeSocialNetwork(i)}
                    aria-label="Retirer ce réseau"
                    className="flex shrink-0 items-center justify-center rounded-lg border border-ink-300 p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16ZM10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addSocialNetwork}
              className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              + Ajouter un réseau
            </button>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea rows={3} className={inputClass} value={form.notes} onChange={set("notes")} />
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-ink-300 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100">
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
