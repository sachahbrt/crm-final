import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { apiFetch } from "../api";
import { useAuth } from "../context/useAuth";

const STATUS_STYLE = {
  actif: "bg-good/10 text-good",
  inactif: "bg-muted/15 text-ink-500",
  "à recontacter": "bg-warning/10 text-warning",
};

function Tile({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-ink-300/60 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-ink-500">{label}</div>
        {icon && (
          <div className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-1 text-3xl font-semibold text-ink-900">{value}</div>
    </div>
  );
}

const TILE_COUNT = 4;
const SWIPE_THRESHOLD = 45; // px before a drag counts as a swipe, not a tap
const BIRTHDAY_WINDOW_DAYS = 30;

// Days from today (midnight) to this contact's next birthday occurrence,
// rolling to next year if this year's has already passed.
function daysUntilBirthday(birthday) {
  const bday = new Date(birthday);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(today.getFullYear(), bday.getUTCMonth(), bday.getUTCDate());
  if (next < today) next.setFullYear(next.getFullYear() + 1);
  return Math.round((next - today) / 86400000);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentContacts, setRecentContacts] = useState(null);
  const [allContacts, setAllContacts] = useState(null);
  const [slide, setSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const dragStartX = useRef(null);

  // Mobile carousel: one tile at a time, dragged/swiped with a translateX
  // track, wrapping at both ends — the desktop grid (sm:) doesn't use any of
  // this, so it only applies the transform while actually below that
  // breakpoint (a plain CSS media query can't be conditioned on JS state).
  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 640);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function handleDragStart(e) {
    dragStartX.current = e.clientX;
  }

  function handleDragEnd(e) {
    if (dragStartX.current == null) return;
    const delta = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (delta <= -SWIPE_THRESHOLD) setSlide((i) => (i + 1) % TILE_COUNT);
    else if (delta >= SWIPE_THRESHOLD) setSlide((i) => (i - 1 + TILE_COUNT) % TILE_COUNT);
  }

  useEffect(() => {
    apiFetch("/api/stats")
      .then(setStats)
      .catch((err) => toast.error(err.message));
    apiFetch("/api/contacts?limit=5")
      .then((data) => setRecentContacts(data.contacts))
      .catch((err) => toast.error(err.message));
    apiFetch("/api/contacts?limit=1000")
      .then((data) => setAllContacts(data.contacts))
      .catch((err) => toast.error(err.message));
  }, []);

  const totalContacts = stats?.byCategory.reduce((sum, c) => sum + c.count, 0) ?? 0;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const addedThisMonth = stats?.byMonth.find((m) => m.month === currentMonth)?.count ?? 0;
  const topCategory = stats?.byCategory.reduce((best, c) => (!best || c.count > best.count ? c : best), null);

  const upcomingBirthdays = (allContacts || [])
    .filter((c) => c.birthday)
    .map((c) => ({ ...c, daysUntil: daysUntilBirthday(c.birthday) }))
    .filter((c) => c.daysUntil <= BIRTHDAY_WINDOW_DAYS)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-900">Bonjour, {user?.firstName} 👋</h1>

      {!stats ? (
        <div className="text-sm text-ink-500">Chargement…</div>
      ) : (
        <>
          <div className="overflow-hidden sm:overflow-visible">
            <div
              onPointerDown={handleDragStart}
              onPointerUp={handleDragEnd}
              style={isMobile ? { transform: `translateX(-${slide * 100}%)` } : undefined}
              className="flex touch-pan-y transition-transform duration-300 ease-out sm:grid sm:grid-cols-2 sm:gap-4 sm:transition-none lg:grid-cols-4"
            >
              <div className="w-full shrink-0 sm:w-auto sm:shrink">
                <Tile
                  label="Contacts au total"
                  value={totalContacts}
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
                      <circle cx="9" cy="8" r="3.2" />
                      <path d="M3.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" strokeLinecap="round" />
                      <circle cx="17" cy="9" r="2.4" />
                      <path d="M15.5 20c0-2.3 1.6-4.2 3.6-4.8" strokeLinecap="round" />
                    </svg>
                  }
                />
              </div>
              <div className="w-full shrink-0 sm:w-auto sm:shrink">
                <Tile
                  label="À recontacter"
                  value={stats.toRecontact.count}
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
                      <circle cx="12" cy="12" r="8" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  }
                />
              </div>
              <div className="w-full shrink-0 sm:w-auto sm:shrink">
                <Tile
                  label="Ajoutés ce mois-ci"
                  value={addedThisMonth}
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                  }
                />
              </div>
              <div className="w-full shrink-0 sm:w-auto sm:shrink">
                <Tile
                  label="Catégorie principale"
                  value={topCategory ? topCategory.category : "—"}
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
                      <path d="M4 20V10M12 20V4M20 20v-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                />
              </div>
            </div>
          </div>
        </>
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

      {upcomingBirthdays.length > 0 && (
        <div className="rounded-xl border border-ink-300/60 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Anniversaires à venir</h2>
          </div>

          <ul className="divide-y divide-ink-300/40">
            {upcomingBirthdays.map((c) => (
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
                    <div className="text-xs text-ink-500">
                      {new Date(c.birthday).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        timeZone: "UTC",
                      })}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-medium text-brand-600">
                  {c.daysUntil === 0 ? "aujourd'hui !" : c.daysUntil === 1 ? "demain" : `dans ${c.daysUntil} jours`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
