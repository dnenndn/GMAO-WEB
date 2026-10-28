"use client";

// Catches errors in the root layout itself — genuinely rare, since that
// layout is minimal, but without this file such an error would fall
// through to the browser's own unstyled crash page with zero branding
// at all. Self-contained with inline styles rather than Tailwind
// classes, since this replaces the entire <html>/<body> and needs to
// work even if the app's normal CSS never loaded.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#EEEDE9",
          color: "#201C19",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 380, padding: "0 20px" }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#B3261E" }}>
            Erreur
          </div>
          <p style={{ fontSize: 14, color: "#6B6259", marginTop: 8 }}>
            Une erreur inattendue est survenue. Vous pouvez réessayer ou
            revenir à l&apos;accueil.
          </p>
          <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                background: "#A8451B",
                color: "white",
                border: "none",
                padding: "10px 18px",
                borderRadius: 3,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Réessayer
            </button>
            <a
              href="/"
              style={{
                border: "1px solid #DCD7CC",
                padding: "9px 18px",
                borderRadius: 3,
                fontSize: 14,
                fontWeight: 600,
                color: "#201C19",
                textDecoration: "none",
              }}
            >
              Accueil
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
