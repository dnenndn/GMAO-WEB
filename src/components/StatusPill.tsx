export function StatusPill({
  label,
  fg,
  bg,
}: {
  label: string;
  fg: string;
  bg: string;
}) {
  return (
    <span className="status-pill" style={{ color: fg, background: bg }}>
      <span className="status-dot" style={{ background: fg }} />
      {label}
    </span>
  );
}
