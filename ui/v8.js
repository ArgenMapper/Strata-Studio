/* Strata 8: integración de cinta, Wiki, diccionario, recortes y preferencias. */
window.StrataV8 = (() => {
  const $ = (id) => document.getElementById(id);
  const el = (tag, className = "", text = "") => {
    const node = document.createElement(tag); node.className = className; node.textContent = text; return node;
  };
  const button = (label, action, className = "btn") => {
    const node = el("button", className, label); node.type = "button";
    node.addEventListener("click", action); return node;
  };
  function field(label, value = "", type = "text") {
    const wrap = el("label", "v8-field", label);
    const input = el(type === "textarea" ? "textarea" : "input", "s-input full");
    if (type !== "textarea") input.type = type;
    input.value = value; wrap.append(input); return { wrap, input };
  }
  function select(label, choices, value) {
    const wrap = el("label", "v8-field", label), input = el("select", "s-select full");
    choices.forEach(([id, name]) => { const option = el("option", "", name); option.value = id; input.append(option); });
    input.value = value; wrap.append(input); return { wrap, input };
  }
  function dialog(title, build, modal = true) {
    captureSelectionAndSyncToolbar(false);
    const node = el("dialog", "v8-dialog");
    const head = el("header", "v8-dialog-head"); head.append(el("h2", "", title), button("✕", () => node.close(), "icon-btn"));
    const body = el("div", "v8-dialog-body"); node.append(head, body); document.body.append(node);
    node.addEventListener("close", () => node.remove());
    node.addEventListener("keydown", (e) => e.stopPropagation());
    build(body, node); if (modal) node.showModal(); else node.show(); return node;
  }
  function rememberCaret(editor) {
    const selection = getSelection();
    if (!selection.rangeCount || !editor.contains(selection.anchorNode)) return () => {};
    const source = selection.getRangeAt(0);
    // Text offsets alone cannot distinguish the end of a paragraph from an empty
    // paragraph after it. Keep the native caret whenever its nodes survive.
    const native = source.cloneRange(), startNode = source.startContainer, endNode = source.endContainer;
    const startValue = startNode.textContent, endValue = endNode.textContent;
    function offset(node, end) { const r = document.createRange(); r.selectNodeContents(editor); r.setEnd(node, end); return r.toString().length; }
    const start = offset(source.startContainer, source.startOffset), end = offset(source.endContainer, source.endOffset);
    return () => {
      if (startNode.isConnected && endNode.isConnected && startNode.textContent === startValue && endNode.textContent === endValue) {
        selection.removeAllRanges(); selection.addRange(native);
        lastCaretRange = native.cloneRange(); savedSelectionRange = native.collapsed ? null : native.cloneRange(); return;
      }
      const locate = (count) => {
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT); let node, last;
        while ((node = walker.nextNode())) { last = node; if (count <= node.length) return [node, count]; count -= node.length; }
        return last ? [last, last.length] : [editor, 0];
      };
      const r = document.createRange(); r.setStart(...locate(start)); r.setEnd(...locate(end));
      selection.removeAllRanges(); selection.addRange(r); lastCaretRange = r.cloneRange();
      savedSelectionRange = r.collapsed ? null : r.cloneRange();
    };
  }
  const ui = { $, el, button, field, select, dialog, rememberCaret };
  let ready = false, ribbonTab = "inicio", account = null, accountProvider = "local";
  const ignored = new Set();
  const defaultCategories = ["Fuentes", "Datos", "Conceptos", "Hallazgos", "Personajes", "Lugares", "Objetos", "Facciones", "Eventos", "Hipótesis", "Extractos"];
  function loadProject() {
    ribbonTab = "inicio";
    state.project.categories ||= [];
    state.project.research ||= { citations: [], style: "apa" };
    state.project.planning ||= { nodes: [], edges: [], events: [] };
    state.project.document.layout ||= {};
    state.project.document.sheets.forEach(sheet => sheet.snapshots ||= []);
    state.ui.scrapSelection = new Set();
    state.ui.planningView = null;
    state.ui.timelineSplit = true;
    state.ui.timelineYear = null;
    state.ui.fichaCategory = "ALL";
  }
  function init() {
    if (ready) return;
    ready = true; loadProject();
    buildRibbon();
    const auto = button("Autoguardado ON", () => {
      state.config.autosave.enabled = !state.config.autosave.enabled;
      clearTimeout(saveTimer);
      if (state.config.autosave.enabled && state.meta.dirty) saveTimer = setTimeout(() => commitProjectSave(false), 800);
      chrome(); scheduleConfigSave();
    }, "toggle-chip"); auto.id = "autosave-toggle"; auto.setAttribute("role", "switch");
    const accountButton = button("Mi cuenta", openAccount, "toggle-chip"); accountButton.id = "account-button";
    document.querySelector(".tb-right").prepend(auto, accountButton);
    const cut = button("✂ Recortar al cajón", sendSelectionToScraps, "v8-cut btn primary"); cut.id = "mini-cut-scrap";
    cut.title = "Recortar al cajón (Ctrl+Shift+X)"; cut.addEventListener("mousedown", e => e.preventDefault());
    $("mini-toolbar").append(cut);
    const cat = $("ficha-category");
    const selection = el("select", "s-select full"); selection.id = cat.id; cat.replaceWith(selection);
    selection.addEventListener("change", () => {
      const category = state.project.categories.find(c => c.name === selection.value);
      if (category) { state.ui.selectedFichaColor = category.color; renderInlineSwatches("ficha-colors", category.color, c => state.ui.selectedFichaColor = c); }
    });
    selection.parentElement.append(button("+ Categoría", () => categoriesDialog(selection.value), "text-btn"));
    $("ficha-card").addEventListener("mouseenter", () => clearTimeout(hoverFichaTimer));
    const img = $("fc-avatar-img"); img.style.cursor = "zoom-in"; img.addEventListener("click", () => { if (img.src) lightbox(img.src, $("fc-name").textContent); });
    const head = document.querySelector("#scraps-drawer .drawer-head");
    const tools = el("div", "scraps-tools");
    const search = el("input", "s-input"); search.id = "scraps-search"; search.placeholder = "Buscar recortes…"; search.setAttribute("aria-label", "Buscar recortes");
    search.addEventListener("input", () => scraps.render());
    const merge = button("Fusionar seleccionados", () => scraps.merge(), "btn"); merge.id = "scraps-merge";
    tools.append(search, merge); (head || $("scraps-drawer").firstElementChild).after(tools);
    setupScrapDrag();
    window.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "x" && !e.target.closest("dialog")) {
        e.preventDefault(); e.stopImmediatePropagation(); sendSelectionToScraps();
      }
    }, true);
    document.addEventListener("input", e => {
      const editor = e.target.closest(".page-editor, #parallel-editor");
      if (editor && !e.isComposing) { dictionary.apply(editor); applyLayers(); }
    });
    const configFields = document.querySelectorAll('[data-cfg="autosave.enabled"]');
    configFields.forEach(input => input.addEventListener("change", () => { clearTimeout(saveTimer); chrome(); }));
    const oldHome = renderHomeScreen;
    renderHomeScreen = function () { oldHome(); renderCovers(); };
    const oldChrome = renderTopChrome;
    renderTopChrome = function () { oldChrome(); chrome(); };
    const oldContext = openRecentCardMenu;
    openRecentCardMenu = function (x, y, project) {
      oldContext(x, y, project);
      const menu = $("ctx-menu");
      menu.append(button("Imagen de portada…", async () => {
        closeAllMenusAndPopovers(); await chooseCover("project_covers", project.file_path);
      }, "ctx-item"));
    };
    const oldStrip = stripEphemeralHtml;
    stripEphemeralHtml = function (raw) {
      const tmp = el("div"); tmp.innerHTML = raw;
      tmp.querySelectorAll(".dictionary-word").forEach(n => n.replaceWith(...n.childNodes));
      tmp.querySelectorAll("[data-layer-hidden]").forEach(n => n.removeAttribute("data-layer-hidden"));
      return oldStrip(tmp.innerHTML);
    };
    apiPost("/api/auth/status", {}).then(result => { if (result.ok) { account = result.user; accountProvider = result.provider; } chrome(); }).catch(() => {});
    chrome();
    window.Strata95?.init();
  }
  function buildRibbon() {
    const ribbon = $("ribbon"), nav = el("nav", "ribbon-tabs"); nav.id = "ribbon-tabs"; nav.setAttribute("role", "tablist");
    const names = [["inicio", "Inicio"], ["insertar", "Insertar"], ["hoja", "Disposición (Hoja)"], ["referencias", "Referencias e Investigación"], ["estructura", "Capas y Estructura"]];
    names.forEach(([id, name]) => {
      const b = button(name, () => {
        ribbonTab = id; state.config.ribbon_collapsed = false; state.config.panels.toolbar = true; renderTopChrome();
      }, "ribbon-tab"); b.dataset.tab = id; b.setAttribute("role", "tab"); nav.append(b);
      b.addEventListener("mousedown", e => { captureSelectionAndSyncToolbar(false); e.preventDefault(); });
    });
    ribbon.before(nav);
    ribbon.querySelectorAll(":scope > .rb-divider").forEach(n => n.remove());
    ribbon.querySelectorAll(":scope > .rb-group").forEach(group => {
      const name = group.querySelector(".rb-label")?.textContent || "";
      group.dataset.ribbonTab = /Insertar/.test(name) ? "insertar" : /Vista/.test(name) ? "hoja" : "inicio";
    });
    function group(tab, name, actions) {
      const g = el("div", "rb-group"), body = el("div", "rb-body v8-ribbon-actions"); g.dataset.ribbonTab = tab;
      actions.forEach(([label, run]) => {
        const b = button(label, run, "rb-btn v8-rb-action"); b.addEventListener("mousedown", e => e.preventDefault()); body.append(b);
      });
      g.append(body, el("div", "rb-label", name)); ribbon.append(g);
    }
    group("inicio", "Recortes", [["✂ Recortar al cajón", sendSelectionToScraps], ["Abrir cajón", () => { state.config.panels.scraps = true; state.ui.scrapsCollapsed = false; renderTopChrome(); renderScrapsDrawer(); }]]);
    group("insertar", "Índice", [["Tabla de contenido", () => StrataResearch.insertTOC()], ["Actualizar índice", () => StrataResearch.updateTOC()]]);
    group("hoja", "Formato de página", [["Márgenes, papel y columnas", pageDialog], ["Estudio de personalización", themeDialog]]);
    const citation = ribbon.querySelector('[data-cmd="citation"]'); if (citation) citation.hidden = true;
    group("referencias", "Referencias", [["Cita / Nota al pie", openCitationModal], ["Biblioteca de citas", () => StrataResearch.library()], ["Generar bibliografía", () => StrataResearch.bibliography()]]);
    const norms = select("Norma bibliográfica", [["apa", "APA 7ma Edición"], ["mla", "MLA"], ["ieee", "IEEE"], ["chicago", "Chicago"]], state.project.research.style);
    norms.input.id = "citation-style"; norms.input.addEventListener("change", () => { state.project.research.style = norms.input.value; scheduleProjectSave(); });
    const normGroup = el("div", "rb-group"); normGroup.dataset.ribbonTab = "referencias"; normGroup.append(norms.wrap); ribbon.append(normGroup);
    group("estructura", "Capas dentro de la hoja", [["Nueva capa", () => openLayerModal()], ["Bloque intercalado", () => insertLayerBlock()], ["Asignar resaltado", () => assignInlineLayer()]]);
    group("estructura", "Planificación", [["Snapshots", () => StrataPlanning.snapshots()], ["Línea de tiempo", () => StrataPlanning.show("timeline")], ["Mapa de nodos", () => StrataPlanning.show("graph")], ["Volver al texto", () => StrataPlanning.show(null)]]);
    ribbon.querySelectorAll(":scope > .rb-spacer").forEach(n => n.remove());
    ribbon.append($("btn-collapse-ribbon"));
    $("ribbon-tabs").addEventListener("keydown", e => {
      if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
      const tabs = [...nav.querySelectorAll('[role="tab"]')], at = tabs.indexOf(document.activeElement);
      if (at < 0) return; e.preventDefault(); const next = tabs[(at + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length]; next.click(); next.focus();
    });
  }
  function chrome() {
    if (!ready) return;
    if (!window.Strata95?.ready) {
      $("autosave-toggle").textContent = `Autoguardado ${state.config.autosave.enabled ? "ON" : "OFF"}`;
      $("account-button").textContent = account ? account.name : "Iniciar sesión";
    }
    $("autosave-toggle").setAttribute("aria-checked", String(state.config.autosave.enabled));
    document.querySelectorAll("#ribbon > .rb-group").forEach(group => group.hidden = group.dataset.ribbonTab !== ribbonTab);
    document.querySelectorAll(".ribbon-tab").forEach(tab => { tab.classList.toggle("active", tab.dataset.tab === ribbonTab); tab.setAttribute("aria-selected", String(tab.dataset.tab === ribbonTab)); });
    if ($("citation-style")) $("citation-style").value = state.project.research.style;
    applyTheme(); applyPageLayout();
    if (window.StrataPlanning) StrataPlanning.visibility();
    if (window.Strata95?.ready) Strata95.chrome();
    window.StrataEditorial?.chrome();
  }
  function render() { if (!ready) return; chrome(); editors(); renderCovers(); }
  function editors() {
    if (!ready) return;
    document.querySelectorAll(".page-editor, #parallel-editor").forEach(editor => dictionary.apply(editor));
    applyLayers();
  }
  function categoryNames() {
    return [...new Set([...defaultCategories, ...state.project.categories.map(c => c.name), ...state.project.fichas.map(f => f.category || "General")])];
  }
  function categoryControls(container) {
    if (!ready) return;
    [...container.children].forEach(b => {
      const category = state.project.categories.find(c => c.name === b.textContent);
      if (category) b.style.setProperty("--cat-color", category.color);
      if (b.textContent !== "Todas") b.addEventListener("contextmenu", e => { e.preventDefault(); e.stopPropagation(); categoriesDialog(b.textContent); });
    });
    container.append(button("+ Categoría", () => categoriesDialog(), "category-add"));
  }
  function categoriesDialog(selected = "") {
    dialog("Categorías de la Wiki", body => {
      const list = select("Crear o editar", [["", "+ Nueva categoría"], ...categoryNames().map(n => [n, n])], selected);
      const name = field("Nombre", selected), color = field("Color", state.project.categories.find(c => c.name === selected)?.color || "#6889b5", "color");
      list.input.addEventListener("change", () => { name.input.value = list.input.value; color.input.value = state.project.categories.find(c => c.name === list.input.value)?.color || "#6889b5"; });
      const mode = select("Enfoque", [["narrative", "Narrativo / Creación"], ["research", "Investigación / Estudio"]], state.project.categories.find(c => c.name === selected)?.mode || (/personaje|lugar|objeto|facción|evento/i.test(selected) ? "narrative" : "research"));
      body.append(list.wrap, name.wrap, color.wrap, mode.wrap, button("Guardar categoría", () => {
        const next = name.input.value.trim(), previous = list.input.value;
        if (!next) return;
        if (next !== previous && categoryNames().some(n => n.toLocaleLowerCase() === next.toLocaleLowerCase())) { showToast("Ya existe una categoría con ese nombre."); return; }
        const existing = state.project.categories.find(c => c.name === previous);
        if (existing) Object.assign(existing, { name: next, color: color.input.value, mode: mode.input.value });
        else state.project.categories.push({ id: uid("category"), name: next, color: color.input.value, mode: mode.input.value });
        state.project.fichas.forEach(f => { if (f.category === previous) { f.category = next; f.color = color.input.value; } });
        document.querySelectorAll(".rich-editor").forEach(editor => syncFichaHighlights(editor, false));
        const view = $("ficha-card-view")?.value;
        state.ui.fichaCategory = next; renderWikiPanel(); fichaModal(null, next);
        if (view) $("ficha-card-view").value = view;
        scheduleProjectSave(); body.closest("dialog").close();
      }, "btn primary"));
    });
  }
  function fichaModal(ficha, preferred = null) {
    const selector = $("ficha-category"); if (!selector || selector.tagName !== "SELECT") return;
    const chosen = preferred || ficha?.category || selector.value || "Fuentes";
    selector.replaceChildren(); categoryNames().forEach(name => { const o = el("option", "", name); o.value = name; selector.append(o); });
    selector.value = chosen;
    if (!$("ficha-card-view")) {
      const view = select("Presentación de la ficha", [["portrait", "Vista Retrato Lateral"], ["banner", "Vista Banner Superior Grande"], ["compact", "Vista Compacta"]], "portrait");
      view.input.id = "ficha-card-view"; (document.querySelector('label[for="ficha-desc"]') || $("ficha-desc")).before(view.wrap);
    }
    $("ficha-card-view").value = ficha?.card_view || state.config.wiki_view || "portrait";
  }
  function lightbox(src, caption) {
    dialog(caption || "Imagen", body => { const image = el("img", "v8-lightbox"); image.src = src; image.alt = caption || "Imagen ampliada"; body.append(image); });
  }
  const dictionary = {
    add(word, persistent = true) {
      if (!word) return;
      if (persistent) { state.config.personal_dictionary ||= []; if (!state.config.personal_dictionary.includes(word)) state.config.personal_dictionary.push(word); scheduleConfigSave(); }
      else ignored.add(word.toLocaleLowerCase("es"));
      editors(); showToast(persistent ? `«${word}» agregado al diccionario` : `«${word}» se ignorará en esta sesión`);
    },
    apply(editor) {
      editor.querySelectorAll(".ficha-ref, .wiki-mention").forEach(n => n.spellcheck = false);
      const words = new Set([...(state.config.personal_dictionary || []).map(w => w.toLocaleLowerCase("es")), ...ignored]);
      const restore = rememberCaret(editor);
      editor.querySelectorAll(".dictionary-word").forEach(node => { if (!words.has(node.textContent.toLocaleLowerCase("es"))) node.replaceWith(...node.childNodes); });
      if (!words.size) { restore(); return; }
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT), nodes = [];
      let node; while ((node = walker.nextNode())) if (!node.parentElement.closest("[spellcheck='false'], .footnotes-section, .strata-toc")) nodes.push(node);
      nodes.forEach(node => {
        const text = node.textContent, matches = [...text.matchAll(/[\p{L}\p{M}]+(?:[-’'][\p{L}\p{M}]+)*/gu)].filter(m => words.has(m[0].toLocaleLowerCase("es")));
        if (!matches.length) return;
        const frag = document.createDocumentFragment(); let at = 0;
        matches.forEach(m => { frag.append(document.createTextNode(text.slice(at, m.index))); const span = el("span", "dictionary-word", m[0]); span.spellcheck = false; frag.append(span); at = m.index + m[0].length; });
        frag.append(document.createTextNode(text.slice(at))); node.replaceWith(frag);
      });
      restore();
    }
  };
  function contextMenu(event) {
    const editor = event.target.closest(".page-editor, #parallel-editor"); if (!editor) return false;
    event.preventDefault(); captureSelectionAndSyncToolbar(false);
    let word = getSelection().toString().trim();
    const clicked = document.caretRangeFromPoint?.(event.clientX, event.clientY);
    if ((!word || /\s/.test(word)) && clicked?.startContainer.nodeType === Node.TEXT_NODE) {
      const node = clicked.startContainer, offset = clicked.startOffset;
      const match = [...node.textContent.matchAll(/[\p{L}\p{M}]+(?:[-’'][\p{L}\p{M}]+)*/gu)].find(m => m.index <= offset && m.index + m[0].length >= offset);
      word = match?.[0] || "";
    }
    const hasSelection = Boolean(getSelection().toString());
    openCustomContextMenu(event.clientX, event.clientY, [
      { label: `Agregar al diccionario${word ? `: ${word}` : ""}`, disabled: !word || /\s/.test(word), action: () => dictionary.add(word) },
      { label: "Ignorar palabra", disabled: !word || /\s/.test(word), action: () => dictionary.add(word, false) },
      { sep: true },
      { label: "Cortar", icon: "scissors", disabled: !hasSelection, action: () => executeRibbonCommand("cut") },
      { label: "Copiar", icon: "copy", disabled: !hasSelection, action: () => executeRibbonCommand("copy") },
      { label: "Pegar sin formato", icon: "clipboard", action: () => executeRibbonCommand("paste-plain") },
      { label: "✂ Recortar al cajón", disabled: !hasSelection, kbd: "Ctrl+Shift+X", action: sendSelectionToScraps },
      { label: "Crear ficha Wiki", disabled: !hasSelection, action: () => openFichaModal(null, getSelection().toString().trim().slice(0, 60)) },
      { label: "Nota de capa", action: createMarginNoteAtSelection }
    ]); return true;
  }
  const tags = [["later", "Para usar después", "#6889b5"], ["doubt", "Párrafo dudoso", "#c98f45"], ["data", "Dato suelto", "#529e78"]];
  const scraps = {
    render() {
      const list = $("scraps-list"), items = state.project.scraps || [], selected = state.ui.scrapSelection ||= new Set();
      $("scraps-count").textContent = items.length; $("scraps-drawer").classList.toggle("collapsed", state.ui.scrapsCollapsed);
      const q = ($("scraps-search")?.value || "").toLocaleLowerCase(); list.replaceChildren();
      if (!items.length) list.append(el("p", "scraps-empty", "Selecciona texto y pulsa ✂ Recortar al cajón o Ctrl+Shift+X. También puedes arrastrarlo aquí."));
      items.filter(sc => `${sc.text} ${sc.tag || ""}`.toLocaleLowerCase().includes(q)).forEach(sc => {
        const card = el("article", "scrap-card"); card.draggable = true; card.dataset.scrapId = sc.id;
        const top = el("div", "sc-tools"), check = el("input"); check.type = "checkbox"; check.checked = selected.has(sc.id); check.setAttribute("aria-label", "Seleccionar recorte para fusionar");
        check.addEventListener("change", () => check.checked ? selected.add(sc.id) : selected.delete(sc.id));
        const tag = select("Etiqueta", [["", "Sin etiqueta"], ...tags.map(t => [t[0], t[1]])], sc.tag || "");
        card.style.setProperty("--scrap-color", tags.find(t => t[0] === sc.tag)?.[2] || "#6889b5");
        tag.input.addEventListener("change", () => { sc.tag = tag.input.value; scheduleProjectSave(); scraps.render(); });
        const copy = button("Copiar", async () => { try { await navigator.clipboard.writeText(sc.text); showToast("Recorte copiado"); } catch { showToast("No se pudo acceder al portapapeles"); } }, "text-btn");
        const insert = button("Insertar", () => { restoreSelection(false); if (!getActiveRichEditor()) return; document.execCommand("insertText", false, sc.text); scraps.remove(sc.id); }, "text-btn");
        insert.addEventListener("mousedown", e => e.preventDefault());
        top.append(check, copy, insert, button("✕", () => scraps.remove(sc.id), "icon-btn"));
        card.append(top, el("div", "sc-text", sc.text), tag.wrap, el("small", "", `${sc.time || ""} · ${sc.source_layer || "Manuscrito"}`));
        card.addEventListener("dragstart", e => { state.ui.draggedScrapId = sc.id; e.dataTransfer.setData("application/x-strata-scrap", sc.id); e.dataTransfer.setData("text/plain", sc.text); e.dataTransfer.effectAllowed = "move"; });
        card.addEventListener("dragend", () => state.ui.draggedScrapId = null); list.append(card);
      });
    },
    remove(id) { state.project.scraps = state.project.scraps.filter(sc => sc.id !== id); state.ui.scrapSelection?.delete(id); scraps.render(); scheduleProjectSave(); },
    merge() {
      const chosen = state.project.scraps.filter(sc => state.ui.scrapSelection?.has(sc.id));
      if (chosen.length < 2) { showToast("Selecciona al menos dos recortes."); return; }
      const merged = { id: uid("scrap"), text: chosen.map(sc => sc.text).join("\n\n"), time: nowHHMM(), source_layer: "Fusión", tag: chosen[0].tag || "" };
      state.project.scraps = [merged, ...state.project.scraps.filter(sc => !state.ui.scrapSelection.has(sc.id))]; state.ui.scrapSelection.clear(); scraps.render(); scheduleProjectSave();
    }
  };
  function setupScrapDrag() {
    let selectionRange = null;
    document.addEventListener("dragstart", e => {
      const source = e.target.nodeType === Node.ELEMENT_NODE ? e.target : e.target.parentElement;
      if (!source?.closest(".page-editor, #parallel-editor") || getSelection().isCollapsed) return;
      selectionRange = getSelection().getRangeAt(0).cloneRange(); state.ui.draggedSelectionText = selectionRange.toString();
      e.dataTransfer.setData("application/x-strata-selection", "true");
    }, true);
    const toggle = document.querySelector('[data-panel="scraps"]');
    toggle.addEventListener("dragover", e => {
      if (!state.ui.draggedSelectionText) return;
      e.preventDefault(); state.config.panels.scraps = true; state.ui.scrapsCollapsed = false; renderTopChrome(); renderScrapsDrawer();
    });
    const accept = e => {
      if (!state.ui.draggedSelectionText || !selectionRange?.startContainer.isConnected) return;
      e.preventDefault(); e.stopImmediatePropagation();
      state.project.scraps.unshift({ id: uid("scrap"), text: state.ui.draggedSelectionText, time: nowHHMM(), source_layer: getActiveLayer()?.name || "Manuscrito" });
      const selection = getSelection(); restoreFocus(selectionRange); selection.removeAllRanges(); selection.addRange(selectionRange); document.execCommand("delete");
      state.ui.draggedSelectionText = ""; selectionRange = null; syncDOMPagesToState(); scraps.render(); scheduleProjectSave();
    };
    $("scraps-drawer").addEventListener("drop", accept, true); toggle.addEventListener("drop", accept, true);
    document.addEventListener("dragend", () => { selectionRange = null; state.ui.draggedSelectionText = ""; });
    function restoreFocus(range) { (range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement).closest(".rich-editor")?.focus(); }
  }
  function deleteLayer(id) {
    const sheet = getActiveSheet(), layer = getSheetLayers().find(l => l.id === id); if (!layer || layer.is_base) return;
    // Borrar la capa conserva el texto: sus bloques y frases vuelven a la base.
    document.querySelectorAll(".rich-editor [data-layer-id]").forEach(node => { if (node.dataset.layerId === id) { node.removeAttribute("data-layer-id"); node.removeAttribute("data-layer-hidden"); node.classList.remove("layer-block", "layer-inline", "strata-layer-annotation"); node.removeAttribute("data-export"); node.removeAttribute("data-layer-kind"); node.removeAttribute("contenteditable"); node.style.removeProperty("--layer-color"); } });
    sheet.pages = sheet.pages.map(raw => { const tmp = el("div"); tmp.innerHTML = raw; tmp.querySelectorAll("[data-layer-id]").forEach(node => { if (node.dataset.layerId === id) { node.removeAttribute("data-layer-id"); node.removeAttribute("data-layer-hidden"); node.classList.remove("layer-block", "layer-inline", "strata-layer-annotation"); node.removeAttribute("data-export"); node.removeAttribute("data-layer-kind"); node.removeAttribute("contenteditable"); } }); return tmp.innerHTML; });
    sheet.layers = sheet.layers.filter(l => l.id !== id);
    if (getActiveLayerId() === id) setActiveLayerId(sheet.layers.find(l => l.is_base).id);
    if (state.ui.parallelLayerId === id) state.ui.parallelLayerId = null;
    syncDOMPagesToState(); renderAll(false); scheduleProjectSave();
  }
  function layerChoice(title, run) {
    captureSelectionAndSyncToolbar(false);
    const options = getSheetLayers().filter(l => !l.is_base);
    if (!options.length) { showToast("Crea primero una capa."); openLayerModal(); return; }
    dialog(title, (body, modal) => { const choice = select("Capa", options.map(l => [l.id, l.name]), getActiveLayer()?.is_base ? options[0].id : getActiveLayerId()); body.append(choice.wrap, button("Aplicar", () => { modal.close(); run(choice.input.value); }, "btn primary")); });
  }
  function insertLayerBlock() {
    layerChoice("Bloque intercalado de capa", id => {
      getSheetLayers().find(l => l.id === id).mode = "draft";
      restoreSelection(false); const node = el("p", "layer-block"); node.dataset.layerId = id; node.dataset.pid = uid("p"); node.append(document.createElement("br"));
      document.execCommand("insertHTML", false, node.outerHTML); applyLayers(); scheduleProjectSave();
    });
  }
  function assignInlineLayer() {
    if (!savedSelectionRange || savedSelectionRange.collapsed) { showToast("Selecciona una frase primero."); return; }
    layerChoice("Resaltado inline por capa", id => {
      getSheetLayers().find(l => l.id === id).mode = "evidence";
      if (!restoreSelection(true)) return;
      const range = getSelection().getRangeAt(0); const span = el("span", "layer-inline"); span.dataset.layerId = id;
      span.append(range.cloneContents()); document.execCommand("insertHTML", false, span.outerHTML); applyLayers(); scheduleProjectSave();
    });
  }
  function applyLayers() {
    const map = new Map(getSheetLayers().map(l => [l.id, l]));
    document.querySelectorAll(".page-editor [data-layer-id], #parallel-editor [data-layer-id]").forEach(node => {
      const layer = map.get(node.dataset.layerId);
      window.StrataEditorial?.markAnnotation(node, layer);
      node.toggleAttribute("data-layer-hidden", layer?.visible === false);
      node.style.setProperty("--layer-color", layer?.color || "#6889b5");
    });
  }
  function exportPages(sheet) {
    return (sheet.pages || []).map(raw => window.StrataEditorial ? StrataEditorial.cleanExportHtml(raw, sheet) : raw);
  }
  function cloneSheetContent(sheet, layers) {
    const mapping = new Map(getSheetLayers(sheet).map((layer, i) => [layer.id, layers[i].id]));
    return sheet.pages.map(raw => {
      const tmp = el("div"); tmp.innerHTML = raw;
      tmp.querySelectorAll("[data-layer-id]").forEach(node => node.dataset.layerId = mapping.get(node.dataset.layerId) || node.dataset.layerId);
      tmp.querySelectorAll("h1[id],h2[id],h3[id]").forEach(node => node.removeAttribute("id")); return tmp.innerHTML;
    });
  }
  function pageDialog() {
    const layout = state.project.document.layout;
    dialog("Disposición de la hoja", body => {
      const preset = select("Márgenes", [["normal", "Normal (2.5 cm)"], ["narrow", "Estrecho (1.27 cm)"], ["moderate", "Moderado (1.91 cm)"], ["apa", "Norma APA (2.54 cm)"], ["custom", "Personalizado"]], layout.preset || "normal");
      const paper = select("Papel", [["a4", "A4"], ["letter", "Carta"], ["oficio", "Oficio (21.6 × 33 cm)"], ["book", "Libro (15 × 23 cm)"]], layout.paper || "a4");
      const orientation = select("Orientación", [["portrait", "Vertical"], ["landscape", "Horizontal"]], layout.orientation || "portrait");
      const columns = select("Columnas", [["1", "Una columna"], ["2", "Dos columnas"], ["3", "Tres columnas"]], String(layout.columns || 1));
      const indent = field("Sangría de primera línea (cm)", layout.indent_cm || 0, "number"); indent.input.min = 0; indent.input.max = 5; indent.input.step = .1;
      const margins = ["top", "right", "bottom", "left"].map((key, i) => { const f = field(["Superior", "Derecho", "Inferior", "Izquierdo"][i] + " (cm)", layout.margins?.[key] ?? 2.5, "number"); f.input.min = .2; f.input.max = 8; f.input.step = .01; return { ...f, key }; });
      preset.input.addEventListener("change", () => { const amount = { normal: 2.5, narrow: 1.27, moderate: 1.91, apa: 2.54, wide: 3.8 }[preset.input.value]; if (amount) margins.forEach(f => f.input.value = amount); });
      body.append(preset.wrap, paper.wrap, orientation.wrap, columns.wrap, indent.wrap, ...margins.map(f => f.wrap), button("Aplicar a este proyecto", () => {
        if ([indent, ...margins].some(f => !f.input.checkValidity())) { showToast("Revisa las medidas de la hoja."); return; }
        Object.assign(layout, { preset: preset.input.value, paper: paper.input.value, orientation: orientation.input.value, columns: +columns.input.value, indent_cm: +indent.input.value, margins: Object.fromEntries(margins.map(f => [f.key, +f.input.value])) });
        applyPageLayout(); scheduleProjectSave(); body.closest("dialog").close();
      }, "btn primary"));
    });
  }
  function applyPageLayout() {
    const l = state.project.document.layout || {}, dimensions = { a4: [21, 29.7], letter: [21.59, 27.94], oficio: [21.6, 33], book: [15, 23] }[l.paper || "a4"];
    const [w, h] = l.orientation === "landscape" ? [...dimensions].reverse() : dimensions;
    const desk = $("pages-stack"); desk.style.setProperty("--paper-w", `${w}cm`); desk.style.setProperty("--paper-h", `${h}cm`);
    const fallback = { normal: 2.5, narrow: 1.27, moderate: 1.91, apa: 2.54, wide: 3.8 }[l.preset || state.config.page.margin] || 2.5;
    ["top", "right", "bottom", "left"].forEach(key => desk.style.setProperty(`--margin-${key}`, `${l.margins?.[key] ?? fallback}cm`));
    desk.style.setProperty("--first-indent", `${l.indent_cm || 0}cm`); desk.style.setProperty("--columns", [1, 2, 3].includes(l.columns) ? l.columns : 1);
  }
  function themeDialog() {
    if(window.StrataThemes)return StrataThemes.open();
    const theme = state.config.custom_theme ||= {};
    dialog("Estudio de personalización", body => {
      [["background", "Fondo del escritorio", "--bg-desk"], ["paper", "Color del papel", "--page-bg"], ["accent", "Color de acento", "--accent"]].forEach(([key, name, variable]) => {
        const current = getComputedStyle(document.body).getPropertyValue(variable).trim();
        const f = field(name, theme[key] || (/^#[a-f0-9]{6}$/i.test(current) ? current : "#6889b5"), "color");
        f.input.addEventListener("input", () => { theme[key] = f.input.value; applyTheme(); scheduleConfigSave(); }); body.append(f.wrap);
      });
      const radius = field("Redondez (0 a 16 px)", theme.radius ?? 14, "range"); radius.input.min = 0; radius.input.max = 16;
      radius.input.addEventListener("input", () => { theme.radius = +radius.input.value; applyTheme(); scheduleConfigSave(); });
      const swap = select("Paneles laterales", [["normal", "Wiki izquierda · Capas derecha"], ["swapped", "Capas izquierda · Wiki derecha"]], theme.swapped ? "swapped" : "normal");
      swap.input.addEventListener("change", () => { theme.swapped = swap.input.value === "swapped"; applyTheme(); scheduleConfigSave(); });
      body.append(radius.wrap, swap.wrap, button("Restaurar tema", () => { state.config.custom_theme = {}; applyTheme(); scheduleConfigSave(); body.closest("dialog").close(); }));
    });
  }
  function applyTheme() {
    const theme = state.config.custom_theme || {};
    Object.entries({ background: "--bg-desk", paper: "--page-bg", accent: "--accent" }).forEach(([key, variable]) => {
      if (theme[key]) document.body.style.setProperty(variable, theme[key]); else document.body.style.removeProperty(variable);
    });
    if (theme.radius !== undefined) document.body.style.setProperty("--custom-radius", `${theme.radius}px`); else document.body.style.removeProperty("--custom-radius");
    document.body.classList.toggle("panels-swapped", Boolean(theme.swapped));
    document.body.classList.toggle("custom-paper", Boolean(theme.paper));
    if (theme.paper) {
      const rgb = theme.paper.match(/[a-f0-9]{2}/gi)?.map(c => parseInt(c, 16)) || [255, 255, 255];
      const text = rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114 > 150 ? "#202124" : "#eeeeef";
      document.body.style.setProperty("--page-text", text); document.body.style.setProperty("--page-heading", text);
    } else { document.body.style.removeProperty("--page-text"); document.body.style.removeProperty("--page-heading"); }
  }
  async function chooseCover(type, key) {
    const result = await apiPost("/api/file/pick-image", {}); if (!result.ok) return;
    state.config[type] ||= {}; state.config[type][key] = result.data_url; scheduleConfigSave(); renderHomeScreen();
  }
  function renderCovers() {
    document.querySelectorAll("#home-templates-grid .tpl-card").forEach((card, index) => {
      const template = state.ui.projectTemplates[index]; if (!template || card.querySelector(".cover-choose")) return;
      const image = state.config.template_covers?.[template.id];
      if (image) { const img = el("img", "home-cover"); img.src = image; img.alt = template.name; card.querySelector(".tpl-illustration").replaceChildren(img); }
      else card.querySelector(".tpl-illustration").replaceChildren(coverIllustration(template.id));
      const choose = el("span", "cover-choose", "Cambiar portada"); choose.setAttribute("role", "button"); choose.tabIndex = 0;
      const action = e => { e.preventDefault(); e.stopPropagation(); chooseCover("template_covers", template.id); };
      choose.addEventListener("click", action); choose.addEventListener("keydown", e => { if (e.key === "Enter") action(e); }); card.append(choose);
    });
    document.querySelectorAll("#home-recent-grid .recent-card").forEach(card => {
      const path = card.querySelector(".rc-file")?.title, image = state.config.project_covers?.[path];
      if (!path || card.querySelector(".home-cover, .home-default-cover")) return;
      if (image) { const img = el("img", "home-cover"); img.src = image; img.alt = "Portada del proyecto"; card.prepend(img); }
      else { const cover = el("div", "home-default-cover"); cover.append(coverIllustration(path)); card.prepend(cover); }
    });
  }
  function coverIllustration(seed) {
    const wrap = el("div", "cover-art"), id = uid("cover");
    const hue = [...seed].reduce((n, c) => n + c.charCodeAt(0) * 7, 0) % 360;
    wrap.innerHTML = `<svg viewBox="0 0 400 160" aria-hidden="true"><defs><linearGradient id="${id}" x2="1" y2="1"><stop stop-color="hsl(${hue} 35% 22%)"/><stop offset="1" stop-color="hsl(${hue + 45} 30% 10%)"/></linearGradient></defs><rect width="400" height="160" fill="url(#${id})"/><circle cx="345" cy="25" r="90" fill="#fff" opacity=".04"/><circle cx="60" cy="155" r="120" fill="#fff" opacity=".03"/><g transform="translate(135 22) rotate(-8 65 58)"><rect x="-8" y="9" width="140" height="111" rx="8" fill="#000" opacity=".2"/><rect width="140" height="111" rx="8" fill="hsl(${hue} 30% 80%)"/><rect x="11" width="129" height="111" rx="6" fill="#f1eddf"/><rect x="11" width="8" height="111" fill="#d8d3c6"/><rect x="32" y="21" width="70" height="6" rx="3" fill="hsl(${hue} 30% 40%)"/><path d="M32 43h83M32 53h75M32 63h83M32 73h60M32 83h79" stroke="#9b9d9b" stroke-width="3" stroke-linecap="round"/><path d="M111 0v35l9-6 9 6V0" fill="hsl(${hue + 30} 55% 55%)"/></g><g fill="none" stroke="#fff" opacity=".22"><circle cx="70" cy="49" r="11"/><circle cx="330" cy="110" r="8"/><path d="m81 51 48 15m151 35 42 7" stroke-dasharray="4 5"/></g></svg>`;
    return wrap.firstElementChild;
  }
  async function openAccount() {
    let result;
    try { result = await apiPost("/api/auth/status", {}); }
    catch { showToast("No se pudo consultar la cuenta."); return; }
    if (!result.ok) { showToast(result.error || "No se pudo consultar la cuenta."); return; }
    account = result.user; accountProvider = result.provider;
    dialog(account ? "Perfil de usuario" : "Tu cuenta Strata", (body, modal) => {
      const status = el("p", "v8-message"); status.setAttribute("role", "status");
      if (account) {
        const avatar = el("img", "account-avatar"); avatar.alt = "Avatar"; if (account.avatar) avatar.src = account.avatar; else avatar.hidden = true;
        const name = field("Nombre", account.name), email = el("p", "", account.email);
        const plan = el("span", "plan-badge", account.plan === "pro" ? "Strata Pro" : "Plan Gratuito");
        const words = state.ui.recentProjects.reduce((total, p) => total + (p.words || 0), 0);
        const stats = el("p", "", `${state.ui.recentProjects.length} proyectos · ${words.toLocaleString('es-AR')} palabras · ${state.project.document.sheets.length} capítulos y ${state.project.fichas.length} fichas en este proyecto`);
        let draftAvatar = account.avatar;
        body.append(avatar, plan, email, stats, name.wrap, button("Cambiar avatar", async () => { const image = await apiPost("/api/file/pick-image", {}); if (image.ok) { draftAvatar = image.data_url; avatar.src = draftAvatar; avatar.hidden = false; } }), button("Guardar perfil", async () => {
          const saved = await apiPost("/api/auth/profile", { name: name.input.value, avatar: draftAvatar }); if (saved.ok) { account = saved.user; chrome(); modal.close(); } else status.textContent = saved.error;
        }, "btn primary"), button("Cerrar sesión", async () => { await apiPost("/api/auth/logout", {}); account = null; chrome(); modal.close(); }), status);
      } else {
        const mode = select("Acceso", [["login", "Iniciar sesión"], ["register", "Crear cuenta"]], "login");
        const name = field("Nombre"), email = field("Correo", "", "email"), password = field("Contraseña", "", "password");
        email.input.autocomplete = "username"; password.input.autocomplete = "current-password";
        body.append(mode.wrap, name.wrap, email.wrap, password.wrap, el("p", "v8-muted", accountProvider === "local" ? "Cuenta local en este equipo. Puedes conectar tu cuenta en la nube mediante Supabase." : "Acceso con Supabase · Sesión protegida en este equipo."));
        const submit = button("Continuar con correo", async () => {
          submit.disabled = true; status.textContent = "Procesando…";
          try {
            const response = await apiPost(`/api/auth/${mode.input.value}`, { name: name.input.value, email: email.input.value, password: password.input.value });
            password.input.value = "";
            if (response.ok && response.user) { account = response.user; chrome(); modal.close(); openAccount(); }
            else status.textContent = response.message || response.error || "Revisa tu correo y vuelve a iniciar sesión.";
          } catch { status.textContent = "No se pudo acceder a la cuenta."; } finally { submit.disabled = false; }
        }, "btn primary");
        let oauthTimer = null;
        modal.addEventListener("close", () => clearInterval(oauthTimer));
        body.append(submit, button("Continuar con Google", async () => {
          const response = await apiPost("/api/auth/google", {}); status.textContent = response.error || response.message;
          if (!response.pending) return;
          clearInterval(oauthTimer); const deadline = Date.now() + 300000; let polling = false;
          oauthTimer = setInterval(async () => {
            if (Date.now() > deadline || !modal.isConnected) { clearInterval(oauthTimer); return; }
            if (polling) return; polling = true;
            try { const next = await apiPost("/api/auth/status", {}); if (next.ok && next.user) { account = next.user; clearInterval(oauthTimer); chrome(); modal.close(); openAccount(); } }
            catch { status.textContent = "Esperando conexión con el proveedor de identidad…"; }
            finally { polling = false; }
          }, 1800);
        }), status);
        password.input.addEventListener("keydown", e => { if (e.key === "Enter") submit.click(); });
        name.wrap.hidden = true; mode.input.addEventListener("change", () => { name.wrap.hidden = mode.input.value !== "register"; password.input.autocomplete = mode.input.value === "register" ? "new-password" : "current-password"; });
      }
    });
  }
  return { get ready() { return ready; }, ui, init, loadProject, render, chrome, editors, categoryControls, fichaModal, lightbox, dictionary, contextMenu, scraps, deleteLayer, applyLayers, exportPages, cloneSheetContent, pageDialog, themeDialog, insertLayerBlock, assignInlineLayer, openAccount, categoriesDialog };
})();
