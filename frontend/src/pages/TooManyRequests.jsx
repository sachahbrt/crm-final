import { Link } from "react-router-dom";
import AuthCard from "../components/AuthCard";

export default function TooManyRequests() {
  return (
    <AuthCard title="Une petite pause s'impose" subtitle="Trop de tentatives en peu de temps">
      <p className="text-sm leading-relaxed text-ink-700">
        Par sécurité, l'accès est temporairement limité après plusieurs essais rapprochés. Réessaie dans quelques
        minutes.
      </p>
      <Link
        to="/login"
        className="mt-6 flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
      >
        Retour à la connexion
      </Link>
    </AuthCard>
  );
}
