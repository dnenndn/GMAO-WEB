import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth";
import { markNotificationRead, markAlerteRead, markAllRead } from "./actions";
import { redirect } from "next/navigation";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: { dateDebut?: string; dateFin?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const dateDebut = searchParams.dateDebut ? new Date(searchParams.dateDebut) : undefined;
  const dateFin = searchParams.dateFin ? new Date(searchParams.dateFin) : undefined;
  const dateFilter =
    dateDebut || dateFin
      ? { dateCreation: { ...(dateDebut ? { gte: dateDebut } : {}), ...(dateFin ? { lte: dateFin } : {}) } }
      : {};

  const [notifications, alertes] = await Promise.all([
    prisma.notification.findMany({
      where: { idUtilisateur: session.userId, ...dateFilter },
      orderBy: { dateCreation: "desc" },
      take: 50,
    }),
    prisma.notificationAlerte.findMany({
      where: { idUtilisateur: session.userId, ...dateFilter },
      orderBy: { dateCreation: "desc" },
      take: 50,
    }),
  ]);

  const unreadCount = notifications.filter((n) => !n.vue).length + alertes.filter((a) => !a.vue).length;

  return (
    <>
      <PageHeader eyebrow="Compte" title="Notifications" hideBack />
      <div className="p-8 max-w-2xl space-y-8">
        <form method="get" className="flex gap-3 items-end -mt-2">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Date début
            </label>
            <input
              type="date"
              name="dateDebut"
              defaultValue={searchParams.dateDebut}
              className="border border-hairline rounded px-2 py-1.5 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Date fin
            </label>
            <input
              type="date"
              name="dateFin"
              defaultValue={searchParams.dateFin}
              className="border border-hairline rounded px-2 py-1.5 text-sm bg-surface"
            />
          </div>
          <button
            type="submit"
            className="bg-steel-600 text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-steel-700 transition-colors"
          >
            Filtrer
          </button>
        </form>
        <div className="flex items-center justify-between -mt-2">
          <p className="text-sm text-muted">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}.`
              : "Tout est à jour."}
          </p>
          {unreadCount > 0 && (
            <form action={markAllRead.bind(null, session.userId)}>
              <button type="submit" className="text-xs font-semibold text-steel-600 hover:text-steel-700">
                Tout marquer comme lu
              </button>
            </form>
          )}
        </div>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Notifications
          </div>
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start justify-between gap-3 border-l-2 pl-3 py-1 text-sm ${
                  n.vue ? "border-hairline text-muted" : "border-safety text-ink"
                }`}
              >
                <div>
                  <div>{n.description}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {n.type} · {n.dateCreation?.toLocaleDateString("fr-FR") ?? "—"}
                  </div>
                </div>
                {!n.vue && (
                  <form action={markNotificationRead.bind(null, n.id)}>
                    <button type="submit" className="text-xs font-semibold text-steel-600 hover:text-steel-700 whitespace-nowrap">
                      Marquer lu
                    </button>
                  </form>
                )}
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-sm text-muted">Aucune notification.</div>
            )}
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Alertes
          </div>
          <div className="space-y-2">
            {alertes.map((a) => (
              <div
                key={a.id}
                className={`flex items-start justify-between gap-3 border-l-2 pl-3 py-1 text-sm ${
                  a.vue ? "border-hairline text-muted" : "border-urgent text-ink"
                }`}
              >
                <div>
                  <div>{a.description}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {a.type} · {a.dateCreation.toLocaleDateString("fr-FR")}
                  </div>
                </div>
                {!a.vue && (
                  <form action={markAlerteRead.bind(null, a.id)}>
                    <button type="submit" className="text-xs font-semibold text-steel-600 hover:text-steel-700 whitespace-nowrap">
                      Marquer lu
                    </button>
                  </form>
                )}
              </div>
            ))}
            {alertes.length === 0 && (
              <div className="text-sm text-muted">Aucune alerte.</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
