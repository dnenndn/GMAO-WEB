"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

// A real "go back" needs browser history (router.back()), which only
// works client-side — this is the one small client component the
// shared, otherwise-server-rendered PageHeader needs.
//
// `href`, when given, makes this a deterministic link to a known
// parent instead of router.back(). Browser history is fragile for
// hierarchical pages — a refresh, a direct URL, or opening the page
// in a new tab all leave nothing to go back to, and router.back() can
// then skip straight past pages the person never meant to leave. For
// pages with a clear, fixed parent (a report's sub-section always
// belongs to that report, that report always belongs to the list),
// linking there directly is more predictable than trusting whatever
// the session history happens to contain.
export function BackButton({ href }: { href?: string }) {
  const router = useRouter();
  const className =
    "w-8 h-8 flex items-center justify-center rounded border border-hairline text-muted hover:text-ink hover:border-steel-400 transition-colors shrink-0";
  const icon = (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9 2L3 7l6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (href) {
    return (
      <Link href={href} aria-label="Retour" className={className}>
        {icon}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => router.back()} aria-label="Retour" className={className}>
      {icon}
    </button>
  );
}
