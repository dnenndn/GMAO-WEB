import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export default function SousTraitanceSettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Sous-traitance" title="Paramètres" />
      <div className="p-8 max-w-xl space-y-4">
        <Link
          href="/sous-traitance/settings/activites"
          className="block bg-surface border border-hairline rounded p-5 hover:border-steel-400 transition-colors"
        >
          <div className="text-sm font-semibold text-ink">Activités</div>
          <div className="text-xs text-muted mt-1.5">
            Types de prestations sous-traitées (usinage, réparation, etc.).
          </div>
        </Link>
        <Link
          href="/sous-traitance/settings/signature"
          className="block bg-surface border border-hairline rounded p-5 hover:border-steel-400 transition-colors"
        >
          <div className="text-sm font-semibold text-ink">Ma signature</div>
          <div className="text-xs text-muted mt-1.5">
            Code personnel requis pour signer une commande en attente.
          </div>
        </Link>
      </div>
    </>
  );
}
