import { redirect } from "next/navigation";

// "Approvisionnement" — real Achat sidebar item (button32 in
// Form1.Designer.cs, opens the `approvisionnement` form). That legacy form
// is itself just a 4-tab shell over Réapprovisionnement / Point de
// commande / Recomplétement / Gérer planning — our existing
// /inventory/reapprovisionnement page already implements the
// Réapprovisionnement + Recomplétement halves of that. Point to it
// directly rather than duplicating it under a second URL.
export default function ProcurementApprovisionnementPage() {
  redirect("/inventory/reapprovisionnement");
}
