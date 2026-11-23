"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, BookOpen, ChefHat, Download, FileDown, MapPin, Search, ShieldCheck, Wheat } from "lucide-react";
import { useSessionUser } from "@/components/auth/session-provider";
import { SectionShell } from "@/components/integration/section-shell";
import { usePublicCatalog } from "@/components/public/public-catalog-provider";
import { buildPublicDashboardView, publicSummaryYears } from "@/lib/public-dashboard";
import { defaultFilters, type CategoryFilter } from "@/lib/dashboard-view";
import { downloadDashboardData, downloadReportRows } from "@/lib/dashboard-export";
import { pueblaMunicipalities } from "@/data/puebla-municipalities";

const templates = [
  { id: "panorama", title: "Panorama gastronómico", description: "Indicadores y distribución del acervo.", icon: BarChart3, color: "#173257", category: "todas" },
  { id: "territorio", title: "Cobertura territorial", description: "Municipios y concentración de publicaciones.", icon: MapPin, color: "#007f78", category: "todas" },
  { id: "calidad", title: "Calidad de los datos", description: "Descripción, ubicación y fuentes documentadas.", icon: ShieldCheck, color: "#a86408", category: "todas" },
  { id: "recetas", title: "Catálogo de recetas", description: "Preparaciones y recetas publicadas.", icon: BookOpen, color: "#ae174e", category: "recetas" },
  { id: "ingredientes", title: "Catálogo de ingredientes", description: "Productos y usos gastronómicos documentados.", icon: Wheat, color: "#b44428", category: "ingredientes" },
  { id: "cocineras", title: "Directorio de saberes", description: "Cocineras y cocineros con fichas publicadas.", icon: ChefHat, color: "#375a8c", category: "cocineras" },
] as const;

export function PublicReports() {
  const user = useSessionUser();
  const [template, setTemplate] = useState<typeof templates[number]["id"]>("panorama");
  const catalog = usePublicCatalog();
  const [municipality, setMunicipality] = useState("todos");
  const [period, setPeriod] = useState("todos");
  const [category, setCategory] = useState<CategoryFilter>("todas");
  const [search, setSearch] = useState("");
  const filters = { ...defaultFilters, municipality, period, category };
  const view = useMemo(() => buildPublicDashboardView(catalog, { ...defaultFilters, municipality, period, category }), [catalog, municipality, period, category]);
  const years = publicSummaryYears(catalog);
  const municipalities = view.rankings.municipios.filter(item => item.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").includes(search.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es")));
  const selectedTemplate = templates.find(item => item.id === template)!;
  const entries = template === "territorio" ? municipalities
    : template === "calidad" ? view.quality.map(item => ({ name: item.label, value: item.value }))
    : template === "recetas" || template === "ingredientes" || template === "cocineras" ? view.rankings[template]
    : [];
  const headers = template === "calidad" ? ["Indicador", "Porcentaje"]
    : template === "territorio" ? ["Municipio", "Registros"] : ["Ficha", "Registros"];
  const download = () => {
    if (!user || template === "panorama") {
      downloadDashboardData(view, filters);
      return;
    }
    downloadReportRows(`observatorio-${template}-${period}.csv`, [
      [selectedTemplate.title], ["Periodo", period], ["Municipio", pueblaMunicipalities.find(item => item.code === municipality)?.name ?? "Todos los municipios"],
      headers, ...entries.map(item => [item.name, item.value]),
    ]);
  };
  return <SectionShell activeItem="Reportes">
    <header className={user ? "acervo-heading rounded-2xl bg-[#173257] p-6 text-white sm:p-8 [&_h1]:!text-white [&_p]:!text-[#d4e3ef]" : "acervo-heading"}><div><p className="section-kicker">Datos y análisis</p><h1>Reportes</h1><p>Consulta la composición y cobertura del acervo publicado.</p></div><Link className="acervo-secondary" href="/datos-analisis">Datos y análisis</Link></header>
    {catalog.error ? <div role="alert" className="acervo-card mt-6 p-6"><p>{catalog.error}</p><button className="acervo-secondary mt-3" onClick={catalog.reload}>Reintentar</button></div> : <>
    {user && <section className="mt-6" aria-labelledby="report-templates">
      <h2 id="report-templates" className="mb-4 text-base font-semibold">Plantillas de reporte</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map(({ id, title, description, icon: Icon, color, category: filter }) =>
          <button key={id} type="button" aria-pressed={template === id} onClick={() => {setTemplate(id);setCategory(filter);}}
            className={`acervo-card flex items-start gap-4 p-5 text-left transition hover:border-[#A9D2ED] ${template === id ? "ring-2 ring-[#2789D1]" : ""}`}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl text-white" style={{backgroundColor:color}}><Icon className="size-5" aria-hidden="true"/></span>
            <span><strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs leading-relaxed text-[#52647d]">{description}</span></span>
          </button>
        )}
      </div>
    </section>}
    <section aria-label="Filtros de reportes" className="acervo-card mt-6 flex flex-wrap items-end gap-4 p-5">
      <label className="min-w-48 flex-1 text-xs font-medium">Municipio<select className="acervo-input mt-2 h-10 w-full" value={municipality} onChange={event=>setMunicipality(event.target.value)}><option value="todos">Todos los municipios</option>{pueblaMunicipalities.map(item=><option value={item.code} key={item.code}>{item.name}</option>)}</select></label>
      <label className="text-xs font-medium">Periodo<select className="acervo-input mt-2 h-10 w-full" value={period} onChange={event=>setPeriod(event.target.value)}><option value="todos">Todo el periodo</option>{years.map(year=><option value={year} key={year}>{year}</option>)}</select></label>
      <label className="text-xs font-medium">Categoría<select className="acervo-input mt-2 h-10 w-full" value={category} onChange={event=>{
        const next=event.target.value as CategoryFilter;
        setCategory(next);
        if (["recetas","ingredientes","cocineras"].includes(template)) setTemplate(templates.find(item=>item.id===next)?.id ?? "panorama");
      }}><option value="todas">Todas las categorías</option><option value="recetas">Recetas</option><option value="ingredientes">Ingredientes</option><option value="cocineras">Cocineras y cocineros</option><option value="mercados">Mercados</option></select></label>
      <button className="acervo-primary" disabled={catalog.loading} onClick={download}><Download className="size-4"/>Descargar CSV</button>
      <button className="acervo-secondary" disabled={catalog.loading} onClick={()=>window.print()}><FileDown className="size-4"/>Imprimir / PDF</button>
    </section>
    {catalog.loading ? <p className="py-10 text-center text-sm" role="status">Cargando publicaciones…</p> : <>
    <div className="mt-6 grid gap-5 sm:grid-cols-2"><article className="acervo-card p-6"><BarChart3 className="size-5 text-[#033AA5]"/><p className="mt-4 text-xs text-[#8190a4]">Registros publicados</p><strong className="mt-1 block text-4xl font-semibold">{view.distributionTotal}</strong></article><article className="acervo-card p-6"><MapPin className="size-5 text-[#2789D1]"/><p className="mt-4 text-xs text-[#8190a4]">Municipios con registros</p><strong className="mt-1 block text-4xl font-semibold">{view.rankings.municipios.length}<span className="text-sm font-normal text-[#8190a4]"> / 217</span></strong></article></div>
    {!view.distributionTotal && <p role="status" className="acervo-card mt-5 p-6 text-sm text-[#8190a4]">Todavía no hay registros publicados para esta selección.</p>}
    {user && template !== "panorama" && template !== "territorio" && <section className="acervo-card mt-6 overflow-hidden">
      <h2 className="p-5 text-base font-semibold">{selectedTemplate.title}</h2>
      <table className="recipe-table"><thead><tr>{headers.map(header=><th key={header} scope="col">{header}</th>)}</tr></thead>
        <tbody>{entries.map(item=><tr key={item.name}><td>{item.name}</td><td>{item.value}{template==="calidad"?"%":""}</td></tr>)}</tbody>
      </table>
    </section>}
    <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
      <section className="acervo-card overflow-hidden"><h2 className="p-5 text-base font-semibold">Composición del acervo</h2><table className="recipe-table"><thead><tr><th scope="col">Categoría</th><th scope="col">Publicaciones</th><th scope="col">Porcentaje</th></tr></thead><tbody>{view.distribution.map(item=><tr key={item.key}><th scope="row" className="px-5 py-4 text-left text-xs font-medium">{item.name}</th><td>{item.value}</td><td>{view.distributionTotal ? (item.value/view.distributionTotal*100).toLocaleString("es-MX",{maximumFractionDigits:1}) : 0}%</td></tr>)}</tbody></table></section>
      <section className="acervo-card overflow-hidden"><div className="p-5"><h2 className="text-base font-semibold">Cobertura municipal</h2><div className="relative mt-4"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8190a4]"/><input className="acervo-input acervo-search-input h-10 w-full" aria-label="Buscar municipio en reporte" placeholder="Buscar municipio…" value={search} onChange={event=>setSearch(event.target.value)}/></div></div><table className="recipe-table"><thead><tr><th scope="col">Municipio</th><th scope="col">Registros</th></tr></thead><tbody>{municipalities.map(item=><tr key={item.name}><td><Link href={`/mapa?municipio=${pueblaMunicipalities.find(m=>m.name===item.name)?.code || ""}`} className="text-[#033AA5] hover:underline">{item.name}</Link></td><td>{item.value}</td></tr>)}</tbody></table>{!municipalities.length && <p className="p-5 text-xs text-[#8190a4]">No hay municipios con publicaciones para esta búsqueda.</p>}</section>
    </div><p className="mt-5 text-xs leading-5 text-[#8190a4]">Los resultados cuentan las fichas aprobadas disponibles para consulta. El periodo usa la fecha de publicación; las fichas sin fecha se incluyen en «Todo el periodo».</p>
    </>}
    </>}
  </SectionShell>;
}
