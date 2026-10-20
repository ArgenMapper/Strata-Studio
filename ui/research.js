/* Investigación: biblioteca persistente, citas, bibliografía e índice navegable. */
window.StrataResearch = (() => {
  const ui = () => StrataV8.ui;
  const research = () => state.project.research;
  function format(citation, style = research().style) {
    const { author, year, title, publisher } = citation;
    if (style === "mla") return `${author}. ${title}. ${publisher ? publisher + ", " : ""}${year}.`;
    if (style === "ieee") return `${author}, ${title}. ${publisher ? publisher + ", " : ""}${year}.`;
    if (style === "chicago") return `${author}. ${title}. ${publisher ? publisher + ", " : ""}${year}.`;
    return `${author} (${year || "s. f."}). ${title}.${publisher ? " " + publisher + "." : ""}`;
  }
  function citationLabel(citation, index = 0) {
    const style = research().style;
    if (style === "ieee" || style === "vancouver") return `[${index + 1}]`;
    if (style === "mla") return `(${citation.author})`;
    if (style === "chicago") return `(${citation.author} ${citation.year})`;
    return `(${citation.author}, ${citation.year || "s. f."})`;
  }
  function insertCitation(id) {
    const citation = research().citations.find(c => c.id === id); if (!citation) return;
    restoreSelection(false);
    const editor = getActiveRichEditor(); if (!editor) return;
    editor.focus(); restoreSelection(false);
    const span = ui().el("span", "saved-citation", citationLabel(citation, research().citations.indexOf(citation)));
    span.dataset.citationId = id; span.contentEditable = "false";
    document.execCommand("insertHTML", false, `${span.outerHTML} `);
    syncDOMPagesToState(); scheduleProjectSave();
  }
  function library(afterSave = null) {
    const { el, field, button, dialog, select } = ui();
    dialog("Biblioteca de citas guardadas", (body, modal) => {
      body.append(el("p", "v8-muted", "Guarda libros y artículos. Inserta una cita para incluirla en la bibliografía automática."));
      const list = el("div", "research-library"), form = el("div", "v8-form-grid");
      const author = field("Autor / autores"), year = field("Año"), title = field("Título"), publisher = field("Editorial / revista");
      const type = select("Tipo", [["book", "Libro"], ["article", "Artículo / paper"]], "book");
      const stance = field("Postura / tesis"), findings = field("Hallazgos", "", "textarea");
      let editing = null;
      const save = button("Guardar referencia", () => {
        if (!author.input.value.trim() || !title.input.value.trim()) { showToast("Completa autor y título."); return; }
        const data = { author: author.input.value.trim(), year: year.input.value.trim(), title: title.input.value.trim(), publisher: publisher.input.value.trim(), type: type.input.value, stance: stance.input.value.trim(), findings: findings.input.value.trim() };
        const existing = research().citations.find(c => c.id === editing);
        if (existing) Object.assign(existing, data); else research().citations.push({ id: uid("citation"), ...data });
        editing = null; [author, year, title, publisher].forEach(f => f.input.value = ""); paint(); scheduleProjectSave();
        if (typeof afterSave === "function") { modal.close(); afterSave(); }
      }, "btn primary");
      form.append(author.wrap, year.wrap, title.wrap, publisher.wrap, type.wrap, stance.wrap, findings.wrap, save); body.append(list, form);
      function paint() {
        list.replaceChildren();
        if (!research().citations.length) list.append(el("p", "empty-hint", "Tu biblioteca está vacía."));
        research().citations.forEach(c => {
          const row = el("article", "v8-list-row"), text = el("div", "", format(c));
          row.append(text, button("Insertar cita", () => { modal.close(); insertCitation(c.id); }), button("Editar", () => {
            stance.input.value = c.stance || ""; findings.input.value = c.findings || ""; editing = c.id; author.input.value = c.author; year.input.value = c.year; title.input.value = c.title; publisher.input.value = c.publisher; type.input.value = c.type || "book"; author.input.focus();
          }), button("Eliminar", () => {
            syncDOMPagesToState();
            const used = state.project.document.sheets.some(s => s.pages.some(p => p.includes(`data-citation-id="${c.id}"`)));
            if (used) { showToast("Esta referencia está citada. Quita sus citas del texto antes de eliminarla."); return; }
            research().citations = research().citations.filter(x => x.id !== c.id); paint(); scheduleProjectSave();
          }, "text-btn danger")); list.append(row);
        });
      } paint();
    });
  }
  function bibliography() {
    syncDOMPagesToState();
    const { el } = ui(), sheets = state.project.document.sheets;
    const used = [];
    sheets.forEach(sheet => sheet.pages.forEach(raw => { const tmp = el("div"); tmp.innerHTML = raw; tmp.querySelectorAll("[data-citation-id]").forEach(n => { if (!used.includes(n.dataset.citationId)) used.push(n.dataset.citationId); }); }));
    let entries = used.map(id => research().citations.find(c => c.id === id)).filter(Boolean);
    if (!entries.length) { showToast("Inserta al menos una cita de la biblioteca para generar la bibliografía."); return; }
    if (research().style !== "ieee") entries.sort((a, b) => a.author.localeCompare(b.author, "es") || a.year.localeCompare(b.year));
    const section = el("section", "auto-bibliography"); section.dataset.generated = "bibliography";
    section.append(el("h2", "", research().style === "apa" ? "Referencias" : "Bibliografía"));
    entries.forEach((entry, index) => {
      const p = el("p", "bibliography-entry");
      if (research().style === "ieee") p.append(document.createTextNode(`[${index + 1}] `));
      // Título en cursiva, texto sin HTML suministrado por el usuario.
      const formatted = format(entry), at = formatted.indexOf(entry.title);
      p.append(document.createTextNode(formatted.slice(0, at)), el("em", "", entry.title), document.createTextNode(formatted.slice(at + entry.title.length))); section.append(p);
    });
    sheets.forEach(sheet => sheet.pages = sheet.pages.map(raw => {
      const tmp = el("div"); tmp.innerHTML = raw; tmp.querySelectorAll(".auto-bibliography").forEach(n => n.remove());
      tmp.querySelectorAll(".saved-citation").forEach(n => { const c = research().citations.find(c => c.id === n.dataset.citationId); if (c) n.textContent = citationLabel(c, entries.indexOf(c)); });
      return tmp.innerHTML;
    }));
    const last = sheets[sheets.length - 1]; last.pages[last.pages.length - 1] += section.outerHTML;
    renderPagesStack(); scheduleProjectSave(); showToast("Bibliografía actualizada al final del documento.");
  }
  function headings() {
    syncDOMPagesToState(); const result = [];
    state.project.document.sheets.forEach(sheet => sheet.pages = sheet.pages.map((raw, pageIndex) => {
      const tmp = ui().el("div"); tmp.innerHTML = raw;
      let headingIndex = 0;
      const editor = sheet.id === getActiveSheet().id ? document.querySelector(`.page-editor[data-page-index="${pageIndex}"]`) : null;
      const liveHeadings = editor ? [...editor.querySelectorAll("h1,h2,h3")].filter(n => !n.closest(".strata-toc,.auto-bibliography")) : [];
      tmp.querySelectorAll("h1,h2,h3").forEach(node => {
        if (node.closest(".strata-toc, .auto-bibliography")) return;
        node.id ||= `heading-${sheet.id}-${node.dataset.pid || uid("h")}`;
        if (liveHeadings[headingIndex]) liveHeadings[headingIndex].id = node.id;
        headingIndex++;
        result.push({ id: node.id, sheetId: sheet.id, level: +node.tagName[1], text: node.textContent });
      }); return tmp.innerHTML;
    })); return result;
  }
  function tocElement(items) {
    const { el } = ui(), nav = el("nav", "strata-toc"); nav.contentEditable = "false"; nav.setAttribute("aria-label", "Tabla de contenido");
    nav.append(el("strong", "", "Contenido"));
    items.forEach(item => { const a = el("a", `toc-level-${item.level}`, item.text); a.href = `#${item.id}`; a.dataset.sheetId = item.sheetId; a.dataset.headingId = item.id; nav.append(a); }); return nav;
  }
  function insertTOC() {
    const items = headings();
    if (!items.length) { showToast("Escribe títulos H1, H2 o H3 para crear el índice."); return; }
    // Actualizar los identificadores de los títulos sin sobrescribir el estado desde un DOM antiguo.
    restoreSelection(false); const editor = getActiveRichEditor(); if (!editor) return;
    document.execCommand("insertHTML", false, `${tocElement(items).outerHTML}<p><br></p>`);
    syncDOMPagesToState();
    // Reasignar IDs en la versión que acaba de guardar el editor.
    headings(); renderPagesStack(); scheduleProjectSave();
  }
  function updateTOC() {
    const items = headings(); let found = false;
    state.project.document.sheets.forEach(sheet => sheet.pages = sheet.pages.map(raw => { const tmp = ui().el("div"); tmp.innerHTML = raw; tmp.querySelectorAll(".strata-toc").forEach(n => { n.replaceWith(tocElement(items)); found = true; }); return tmp.innerHTML; }));
    if (!found) { insertTOC(); return; }
    renderPagesStack(); scheduleProjectSave(); showToast("Tabla de contenido actualizada.");
  }
  document.addEventListener("click", e => {
    const link = e.target.closest(".strata-toc a[data-heading-id]"); if (!link) return;
    e.preventDefault(); syncDOMPagesToState(); state.project.document.active_sheet_id = link.dataset.sheetId;
    if (state.ui.planningView) StrataPlanning.show(null); renderAll(true);
    document.getElementById(link.dataset.headingId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  return { format, library, insertCitation, bibliography, headings, insertTOC, updateTOC };
})();
