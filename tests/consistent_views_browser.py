"""Compare published data and map density with and without an authenticated session."""
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

session = json.loads(Path(sys.argv[1]).read_text())
origin = session["origin"]
output = Path("work/consistent-views")
output.mkdir(parents=True, exist_ok=True)


def density_snapshot(page):
    return page.locator(".municipal-canvas path[role='button']").evaluate_all(
        "els => els.map(el => ({code:el.dataset.municipality,count:el.dataset.recordCount,fill:getComputedStyle(el).fill}))"
    )


INTERIOR_POINT = """el=>{
      const box=el.getBBox();
      for(let y=1;y<20;y++)for(let x=1;x<20;x++){
        const p=new DOMPoint(box.x+box.width*x/20,box.y+box.height*y/20);
        if(el.isPointInFill(p)&&!el.isPointInStroke(p)){
          const screen=p.matrixTransform(el.getScreenCTM());
          if(document.elementFromPoint(screen.x,screen.y)===el)return {x:screen.x,y:screen.y};
        }
      }
      throw new Error('No se encontró un punto interior del municipio');
    }"""


def check_zero_selection(page):
    zero = page.locator(".municipal-canvas path[data-record-count='0']").first
    zero.scroll_into_view_if_needed()
    original = zero.evaluate("el=>getComputedStyle(el).fill")
    # Find a point inside the actual polygon rather than relying on its bounding-box centre.
    location = zero.evaluate(INTERIOR_POINT)
    page.mouse.move(location["x"], location["y"])
    expect(zero).to_have_css("fill", "rgb(196, 90, 50)")
    page.mouse.move(0, 0)
    expect(zero).to_have_css("fill", original)
    zero.focus()
    expect(zero).to_have_css("fill", "rgb(196, 90, 50)")
    zero.evaluate("el=>el.blur()")
    expect(zero).to_have_css("fill", original)
    # Selection from the dropdown must fill the whole shape even without hover or focus.
    code = zero.get_attribute("data-municipality")
    page.get_by_label("Municipio del mapa", exact=True).select_option(code)
    expect(zero).to_have_attribute("aria-pressed", "true")
    expect(zero).to_have_css("fill", "rgb(196, 90, 50)")
    expect(zero).to_have_css("stroke", "rgb(0, 0, 0)")
    expect(zero).to_have_css("stroke-width", "0.65px")
    expect(page.locator(".municipal-selection")).to_contain_text("Municipio seleccionado")
    expect(page.locator(".public-map aside")).to_contain_text("0 registros encontrados")
    expect(zero).to_have_attribute("data-record-count", "0")
    # Keyboard deselection restores density after focus leaves the municipality.
    zero.focus()
    zero.press("Enter")
    expect(zero).to_have_attribute("aria-pressed", "false")
    zero.evaluate("el=>el.blur()")
    expect(zero).to_have_css("fill", original)
    zero.scroll_into_view_if_needed()
    location = zero.evaluate(INTERIOR_POINT)
    page.mouse.click(location["x"], location["y"])
    expect(zero).to_have_attribute("aria-pressed", "true")
    page.mouse.move(0, 0)
    zero.evaluate("el=>el.blur()")
    expect(zero).to_have_css("fill", "rgb(196, 90, 50)")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"),
        headless=True, args=["--no-sandbox"],
    )
    public = browser.new_context(viewport={"width": 1360, "height": 1000}, reduced_motion="reduce")
    team = browser.new_context(viewport={"width": 1360, "height": 1000}, reduced_motion="reduce")
    team.add_cookies([{"name": session["name"], "value": session["value"], "url": origin, "httpOnly": True, "sameSite": "Lax"}])
    pages = [public.new_page(), team.new_page()]
    catalog = public.request.get(origin + "/api/public/catalog").json()
    total = sum(len(catalog[key]) for key in ["recipes", "ingredients", "cooks", "markets"])
    snapshots = []
    legends = []
    summaries = []
    for label, page in zip(["usuario", "equipo"], pages):
        page.set_default_timeout(20000)
        page.goto(origin + "/", wait_until="networkidle")
        counter = page.get_by_role("button", name=f"Explorar registros totales: {total:,} registros", exact=True)
        expect(counter).to_be_visible()
        summaries.append(page.locator("section[aria-label='Indicadores generales']").inner_text())
        assert "+8.6 pp" not in page.locator("main").inner_text()
        miniature = page.get_by_role("group", name="Mapa municipal de Puebla con 217 áreas geoestadísticas municipales", exact=True)
        expect(miniature.locator("path[role='button']")).to_have_count(217)
        initial_fills = miniature.locator("path[role='button']").evaluate_all("els=>els.map(el=>getComputedStyle(el).fill)")
        empty_municipality = miniature.locator("path[aria-label*=', 0 registros publicados']").first
        mini_index = empty_municipality.evaluate("el=>Array.from(el.ownerSVGElement.querySelectorAll('path[role=button]')).indexOf(el)")
        empty_municipality.focus()
        expect(empty_municipality).to_have_css("fill", "rgb(196, 90, 50)")
        empty_municipality.press("Enter")
        expect(empty_municipality).to_have_attribute("aria-pressed", "true")
        expect(empty_municipality).to_have_css("fill", "rgb(196, 90, 50)")
        selected_fills = initial_fills.copy()
        selected_fills[mini_index] = "rgb(196, 90, 50)"
        assert miniature.locator("path[role='button']").evaluate_all("els=>els.map(el=>getComputedStyle(el).fill)") == selected_fills, "La selección cambió los colores de otros municipios"
        empty_municipality.press("Enter")
        expect(empty_municipality).to_have_attribute("aria-pressed", "false")
        empty_municipality.evaluate("el=>el.blur()")
        expect(empty_municipality).to_have_css("fill", initial_fills[mini_index])
        assert miniature.locator("path[role='button']").evaluate_all("els=>els.map(el=>getComputedStyle(el).fill)") == initial_fills
        expect(counter).to_be_visible()
        market_routes = ["/mercados", "/mercados/ficha-pendiente"]
        for route in market_routes:
            page.goto(origin + route, wait_until="networkidle")
            expect(page.locator("main")).to_contain_text("Próximamente, mercados y tianguis")
            expect(page.locator("main form")).to_have_count(0)
            expect(page.locator("main .legacy-module")).to_have_count(0)
            expect(page.get_by_role("button", name="Nuevo mercado", exact=True)).to_have_count(0)
        if label == "equipo":
            page.goto(origin + "/admin/mercados", wait_until="networkidle")
            expect(page.get_by_role("link", name="Registrar mercado")).to_be_visible()
            page.get_by_role("link", name="Registrar mercado").click()
            expect(page.get_by_role("heading", name="Días y horarios", exact=True)).to_be_visible()
            multimedia = page.get_by_role("button", name="Multimedia", exact=True)
            multimedia.click()
            expect(page.get_by_role("menuitem", name="Podcast", exact=True)).to_be_visible()
            page.get_by_role("menuitem", name="Recetario", exact=True).click()
            expect(page.get_by_role("button", name="Añadir recetario")).to_be_visible()
        page.goto(origin + "/reportes", wait_until="networkidle")
        expect(page.get_by_role("heading", name="Crear un reporte")).to_be_visible()
        expect(page.get_by_role("heading", name="Reportes recientes")).to_be_visible()
        page.get_by_role("button", name="Directorio de saberes", exact=False).click()
        expect(page.get_by_role("dialog", name="Directorio de saberes")).to_be_visible()
        page.keyboard.press("Escape")
        if label == "equipo":
            page.get_by_role("button", name="Abrir menú de usuario", exact=True).click()
            expect(page.get_by_role("link", name="Roles y permisos", exact=True)).to_be_visible()
            expect(page.get_by_role("link", name="Registros anteriores", exact=True)).to_have_count(0)
            page.keyboard.press("Escape")
        page.goto(origin + "/mapa", wait_until="networkidle")
        expect(page.locator(".municipal-canvas path[role='button']")).to_have_count(217)
        snapshots.append(density_snapshot(page))
        allowed_blues = {"rgb(237, 243, 245)", "rgb(200, 223, 228)", "rgb(141, 188, 198)", "rgb(67, 134, 154)", "rgb(22, 79, 112)", "rgb(16, 47, 79)"}
        assert {row["fill"] for row in snapshots[-1]} <= allowed_blues, "El mapa no usa la paleta azul original"
        legends.append(page.locator(".municipal-legend").inner_text())
        check_zero_selection(page)
        page.screenshot(path=str(output / f"mapa-{label}-seleccion.png"), full_page=True)
        page.goto(origin + "/mapa?tipos=mercados", wait_until="networkidle")
        market_filter = page.get_by_role("button", name="Mercados", exact=True)
        expect(market_filter).to_be_enabled()
        expect(market_filter).to_have_attribute("aria-pressed", "true")
        expect(page.locator(".public-map aside")).to_contain_text(f"{len(catalog['markets'])} registros encontrados")
        for market in catalog["markets"]:
            expect(page.locator(".public-map aside")).to_contain_text(market["name"])
        page.set_viewport_size({"width": 390, "height": 844})
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), label
    assert summaries[0] == summaries[1], "Entrar a sesión cambió los indicadores del acervo publicado"
    assert snapshots[0] == snapshots[1], "Los municipios cambiaron de cantidad o color al iniciar sesión"
    assert legends[0] == legends[1], "La leyenda no coincide entre usuario y equipo"

    # An empty real catalog must stay empty after login; no example totals may take its place.
    empty = {key: [] for key in ["recipes", "ingredients", "cooks", "episodes", "markets", "timeline", "relations"]}
    for page in pages:
        page.route("**/api/public/catalog", lambda route: route.fulfill(status=200, json=empty))
        page.goto(origin + "/", wait_until="networkidle")
        expect(page.get_by_role("button", name="Explorar registros totales: 0 registros", exact=True)).to_be_visible()
        expect(page.get_by_role("status").filter(has_text="Aún no hay fichas publicadas")).to_be_visible()
        page.goto(origin + "/mapa", wait_until="networkidle")
        expect(page.locator(".municipal-canvas path[data-record-count='0']")).to_have_count(217)
        assert len({row["fill"] for row in density_snapshot(page)}) == 1
        check_zero_selection(page)
        page.goto(origin + "/mapa?tipos=mercados", wait_until="networkidle")
        expect(page.get_by_role("button", name="Mercados", exact=True)).to_be_enabled()
        expect(page.get_by_role("button", name="Mercados", exact=True)).to_have_attribute("aria-pressed", "true")
        expect(page.locator(".public-map aside")).to_contain_text("Todavía no hay mercados publicados.")
        expect(page.locator(".municipal-canvas path[data-record-count='0']")).to_have_count(217)
    team.route("https://**", lambda route: route.abort())
    page = pages[1]
    page.set_viewport_size({"width": 1360, "height": 1000})
    page.goto(origin + "/admin/recetario")
    page.get_by_role("button", name="Añadir recetario").click()
    dialog = page.get_by_role("dialog")
    dialog.locator("#book-pdf").set_input_files("assets/recetarios/cocina-dig-2.pdf")
    expect(dialog.get_by_role("button", name="Guardar borrador")).to_be_enabled(timeout=30000)
    dialog.locator("#book-title").fill("Recetario de prueba en navegador")
    dialog.locator("#book-description").fill("Prueba de portada automática, carga por partes y lectura.")
    dialog.get_by_role("button", name="Guardar borrador").click()
    expect(dialog).to_have_count(0, timeout=45000)
    page.get_by_role("link", name="Leer Recetario de prueba en navegador").click()
    expect(page.locator("canvas").first).to_be_visible(timeout=25000)

    page.goto(origin + "/podcast")
    page.get_by_role("button", name="Añadir episodio", exact=True).click()
    dialog = page.get_by_role("dialog")
    dialog.locator("#podcast-url").fill("https://www.youtube.com/watch?v=a1b2c3d4e5F")
    dialog.locator("#podcast-title").fill("Episodio de prueba en navegador")
    dialog.locator("#podcast-description").fill("Prueba de duración, participantes y capítulos.")
    dialog.locator("#podcast-duration").fill("12:30")
    dialog.get_by_role("button", name="Añadir participante").click()
    dialog.locator("#person-name-0").fill("Persona de prueba")
    dialog.locator("#person-role-0").select_option("Cronista")
    dialog.get_by_text("Detalles adicionales", exact=False).click()
    dialog.get_by_role("button", name="Añadir capítulo").click()
    dialog.get_by_label("Minuto del capítulo 1").fill("01:20")
    dialog.get_by_label("Título del capítulo 1").fill("El inicio")
    dialog.get_by_role("button", name="Guardar borrador").click()
    expect(page.get_by_role("heading", name="Episodio de prueba en navegador", level=1)).to_be_visible()
    page.reload()
    expect(page.get_by_text("12 min 30 seg")).to_be_visible()
    expect(page.get_by_text("Persona de prueba")).to_be_visible()
    expect(page.get_by_role("button", name="El inicio", exact=False)).to_be_visible()

    public.close()
    team.close()
    browser.close()
    print("Usuario y equipo: mismos totales reales, mapa y leyenda; hover, foco y selección rellenan el municipio y restauran su densidad al salir. El equipo cuenta con formulario de mercados, plantillas de reportes, carga y lectura de PDF y fichas extendidas de podcast.")
