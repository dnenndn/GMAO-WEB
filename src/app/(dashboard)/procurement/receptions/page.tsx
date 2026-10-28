// "Bon de Réception" — one of the real Achat sidebar items (button14 in
// Form1.Designer.cs, opens the `reception` form). The feature itself
// already lives at /inventory/receptions (it's also reachable from the
// stock side of the app in the legacy UI's own menu duplication), so this
// just re-exports that same page under the Achat section for a direct,
// correctly-labelled entry point — no logic duplicated.
export { default } from "../../inventory/receptions/page";
