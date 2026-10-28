import type { Metadata } from "next";
import "./globals.css";

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
