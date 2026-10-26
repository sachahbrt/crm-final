export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-[440px] shrink-0 flex-col justify-between bg-ink-900 p-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <LockListMark className="size-7 text-brand-500" />
          <span className="font-display text-xl font-extrabold">LockList</span>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-500">
            Votre CRM personnel
          </span>
          <h2 className="font-display text-3xl font-extrabold leading-tight">
            Chaque relation compte.
            <br />
            Gardez-la sous clé.
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-white/65">
            Un espace privé pour organiser vos rencontres, suivre vos échanges et ne plus jamais
            perdre le fil avec les personnes qui comptent.
          </p>
        </div>

        <div className="flex items-center gap-2.5 border-t border-white/10 pt-5 text-xs text-white/50">
          <HeartLockIcon className="size-4 shrink-0" />
          Moins de contacts oubliés. Plus de relations entretenues.
        </div>
      </aside>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <LockListMark className="size-7 text-brand-500" />
            <span className="font-display text-lg font-extrabold text-ink-900">LockList</span>
          </div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
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

function HeartLockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 21s-7-4.5-7-10a7 7 0 0 1 14 0c0 5.5-7 10-7 10z" />
    </svg>
  );
}
