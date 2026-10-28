import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { createUser, deactivateUser, reactivateUser, resetPassword, updateUserRole } from "./actions";
import { redirect } from "next/navigation";

export default async function UsersAdminPage() {
  const session = await getSession();
  if (session?.role !== "Admin") {
    redirect("/");
  }

  const users = await prisma.utilisateur.findMany({ orderBy: { login: "asc" } });
  type UserRow = (typeof users)[number];

  return (
    <>
      <PageHeader eyebrow="Administration" title="Utilisateurs" hideBack />
      <div className="p-8 max-w-3xl space-y-6">
        <form
          action={createUser}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
        >
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Identifiant <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              name="login"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Mot de passe (min. 6 car.) <span className="text-urgent">*</span>
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Fonction
            </label>
            <input
              type="text"
              name="fonction"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              name="mail"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Téléphone
            </label>
            <input
              type="tel"
              name="telephone"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Rôle
            </label>
            <select
              name="role"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="Utilisateur">Utilisateur</option>
              <option value="Superviseur">Superviseur (lecture seule)</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
          >
            Créer
          </button>
        </form>

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Identifiant</th>
                <th className="px-4 py-3 font-semibold">Fonction</th>
                <th className="px-4 py-3 font-semibold">E-mail</th>
                <th className="px-4 py-3 font-semibold">Téléphone</th>
                <th className="px-4 py-3 font-semibold">Rôle</th>
                <th className="px-4 py-3 font-semibold">Mot de passe</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold w-24"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: UserRow) => (
                <tr key={u.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink font-mono text-xs">{u.login}</td>
                  <td className="px-4 py-2.5 text-ink">{u.fonction ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink text-xs">{u.mail ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink text-xs">{u.telephone ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <form action={updateUserRole.bind(null, u.id)} className="flex gap-1.5 items-center">
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="border border-hairline rounded px-2 py-1 text-xs bg-surface"
                      >
                        <option value="Utilisateur">Utilisateur</option>
                        <option value="Superviseur">Superviseur</option>
                        <option value="Admin">Admin</option>
                      </select>
                      <button
                        type="submit"
                        className="text-xs font-semibold text-steel-600 hover:text-steel-700"
                      >
                        OK
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-2.5">
                    <form action={resetPassword.bind(null, u.id)} className="flex gap-1.5 items-center">
                      <input
                        type="password"
                        name="password"
                        placeholder="Nouveau (min. 6 car.)"
                        minLength={6}
                        className="w-36 border border-hairline rounded px-2 py-1 text-xs bg-surface"
                      />
                      <button
                        type="submit"
                        className="text-xs font-semibold text-steel-600 hover:text-steel-700"
                      >
                        Réinitialiser
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill
                      label={u.deleted ? "Désactivé" : "Actif"}
                      fg={u.deleted ? "#B3261E" : "#3D7A4E"}
                      bg={u.deleted ? "#FBE9E7" : "#E7F2E9"}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {u.deleted ? (
                      <form action={reactivateUser.bind(null, u.id)}>
                        <button type="submit" className="text-xs text-steel-600 hover:underline">
                          Réactiver
                        </button>
                      </form>
                    ) : (
                      <form action={deactivateUser.bind(null, u.id)}>
                        <button type="submit" className="text-xs text-urgent hover:underline">
                          Désactiver
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
