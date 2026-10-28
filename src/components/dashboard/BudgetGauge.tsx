/** Semi-circular gauge showing budget consumption as a percentage.
 * Pure SVG, computed server-side — no client JS needed for a static
 * visual. Color shifts from steel (under budget) to red (over budget),
 * matching the reference dashboard's red gauge for an over-budget month. */
export function BudgetGauge({ pct }: { pct: number }) {
  const clamped = Math.min(Math.max(pct, 0), 150); // cap the arc's visual sweep at 150% so a huge overrun doesn't visually break the arc
  const angle = (Math.min(clamped, 100) / 100) * 180; // 0-100% maps to the 180° sweep; beyond 100% the arc stays full and only the color/number keep climbing
  const isOver = pct > 100;

  const r = 60;
  const cx = 70;
  const cy = 70;
  const startAngle = 180;
  const endAngleFull = 0;
  const endAngleValue = 180 - angle;

  const polarToCartesian = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  };
  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngleValue);
  const trackEnd = polarToCartesian(endAngleFull);

  return (
    <svg viewBox="0 0 140 80" className="w-full max-w-[160px]">
      <path
        d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${trackEnd.x} ${trackEnd.y}`}
        fill="none"
        stroke="var(--color-hairline, #e5e1d8)"
        strokeWidth={12}
        strokeLinecap="round"
      />
      <path
        d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`}
        fill="none"
        stroke={isOver ? "#dc2626" : "#2563a8"}
        strokeWidth={12}
        strokeLinecap="round"
      />
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        className={`text-2xl font-bold ${isOver ? "fill-[#dc2626]" : "fill-ink"}`}
      >
        {pct.toFixed(1)}
      </text>
    </svg>
  );
}
