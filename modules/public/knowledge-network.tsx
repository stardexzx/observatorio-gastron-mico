"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ChefHat, Mic2, Network, RotateCcw, Search, ShoppingBasket, Wheat } from "lucide-react";
import { usePublicCatalog } from "@/components/public/public-catalog-provider";
import { SectionShell } from "@/components/integration/section-shell";
import { authorCatalogs, buildKnowledgeGraph, buildUnifiedCatalogs, normalizedName } from "@/lib/integration/records";

const categories: Record<string, { label: string; singular: string; icon: typeof BookOpen; color: string }> = {
  rec: { label: "Recetas", singular: "Receta", icon: BookOpen, color: "#033AA5" },
  ing: { label: "Ingredientes", singular: "Ingrediente", icon: Wheat, color: "#2789D1" },
  mer: { label: "Mercados y tianguis", singular: "Mercado o tianguis", icon: ShoppingBasket, color: "#94630f" },
  coc: { label: "Cocineras y cocineros", singular: "Cocinera o cocinero", icon: ChefHat, color: "#EF703C" },
  ep: { label: "Podcast", singular: "Capítulo", icon: Mic2, color: "#68849e" },
};

type Point = { x: number; y: number };

export function PublicKnowledgeNetwork() {
  const catalog = usePublicCatalog();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState("");
  const [positions, setPositions] = useState<Record<string, Point>>({});
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; point: Point; start: Point } | null>(null);

  const graph = useMemo(() => {
    const unified = buildUnifiedCatalogs({}, authorCatalogs(catalog.recipes, catalog.cooks, catalog.ingredients));
    const result = buildKnowledgeGraph({
      ...unified,
      mercados: catalog.markets.map(market => ({ ...market, n: market.name })),
    });
    result.nodes.push(...catalog.episodes.map(episode => ({
      id: `podcast:${episode.id}`, n: episode.title, t: "ep",
      to: `/podcast/${encodeURIComponent(episode.id)}`, r: 14, x: 0, y: 0,
    })));
    const lookup = new Map(result.nodes.map(node => [node.id.slice(node.id.indexOf(":") + 1), node.id]));
    const seen = new Set(result.edges.map(edge => [edge.source, edge.target].sort().join("|")));
    const episodeLinks = catalog.episodes.flatMap(episode =>
      [...episode.recipeIds, ...episode.ingredientIds].map(id => ({ source: episode.id, target: id, type: "documenta" })),
    );
    for (const relation of [...catalog.relations, ...episodeLinks]) {
      const source = lookup.get(relation.source), target = lookup.get(relation.target);
      if (!source || !target || source === target) continue;
      const key = [source, target].sort().join("|");
      if (!seen.has(key)) {
        seen.add(key);
        result.edges.push({ source, target, type: relation.type });
      }
    }
    return result;
  }, [catalog.recipes, catalog.cooks, catalog.ingredients, catalog.markets, catalog.episodes, catalog.relations]);

  const nodes = category ? graph.nodes.filter(node => node.t === category) : graph.nodes;
  const points = new Map(nodes.map((node, index) => {
    const angle = index * 2 * Math.PI / nodes.length;
    const initial = nodes.length === 1 ? { x: 380, y: 240 } : { x: 380 + 295 * Math.cos(angle), y: 240 + 175 * Math.sin(angle) };
    return [node.id, positions[node.id] ?? initial];
  }));
  const edges = graph.edges.filter(edge => points.has(edge.source) && points.has(edge.target));
  const query = normalizedName(search);
  const matches = nodes.filter(node => normalizedName(node.n).includes(query));
  const matchIds = new Set(matches.map(node => node.id));
  const selectedNode = nodes.find(node => node.id === selected);
  const neighbors = new Set(edges.filter(edge => edge.source === selected || edge.target === selected).flatMap(edge => [edge.source, edge.target]));

  const reset = () => {
    setPositions({});
    setSelected("");
    setSearch("");
    setCategory("");
  };
  const pointerPoint = (event: React.PointerEvent<SVGElement>) => {
    const box = svg.current!.getBoundingClientRect();
    return { x: (event.clientX - box.left) / box.width * 760, y: (event.clientY - box.top) / box.height * 480 };
  };

  return <SectionShell activeItem="Red de conocimiento">
    <header className="acervo-heading"><div><p className="section-kicker">Datos y análisis</p><h1>Red de conocimiento</h1><p>Explora las relaciones entre los registros publicados del acervo.</p></div><Link href="/reportes" className="acervo-secondary">Consultar reportes<ArrowRight className="size-4"/></Link></header>
    {catalog.error ? <div role="alert" className="acervo-card mt-6 p-6">{catalog.error}<button onClick={catalog.reload} className="acervo-secondary mt-4">Reintentar</button></div>
      : catalog.loading ? <p role="status" className="py-16 text-center">Cargando la red de conocimiento…</p>
      : <section className="acervo-card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 border-b p-5">
          <div className="relative w-full sm:w-80">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8190a4]"/>
            <input aria-label="Buscar en la red" placeholder="Buscar registros en la red…" value={search} onChange={event => setSearch(event.target.value)} className="acervo-input acervo-search-input h-10 w-full"/>
          </div>
          <select aria-label="Categoría de la red" className="acervo-input h-10 w-full sm:w-auto" value={category} onChange={event => {
            setCategory(event.target.value);
            setPositions({});
            setSelected("");
          }}>
            <option value="">Todas las categorías</option>
            {Object.entries(categories).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
          </select>
          <button type="button" onClick={reset} className="acervo-secondary sm:ml-auto"><RotateCcw className="size-4"/>Restablecer</button>
        </div>
        {!graph.nodes.length ? <div className="p-12 text-center"><Network className="mx-auto size-10 text-[#A9D2ED]"/><h2 className="mt-4 text-lg font-semibold">La red está por construirse</h2><p className="mt-2 text-sm text-[#8190a4]">Aquí aparecerán los registros publicados y sus relaciones.</p></div>
          : <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="min-w-0 p-4">
              {nodes.length ? <>
                <svg ref={svg} viewBox="0 0 760 480" role="group" aria-label="Relaciones del acervo" className="w-full rounded-xl bg-[#f8fafc]" onPointerMove={event => {
                  if (!drag.current) return;
                  const { id, point, start } = drag.current;
                  const pointer = pointerPoint(event);
                  setPositions(values => ({ ...values, [id]: {
                    x: Math.max(35, Math.min(725, point.x + pointer.x - start.x)),
                    y: Math.max(30, Math.min(435, point.y + pointer.y - start.y)),
                  } }));
                }} onLostPointerCapture={() => { drag.current = null; }}>
                  {edges.map(edge => {
                    const a = points.get(edge.source)!, b = points.get(edge.target)!;
                    return <line key={`${edge.source}|${edge.target}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={neighbors.has(edge.source) && neighbors.has(edge.target) ? "#033AA5" : "#A9D2ED"} strokeWidth="1.5"><title>{edge.type}</title></line>;
                  })}
                  {nodes.map(node => {
                    const point = points.get(node.id)!;
                    const { singular, icon: Icon, color } = categories[node.t];
                    const dimmed = (selectedNode && !neighbors.has(node.id) && node.id !== selected) || !matchIds.has(node.id);
                    return <g key={node.id} transform={`translate(${point.x},${point.y})`} role="button" tabIndex={0} aria-label={`${singular}, ${node.n}`} aria-pressed={selected === node.id} className="group cursor-grab outline-none" opacity={dimmed ? 0.25 : 1} style={{ touchAction: "none" }} onKeyDown={event => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(node.id);
                      }
                    }} onPointerDown={event => {
                      svg.current!.setPointerCapture(event.pointerId);
                      drag.current = { id: node.id, point, start: pointerPoint(event) };
                      setSelected(node.id);
                    }}>
                      <circle r={node.r} fill={color} stroke={selected === node.id ? "#FFBF18" : "white"} strokeWidth="3" className="group-focus-visible:stroke-[#FFBF18]"/>
                      <Icon x={-8} y={-8} size={16} color="white" aria-hidden="true" pointerEvents="none"/>
                      <text y={node.r + 16} textAnchor="middle" fontSize="11" fill="#001B62" paintOrder="stroke" stroke="white" strokeWidth="3">{node.n}</text>
                    </g>;
                  })}
                </svg>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#52647d]">
                  {Object.entries(categories).filter(([key]) => !category || key === category).map(([key, { label, icon: Icon, color }]) =>
                    <span key={key} className="flex items-center gap-2"><Icon size={14} color={color} aria-hidden="true"/>{label}</span>
                  )}
                </div>
                <p className="mt-3 text-xs text-[#8190a4]">Selecciona o arrastra un nodo. También puedes usar la lista y el teclado.</p>
              </> : <p role="status" className="p-8 text-center text-sm">Aún no hay registros en esta categoría.</p>}
            </div>
            <aside className="border-t bg-[#f8fafc] p-5 lg:border-l lg:border-t-0">
              <p className="text-xs text-[#8190a4]" aria-live="polite">{nodes.length} registros · {edges.length} relaciones</p>
              {selectedNode && <div className="my-4 rounded-xl border border-[#A9D2ED] bg-white p-4"><strong className="text-sm">{selectedNode.n}</strong><p className="my-2 text-xs text-[#8190a4]">{categories[selectedNode.t].singular}</p><Link href={selectedNode.to} className="inline-flex items-center gap-2 text-xs font-semibold text-[#033AA5]">Ver ficha<ArrowRight className="size-3"/></Link></div>}
              <h2 className="my-4 text-sm font-semibold">Registros de la red</h2>
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {matches.map(node => {
                  const { icon: Icon, singular, color } = categories[node.t];
                  return <li key={node.id}><button type="button" aria-pressed={selected === node.id} onClick={() => setSelected(node.id)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-white ${selected === node.id ? "bg-white font-semibold text-[#033AA5]" : "text-[#52647d]"}`}><Icon size={16} color={color} className="shrink-0" aria-hidden="true"/><span><span className="sr-only">{singular}: </span>{node.n}</span></button></li>;
                })}
              </ul>
              {!!nodes.length && !matches.length && <p className="text-xs">No encontramos registros con esa búsqueda.</p>}
            </aside>
          </div>}
      </section>}
  </SectionShell>;
}
