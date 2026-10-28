import type { Metadata } from "next";
import "./globals.css";

// Deliberately not using next/font/google here — it needs real network
// access to fonts.gstatic.com at BUILD time (not just dev time), and dev
// mode tolerates a failed fetch with a silent fallback while a
// production build treats the exact same failure as fatal, blocking
// `next build` entirely. Rather than depend on a machine's outbound
// internet access just to render text, the CSS variables these fonts
// used to define are simply left unset — Tailwind's own font-family
// stacks (tailwind.config.ts) already list a system fallback
// (system-ui/ui-monospace) right after them, and an unset CSS var()
// falls through to the next entry in the stack automatically, so this
// needs no other changes anywhere else.

export const metadata: Metadata = {
  title: "GMAO — Maintenance",
  description: "Gestion de la maintenance assistée par ordinateur",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
