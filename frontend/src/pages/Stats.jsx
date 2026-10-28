import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiFetch } from "../api";
import Select from "../components/Select";

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

const RANGE_OPTIONS = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "12m", label: "12 mois" },
];

// `timeline[].label` is "YYYY-MM-DD" for 7d/30d, "YYYY-MM" for 12m.
function formatTimelineLabel(label, range) {
  if (range === "12m") {
    const month = Number(label.split("-")[1]) - 1;
    return MONTH_LABELS[month] || label;
  }
  const date = new Date(`${label}T00:00:00`);
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function Tile({ label, value, sub }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-ink-300/60 bg-white p-5">
      <div className="flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-brand-500" />
        <span className="flex-1 text-sm font-bold text-ink-900">{label}</span>
      </div>
      <div>
        <span className="truncate font-display text-[30px] font-extrabold text-ink-900">{value}</span>
        {sub && <div className="mt-0.5 text-xs text-ink-500">{sub}</div>}
      </div>
    </div>
  );
}

function BreakdownRow({ row, total, isFirst }) {
  return (
    <div className={isFirst ? "" : "border-t border-ink-100 pt-3"}>
      <div className="mb-0.5 flex justify-between text-[13px]">
        <span className="font-semibold text-ink-900">{row.label}</span>
        <span className="text-ink-500">{total ? Math.round((row.count / total) * 100) : 0}%</span>
      </div>
      <div className="font-display text-xl font-extrabold text-ink-900">{row.count}</div>
    </div>
  );
}

// `maxRows`: when rows exceed it, show only the first `maxRows` and add a
// small arrow button that opens a modal with the full, untruncated list.
function BreakdownCard({ title, rows, total, highlight, maxRows }) {
  const [expanded, setExpanded] = useState(false);
  const isTruncated = maxRows && rows.length > maxRows;
  const visibleRows = isTruncated ? rows.slice(0, maxRows) : rows;

  return (
    <div
      className={`flex flex-col gap-3.5 rounded-xl border bg-white p-5 ${
        highlight ? "border-2 border-brand-500" : "border-ink-300/60"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`size-1.5 rounded-full ${highlight ? "bg-warning" : "bg-brand-500"}`} />
        <span className="flex-1 text-sm font-bold text-ink-900">{title}</span>
        <span className="text-[11px] text-ink-500">{total}</span>
        {isTruncated && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={`Voir tout : ${title}`}
            className="flex size-5 items-center justify-center rounded-md text-ink-500 hover:bg-ink-100 hover:text-ink-900"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H8M17 7V16" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {visibleRows.map((row, i) => (
          <BreakdownRow key={row.label} row={row} total={total} isFirst={i === 0} />
        ))}
        {rows.length === 0 && <span className="text-sm text-ink-500">Pas encore de données.</span>}
      </div>

      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setExpanded(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-900">{title}</h3>
              <button type="button" onClick={() => setExpanded(false)} className="text-ink-500 hover:text-ink-900">
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {rows.map((row, i) => (
                <BreakdownRow key={row.label} row={row} total={total} isFirst={i === 0} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Stats() {
  const [stats, setStats] = useState(null);
  const [statusCounts, setStatusCounts] = useState(null);
  const [range, setRange] = useState("12m");

  useEffect(() => {
    Promise.all([
      apiFetch(`/api/stats?range=${range}`),
      apiFetch("/api/contacts?status=actif&limit=1"),
      apiFetch("/api/contacts?status=inactif&limit=1"),
    ])
      .then(([statsData, actifData, inactifData]) => {
        setStats(statsData);
        setStatusCounts({ actif: actifData.total, inactif: inactifData.total });
      })
      .catch((err) => toast.error(err.message));
  }, [range]);

  if (!stats || !statusCounts) return <div className="text-sm text-ink-500">Chargement des statistiques…</div>;

  const totalContacts = stats.byCategory.reduce((sum, c) => sum + c.count, 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const addedThisMonth = stats.byMonth.find((m) => m.month === currentMonth)?.count ?? 0;

  const statusRows = [
    { label: "Actif", count: statusCounts.actif },
    { label: "Inactif", count: statusCounts.inactif },
    { label: "À recontacter", count: stats.toRecontact.count },
  ];

  const timeline = (stats.timeline || []).map((t) => ({ ...t, display: formatTimelineLabel(t.label, range) }));
  // Skip ticks so the X axis stays readable at 30 points without listing every day.
  const tickInterval = Math.max(Math.ceil(timeline.length / 7) - 1, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Statistiques</h1>
        <p className="text-sm text-ink-500">Suivez votre réseau, vos catégories et vos contacts à recontacter.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Tile label="Contacts au total" value={totalContacts} sub={`${addedThisMonth} ajoutés ce mois-ci`} />
        <Tile
          label="Top entreprise"
          value={stats.topCompany?.company || "—"}
          sub={stats.topCompany ? `${stats.topCompany.count} contact${stats.topCompany.count > 1 ? "s" : ""}` : "Aucune entreprise renseignée"}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <BreakdownCard
          title="Catégories"
          total={totalContacts}
          rows={stats.byCategory.map((c) => ({ label: c.category || "Sans catégorie", count: c.count }))}
          maxRows={3}
        />
        <BreakdownCard title="Statuts" total={totalContacts} rows={statusRows} />
        <BreakdownCard
          title="Lieux de rencontre"
          total={totalContacts}
          rows={stats.byLocation.map((l) => ({ label: l.location, count: l.count }))}
          maxRows={3}
        />
        <BreakdownCard
          title="Contacts à recontacter"
          total={totalContacts}
          rows={[{ label: "À recontacter", count: stats.toRecontact.count }]}
          highlight
        />
      </div>

      <div className="rounded-xl border border-ink-300/60 bg-white p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold text-ink-900">Contacts ajoutés</span>
            <span className="text-xs text-ink-500">
              Évolution sur {RANGE_OPTIONS.find((o) => o.value === range)?.label.toLowerCase()}
            </span>
          </div>
          <Select className="w-32" value={range} onChange={setRange} options={RANGE_OPTIONS} />
        </div>

        {timeline.length === 0 ? (
          <p className="text-sm text-ink-500">Pas encore assez de données pour afficher une tendance.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timeline} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--color-ink-300)" strokeOpacity={0.6} />
              <XAxis
                dataKey="display"
                interval={tickInterval}
                tick={{ fontSize: 11, fill: "var(--color-ink-500)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-ink-500)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, borderColor: "var(--color-ink-300)", fontSize: 12 }}
                labelStyle={{ color: "var(--color-ink-900)", fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--color-brand-500)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--color-brand-500)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4 text-sm">
          <span className="text-ink-500">{totalContacts} contacts au total</span>
          <Link to="/contacts" className="font-semibold text-brand-600 hover:underline">
            Voir les contacts →
          </Link>
        </div>
      </div>

      {stats.toRecontact.contacts.length > 0 && (
        <div className="rounded-xl border border-ink-300/60 bg-white p-6">
          <h2 className="mb-3 text-sm font-bold text-ink-900">Contacts à recontacter</h2>
          <ul className="flex flex-col gap-2">
            {stats.toRecontact.contacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg bg-ink-100/60 px-3 py-2 text-sm">
                <span className="text-ink-900">
                  {c.firstName} {c.lastName}
                </span>
                <Link to="/contacts" className="font-medium text-brand-600 hover:underline">
                  Voir
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
