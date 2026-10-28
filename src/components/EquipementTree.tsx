"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  getEquipementChildren,
  searchEquipements,
  getEquipementsWithPdf,
  getEquipement3DModels,
} from "@/app/(dashboard)/equipements/actions";
import { Model3DViewer } from "@/components/Model3DViewer";

type EquipNode = {
  id: number;
  idParent: number | null;
  code: string | null;
  designation: string;
  hasPdf: boolean;
};

type Model3D = { id: number; adresse: string };
type DisplayMode = "designation" | "code" | "id";

export function EquipementTree({ roots }: { roots: EquipNode[] }) {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<EquipNode[] | null>(null);
  const [isSearching, startSearchTransition] = useTransition();
  const [displayMode, setDisplayMode] = useState<DisplayMode>("designation");
  const [showJoints, setShowJoints] = useState(false);
  const [jointsNodes, setJointsNodes] = useState<EquipNode[] | null>(null);
  const [isLoadingJoints, startJointsTransition] = useTransition();

  // Loaded children per node id, populated lazily as nodes are
  // expanded — matches the real reference screen's own design
  // (Arbre_Equipement.cs re-queries id_parent = @r on every expand
  // rather than loading the whole hierarchy at once).
  const [childrenByParent, setChildrenByParent] = useState<Map<number, EquipNode[]>>(new Map());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());

  // Selection — clicking a part's name shows its 3D model(s) directly
  // next to the tree, instead of navigating to a separate page/tab.
  // The small "→" link next to each row still goes to the full
  // equipment detail page for people who want that.
  const [selected, setSelected] = useState<EquipNode | null>(null);
  const [selectedModels, setSelectedModels] = useState<Model3D[] | null>(null);
  const [isLoadingModels, startModelsTransition] = useTransition();

  function selectNode(node: EquipNode) {
    setSelected(node);
    setSelectedModels(null);
    if (!node.hasPdf) {
      setSelectedModels([]);
      return;
    }
    startModelsTransition(async () => {
      const models = await getEquipement3DModels(node.id);
      setSelectedModels(models);
    });
  }

  async function toggleExpand(id: number) {
    if (expanded.has(id)) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }
    setExpanded((prev) => new Set(prev).add(id));
    if (childrenByParent.has(id)) return; // already loaded, just toggling open
    setLoadingIds((prev) => new Set(prev).add(id));
    const kids = await getEquipementChildren(id);
    setChildrenByParent((prev) => new Map(prev).set(id, kids));
    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function label(n: EquipNode): string {
    if (displayMode === "code") return n.code || `#${n.id}`;
    if (displayMode === "id") return String(n.id);
    return n.designation;
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (!value.trim()) {
      setSearchResults(null);
      return;
    }
    startSearchTransition(async () => {
      const results = await searchEquipements(value);
      setSearchResults(results);
    });
  }

  function handleToggleJoints() {
    const next = !showJoints;
    setShowJoints(next);
    if (next && jointsNodes === null) {
      startJointsTransition(async () => {
        const results = await getEquipementsWithPdf();
        setJointsNodes(results);
      });
    }
  }

  const rows = useMemo(() => {
    type Row = { node: EquipNode; depth: number; hasChildren: boolean | "unknown" };
    const out: Row[] = [];
    // Iterative, explicit-stack walk over only what's currently loaded
    // client-side (roots + any expanded node's cached children) — no
    // function recursion, and nothing here can ever see more than one
    // node's worth of unloaded data at a time, so neither a cycle nor a
    // huge dataset can blow the call stack or the network payload.
    const stack: { node: EquipNode; depth: number }[] = [];
    for (let i = roots.length - 1; i >= 0; i--) stack.push({ node: roots[i], depth: 0 });
    const visited = new Set<number>();

    while (stack.length > 0) {
      const { node, depth } = stack.pop()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);

      const kids = childrenByParent.get(node.id);
      const isExpanded = expanded.has(node.id);
      out.push({ node, depth, hasChildren: kids ? kids.length > 0 : "unknown" });

      if (isExpanded && kids) {
        for (let i = kids.length - 1; i >= 0; i--) {
          if (!visited.has(kids[i].id)) stack.push({ node: kids[i], depth: depth + 1 });
        }
      }
    }
    return out;
  }, [roots, childrenByParent, expanded]);

  const showingSearch = search.trim().length > 0;

  function RowLabel({ node }: { node: EquipNode }) {
    const isSelected = selected?.id === node.id;
    return (
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => selectNode(node)}
          className={`text-sm truncate text-left transition-colors ${
            isSelected ? "text-steel-700 font-semibold" : "text-ink hover:text-steel-600"
          }`}
        >
          {label(node)}
        </button>
        {node.hasPdf && (
          <span className="w-1.5 h-1.5 rounded-full bg-steel-500 shrink-0" title="Modèle 3D disponible" />
        )}
        <Link
          href={`/equipements/${node.id}`}
          className="ml-auto text-muted hover:text-steel-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Voir la fiche équipement"
        >
          →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Recherche"
            className="border border-hairline rounded px-3 py-2 text-sm bg-surface w-64"
          />
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleToggleJoints}
              className={`text-sm font-semibold px-4 py-2 rounded transition-colors ${
                showJoints ? "bg-steel-600 text-white" : "bg-urgent text-white hover:bg-urgent/90"
              }`}
            >
              {showJoints ? "Annuler" : "Afficher Joints"}
            </button>
            <div className="flex gap-4 text-sm">
              {[
                { key: "designation" as const, label: "Désignation" },
                { key: "code" as const, label: "Code Equipement" },
                { key: "id" as const, label: "ID" },
              ].map((m) => (
                <label key={m.key} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="displayMode"
                    checked={displayMode === m.key}
                    onChange={() => setDisplayMode(m.key)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-surface border border-hairline rounded p-4 max-h-[600px] overflow-y-auto">
          {showJoints ? (
            isLoadingJoints ? (
              <div className="text-sm text-muted text-center py-8">Chargement…</div>
            ) : jointsNodes && jointsNodes.length === 0 ? (
              <div className="text-sm text-muted text-center py-8">Aucun équipement avec document PDF attaché.</div>
            ) : (
              (jointsNodes ?? []).map((n) => (
                <div key={n.id} className="group flex items-center gap-1.5 py-1 hover:bg-paper/60 rounded px-1">
                  <span className="w-4 shrink-0" />
                  <RowLabel node={n} />
                </div>
              ))
            )
          ) : showingSearch ? (
            isSearching ? (
              <div className="text-sm text-muted text-center py-8">Recherche…</div>
            ) : !searchResults || searchResults.length === 0 ? (
              <div className="text-sm text-muted text-center py-8">Aucun équipement pour cette recherche.</div>
            ) : (
              searchResults.map((n) => (
                <div key={n.id} className="group flex items-center gap-1.5 py-1 hover:bg-paper/60 rounded px-1">
                  <span className="w-4 shrink-0" />
                  <RowLabel node={n} />
                </div>
              ))
            )
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted text-center py-8">Aucun équipement pour le moment.</div>
          ) : (
            rows.map(({ node, depth, hasChildren }) => {
              const isExpanded = expanded.has(node.id);
              const isLoading = loadingIds.has(node.id);
              return (
                <div
                  key={node.id}
                  className="group flex items-center gap-1.5 py-1 hover:bg-paper/60 rounded px-1"
                  style={{ paddingLeft: depth * 20 }}
                >
                  {hasChildren === false ? (
                    <span className="w-4 shrink-0" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleExpand(node.id)}
                      className="w-4 h-4 flex items-center justify-center text-muted hover:text-ink shrink-0"
                    >
                      {isLoading ? "…" : isExpanded ? "▾" : "▸"}
                    </button>
                  )}
                  <RowLabel node={node} />
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="w-[420px] shrink-0 sticky top-4">
        {!selected ? (
          <div className="bg-surface border border-hairline rounded p-8 text-center text-sm text-muted h-96 flex items-center justify-center">
            Sélectionnez un équipement pour voir son modèle 3D, s&apos;il en a un.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-ink truncate">{selected.designation}</div>
            {isLoadingModels || selectedModels === null ? (
              <div className="bg-surface border border-hairline rounded h-96 flex items-center justify-center text-sm text-muted">
                Chargement…
              </div>
            ) : selectedModels.length === 0 ? (
              <div className="bg-surface border border-hairline rounded h-96 flex items-center justify-center text-sm text-muted text-center px-6">
                Aucun modèle 3D pour cet équipement.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedModels.map((m) => (
                  <Model3DViewer key={m.id} url={m.adresse} className="h-96" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
