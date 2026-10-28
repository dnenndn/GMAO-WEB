"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Error subclass identity (`error.name`) isn't guaranteed to survive the
  // server→client serialization boundary for Server Action errors across
  // all Next.js versions, so match on message content as the reliable
  // signal, checking `name` too as a bonus when it does survive. Two
  // distinct ForbiddenError messages exist (admin-only actions, and the
  // Superviseur read-only role added later) — distinguished separately
  // below so each gets its own accurate wording, not a shared message
  // that would misleadingly tell a Superviseur they need to be "an
  // administrator" when the real issue is that their role is read-only.
  const isReadOnlyBlock = error.message.includes("lecture seule");
  const isForbidden =
    isReadOnlyBlock ||
    error.name === "ForbiddenError" ||
    error.message.includes("réservée aux administrateurs");

  useEffect(() => {
    if (!isForbidden) {
      console.error(error);
    }
  }, [error, isForbidden]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-8">
      <div className="max-w-md text-center">
        <div className="text-[11px] tracking-[0.2em] text-muted font-semibold mb-2">
          {isForbidden ? "ACCÈS REFUSÉ" : "ERREUR"}
        </div>
        <h1 className="text-lg font-semibold text-ink mb-2">
          {isReadOnlyBlock
            ? "Accès en lecture seule"
            : isForbidden
              ? "Action réservée aux administrateurs"
              : "Une erreur est survenue"}
        </h1>
        <p className="text-sm text-muted mb-6">
          {isReadOnlyBlock
            ? "Votre rôle (Superviseur) permet de consulter toutes les données, mais pas de les modifier. Contactez un administrateur si vous avez besoin d'effectuer cette action."
            : isForbidden
              ? "Votre compte n'a pas les droits nécessaires pour effectuer cette action. Contactez un administrateur si vous pensez que c'est une erreur."
              : "Quelque chose s'est mal passé. Vous pouvez réessayer ou revenir au tableau de bord."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="border border-hairline text-ink text-sm font-semibold px-4 py-2 rounded hover:bg-surface transition-colors"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="bg-steel-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-steel-700 transition-colors"
          >
            Tableau de bord
          </a>
        </div>
      </div>
    </div>
  );
}
