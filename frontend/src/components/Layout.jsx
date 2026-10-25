import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const NAV = [
  { to: "/dashboard", label: "Tableau de bord", icon: HomeIcon },
  { to: "/contacts", label: "Contacts", icon: UsersIcon },
  { to: "/network", label: "Réseau", icon: NetworkIcon },
  { to: "/stats", label: "Statistiques", icon: ChartIcon },
  { to: "/settings", label: "Paramètres", icon: GearIcon },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-ink-300/60 bg-white transition-transform duration-200 lg:static lg:translate-x-0 lg:min-h-screen ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 px-6">
          <div className="flex size-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-semibold text-white">
            B
          </div>
          <span className="text-lg font-semibold text-ink-900">CRM Breece</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-600"
                    : "text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                }`
              }
            >
              <Icon className="size-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <ProfileMenu user={user} logout={logout} />
      </aside>

      <div className="flex-1 lg:min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-ink-300/60 bg-white px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-ink-700 hover:bg-ink-100 lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <MenuIcon className="size-6" />
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-semibold text-white">
              B
            </div>
            <span className="text-base font-semibold text-ink-900">CRM Breece</span>
          </div>
          <div className="hidden lg:block" />
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function ProfileMenu({ user, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative border-t border-ink-300/60 p-3">
      {open && (
        <div className="absolute inset-x-3 bottom-full mb-1 overflow-hidden rounded-lg border border-ink-300/60 bg-white shadow-lg">
          <NavLink
            to="/settings"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100"
          >
            Paramètres
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="block w-full px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-ink-100"
          >
            Déconnexion
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-ink-100"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {user?.firstName?.[0]?.toUpperCase()}
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-700">
          {user?.firstName} {user?.lastName}
        </span>
      </button>
    </div>
  );
}

function MenuIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

function HomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 10.5 12 4l8 6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 9.5V20h12V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" strokeLinecap="round" />
      <path d="M3.5 20c1.2-3.6 4.2-6 8.5-6s7.3 2.4 8.5 6" strokeLinecap="round" />
    </svg>
  );
}

function NetworkIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="5" r="2.2" />
      <circle cx="5" cy="19" r="2.2" />
      <circle cx="19" cy="19" r="2.2" />
      <path d="M12 7.2V13M12 13 6.3 17.2M12 13l5.7 4.2" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 20V10M12 20V4M20 20v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GearIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.4-2-3.4-2.3.8a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.3-.8-2 3.4 2 1.4a7.6 7.6 0 0 0 0 3l-2 1.4 2 3.4 2.3-.8a7.6 7.6 0 0 0 2.6 1.5l.5 2.5h4l.5-2.5a7.6 7.6 0 0 0 2.6-1.5l2.3.8 2-3.4-2-1.4Z" strokeLinejoin="round" />
    </svg>
  );
}
