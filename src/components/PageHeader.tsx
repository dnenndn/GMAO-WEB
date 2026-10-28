import Link from "next/link";
import { BackButton } from "./BackButton";

export function PageHeader({
  eyebrow,
  title,
  action,
  hideBack,
  backHref,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly action?: { readonly href: string; readonly label: string };
  readonly hideBack?: boolean;
  readonly backHref?: string;
}) {
  return (
    <header className="page-enter flex items-end justify-between border-b border-hairline bg-white/72 px-5 py-7 shadow-[0_1px_0_rgba(16,24,40,0.03)] sm:px-10 sm:py-8">
      <div className="flex items-stretch gap-3">
        {!hideBack && (
          <div className="flex items-center pr-1">
            <BackButton href={backHref} />
          </div>
        )}
        <div className="w-1.5 rounded-full bg-steel-600 shadow-[0_0_0_4px_rgba(239,104,72,0.1)]" />
        <div>
          <div className="text-[10px] tracking-[0.18em] uppercase text-steel-700 font-bold">
            {eyebrow}
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink mt-1">{title}</h1>
        </div>
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 bg-safety text-white text-sm font-semibold px-4 py-2.5 rounded-md hover:-translate-y-0.5 hover:bg-safety/90 shadow-[0_5px_14px_rgba(61,107,53,0.2)]"
        >
          {action.label}
        </Link>
      )}
    </header>
  );
}
