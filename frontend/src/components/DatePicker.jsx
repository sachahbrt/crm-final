import { useEffect, useRef, useState } from "react";

const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 102 }, (_, i) => CURRENT_YEAR + 1 - i); // current+1 down to current-100

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoToDisplay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Inserts the "/" separators as digits are typed, e.g. "12051990" -> "12/05/1990".
function formatTyping(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
}

// Strictly parses "DD/MM/YYYY" and rejects dates that don't round-trip (e.g. 31/02/2026).
function parseDisplay(text) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const d = Number(match[1]);
  const m = Number(match[2]);
  const y = Number(match[3]);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return toISO(date);
}

export default function DatePicker({ value, onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const [pickingMonthYear, setPickingMonthYear] = useState(false);
  const [viewDate, setViewDate] = useState(() => (value ? new Date(value) : new Date()));
  const [text, setText] = useState(() => isoToDisplay(value));
  const [syncedValue, setSyncedValue] = useState(value);
  const ref = useRef(null);

  // Keep the displayed text in sync when `value` changes externally (not via useEffect,
  // to avoid an extra render pass — this is React's documented "adjust state during render" pattern).
  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(isoToDisplay(value));
  }

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // week starts Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  function selectDay(day) {
    onChange(toISO(new Date(year, month, day)));
    setOpen(false);
  }

  function toggleOpen() {
    if (!open) {
      const parsed = parseDisplay(text);
      setViewDate(parsed ? new Date(parsed) : value ? new Date(value) : new Date());
      setPickingMonthYear(false);
    }
    setOpen((o) => !o);
  }

  function commit() {
    const iso = parseDisplay(text);
    if (iso) onChange(iso);
    return iso;
  }

  function handleBlur() {
    if (!commit()) setText(isoToDisplay(value));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") commit();
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="JJ/MM/AAAA"
        value={text}
        onChange={(e) => setText(formatTyping(e.target.value))}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full rounded-lg border border-ink-300 bg-white px-3 py-2 pr-9 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Ouvrir le calendrier"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-500 hover:bg-ink-100"
      >
        <svg className="size-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1Zm12 7H4v7h14V9Z" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-64 rounded-lg border border-ink-300 bg-white p-3 shadow-lg">
          {pickingMonthYear ? (
            <div className="mb-2 flex items-center gap-1">
              <select
                value={month}
                onChange={(e) => setViewDate(new Date(year, Number(e.target.value), 1))}
                className="min-w-0 flex-1 rounded border border-ink-300 py-1 text-sm text-ink-900 outline-none focus:border-brand-500"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setViewDate(new Date(Number(e.target.value), month, 1))}
                className="rounded border border-ink-300 py-1 text-sm text-ink-900 outline-none focus:border-brand-500"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="rounded p-1 text-ink-500 hover:bg-ink-100"
                aria-label="Mois précédent"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setPickingMonthYear(true)}
                className="rounded px-1 text-sm font-medium text-ink-900 hover:bg-ink-100"
              >
                {MONTHS[month]} {year}
              </button>
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="rounded p-1 text-ink-500 hover:bg-ink-100"
                aria-label="Mois suivant"
              >
                ›
              </button>
            </div>
          )}
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-500">
            {DAYS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <span key={i} />;
              const isSelected = value === toISO(new Date(year, month, day));
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`rounded p-1.5 text-center text-sm hover:bg-brand-50 ${
                    isSelected ? "bg-brand-500 text-white hover:bg-brand-600" : "text-ink-900"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
