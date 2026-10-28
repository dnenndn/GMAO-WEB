import Link from "next/link";

// A single not-found.tsx at this route-group level covers every nested
// dynamic route automatically — found this was completely missing
// despite the app having many [id]-style routes where a deleted record
// or a bad link would otherwise fall through to Next.js's generic,
// unbranded default 404 (no sidebar, no logo, nothing matching the
// rest of the app).
export default function DashboardNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="text-center max-w-sm">
        <div className="text-6xl font-bold font-mono text-hairline">404</div>
        <h1 className="text-xl font-semibold text-ink mt-3">
          Page introuvable
        </h1>
        <p className="text-sm text-muted mt-2">
          L&apos;élément que vous cherchez n&apos;existe pas ou a été
          supprimé.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-steel-600 text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-steel-700 transition-colors mt-6"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
