import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-100 px-4 text-center">
      <div className="mb-6 flex items-center gap-2.5">
        <LockListMark className="size-9 text-brand-500" />
        <span className="font-display text-2xl font-extrabold text-ink-900">LockList</span>
      </div>

      <h1 className="font-display max-w-xl text-3xl font-extrabold text-ink-900">
        Gardez le fil de chaque relation, sous clé
      </h1>
      <p className="mt-4 max-w-md text-sm text-ink-500">
        Centralise tes contacts, garde le contexte de chaque relation et suis l'évolution de ton
        réseau grâce à des statistiques claires — en toute confidentialité.
      </p>

      <div className="mt-8 flex gap-3">
        <Link
          to="/login"
          className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Se connecter
        </Link>
        <Link
          to="/register"
          className="rounded-lg border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-white"
        >
          Créer un compte
        </Link>
      </div>
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
