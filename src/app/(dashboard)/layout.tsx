import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logout } from "../login/actions";
import { SidebarNav } from "@/components/SidebarNav";

type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
  showNotificationBadge?: boolean;
  children?: { href: string; label: string }[];
};

const NAV: NavItem[] = [
  { href: "/", label: "Tableau de bord" },
  { href: "/equipements", label: "Équipement" },
  {
    href: "/work-orders",
    label: "Maintenance",
    children: [
      { href: "/interventions", label: "DI" },
      { href: "/work-orders", label: "OT" },
    ],
  },
  { href: "/production", label: "Production", children: [
    { href: "/production/recap", label: "Récap" },
    { href: "/production/electricite", label: "Electrique" },
    { href: "/production/coefficient", label: "Coefficient" },
  ] },
  { href: "/inventory", label: "Gestion de stock", children: [
    { href: "/inventory/articles", label: "Articles" },
    { href: "/inventory/bsm", label: "BSM" },
    { href: "/inventory/brm", label: "Retour" },
    { href: "/inventory/liste-article", label: "Liste article" },
    { href: "/inventory/mouvements", label: "Mvt de stock" },
  ] },
  { href: "/budget", label: "Gestion de budget", children: [
    { href: "/budget", label: "Liste des budgets" },
    { href: "/budget/new", label: "Créer un budget" },
    { href: "/budget/investissement", label: "Investissement" },
  ] },
  { href: "/procurement", label: "Achat", children: [
    { href: "/procurement/suppliers", label: "Fournisseur" },
    { href: "/procurement/requests", label: "Demande" },
    { href: "/procurement/orders", label: "Commandes" },
    { href: "/procurement/dop", label: "DOP" },
    { href: "/procurement/devis", label: "Devis" },
    { href: "/procurement/factures", label: "Factures" },
  ] },
  { href: "/admin/users", label: "Utilisateur", adminOnly: true },
  { href: "/sous-traitance", label: "Sous Traitance", children: [
    { href: "/sous-traitance/activites", label: "Activités" },
    { href: "/sous-traitance/demandes", label: "Intervention" },
    { href: "/sous-traitance/magasin", label: "Stock" },
    { href: "/sous-traitance/commandes", label: "Achat" },
  ] },
  { href: "/tooling", label: "Outillage" },
  { href: "/notifications", label: "Notification", showNotificationBadge: true },
  { href: "/fleet", label: "Parc Engin", children: [
    { href: "/fleet/vehicles", label: "Véhicules" },
    { href: "/fleet/voyages", label: "Voyages" },
    { href: "/fleet/bons-carburant", label: "Bons carburant" },
    { href: "/fleet/reclamations", label: "Réclamations" },
    { href: "/fleet/rapport", label: "Rapport de coûts" },
  ] },
  { href: "/workshop", label: "Atelier", children: [
    { href: "/workshop/jobs", label: "Liste" },
    { href: "/workshop/settings", label: "Paramètres" },
  ] },
  { href: "/analytics", label: "Analyse & KPI" },
];
// Ordered and labeled to match the real legacy app's own sidebar menu
// (screenshot provided directly), item for item, in the same sequence.
// "Moteurs" — present in that legacy menu — is deliberately NOT included
// here: checked directly against the decompiled source (ajouter_moteur.cs)
// and the real 215-table schema export, and confirmed it's a UI-only
// stub in the ORIGINAL app itself — the "add" button there never writes
// to any database table, just adds a row to a local on-screen grid, and
// no "moteur" table exists anywhere in the confirmed real schema. Not a
// gap in this migration; a feature that was never actually finished in
// the legacy application, so nothing to rebuild here.
//
// Two items here have no direct match in that legacy menu and were kept
// anyway rather than dropped: "Tableau de bord" (this app's own
// home/dashboard) and "Analyse & KPI" (real, working Analytics module
// built in this project — the legacy app never had it at all) are both
// genuine, valuable functionality.
//
// "Maintenance" (and every other module with real sub-items) nests its
// children directly beneath it, matching how the reference screenshots
// actually show every module — a parent header with its own children
// indented below, not a flat list. Now a true collapsible accordion
// (SidebarNav.tsx, a client component) — sub-menus start collapsed and
// only expand when their own toggle is clicked, rather than the
// previous always-expanded static list.

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const [unreadCount, currentUser] = await Promise.all([
    session
      ? Promise.all([
          prisma.notification.count({ where: { idUtilisateur: session.userId, vue: false } }),
          prisma.notificationAlerte.count({ where: { idUtilisateur: session.userId, vue: false } }),
        ]).then(([a, b]) => a + b)
      : Promise.resolve(0),
    session
      ? prisma.utilisateur.findUnique({ where: { id: session.userId }, select: { fonction: true } })
      : Promise.resolve(null),
  ]);

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 bg-graphite-900 text-white/90 flex flex-col h-screen sticky top-0">
        <div className="px-5 py-6 border-b border-white/10 flex flex-col items-center gap-2 shrink-0">
          <div className="bg-white rounded-lg p-2.5 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpeg" alt="Ideal Brique" className="w-28 h-28 object-contain" />
          </div>
          <div className="text-center">
            <div className="text-[10px] tracking-[0.18em] text-white/50 font-semibold uppercase">
              Ideal Brique
            </div>
            <div className="text-sm font-semibold text-white">GMAO</div>
          </div>
        </div>
        <SidebarNav
          items={NAV.filter((item) => !item.adminOnly || session?.role === "Admin")}
          unreadCount={unreadCount}
        />
      </aside>
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Account header — matches the reference app's own top-right
            name/role display, moved here from a small text link buried
            in the sidebar footer so connecting/disconnecting has a
            clear, visible home. */}
        <header className="h-14 shrink-0 bg-surface border-b border-hairline flex items-center justify-end gap-4 px-6">
          {session && (
            <>
              <div className="text-right leading-tight">
                <div className="text-sm font-semibold text-ink">{session.login}</div>
                <div className="text-[11px] text-muted">{currentUser?.fonction ?? session.role}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-steel-600 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                {session.login.slice(0, 2).toUpperCase()}
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-xs font-semibold text-muted hover:text-urgent transition-colors border border-hairline rounded px-3 py-1.5 hover:border-urgent/40"
                >
                  Déconnexion
                </button>
              </form>
            </>
          )}
        </header>
        <main className="flex-1 bg-paper">{children}</main>
      </div>
    </div>
  );
}
