/* Planificación por proyecto: versiones de capítulos, grafo y cronología. */
window.StrataPlanning = (() => {
  const ui = () => StrataV8.ui;
  const planning = () => state.project.planning;
  let graphSource = null;
  let zoom = 30;
  let draggedEvent = null;
  let graphZoom = 1;
  function snapshot(name) {
    syncDOMPagesToState(); const sheet = getActiveSheet();
    const copy = { id: uid("snapshot"), name: name.trim() || "Instantánea", created_at: new Date().toISOString(),
      title: sheet.title, pages: [...sheet.pages], layers: JSON.parse(JSON.stringify(sheet.layers)), active_layer_id: sheet.active_layer_id };
    sheet.snapshots ||= []; sheet.snapshots.unshift(copy); scheduleProjectSave(); return copy;
  }
  function restore(id) {
    const sheet = getActiveSheet(), version = sheet.snapshots.find(s => s.id === id); if (!version) return;
    snapshot("Antes de restaurar «" + version.name + "»");
    sheet.title = version.title; sheet.pages = [...version.pages]; sheet.layers = JSON.parse(JSON.stringify(version.layers)); sheet.active_layer_id = version.active_layer_id;
    state.ui.planningView = null;
    savedSelectionRange = lastCaretRange = null; state.ui.parallelLayerId = null; renderAll(true); scheduleProjectSave(); showToast("Instantánea restaurada. Se guardó una copia del estado anterior.");
  }
  function plain(pages) { const tmp = ui().el("div"); tmp.innerHTML = pages.join("\n"); tmp.querySelectorAll("p,h1,h2,h3,li").forEach(p => p.append(document.createTextNode("\n"))); return tmp.textContent.trim(); }
  function compare(id) {
    syncDOMPagesToState(); const sheet = getActiveSheet(), version = sheet.snapshots.find(s => s.id === id); if (!version) return;
    const { dialog, el, select } = ui();
    dialog("Comparar versiones", body => {
      const other = select("Comparar con", [["current", "Capítulo actual"], ...sheet.snapshots.filter(s => s.id !== id).map(s => [s.id, s.name])], "current");
      const summary = el("p", "v8-muted"), pair = el("div", "snapshot-comparison");
      const left = el("pre"), right = el("pre"); pair.append(left, right); body.append(other.wrap, summary, pair);
      function paint() {
        const next = other.input.value === "current" ? sheet : sheet.snapshots.find(s => s.id === other.input.value);
        const a = plain(version.pages), b = plain(next.pages); left.textContent = `${version.name}\n${new Date(version.created_at).toLocaleString('es-AR')}\n\n${a}`;
        right.textContent = `${next.name || "Capítulo actual"}\n\n${b}`;
        const count = text => text ? text.split(/\s+/).length : 0;
        summary.textContent = a === b ? "Las versiones tienen el mismo texto." : `Texto modificado · ${count(a)} → ${count(b)} palabras (${count(b) - count(a) >= 0 ? "+" : ""}${count(b) - count(a)}).`;
      } other.input.addEventListener("change", paint); paint();
    });
  }
  function snapshots() {
    const { dialog, el, field, button } = ui();
    dialog("Snapshots · " + getActiveSheet().title, (body, modal) => {
      const name = field("Nombre de la instantánea", "Versión " + new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }));
      const list = el("div", "snapshot-list"); body.append(name.wrap, button("Guardar instantánea", () => { snapshot(name.input.value); paint(); }, "btn primary"), list);
      function paint() {
        list.replaceChildren();
        if (!getActiveSheet().snapshots.length) list.append(el("p", "empty-hint", "Guarda una versión antes de experimentar con tu capítulo."));
        getActiveSheet().snapshots.forEach(s => {
          const row = el("article", "v8-list-row"); row.append(el("div", "", `${s.name} · ${new Date(s.created_at).toLocaleString('es-AR')}`), button("Comparar", () => compare(s.id)), button("Restaurar", () => { modal.close(); restore(s.id); }), button("Eliminar", () => { getActiveSheet().snapshots = getActiveSheet().snapshots.filter(x => x.id !== s.id); scheduleProjectSave(); paint(); }, "text-btn danger")); list.append(row);
        });
      } paint();
    });
  }
  function ensurePane() {
    const { $, el, button } = ui();
    if ($("planning-pane")) return $("planning-pane");
    const pane = el("section", "planning-pane"); pane.id = "planning-pane"; pane.hidden = true;
    const toolbar = el("div", "planning-toolbar"), title = el("h2"); title.id = "planning-title";
    toolbar.append(title, button("Volver al texto", () => show(null)), button("Añadir evento", () => eventDialog()));
    toolbar.lastChild.id = "timeline-add-event";
    const help = el("p", "v8-muted"); help.id = "planning-help";
    const content = el("div", "planning-content"); content.id = "planning-content";
    const controls = el("div", "timeline-controls"); controls.id = "timeline-controls";
    const split = button("Vista dividida / Panel inferior", () => { state.ui.timelineSplit = !state.ui.timelineSplit; state.config.page.view_mode = "pages"; renderTopChrome(); timeline(); }); split.id = "timeline-split-toggle";
    const zoomOut = button("−", () => setZoom(zoom / 1.5)), zoomIn = button("+", () => setZoom(zoom * 1.5)), fit = button("Ajustar al contenido", () => setZoom(null)), zoomLabel = el("span", "timeline-zoom-label"); zoomLabel.id = "timeline-zoom-label";
    zoomOut.title = "Alejar eje temporal"; zoomIn.title = "Acercar eje temporal";
    const grouping = ui().select("Agrupar carriles por", [["plot", "Trama"], ["category", "Categoría"]], state.ui.timelineGrouping || "plot"); grouping.input.id = "timeline-grouping";
    grouping.input.onchange = () => { state.ui.timelineGrouping = grouping.input.value; timeline(); };
    const yearWrap = ui().field("Año", new Date().getFullYear(), "number"); yearWrap.input.id = "timeline-year"; yearWrap.input.min = 1; yearWrap.input.max = 9999; yearWrap.input.step = 1;
    yearWrap.input.addEventListener("change", () => navigateYear(Number(yearWrap.input.value)));
    const previous = button("‹", () => navigateYear(Number(yearWrap.input.value) - 1)), next = button("›", () => navigateYear(Number(yearWrap.input.value) + 1)); previous.title="Año anterior"; next.title="Año siguiente";
    const all = button("Todos", () => { state.ui.timelineYear = null; timeline(); }); all.id="timeline-all-years"; all.title="Mostrar eventos de todos los años";
    const height = ui().field("Altura", state.config.interface?.timeline_height || 220, "range"); height.input.id="timeline-height"; height.input.min=160; height.input.max=480; height.input.step=20;
    height.input.oninput=()=>{ state.config.interface ||= {}; state.config.interface.timeline_height=Number(height.input.value); applyHeight(); scheduleConfigSave(); };
    controls.append(previous,yearWrap.wrap,next,all,split,zoomOut,zoomLabel,zoomIn,fit,grouping.wrap,height.wrap);
    pane.append(toolbar, controls, help, content); $("editor-scroll").append(pane); return pane;
  }
  function visibility() {
    const { $ } = ui(); if (!$("planning-pane") && !state.ui.planningView) return;
    applyHeight();
    const pane = ensurePane(), active = Boolean(state.ui.planningView);
    const split = active && state.ui.planningView === "timeline" && !!state.ui.timelineSplit;
    document.body.classList.toggle("timeline-split", split); pane.classList.toggle("split-pane", split); pane.hidden = !active;
    if (split) {
      if (pane.parentElement !== $("center")) $("editor-scroll").after(pane);
      $("sheet-layout").hidden = false; $("corkboard-view").hidden = true;
    } else if (active) {
      if (pane.parentElement !== $("editor-scroll")) $("editor-scroll").append(pane);
      $("sheet-layout").hidden = true; $("corkboard-view").hidden = true;
    }
    $("timeline-controls").hidden = state.ui.planningView !== "timeline";
    $("timeline-split-toggle").textContent = split ? "Ampliar cronología" : "Vista dividida / Panel inferior";
    $("timeline-split-toggle").setAttribute("aria-pressed", String(split));
  }
  function show(view, options = {}) {
    syncDOMPagesToState(); state.ui.planningView = view; graphSource = null;
    if (!view) { state.ui.timelineSplit = false; renderTopChrome(); return; }
    if (view === "timeline") {
      if (typeof options.split === "boolean") state.ui.timelineSplit = options.split;
      else if (state.ui.timelineSplit === undefined) state.ui.timelineSplit = true;
      if (state.ui.timelineSplit) state.config.page.view_mode = "pages";
    }
    ensurePane(); renderTopChrome(); visibility();
    const { $ } = ui(); $("planning-title").textContent = view === "graph" ? "Mapa de nodos" : "Línea de tiempo";
    $("timeline-add-event").hidden = view !== "timeline";
    $("planning-help").textContent = view === "graph" ? "Arrastra las fichas. Pulsa Conectar en el origen y después en el destino para crear una flecha etiquetada. Doble clic en una etiqueta elimina la conexión." : "Edita el título y la fecha en cada tarjeta. Arrastra eventos entre carriles o a otra fecha. Usa ↗ para ir al capítulo vinculado.";
    if (view === "graph") graph(); else timeline();
  }
  function graph() {
    const { $, el, button, dialog, field } = ui(), content = $("planning-content"); content.replaceChildren();
    const canvas = el("div", "graph-canvas"); content.append(canvas);
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"); svg.classList.add("graph-lines"); svg.setAttribute("width", "1800"); svg.setAttribute("height", "1200");
    svg.innerHTML = '<defs><marker id="graph-arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0 0 L10 4 L0 8 Z" fill="currentColor"/></marker></defs>';
    canvas.append(svg);
    canvas.style.transformOrigin='0 0';canvas.style.transform=`scale(${graphZoom})`;
    content.onwheel=e=>{if(state.ui.planningView!=='graph')return;e.preventDefault();graphZoom=Math.max(.3,Math.min(2.5,graphZoom*(e.deltaY<0?1.1:1/1.1)));canvas.style.transform=`scale(${graphZoom})`;};
    if (!state.project.fichas.length) { canvas.append(el("p", "empty-hint", "Crea fichas en la Wiki para comenzar el mapa.")); return; }
    const nodes = planning().nodes, valid = new Set(state.project.fichas.map(f => f.id)); let added = false;
    state.project.fichas.forEach((f, i) => { if (!nodes.some(n => n.ficha_id === f.id)) { nodes.push({ ficha_id: f.id, x: 60 + (i % 5) * 250, y: 60 + Math.floor(i / 5) * 190 }); added = true; } });
    if (added) scheduleProjectSave();
    function lines() {
      svg.querySelectorAll("g").forEach(n => n.remove());
      planning().edges.filter(edge => valid.has(edge.from) && valid.has(edge.to)).forEach(edge => {
        const a = nodes.find(n => n.ficha_id === edge.from), b = nodes.find(n => n.ficha_id === edge.to); if (!a || !b) return;
        const g = document.createElementNS(ns, "g"), line = document.createElementNS(ns, "line"), label = document.createElementNS(ns, "text");
        const ax = a.x + 100, ay = a.y + 65, bx = b.x + 100, by = b.y + 65;
        const distance = Math.hypot(bx - ax, by - ay) || 1, inset = Math.min(100, distance / 3);
        line.setAttribute("x1", ax + (bx - ax) / distance * inset); line.setAttribute("y1", ay + (by - ay) / distance * inset);
        line.setAttribute("x2", bx - (bx - ax) / distance * inset); line.setAttribute("y2", by - (by - ay) / distance * inset); line.setAttribute("marker-end", "url(#graph-arrow)");
        label.setAttribute("x", (ax + bx) / 2); label.setAttribute("y", (ay + by) / 2 - 8); label.textContent = edge.label;
        label.addEventListener("dblclick", () => { planning().edges = planning().edges.filter(e => e.id !== edge.id); lines(); scheduleProjectSave(); });
        g.append(line, label); svg.append(g);
      });
    }
    state.project.fichas.forEach(ficha => {
      const node = nodes.find(n => n.ficha_id === ficha.id), card = el("article", "graph-node"); card.dataset.fichaId = ficha.id; card.style.left = `${node.x}px`; card.style.top = `${node.y}px`;
      card.style.borderLeft=`3px solid ${/^#[a-f0-9]{6}$/i.test(ficha.color||'')?ficha.color:'#799fbc'}`;let moved=false;
      if (ficha.image) { const image = el("img"); image.src = ficha.image; image.alt = ficha.name; image.draggable = false; card.append(image); }
      card.append(el("strong", "", ficha.name), el("small", "", ficha.category), button("Conectar ↗", () => {
        if (!graphSource) { graphSource = ficha.id; card.classList.add("connecting"); showToast("Selecciona el destino con su botón Conectar."); return; }
        if (graphSource === ficha.id) { graphSource = null; card.classList.remove("connecting"); return; }
        const source = graphSource; graphSource = null; canvas.querySelectorAll(".connecting").forEach(n => n.classList.remove("connecting"));
        dialog("Etiquetar conexión", (body, modal) => { const label = field("Relación", "se relaciona con"); body.append(label.wrap, button("Crear flecha", () => { planning().edges.push({ id: uid("edge"), from: source, to: ficha.id, label: label.input.value.trim() || "Relación" }); lines(); scheduleProjectSave(); modal.close(); }, "btn primary")); });
      }, "text-btn"));
      card.addEventListener("dblclick", e => { if (!e.target.closest("button")) card.querySelector('button').click(); });
      card.addEventListener('click',e=>{if(moved||e.target.closest('button'))return;content.querySelector('.graph-detail')?.remove();const detail=el('aside','graph-detail'),color=field('Color de categoría',ficha.color||'#799fbc','color');color.input.onchange=()=>{state.project.fichas.filter(f=>f.category===ficha.category).forEach(f=>f.color=color.input.value);scheduleProjectSave();renderWikiPanel();graph();};detail.append(el('strong','',ficha.name),el('p','',ficha.description||'Sin resumen'),color.wrap,button('Editar ficha',()=>openFichaModal(ficha.id)),button('Cerrar',()=>detail.remove()));content.append(detail);});
      card.addEventListener("pointerdown", e => {
        if (e.target.closest("button") || e.button !== 0) return;
        e.preventDefault(); card.setPointerCapture(e.pointerId);
        moved=false;
        const x = e.clientX, y = e.clientY, startX = node.x, startY = node.y;
        const move = next => { if(Math.hypot(next.clientX-x,next.clientY-y)>3)moved=true;node.x = Math.max(0, Math.min(1580, startX + (next.clientX - x)/graphZoom)); node.y = Math.max(0, Math.min(1020, startY + (next.clientY - y)/graphZoom)); card.style.left = `${node.x}px`; card.style.top = `${node.y}px`; lines(); };
        const finish = () => { card.removeEventListener("pointermove", move); card.removeEventListener("pointerup", finish); card.removeEventListener("pointercancel", finish); scheduleProjectSave(); };
        card.addEventListener("pointermove", move); card.addEventListener("pointerup", finish); card.addEventListener("pointercancel", finish);
      }); canvas.append(card);
    }); lines();
  }
  function applyHeight() {
    document.getElementById("planning-pane")?.style.setProperty("--timeline-height", `${Math.max(160,Math.min(480,state.config.interface?.timeline_height || 220))}px`);
  }
  function navigateYear(value) {
    if (!Number.isInteger(value) || value < 1 || value > 9999) { showToast("Elige un año entre 1 y 9999."); timeline(); return; }
    state.ui.timelineYear=value; timeline();
  }
  function eventYear(event, value) {
    const year=Number(value);
    if (!Number.isInteger(year) || year<1 || year>9999) { showToast("Elige un año entre 1 y 9999."); timeline(); return; }
    const prefix=String(year).padStart(4,"0"), suffix=event.date.slice(4);
    const next=prefix+suffix;
    event.date=validDate(next)?next:prefix+"-02-28";
    if (state.ui.timelineYear) state.ui.timelineYear=year;
    scheduleProjectSave(); timeline();
  }
  function eventDialog(event = null) {
    const { dialog, field, select, button } = ui();
    dialog(event ? "Editar evento" : "Nuevo evento", (body, modal) => {
      const title = field("Evento", event?.title || ""), date = field("Fecha", event?.date || (state.ui.timelineYear ? String(state.ui.timelineYear).padStart(4,"0")+"-01-01" : new Date().toISOString().slice(0, 10)), "date"), description = field("Descripción", event?.description || "", "textarea");
      const sheet = select("Capítulo vinculado", [["", "Sin capítulo"], ...state.project.document.sheets.map(s => [s.id, s.title])], event?.sheet_id || "");
      const color = field("Color", event?.color || "#6889b5", "color");
      const plot = field("Trama / carril", event?.plot || "Trama principal"), category = field("Categoría", event?.category || "General");
      body.append(title.wrap, date.wrap, sheet.wrap, plot.wrap, category.wrap, description.wrap, color.wrap, button("Guardar evento", () => {
        if (!title.input.value.trim() || !date.input.value || !date.input.checkValidity()) { showToast("Completa un título y una fecha válida."); return; }
        const data = { title: title.input.value.trim(), date: date.input.value, description: description.input.value, sheet_id: sheet.input.value, color: color.input.value, plot: plot.input.value.trim() || "Trama principal", category: category.input.value.trim() || "General" };
        if (event) Object.assign(event, data); else planning().events.push({ id: uid("event"), ...data });
        if (state.ui.timelineYear) state.ui.timelineYear=Number(data.date.slice(0,4));
        scheduleProjectSave(); modal.close(); timeline();
      }, "btn primary"));
      if (event) body.append(button("Eliminar evento", () => { planning().events = planning().events.filter(e => e.id !== event.id); scheduleProjectSave(); modal.close(); timeline(); }, "btn danger"));
    });
  }
  const day = 86400000;
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
    const date = new Date(value + "T12:00:00Z");
    return Number.isFinite(+date) && date.toISOString().slice(0,10) === value;
  }
  function setZoom(value) {
    if (value == null) {
      if(state.ui.timelineYear){
        const year=String(state.ui.timelineYear).padStart(4,"0");
        const span=(Date.parse(year+"-12-31T12:00:00Z")-Date.parse(year+"-01-01T12:00:00Z"))/day+1;
        zoom=Math.max(.15,Math.min(180,((ui().$("planning-content").clientWidth||800)-385)/span));timeline();return;
      }
      const events = planning().events.filter(e => validDate(e.date));
      const dates = events.map(e => Date.parse(e.date + "T12:00:00Z"));
      zoom = dates.length > 1 ? Math.max(.15, Math.min(180, ((ui().$("planning-content").clientWidth || 800) - 400) / ((Math.max(...dates) - Math.min(...dates)) / day + 14))) : 30;
    } else zoom = Math.max(.15, Math.min(180, value));
    timeline();
  }
  function jumpToSheet(sheetId) {
    const sheet = state.project.document.sheets.find(s => s.id === sheetId); if (!sheet) return;
    syncDOMPagesToState(); state.project.document.active_sheet_id = sheet.id;
    state.ui.activePageIndex = 0; state.ui.parallelLayerId = null; savedSelectionRange = lastCaretRange = null;
    if (state.ui.timelineSplit) { state.config.page.view_mode = "pages"; renderAll(true); }
    else { show(null); renderAll(true); }
    const editor = document.querySelector(".page-editor");
    if (editor) { editor.focus(); const range = document.createRange(); range.selectNodeContents(editor); range.collapse(true); getSelection().removeAllRanges(); getSelection().addRange(range); lastCaretRange = range.cloneRange(); }
  }
  function timeline() {
    const { $, el, button } = ui(), content = $("planning-content"); if (!content) return;
    const scrollLeft = content.scrollLeft, scrollTop = content.scrollTop; content.replaceChildren();
    $("timeline-zoom-label").textContent = zoom >= 1 ? `${Math.round(zoom)} px / día` : `${Math.round(zoom * 30)} px / mes`;
    const allEvents = [...planning().events].filter(e => validDate(e.date)).sort((a,b) => a.date.localeCompare(b.date));
    const selectedYear = state.ui.timelineYear || null;
    const events = selectedYear ? allEvents.filter(e => Number(e.date.slice(0,4))===selectedYear) : allEvents;
    $("timeline-year").value = selectedYear || Number(events[0]?.date.slice(0,4)) || new Date().getFullYear();
    $("timeline-all-years").classList.toggle("on", !selectedYear);
    const time = value => Date.parse(value + "T12:00:00Z");
    const origin = selectedYear ? time(String(selectedYear).padStart(4,"0")+"-01-01") : events.length ? time(events[0].date) - 7 * day : time(new Date().toISOString().slice(0,10)) - 7 * day;
    const end = selectedYear ? time(String(selectedYear).padStart(4,"0")+"-12-31")+day : events.length ? time(events.at(-1).date) + 7 * day : origin + 30 * day;
    const span = Math.max(14, (end - origin) / day), width = Math.max(content.clientWidth - 145, Math.min(1000000, span * zoom + 240));
    const scale = Math.min(zoom, (width - 240) / span), groupKey = state.ui.timelineGrouping || "plot";
    const getLane = event => event[groupKey] || (groupKey === "plot" ? "Trama principal" : "General");
    const lanes = events.length ? [...new Set(events.map(getLane))] : [groupKey === "plot" ? "Trama principal" : "General"];
    const surface = el("div", "timeline-board"); surface.style.minWidth = `${width + 145}px`; content.append(surface);
    const rulerRow = el("div", "timeline-ruler-row"), corner = el("div", "timeline-lane-label", groupKey === "plot" ? "Tramas" : "Categorías"), ruler = el("div", "timeline-ruler"); ruler.style.width = `${width}px`;
    const interval = Math.max(1, Math.ceil(110 / scale));
    for (let offset = 0; offset <= span; offset += interval) { const tick = el("span", "timeline-tick", new Date(origin + offset * day).toLocaleDateString("es-AR", { timeZone: "UTC" })); tick.style.left = `${offset * scale}px`; ruler.append(tick); }
    rulerRow.append(corner,ruler); surface.append(rulerRow);
    lanes.forEach(name => {
      const row = el("div", "timeline-swimlane"), heading = el("div", "timeline-lane-label", name), track = el("div", "timeline-track"); track.dataset.lane = name; track.style.width = `${width}px`;
      const laneEvents = events.filter(e => getLane(e) === name); const occupied = [];
      laneEvents.forEach(event => {
        const left = (time(event.date) - origin) / day * scale;
        let slot = occupied.findIndex(end => end + 12 <= left); if (slot < 0) slot = occupied.length; occupied[slot] = left + 224;
        const card = el("article", "timeline-card"); card.dataset.eventId = event.id; card.draggable = true;
        card.style.left = `${left}px`; card.style.top = `${8 + slot * 108}px`; card.style.setProperty("--event-color", event.color || "#6889b5");
        const title = el("input", "timeline-title"), date = el("input", "timeline-date"); title.value = event.title; title.setAttribute("aria-label", "Título del evento"); date.type = "date"; date.value = event.date; date.setAttribute("aria-label", "Fecha del evento");
        // Texto de consulta accesible para búsquedas y lectores, sin duplicarlo visualmente.
        const year=el("input","timeline-event-year"); year.type="number"; year.min=1; year.max=9999; year.value=Number(event.date.slice(0,4)); year.setAttribute("aria-label","Año del evento"); year.title="Cambiar el año del evento"; year.onchange=()=>eventYear(event,year.value);
        const dates=el("div","timeline-date-controls"); const yearLabel=el("label","timeline-event-year-label","Año"); yearLabel.append(year); dates.append(date,yearLabel);
        const accessible = el("span", "sr-event-title", event.title);
        title.addEventListener("change", () => { const next = title.value.trim(); if (!next) { title.value = event.title; return; } event.title = next; accessible.textContent = next; scheduleProjectSave(); });
        date.addEventListener("change", () => { if (!validDate(date.value)) { date.value = event.date; showToast("Escribe una fecha válida."); return; } event.date = date.value; if(state.ui.timelineYear)state.ui.timelineYear=Number(event.date.slice(0,4)); scheduleProjectSave(); timeline(); });
        for (const input of [title,date,year]) { input.addEventListener("pointerdown", e => e.stopPropagation()); input.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); input.blur(); } }); }
        const actions = el("div", "timeline-card-actions"); actions.append(button("Detalles", () => eventDialog(event), "text-btn"));
        const sheet = state.project.document.sheets.find(s => s.id === event.sheet_id);
        if (sheet) { const jump = button("↗ " + sheet.title, () => jumpToSheet(sheet.id), "text-btn timeline-jump"); jump.title = "Ir al capítulo vinculado"; actions.append(jump); }
        card.append(accessible,title,dates,actions);
        card.addEventListener("dragstart", e => { if (e.target.closest("input,button")) { e.preventDefault(); return; } draggedEvent = event.id; e.dataTransfer.setData("application/x-strata-event", event.id); e.dataTransfer.effectAllowed = "move"; });
        card.addEventListener("dragend", () => draggedEvent = null); track.append(card);
      });
      track.style.height = `${Math.max(116, occupied.length * 108 + 16)}px`;
      track.addEventListener("dragover", e => { if (e.dataTransfer.types.includes("application/x-strata-event")) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } });
      track.addEventListener("drop", e => {
        const id = e.dataTransfer.getData("application/x-strata-event") || draggedEvent, event = planning().events.find(x => x.id === id); if (!event) return;
        e.preventDefault(); const offset = Math.max(0, Math.min(selectedYear ? span-1 : span, Math.round((e.clientX - track.getBoundingClientRect().left) / scale)));
        event.date = new Date(origin + offset * day).toISOString().slice(0,10); event[groupKey] = name; scheduleProjectSave(); timeline();
      });
      row.append(heading,track); surface.append(row);
    });
    if (!events.length) surface.querySelector(".timeline-track")?.append(el("p", "timeline-empty", selectedYear ? `No hay eventos en ${selectedYear}. Puedes añadir uno o pulsar Todos para ver los demás años.` : "Añade un evento para comenzar tu cronología."));
    content.scrollLeft = scrollLeft; content.scrollTop = scrollTop;
  }
  function refresh() { if (state.ui.planningView === "graph") graph(); else if (state.ui.planningView === "timeline") timeline(); }
  function prune() {
    const valid = new Set(state.project.fichas.map(f => f.id));
    planning().nodes = planning().nodes.filter(n => valid.has(n.ficha_id));
    planning().edges = planning().edges.filter(edge => valid.has(edge.from) && valid.has(edge.to)); refresh();
  }
  return { snapshots, snapshot, restore, compare, show, visibility, graph, timeline, eventDialog, refresh, prune, setZoom, jumpToSheet, navigateYear, eventYear };
})();
