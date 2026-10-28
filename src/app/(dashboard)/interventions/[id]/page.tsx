import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { urgenceColor, statutColor } from "@/lib/constants";
import { confirmerDemande, refuserDemande } from "../actions";
import { notFound } from "next/navigation";

export default async function InterventionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const di = await prisma.demandeIntervention.findUnique({
    where: { id: Number(params.id) },
    include: { equipementRef: true, defaillance: true, ordresTravail: true },
  });

  if (!di) notFound();

  const u = urgenceColor(di.urgence);
  const s = statutColor(di.statut);
  const isPending = di.statut === "En attente";

  return (
    <>
      <PageHeader eyebrow="Demande d'intervention" title={di.nDi ?? `DI-${di.id}`} />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="flex gap-2">
          <StatusPill label={di.urgence ?? "—"} fg={u.fg} bg={u.bg} />
          <StatusPill label={di.statut ?? "—"} fg={s.fg} bg={s.bg} />
          {di.arretMachine && (
            <StatusPill label="Arrêt machine" fg="#B3261E" bg="#FBE9E7" />
          )}
        </div>

        <div className="bg-surface border border-hairline rounded divide-y divide-hairline">
          <Row label="Équipement" value={di.equipementRef?.designation ?? "—"} />
          <Row label="Défaillance" value={di.defaillance?.anomalie ?? "—"} />
          <Row label="Description" value={di.descriptionDefaillance ?? "—"} />
          <Row
            label="Émise le"
            value={di.dateEmission.toLocaleString("fr-FR")}
          />
          <Row label="Créée par" value={di.createur ?? "—"} />
        </div>

        {di.ordresTravail.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Ordre(s) de travail généré(s)
            </div>
            <div className="flex flex-wrap gap-2">
              {di.ordresTravail.map((ot) => (
                <a key={ot.id} href={`/work-orders/${ot.id}`}>
                  <Nameplate>{ot.nOt}</Nameplate>
                </a>
              ))}
            </div>
          </div>
        )}

        {isPending && (
          <div className="flex gap-3 pt-2">
            <form action={confirmerDemande.bind(null, di.id)}>
              <button
                type="submit"
                className="bg-safety text-white text-sm font-semibold px-4 py-2.5 rounded hover:bg-safety/90 transition-colors"
              >
                Confirmer et créer l'OT
              </button>
            </form>
            <form action={refuserDemande.bind(null, di.id)}>
              <button
                type="submit"
                className="border border-hairline text-ink text-sm font-semibold px-4 py-2.5 rounded hover:bg-paper transition-colors"
              >
                Refuser
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 px-4 py-3">
      <div className="text-xs font-semibold text-muted uppercase tracking-wide">
        {label}
      </div>
      <div className="col-span-2 text-sm text-ink">{value}</div>
    </div>
  );
}
