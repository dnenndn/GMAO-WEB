"use client";

import { useMemo, useState, useTransition } from "react";
import { createDemandeAchatWithLignes } from "@/app/(dashboard)/procurement/actions";

type ArticleOption = { id: number; codeArticle: string | null; designation: string };

type StagedLigne = {
  key: number;
  idArticle: number;
  designation: string;
  qt: number;
  motif: string;
};

export function CreerDemandeTab({ articles }: { articles: ArticleOption[] }) {
  const [delai, setDelai] = useState("");
  const [periode, setPeriode] = useState("Jour");
  const [search, setSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<ArticleOption | null>(null);
  const [qt, setQt] = useState("1");
  const [motif, setMotif] = useState("");
  const [lignes, setLignes] = useState<StagedLigne[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filteredArticles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return articles.slice(0, 200);
    return articles
      .filter(
        (a) =>
          a.designation.toLowerCase().includes(q) ||
          (a.codeArticle ?? "").toLowerCase().includes(q)
      )
      .slice(0, 200);
  }, [articles, search]);

  function addLigne() {
    if (!selectedArticle) return;
    const qtNum = Number(qt);
    if (!qtNum || qtNum <= 0) return;

    setLignes((prev) => [
      ...prev,
      {
        key: Date.now(),
        idArticle: selectedArticle.id,
        designation: selectedArticle.designation,
        qt: qtNum,
        motif,
      },
    ]);
    setSelectedArticle(null);
    setQt("1");
    setMotif("");
  }

  function removeLigne(key: number) {
    setLignes((prev) => prev.filter((l) => l.key !== key));
  }

  function submit() {
    if (lignes.length === 0) {
      setError("Ajoutez au moins un article avant de créer la demande.");
      return;
    }
    setError(null);
    startTransition(async () => {
      await createDemandeAchatWithLignes(
        { delai: delai ? Number(delai) : null, periode: periode || null },
        lignes.map((l) => ({ idArticle: l.idArticle, qt: l.qt, motif: l.motif || null }))
      );
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Délai Souhaité
          </label>
          <input
            type="number"
            value={delai}
            onChange={(e) => setDelai(e.target.value)}
            className="border border-hairline rounded px-3 py-2 text-sm bg-surface w-28"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5 opacity-0">
            Période
          </label>
          <select
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
          >
            <option value="Jour">Jour</option>
            <option value="Semaine">Semaine</option>
            <option value="Mois">Mois</option>
          </select>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="bg-safety text-white text-sm font-semibold px-5 py-2 rounded hover:bg-safety/90 transition-colors disabled:opacity-50"
        >
          {isPending ? "Création…" : "Créer DA"}
        </button>
        {error && <span className="text-xs text-urgent">{error}</span>}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Article</div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface mb-2"
          />
          <div className="border border-hairline rounded bg-surface h-72 overflow-y-auto">
            {filteredArticles.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedArticle(a)}
                className={`w-full text-left px-3 py-1.5 text-sm border-b border-hairline last:border-0 truncate ${
                  selectedArticle?.id === a.id ? "bg-steel-600 text-white" : "text-ink hover:bg-paper"
                }`}
              >
                {a.codeArticle ? `${a.codeArticle} — ` : ""}{a.designation}
              </button>
            ))}
            {filteredArticles.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted">Aucun article trouvé.</div>
            )}
          </div>

          <div className="flex items-end gap-2 mt-3">
            <div className="w-24">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Quantité</label>
              <input
                type="number"
                value={qt}
                onChange={(e) => setQt(e.target.value)}
                min={1}
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Motif</label>
              <input
                type="text"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <button
              type="button"
              onClick={addLigne}
              disabled={!selectedArticle}
              className="bg-steel-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-steel-700 transition-colors disabled:opacity-40"
            >
              + Ajouter
            </button>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Articles de la demande
          </div>
          <div className="border border-hairline rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted bg-paper">
                  <th className="px-3 py-2 font-semibold">Désignation</th>
                  <th className="px-3 py-2 font-semibold w-20 text-right">Quantité</th>
                  <th className="px-3 py-2 font-semibold">Motif</th>
                  <th className="px-3 py-2 font-semibold w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.key} className="border-b border-hairline last:border-0">
                    <td className="px-3 py-2 text-ink">{l.designation}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-ink">{l.qt}</td>
                    <td className="px-3 py-2 text-ink text-xs">{l.motif || "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLigne(l.key)}
                        className="text-urgent hover:text-urgent/70 text-xs font-bold"
                        title="Retirer"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
                {lignes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-muted text-sm">
                      Aucun article ajouté pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
