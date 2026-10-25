import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { apiFetch } from "../api";

// Fixed categorical order, validated for CVD-safe adjacency (see dataviz skill).
const CATEGORY_COLORS = ["#465FFF", "#17B26A", "#F79009", "#7A5AF8", "#0BA5EC", "#F97066"];

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-ink-300/60 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-ink-700">{title}</h2>
      {children}
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="rounded-xl border border-ink-300/60 bg-white p-5">
      <div className="text-sm text-ink-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-ink-900">{value}</div>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #E4E7EC",
  fontSize: 13,
  boxShadow: "0 4px 12px rgba(16,24,40,.08)",
};

export default function Stats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    apiFetch("/api/stats")
      .then(setStats)
      .catch((err) => toast.error(err.message));
  }, []);

  if (!stats) return <div className="text-sm text-ink-500">Chargement des statistiques…</div>;

  const totalContacts = stats.byCategory.reduce((sum, c) => sum + c.count, 0);
  const monthData = stats.byMonth.map((m) => ({ ...m, label: MONTH_LABELS[Number(m.month?.split("-")?.[1] || m.month) - 1] || m.month }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-900">Statistiques</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Tile label="Contacts au total" value={totalContacts} />
        <Tile label="À recontacter" value={stats.toRecontact.count} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Contacts par catégorie">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.byCategory} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid horizontal={false} stroke="#E4E7EC" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#667085" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 12, fill: "#344054" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F2F4F7" }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                {stats.byCategory.map((entry, i) => (
                  <Cell key={entry.category} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Répartition par lieu de rencontre">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.byLocation} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid horizontal={false} stroke="#E4E7EC" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#667085" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="location" width={90} tick={{ fontSize: 12, fill: "#344054" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F2F4F7" }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20} fill="#465FFF" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Contacts ajoutés par mois">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthData} margin={{ left: -8 }}>
              <CartesianGrid vertical={false} stroke="#E4E7EC" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#667085" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#667085" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F2F4F7" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={18} fill="#465FFF" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="À recontacter">
          {stats.toRecontact.contacts.length === 0 ? (
            <p className="text-sm text-ink-500">Rien en attente, tout est à jour.</p>
          ) : (
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
          )}
        </Card>
      </div>
    </div>
  );
}
