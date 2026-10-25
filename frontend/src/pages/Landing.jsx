import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-100 px-4 text-center">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-lg bg-brand-500 text-lg font-semibold text-white">
          B
        </div>
        <span className="text-2xl font-semibold text-ink-900">CRM Breece</span>
      </div>

      <h1 className="max-w-xl text-3xl font-semibold text-ink-900">
        Garde le fil de chaque personne que tu rencontres
      </h1>
      <p className="mt-4 max-w-md text-sm text-ink-500">
        Centralise tes contacts, garde le contexte de chaque relation et suis l'évolution de ton
        réseau grâce à des statistiques claires.
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
          className="rounded-lg border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-100"
        >
          Créer un compte
        </Link>
      </div>
    </div>
  );
}
