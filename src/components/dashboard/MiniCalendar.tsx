const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_NAMES = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** Simple current-month calendar grid — display only, matches the
 * reference dashboard's calendar widget. No navigation/interactivity
 * built in (the reference doesn't show any obvious data tied to specific
 * days either — this is a plain reference calendar, not an events view). */
export function MiniCalendar() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  // getDay(): 0=Sunday..6=Saturday: convert to Monday-first (0=Monday..6=Sunday)
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="text-center text-sm font-semibold text-ink mb-2 capitalize">
        {MONTH_NAMES[month]} {year}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_LETTERS.map((d, i) => (
          <div key={i} className="text-[11px] font-semibold text-muted py-1">
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={`text-xs py-1.5 rounded ${
              day === null
                ? ""
                : day === today.getDate()
                  ? "bg-steel-600 text-white font-semibold"
                  : "text-ink hover:bg-paper"
            }`}
          >
            {day ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
}
