import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { EquipementTabs } from "@/components/EquipementTabs";
import { updateEquipementGenerale } from "../actions";
import { notFound } from "next/navigation";

export default async function EquipementDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const equipement = await prisma.equipement.findUnique({
    where: { id },
    include: {
      parent: true,
      enfants: { where: { deleted: false } },
      generale: true,
      enginRef: true,
    },
  });

  if (!equipement) notFound();

  const fmt = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

  return (
    <>
      <PageHeader
        eyebrow="Équipement"
        title={`${equipement.code ?? `EQ-${equipement.id}`} — ${equipement.designation}`}
      />
      <EquipementTabs id={id} active="" />
      <div className="p-8 max-w-3xl space-y-8">
        <div className="flex gap-2 items-center flex-wrap text-sm">
          {equipement.parent && (
            <span className="text-muted">
              Parent :{" "}
              <Link href={`/equipements/${equipement.parent.id}`} className="text-steel-600 hover:underline">
                {equipement.parent.designation}
              </Link>
            </span>
          )}
          {equipement.enginRef && (
            <Nameplate>Véhicule : {equipement.enginRef.designation}</Nameplate>
          )}
        </div>

        {equipement.enfants.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Sous-équipements
            </div>
            <div className="flex flex-wrap gap-2">
              {equipement.enfants.map((e) => (
                <Link key={e.id} href={`/equipements/${e.id}`}>
                  <Nameplate>{e.designation}</Nameplate>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Informations générales
          </div>
          <form
            action={updateEquipementGenerale.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="Référence" name="reference" defaultValue={equipement.generale?.reference ?? ""} />
              <Field label="Marque" name="marque" defaultValue={equipement.generale?.marque ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="N° série" name="nSerie" defaultValue={equipement.generale?.nSerie ?? ""} />
              <Field label="N° modèle" name="nModele" defaultValue={equipement.generale?.nModele ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="N° contrat" name="nContrat" defaultValue={equipement.generale?.nContrat ?? ""} />
              <Field
                label="N° immobilisation"
                name="nImmobilisation"
                defaultValue={equipement.generale?.nImmobilisation ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Fabricant" name="fabricant" defaultValue={equipement.generale?.fabricant ?? ""} />
              <Field label="Coût d'achat" name="coutAchat" defaultValue={equipement.generale?.coutAchat ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Date d'achat"
                name="dateAchat"
                type="date"
                defaultValue={fmt(equipement.generale?.dateAchat)}
              />
              <Field
                label="Mise en service"
                name="dateMiseEnService"
                type="date"
                defaultValue={fmt(equipement.generale?.dateMiseEnService)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Fin de garantie"
                name="dateFinGarantie"
                type="date"
                defaultValue={fmt(equipement.generale?.dateFinGarantie)}
              />
              <Field
                label="Fin d'amortissement"
                name="dateFinAmortissement"
                type="date"
                defaultValue={fmt(equipement.generale?.dateFinAmortissement)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Fonction requise
              </label>
              <textarea
                name="fonctionReq"
                rows={2}
                defaultValue={equipement.generale?.fonctionReq ?? ""}
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Enregistrer
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
      />
    </div>
  );
}
