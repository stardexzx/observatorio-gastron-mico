"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { BarChart3, CalendarDays, Check, ChevronRight, Download, FileDown, FileSpreadsheet, FileText, MapPinned, Plus, Search, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { ObservatorySidebar } from "@/components/dashboard/observatory-sidebar";
import { usePublicCatalog, type PublicCatalog } from "@/components/public/public-catalog-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pueblaMunicipalities } from "@/data/puebla-municipalities";
import { downloadReportFile, downloadReportRows } from "@/lib/dashboard-export";
import { buildPublicDashboardView, defaultSummaryFilters, publicSummaryYears } from "@/lib/public-dashboard";

const templates = [
  { id: "panorama", title: "Panorama gastronómico", description: "Indicadores generales, tendencias, distribución y rankings.", icon: BarChart3, color: "bg-[#173257]" },
  { id: "territorio", title: "Cobertura territorial", description: "Municipios, regiones y concentración de registros.", icon: MapPinned, color: "bg-[#007f78]" },
  { id: "calidad", title: "Calidad de los datos", description: "Completitud, verificación, consistencia y actualización.", icon: ShieldCheck, color: "bg-[#efa80e] text-[#173257]" },
  { id: "recetas", title: "Catálogo de recetas", description: "Preparaciones, procedencia, estado y completitud.", icon: FileText, color: "bg-[#ae174e]" },
  { id: "ingredientes", title: "Catálogo de ingredientes", description: "Productos, temporada, origen y usos gastronómicos.", icon: FileSpreadsheet, color: "bg-[#dd4b24]" },
  { id: "cocineras", title: "Directorio de saberes", description: "Cocineras, cocineros y colectivos documentados.", icon: Users, color: "bg-[#375a8c]" },
] as const;
const formats = ["PDF", "CSV", "XLSX"] as const;
type Template = typeof templates[number];
type Report = {
  id: string;
  template: Template["id"];
  municipality: string;
  period: string;
  createdAt: string;
  format: typeof formats[number];
};
type ReportContent = { title: string; coverage: string; period: string; columns: string[]; rows: (string | number)[][] };

const reportKey = "observatorio-reports-v1";
const dateFormat = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" });
const municipalityName = (code: string) => pueblaMunicipalities.find(item => item.code === code)?.name ?? "Todos los municipios";
const periodName = (period: string) => {
  if (period === "todos") return "Histórico completo";
  if (period.startsWith("ene-sep-")) return `Enero–septiembre ${period.slice(-4)}`;
  if (period.includes("-")) return period.replace("-", "–");
  return `Año ${period}`;
};
const inPeriod = (publishedAt: string | undefined, period: string) => {
  if (period === "todos") return true;
  if (!publishedAt || !/^\d{4}-\d{2}-\d{2}T/.test(publishedAt) || !Number.isFinite(Date.parse(publishedAt))) return false;
  const year = publishedAt.slice(0, 4);
  if (period.startsWith("ene-sep-")) return period.endsWith(year) && publishedAt.slice(5, 7) <= "09";
  const [from, to = from] = period.split("-");
  return year >= from && year <= to;
};
const reportTemplate = (id: Report["template"]) => templates.find(template => template.id === id)!;
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX").trim();

function readHistory(): Report[] {
  try {
    const items: unknown = JSON.parse(localStorage.getItem(reportKey) ?? "[]");
    if (!Array.isArray(items)) return [];
    return items.flatMap(item => {
      if (!item || typeof item.id !== "string" || typeof item.createdAt !== "string" ||
          !templates.some(template => template.id === item.template) || !formats.includes(item.format)) return [];
      const municipality = item.municipality === "todos" || item.municipality === "Todos los municipios"
        ? "todos"
        : pueblaMunicipalities.find(city => city.code === item.municipality || city.name === item.municipality)?.code;
      const period = item.period === "historico" ? "todos" : item.period;
      if (!municipality || typeof period !== "string" || !/^(todos|\d{4}(?:-\d{4})?|ene-sep-\d{4})$/.test(period)) return [];
      return [{ id: item.id, template: item.template, municipality, period, createdAt: item.createdAt, format: item.format }];
    });
  } catch {
    return [];
  }
}

function reportContent(catalog: PublicCatalog, report: Report): ReportContent {
  const { municipality, period, template } = report;
  const context = { title: reportTemplate(template).title, coverage: municipalityName(municipality), period: periodName(period) };
  const matches = (item: { municipalityCode: string; publishedAt?: string }) =>
    (municipality === "todos" || item.municipalityCode === municipality) &&
    inPeriod(item.publishedAt, period);
  if (template === "recetas") return {
    ...context, columns: ["Receta", "Categoría", "Municipio", "Región", "Estado", "Completitud"],
    rows: catalog.recipes.filter(matches).map(item => [item.name, item.category, item.municipality, item.region, "Publicada", item.completeness]),
  };
  if (template === "ingredientes") return {
    ...context, columns: ["Ingrediente", "Clasificación", "Municipio", "Temporada", "Usos"],
    rows: catalog.ingredients.filter(matches).map(item => [item.name, item.category, item.municipality, item.season, item.uses.join(", ")]),
  };
  if (template === "cocineras") return {
    ...context, columns: ["Nombre", "Tipo", "Municipio", "Comunidad", "Especialidades"],
    rows: catalog.cooks.filter(matches).map(item => [item.name, item.role, item.municipality, item.community, item.specialties.join(", ")]),
  };
  const inReportPeriod = (item: { publishedAt?: string }) => inPeriod(item.publishedAt, period);
  const view = buildPublicDashboardView({
    recipes: catalog.recipes.filter(inReportPeriod), cooks: catalog.cooks.filter(inReportPeriod),
    ingredients: catalog.ingredients.filter(inReportPeriod), markets: catalog.markets.filter(inReportPeriod),
  }, { ...defaultSummaryFilters, municipality });
  if (template === "territorio") return {
    ...context, columns: ["Municipio", "Registros"], rows: view.rankings.municipios.map(item => [item.name, item.value]),
  };
  if (template === "calidad") return {
    ...context, columns: ["Indicador", "Porcentaje"], rows: view.quality.map(item => [item.label, item.value]),
  };
  return {
    ...context, columns: ["Indicador", "Valor"],
    rows: [["Registros publicados", view.distributionTotal], ["Municipios con registros", view.rankings.municipios.length],
      ...view.distribution.map(item => [item.name, item.value]),
      ...view.quality.map(item => [item.label, `${item.value}%`]),
      ...view.rankings.municipios.map(item => [`Publicaciones en ${item.name}`, item.value]),
      ...view.records.filter(item => item.month !== "Sin publicaciones").map(item => [`Publicaciones acumuladas · ${item.month}`, item.records])],
  };
}

export function ReportsCenter() {
  const catalog = usePublicCatalog();
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<Template | null>(null);
  const [municipality, setMunicipality] = useState("todos");
  const [period, setPeriod] = useState("todos");
  const [format, setFormat] = useState<Report["format"]>("PDF");
  const [printContent, setPrintContent] = useState<ReportContent | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setReports(readHistory()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const view = buildPublicDashboardView(catalog, defaultSummaryFilters);
  const years = publicSummaryYears(catalog);
  const filtered = reports.filter(report => normalize(`${reportTemplate(report.template).title} ${municipalityName(report.municipality)} ${periodName(report.period)} ${report.format}`).includes(normalize(search)));
  const ready = !catalog.loading && !catalog.error;

  const print = (report: Report) => {
    flushSync(() => setPrintContent(reportContent(catalog, report)));
    window.print();
  };
  const download = async (report: Report) => {
    if (report.format === "PDF") {
      print(report);
      return;
    }
    const content = reportContent(catalog, report);
    const rows = [[content.title], ["Cobertura", content.coverage], ["Periodo", content.period], [], content.columns, ...content.rows];
    const name = `reporte-${report.template}-${report.period}`;
    if (report.format === "CSV") {
      downloadReportRows(`${name}.csv`, rows);
      return;
    }
    try {
      const { reportWorkbook } = await import("@/lib/report-workbook");
      const bytes = Uint8Array.from(reportWorkbook(rows));
      downloadReportFile(`${name}.xlsx`, new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    } catch {
      toast.error("No se pudo preparar el archivo XLSX.");
    }
  };
  const generate = () => {
    if (!dialog || !ready) return;
    const report: Report = {
      id: crypto.randomUUID(), template: dialog.id, municipality, period, createdAt: dateFormat.format(new Date()), format,
    };
    const next = [report, ...reports];
    setReports(next);
    try {
      localStorage.setItem(reportKey, JSON.stringify(next));
    } catch {
      toast.error("El historial de reportes no se pudo guardar en este dispositivo.");
    }
    setDialog(null);
    toast.success("Reporte generado", { description: `${dialog.title} · ${format}` });
    void download(report);
  };

  return <div className="min-h-screen bg-[#f5f7f6] text-[#173257] print:min-h-0 print:bg-white">
    <div className="print:hidden"><ObservatorySidebar activeItem="Reportes"/><main className="admin-main min-h-screen"><div className="mx-auto max-w-[1200px]">
      <header className="flex items-start justify-between gap-6"><div>
        <p className="section-kicker">Análisis y salidas</p>
        <h1 className="editorial-title mt-1 text-[42px] font-bold leading-none">Reportes</h1>
        <p className="mt-2 max-w-2xl text-[14px] text-[#5f6f85]">Genera, consulta y exporta resultados del observatorio gastronómico.</p>
      </div></header>
      {catalog.error && <div role="alert" className="mt-6 rounded-[16px] border bg-white p-5 text-sm">
        <p>{catalog.error}</p><Button variant="outline" className="mt-3" onClick={catalog.reload}>Reintentar</Button>
      </div>}
      <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="rounded-[16px] border bg-white p-5">
          <div className="flex items-end justify-between gap-3"><div>
            <h2 className="editorial-title text-[23px] font-bold">Crear un reporte</h2>
            <p className="mt-1 text-xs text-[#7c8897]">Selecciona una plantilla para configurar el contenido.</p>
          </div><span className="shrink-0 rounded-full bg-[#edf1f2] px-3 py-1 text-[10px] text-[#60707b]">{templates.length} plantillas</span></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {templates.map(({ id, title, description, icon: Icon, color }) => <button key={id} type="button" disabled={!ready} onClick={() => {
              setMunicipality("todos"); setPeriod("todos"); setFormat("PDF"); setDialog(reportTemplate(id));
            }} className="group min-h-[145px] rounded-[14px] border p-4 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:border-[#aebbc1] disabled:opacity-55">
              <span className={`grid size-10 place-items-center rounded-xl text-white ${color}`}><Icon className="size-5" aria-hidden="true"/></span>
              <strong className="mt-4 block text-sm">{title}</strong>
              <span className="mt-1 block text-[11px] leading-4 text-[#7c8897]">{description}</span>
              <ChevronRight className="ml-auto mt-2 size-4 text-[#9ba6ad] transition group-hover:translate-x-1" aria-hidden="true"/>
            </button>)}
          </div>
        </div>
        <aside className="rounded-[16px] border border-[#d8eaf0] bg-[#eef8fb] p-5 text-[#173257]">
          <p className="text-xs text-[#6e7d91]">Estado de las salidas</p>
          <h2 className="editorial-title mt-1 text-[23px] font-bold">{ready ? "Listo para exportar" : "Publicaciones"}</h2>
          {ready ? <><div className="mt-5 space-y-3">{view.quality.map(item => <Quality key={item.label} {...item}/>)}</div>
            <p className="mt-6 text-[11px] leading-4 text-[#6e7d91]">Los porcentajes corresponden al acervo publicado y se incorporan al reporte de calidad.</p></>
            : <p role="status" className="mt-5 text-xs text-[#6e7d91]">{catalog.loading ? "Cargando publicaciones…" : "Los indicadores no están disponibles."}</p>}
        </aside>
      </section>
      <section className="mt-5 rounded-[16px] border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4"><div>
          <h2 className="editorial-title text-[23px] font-bold">Reportes recientes</h2>
          <p className="mt-1 text-xs text-[#7c8897]">Historial generado en este dispositivo.</p>
        </div><div className="relative w-full sm:w-[320px]">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8792a4]"/>
          <Input aria-label="Buscar reporte" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar reporte" className="h-10 rounded-full border-0 bg-[#f1f4f5] pl-11"/>
        </div></div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] table-fixed text-left">
            <thead className="border-b text-[10px] font-semibold uppercase tracking-[.09em] text-[#78869a]"><tr>
              {["Reporte", "Cobertura", "Periodo", "Formato", "Acciones"].map((label, index) => <th key={label} scope="col" className={`px-3 py-2 ${["w-[34%]", "w-[22%]", "w-[17%]", "w-[12%]", "w-[15%]"][index]}`}>{label}</th>)}
            </tr></thead>
            <tbody>{filtered.map(report => <ReportRow key={report.id} report={report} ready={ready} onDownload={() => void download(report)} onPrint={() => print(report)}/>)}</tbody>
          </table>
        </div>
        {!filtered.length && <p className="px-3 py-6 text-xs text-[#6e7d91]">{reports.length ? "No encontramos reportes para esa búsqueda." : "Aún no se han generado reportes en este dispositivo."}</p>}
      </section>
    </div></main></div>
    <Dialog open={!!dialog} onOpenChange={open => { if (!open) setDialog(null); }}>
      <DialogContent className="rounded-[18px] bg-white p-7 sm:max-w-[520px] print:hidden">
        <DialogHeader><div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#173257] text-white"><FileText className="size-6" aria-hidden="true"/></span>
          <div><DialogTitle className="editorial-title text-[24px]">{dialog?.title}</DialogTitle><DialogDescription>Configura el alcance y el formato de salida.</DialogDescription></div>
        </div></DialogHeader>
        <div className="space-y-4 py-3">
          <div><Label htmlFor="report-municipality" className="mb-2 block">Municipio</Label>
            <Select value={municipality} onValueChange={setMunicipality}>
              <SelectTrigger id="report-municipality" className="h-12 w-full rounded-xl bg-[#f1f4f5]"><MapPinned className="size-4" aria-hidden="true"/><SelectValue/></SelectTrigger>
              <SelectContent className="max-h-80"><SelectItem value="todos">Todos los municipios</SelectItem>{pueblaMunicipalities.map(item => <SelectItem key={item.code} value={item.code}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="report-period" className="mb-2 block">Periodo</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger id="report-period" className="h-12 w-full rounded-xl bg-[#f1f4f5]"><CalendarDays className="size-4" aria-hidden="true"/><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="todos">Histórico completo</SelectItem>{years.map(year => <SelectItem key={year} value={year}>{periodName(year)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <fieldset><legend className="mb-2 text-sm font-medium">Formato</legend><div className="grid grid-cols-3 gap-2">
            {formats.map(value => <button key={value} type="button" aria-pressed={format === value} onClick={() => setFormat(value)}
              className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-semibold ${format === value ? "border-[#173257] bg-[#edf1f7]" : "hover:bg-[#f6f8f8]"}`}>
              {format === value && <Check className="size-4" aria-hidden="true"/>}{value}
            </button>)}
          </div></fieldset>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialog(null)} className="rounded-full">Cancelar</Button>
          <Button disabled={!ready} onClick={generate} className="rounded-full bg-[#cf1760] px-5 hover:bg-[#ac124f]"><Plus aria-hidden="true"/>Generar reporte</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {printContent && <article className="hidden p-6 text-black print:block">
      <p>Observatorio Gastronómico de Puebla</p><h1 className="mt-2 text-2xl font-bold">{printContent.title}</h1>
      <p className="my-4">{printContent.coverage} · {printContent.period}</p>
      <table className="w-full border-collapse text-left text-sm">
        <thead><tr>{printContent.columns.map(column => <th key={column} scope="col" className="border-b p-2">{column}</th>)}</tr></thead>
        <tbody>{printContent.rows.map((row, index) => <tr key={index}>{row.map((value, column) => <td key={column} className="border-b p-2">{value}</td>)}</tr>)}</tbody>
      </table>
      {!printContent.rows.length && <p className="mt-4">No hay publicaciones para estos filtros.</p>}
    </article>}
  </div>;
}

function Quality({ label, value }: { label: string; value: number }) {
  return <div><div className="mb-1.5 flex justify-between gap-2 text-xs"><span>{label}</span><strong>{value}%</strong></div>
    <div className="h-1.5 overflow-hidden rounded-full bg-white/60"><span className="block h-full rounded-full bg-[#55dfaa]" style={{ width: `${value}%` }}/></div>
  </div>;
}

function ReportRow({ report, ready, onDownload, onPrint }: { report: Report; ready: boolean; onDownload: () => void; onPrint: () => void }) {
  const Icon = report.format === "PDF" ? FileDown : FileSpreadsheet;
  const { title } = reportTemplate(report.template);
  return <tr className="border-b last:border-0">
    <td className="px-3 py-3"><div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf1f7] text-[#173257]"><Icon className="size-5" aria-hidden="true"/></span>
      <span><strong className="block text-xs">{title}</strong><small className="text-[10px] text-[#8b96a7]">Generado el {report.createdAt}</small></span>
    </div></td>
    <td className="truncate px-3 py-3 text-xs">{municipalityName(report.municipality)}</td>
    <td className="px-3 py-3 text-xs">{periodName(report.period)}</td>
    <td className="px-3 py-3"><span className="rounded-md bg-[#edf1f2] px-2 py-1 text-[10px] font-semibold">{report.format}</span></td>
    <td className="px-3 py-3"><div className="flex gap-1">
      <Button variant="outline" size="icon" disabled={!ready} onClick={onDownload} aria-label={`Descargar ${title}`} className="size-8 rounded-full"><Download className="size-3.5"/></Button>
      <Button variant="ghost" size="icon" disabled={!ready} onClick={onPrint} aria-label={`Vista imprimible de ${title}`} className="size-8 rounded-full"><FileText className="size-3.5"/></Button>
    </div></td>
  </tr>;
}
