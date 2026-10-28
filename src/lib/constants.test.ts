import { describe, it, expect } from "vitest";
import {
  budgetPeriodEnd,
  urgenceColor,
  statutColor,
  commandeStatutColor,
  daStatutColor,
  atelierEtatColor,
  posteColor,
  BUDGET_DUREES,
} from "./constants";

describe("budgetPeriodEnd", () => {
  const start = new Date("2026-01-15T00:00:00.000Z");

  it("adds 1 day for 'Chaque Jour'", () => {
    const end = budgetPeriodEnd(start, "Chaque Jour");
    expect(end.toISOString()).toBe("2026-01-16T00:00:00.000Z");
  });

  it("adds 7 days for 'Chaque Semaine'", () => {
    const end = budgetPeriodEnd(start, "Chaque Semaine");
    expect(end.toISOString()).toBe("2026-01-22T00:00:00.000Z");
  });

  it("adds 14 days for 'Chaque 2 Semaine'", () => {
    const end = budgetPeriodEnd(start, "Chaque 2 Semaine");
    expect(end.toISOString()).toBe("2026-01-29T00:00:00.000Z");
  });

  it("adds 1 month for 'Chaque Mois'", () => {
    const end = budgetPeriodEnd(start, "Chaque Mois");
    expect(end.toISOString()).toBe("2026-02-15T00:00:00.000Z");
  });

  it("adds 3 months for 'Chaque Trimestre'", () => {
    const end = budgetPeriodEnd(start, "Chaque Trimestre");
    expect(end.toISOString()).toBe("2026-04-15T00:00:00.000Z");
  });

  it("adds 6 months for 'Chaque Simestre'", () => {
    const end = budgetPeriodEnd(start, "Chaque Simestre");
    expect(end.toISOString()).toBe("2026-07-15T00:00:00.000Z");
  });

  it("adds 1 year for 'Chaque Année'", () => {
    const end = budgetPeriodEnd(start, "Chaque Année");
    expect(end.toISOString()).toBe("2027-01-15T00:00:00.000Z");
  });

  it("falls back to monthly for an unrecognized value", () => {
    const end = budgetPeriodEnd(start, "Some Garbage Value");
    expect(end.toISOString()).toBe("2026-02-15T00:00:00.000Z");
  });

  it("handles every value in BUDGET_DUREES without throwing", () => {
    for (const duree of BUDGET_DUREES) {
      expect(() => budgetPeriodEnd(start, duree)).not.toThrow();
      expect(budgetPeriodEnd(start, duree).getTime()).toBeGreaterThan(start.getTime());
    }
  });

  it("does not mutate the input date", () => {
    const original = new Date(start);
    budgetPeriodEnd(start, "Chaque Mois");
    expect(start.getTime()).toBe(original.getTime());
  });
});

describe("status color helpers", () => {
  it("urgenceColor returns a distinct color per known urgency level", () => {
    const eleveeColor = urgenceColor("Elevée");
    const moyenneColor = urgenceColor("Moyenne");
    const faibleColor = urgenceColor("Faible");
    expect(new Set([eleveeColor.fg, moyenneColor.fg, faibleColor.fg]).size).toBe(3);
  });

  it("urgenceColor falls back gracefully for unknown/null input", () => {
    expect(() => urgenceColor(null)).not.toThrow();
    expect(() => urgenceColor(undefined)).not.toThrow();
    expect(() => urgenceColor("nonsense")).not.toThrow();
  });

  it("statutColor treats both 'Clôturé' and 'Clôturée' as the closed state", () => {
    expect(statutColor("Clôturé")).toEqual(statutColor("Clôturée"));
  });

  it("commandeStatutColor covers every value in COMMANDE_STATUTS", () => {
    for (const s of ["En attente", "En cours", "Annulée", "Clôturée"]) {
      expect(() => commandeStatutColor(s)).not.toThrow();
    }
  });

  it("daStatutColor distinguishes closed from open", () => {
    expect(daStatutColor("Clôturée")).not.toEqual(daStatutColor("En cours"));
  });

  it("atelierEtatColor handles the added 'Terminé' state distinctly from 'A Vérifié'", () => {
    expect(atelierEtatColor("Terminé")).not.toEqual(atelierEtatColor("A Vérifié"));
  });

  it("posteColor covers all three shifts distinctly", () => {
    const jour = posteColor("Jour");
    const soir = posteColor("Soir");
    const nuit = posteColor("Nuit");
    expect(new Set([jour.fg, soir.fg, nuit.fg]).size).toBe(3);
  });
});
