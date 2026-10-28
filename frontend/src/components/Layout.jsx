import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import { apiFetch } from "../api";

const NAV = [
  { to: "/dashboard", label: "Tableau de bord", icon: HomeIcon },
  { to: "/contacts", label: "Contacts", icon: UsersIcon },
  { to: "/stats", label: "Statistiques", icon: ChartIcon },
];

const SECONDARY_NAV = [{ to: "/settings", label: "Paramètres", icon: GearIcon }];

// Only used to resolve the header breadcrumb label for routes that aren't in
// the main sidebar nav (e.g. /network, reached via the "Voir le réseau" card).
const BREADCRUMB_LABELS = [...NAV, ...SECONDARY_NAV, { to: "/network", label: "Réseau" }];

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const current = BREADCRUMB_LABELS.find((n) => location.pathname.startsWith(n.to));

  return (
    <div className="min-h-screen lg:flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-white/10 bg-ink-900 text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:overflow-y-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 px-6">
          <LockListMark className="size-6 text-brand-500" />
          <span className="font-display text-lg font-extrabold">LockList</span>
        </div>

        <div className="mx-3 mb-5 flex items-center gap-2.5 rounded-xl bg-white/5 p-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-xs font-extrabold text-ink-900">
            {user?.firstName?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-bold text-white">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="truncate text-xs text-white/50">{user?.email}</span>
          </div>
        </div>

        <span className="mb-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-white/35">Relations</span>

        <nav className="flex flex-col gap-1 px-3 pb-5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-r-lg border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-brand-500 bg-white/10 text-white"
                    : "border-transparent text-white/60 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon className="size-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mx-3 mb-2 flex flex-col gap-2 rounded-2xl bg-white/5 p-4">
          <SparkleIcon className="size-4 text-brand-500" />
          <span className="text-sm font-semibold text-white">Votre réseau, à l'abri.</span>
          <span className="text-xs leading-relaxed text-white/55">
            Centralisez vos relations, vos contextes et vos notes au même endroit.
          </span>
          <Link to="/network" className="mt-0.5 text-xs font-bold text-brand-500">
            Voir le réseau →
          </Link>
        </div>

        <div className="flex-1" />

        <div className="mx-3 mb-3 h-px bg-white/10" />

        <ProfileMenu user={user} logout={logout} onNavigate={() => setSidebarOpen(false)} />
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
            <LockListMark className="size-6 text-brand-500" />
            <span className="font-display text-base font-extrabold text-ink-900">LockList</span>
          </div>
          <div className="hidden text-sm lg:block">
            <span className="text-ink-500">LockList</span>
            {current && (
              <>
                <span className="mx-2 text-ink-300">›</span>
                <span className="font-medium text-ink-900">{current.label}</span>
              </>
            )}
          </div>
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      <AiChatWidget />
    </div>
  );
}

// Renders **bold** segments and line breaks from AI replies — the model
// writes basic markdown but chat bubbles otherwise show plain text, so
// "**word**" was showing up literally with the asterisks.
function renderMessageContent(text) {
  return text.split("\n").map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part
      )}
    </span>
  ));
}

// Floating AI assistant button + chat panel, visible on every authenticated
// page. The welcome/disclaimer bubble below is static (never sent to the
// backend) and only shown while `messages` is still empty.
function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role: "user" | "assistant", content }
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    try {
      const { reply } = await apiFetch("/api/ai/chat", { method: "POST", body: { message: text, history } });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      toast.error(err.message);
      setMessages((m) => [...m, { role: "assistant", content: "Je n'ai pas pu répondre, réessaie plus tard." }]);
    } finally {
      setSending(false);
    }
  }

  // Native implicit submission-on-Enter can be swallowed in some browsers,
  // so submit explicitly instead of relying on it (same convention as Login.jsx).
  function handleEnterKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant"}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-xl hover:bg-brand-600"
      >
        <SparkleIcon className="size-6" />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[32rem] w-96 flex-col overflow-hidden rounded-xl border border-ink-300/60 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <h3 className="text-sm font-bold text-ink-900">Assistant LockList</h3>
            <button type="button" onClick={() => setOpen(false)} className="text-ink-500 hover:text-ink-900">
              ✕
            </button>
          </div>

          <div ref={listRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-brand-500/30 bg-brand-500/5 p-3 text-sm leading-relaxed text-ink-900">
                <SparkleIcon className="mt-0.5 size-4 shrink-0 text-brand-500" />
                <p>
                  Bienvenue sur l'assistant LockList ! Je suis là pour t'aider avec tes contacts et ton réseau.
                  Comme je m'appuie sur un modèle gratuit (propulsé par NVIDIA Nemotron 3 Ultra), les informations
                  échangées ici — tes messages ainsi que les données de contact utilisées pour te répondre — peuvent
                  être collectées par le fournisseur du modèle pour l'entraîner : évite donc de partager des
                  informations trop sensibles. Pose-moi ta question quand tu veux !
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user" ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-900"
                  }`}
                >
                  {renderMessageContent(m.content)}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-ink-100 px-3 py-2 text-sm text-ink-500">…</div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-ink-100 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleEnterKey}
              disabled={sending}
              placeholder="Écris ton message…"
              className="flex-1 rounded-lg border border-ink-300 px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex h-[38px] shrink-0 items-center justify-center rounded-lg bg-brand-500 px-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              Envoyer
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function ProfileMenu({ user, logout, onNavigate }) {
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
    <div ref={ref} className="relative border-t border-white/10 p-3">
      {open && (
        <div className="absolute inset-x-3 bottom-full mb-1 overflow-hidden rounded-xl border border-ink-300/60 bg-white shadow-lg">
          {SECONDARY_NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-ink-700 hover:bg-ink-100"
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 border-t border-ink-100 px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-ink-100"
          >
            <LogoutIcon className="size-4 shrink-0" />
            Déconnexion
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-ink-900">
          {user?.firstName?.[0]?.toUpperCase()}
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
          {user?.firstName} {user?.lastName}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5 shrink-0 text-white/40">
          <path d="m7 15 5 5 5-5M7 9l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

function LockListMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path
        d="M7 10.4V7.8a5 5 0 0 1 10 0v2.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="4.4" y="10.4" width="15.2" height="10.2" rx="2.6" fill="currentColor" />
      <rect x="7.8" y="14.2" width="8.4" height="1.5" rx="0.75" className="fill-ink-900" />
      <rect x="7.8" y="17.1" width="5.6" height="1.5" rx="0.75" className="fill-ink-900" />
    </svg>
  );
}

function SparkleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12 2 9.2 8.6 2 9.3l5.5 4.8L5.8 21 12 17.3 18.2 21l-1.7-6.9L22 9.3l-7.2-.7z" />
    </svg>
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

function LogoutIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M13 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 12h11m0 0-3.5-3.5M21 12l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
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

