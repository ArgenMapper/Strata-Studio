/* Contratos del manuscrito: la selección de una capa nunca cambia el destino de escritura. */
window.StrataEditorial = (() => {
  const $ = id => document.getElementById(id), ui = () => StrataV8.ui;
  let initialized = false;
  function markAnnotation(node, layer) {
    if (!node.matches('.layer-block,.layer-inline,.strata-layer-annotation')) return;
    const evidence = node.classList.contains('layer-inline') && (layer?.mode === 'evidence' || node.dataset.layerKind === 'evidence');
    node.dataset.layerKind = evidence ? 'evidence' : 'annotation';
    node.dataset.export = 'ignore'; node.classList.add('strata-layer-annotation');
    if (node.classList.contains('layer-block')) {
      node.contentEditable = 'false'; node.title = 'Anotación de capa · Doble clic para editar';
    }
  }
  function cleanExportHtml(raw, sheet = getActiveSheet()) {
    const documentNode = document.createElement('div'); documentNode.innerHTML = raw || '';
    const clone = documentNode.cloneNode(true);
    // Una evidencia marca palabras del manuscrito: se elimina su envoltorio, nunca esas palabras.
    clone.querySelectorAll('.layer-inline').forEach(node => {
      const layer = sheet.layers?.find(l => l.id === node.dataset.layerId);
      if (node.dataset.layerKind === 'evidence' || layer?.mode === 'evidence') node.replaceWith(...node.childNodes);
      else { node.dataset.export = 'ignore'; node.classList.add('strata-layer-annotation'); }
    });
    clone.querySelectorAll('.layer-block,.note-card,#notes-col,#parallel-pane').forEach(n => { n.dataset.export = 'ignore'; });
    clone.querySelectorAll('[data-export="ignore"], .strata-layer-annotation').forEach(el => el.remove());
    clone.querySelectorAll('[data-layer-id]').forEach(n => {
      n.removeAttribute('data-layer-id'); n.removeAttribute('data-layer-hidden'); n.removeAttribute('data-layer-kind');
      n.style.removeProperty('--layer-color'); n.classList.remove('layer-inline','layer-block','evidence-flash');
    });
    return clone.innerHTML;
  }
  function baseInput(event, editor) {
    // Los campos de anotaciones y el editor paralelo son destinos explícitos independientes.
    const base = getSheetLayers().find(l => l.is_base);
    if (!base) return;
    if (getActiveLayerId() !== base.id) { setActiveLayerId(base.id); renderLayersPanel(); updateStatusBar(); }
    const sel = getSelection(), range = sel.rangeCount ? sel.getRangeAt(0) : null;
    const node = range?.startContainer.nodeType === 1 ? range?.startContainer : range?.startContainer.parentElement;
    const annotation = node?.closest('.layer-block,.layer-inline');
    if (!annotation || !editor.contains(annotation)) return;
    if (annotation.dataset.layerKind === "evidence") {
      const restore = ui().rememberCaret(editor); annotation.replaceWith(...annotation.childNodes); restore(); return;
    }
    // Sacar el punto de inserción de una nota o resaltado evita heredar la capa al escribir.
    let destination = annotation.classList.contains('layer-block') ? annotation.nextElementSibling : null;
    if (!destination || destination.matches('.strata-layer-annotation')) {
      destination = document.createElement(annotation.tagName === 'SPAN' ? 'span' : 'p');
      if (destination.tagName === 'P') { destination.dataset.pid = uid('p'); destination.append(document.createElement('br')); }
      annotation.after(destination);
    }
    const caret = document.createRange(); caret.selectNodeContents(destination); caret.collapse(true);
    sel.removeAllRanges(); sel.addRange(caret); lastCaretRange = caret.cloneRange(); savedSelectionRange = null;
  }
  function returnToBase() {
    const base = getSheetLayers().find(l => l.is_base); if (!base) return;
    const changed = getActiveLayerId() !== base.id || !!state.ui.parallelLayerId;
    setActiveLayerId(base.id); state.ui.parallelLayerId = null;
    renderParallelPane(); renderLayersPanel(); renderMarginNotes(); updateStatusBar();
    const candidate = getActiveRichEditor();
    const editor = candidate?.matches(".page-editor") ? candidate : document.querySelector(".page-editor");
    editor?.focus(); if (editor) baseInput(null, editor);
    if (changed) scheduleProjectSave();
  }
  function compactRibbon() {
    const ribbon = $('ribbon');
    const groups = [...ribbon.querySelectorAll(':scope > .rb-group')];
    const find = name => groups.find(g => g.querySelector('.rb-label')?.textContent === name);
    const label = group => group?.querySelector('.rb-body');
    // Galería de estilos como en 9.5, sin duplicar el grupo.
    for (const name of ['Estilos','Estilos editoriales']) find(name)?.remove();
    const styleGroup = document.createElement('div'); styleGroup.className = 'rb-group editorial-styles'; styleGroup.dataset.ribbonTab = 'inicio';
    const gallery = ui().el('div', 'block-style-gallery'); gallery.id = 'block-styles';
    for (const [tag, name] of [['p','Normal'],['h1','Título 1'],['h2','Título 2'],['h3','Título 3'],['blockquote','Cita'],['pre','Código']]) {
      const b = ui().button(name, () => {}, `style-chip style-${tag}`);
      b.dataset.cmd = 'block'; b.dataset.value = tag; b.dataset.block = tag; b.dataset.tip = name; b.title = name;
      b.addEventListener('mousedown', e => { captureSelectionAndSyncToolbar(false); e.preventDefault(); }); gallery.append(b);
    }
    styleGroup.append(gallery, ui().el('div','rb-label','Estilos')); ribbon.insertBefore(styleGroup, $('btn-collapse-ribbon'));
    const scraps = find('Recortes');
    scraps?.querySelector('[data-tip="Abrir cajón"]')?.remove();
    const xray = $('btn-xray');
    if (xray) { const g=ui().el('div','rb-group'), body=ui().el('div','rb-body'); g.dataset.ribbonTab='inicio'; body.append(xray); g.append(body,ui().el('div','rb-label','Revisión')); ribbon.insertBefore(g,$('btn-collapse-ribbon')); }
    installDensityControl();
    const clipboard = label(find('Portapapeles')), utilities = find('Portapapeles y edición');
    const format = utilities?.querySelector('[data-tip="Copiar formato"]'); if (format) clipboard.append(format);
    const casing = utilities?.querySelector('[data-tip="Aa · Mayúsculas"]'); if (casing) label(find('Fuente')).querySelector('.rb-row').append(casing);
    if (utilities) utilities.querySelector('.rb-label').textContent = 'Utilidades';
    // Los grupos siguen manteniendo los controles y los manejadores originales.
    const compact = new Set(['cut','copy','paste-plain','grow','shrink','removeFormat','superscript','subscript','pick-fore','pick-back','outdent','indent','insertUnorderedList','insertOrderedList','justifyLeft','justifyCenter','justifyRight','justifyFull','undo','redo']);
    ribbon.querySelectorAll('[data-ribbon-tab="inicio"] button').forEach(b => {
      if (compact.has(b.dataset.cmd) || b.classList.contains('v8-rb-action') || b.classList.contains('v95-tool')) {
        b.dataset.iconOnly = 'true'; b.classList.add('editorial-icon');
        const name = b.dataset.tip || b.title || b.textContent.trim();
        b.title = name; b.setAttribute('aria-label', name);
        const scrapIcon = /Recortar al cajón/i.test(name) ? "scissors" : /Abrir cajón/i.test(name) ? "inbox" : null;
        if (scrapIcon) { b.replaceChildren(); const icon = ui().el("i", "ic"); icon.dataset.i = scrapIcon; b.append(icon); injectIcons(b); }
        [...b.childNodes].forEach(n => { if (n.nodeType === Node.TEXT_NODE || (n.nodeType === 1 && !n.matches('svg,.ic,.color-bar'))) n.remove(); });
      }
    });

    ribbon.dataset.activeTab = 'inicio';
  }
  function installDensityControl() {
    const glyph = mode => `<svg viewBox="0 0 40 26" aria-hidden="true"><rect x="1" y="1" width="38" height="24" rx="3" fill="none" stroke="currentColor"/><path d="M2 6h36" stroke="currentColor"/><g fill="currentColor">${Array.from({length:mode==='comfortable'?3:mode==='compact'?2:1},(_,r)=>Array.from({length:5},(_,c)=>`<rect x="${5+c*6}" y="${10+r*4}" width="4" height="2" rx=".5"/>`).join('')).join('')}</g></svg>`;
    const trigger=ui().button('',()=>{},'toggle-chip editor-only ribbon-density-trigger');
    trigger.id='ribbon-density'; trigger.title='Altura de la cinta'; trigger.setAttribute('aria-label',trigger.title);
    trigger.setAttribute('aria-haspopup','menu'); trigger.setAttribute('aria-expanded','false'); trigger.setAttribute('aria-controls','ribbon-density-menu');
    trigger.innerHTML=glyph('compact'); document.querySelector('.panel-toggles').append(trigger);
    const menu=ui().el('div','ribbon-density-menu'); menu.id='ribbon-density-menu'; menu.hidden=true;
    menu.setAttribute('role','menu'); menu.setAttribute('aria-label','Altura de la cinta');
    menu.append(ui().el('div','density-heading','Altura de la cinta'));
    const close=(focus=false)=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus();};
    for(const [mode,name,description] of [['slim','Una fila','Máximo espacio para escribir'],['compact','Compacta','Dos filas de herramientas'],['comfortable','Cómoda','Controles más espaciados']]) {
      const option=ui().button('',()=>{
        state.config.interface ||= {};state.config.interface.ribbon_density=mode;chrome();scheduleConfigSave();close(true);
      },'density-option');
      option.dataset.density=mode; option.setAttribute('role','menuitemradio');option.innerHTML=glyph(mode);
      const text=ui().el('span');text.append(ui().el('strong','',name),ui().el('small','',description));option.append(text);menu.append(option);
    }
    document.body.append(menu);
    trigger.addEventListener('mousedown',e=>{captureSelectionAndSyncToolbar(false);e.preventDefault();});
    trigger.addEventListener('click',()=>{
      if(!menu.hidden){close();return;}
      const box=trigger.getBoundingClientRect();menu.style.right=`${Math.max(8,innerWidth-box.right)}px`;menu.style.top=`${box.bottom+6}px`;
      menu.hidden=false;trigger.setAttribute('aria-expanded','true');
      menu.querySelector('[aria-checked="true"]')?.focus();
    });
    menu.addEventListener('keydown',e=>{
      const items=[...menu.querySelectorAll('[role=menuitemradio]')],index=items.indexOf(document.activeElement);
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}
      if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)) {
        e.preventDefault();items[e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();
      }
    });
    document.addEventListener('pointerdown',e=>{if(!menu.hidden&&!menu.contains(e.target)&&!trigger.contains(e.target))close();});
    window.addEventListener('resize',()=>close());
  }
  function themeCards() {
    for (const [id, name, desc] of [
      ['oxford','Azul Noche Académico (Oxford)','Serif editorial, mesa azul y papel marfil'],
      ['library','Verde Biblioteca Clásica','Serif clásica, verde profundo y papel cálido'],
      ['ink','Alto Contraste Tinta','Texto nítido, interfaz negra y hoja blanca']
    ]) {
      const b = document.querySelector(`[data-theme-choice="${id}"]`); if (!b) continue;
      b.replaceChildren(); b.removeAttribute('data-preview-theme');
      const preview = ui().el('div', `tc-preview t-${id}`), side = ui().el('div','tc-side'), page = ui().el('div','tc-page');
      for (const tag of ['b','i','i','hr','i']) page.append(document.createElement(tag));
      preview.append(side,page); b.append(preview,ui().el('div','tc-name',name),ui().el('div','tc-desc',desc));
    }
  }
  function chrome() {
    if (!initialized) return;
    const active = document.querySelector('.ribbon-tab.active');
    $('ribbon').dataset.activeTab = active?.dataset.tab || 'inicio';
    const density=['slim','compact','comfortable'].includes(state.config.interface?.ribbon_density)?state.config.interface.ribbon_density:'compact';
    document.body.dataset.ribbonDensity=density;
    document.querySelectorAll('.density-option').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.density===density)));
    $('ribbon-density')?.setAttribute('title',`Altura de la cinta · ${density==='slim'?'Una fila':density==='compact'?'Compacta':'Cómoda'}`);
    const base = getActiveLayer()?.is_base;
    document.querySelectorAll('.return-base').forEach(b => { b.classList.toggle('at-base', !!base); b.setAttribute('aria-pressed', String(!!base)); });
  }
  function init() {
    if (initialized) return; initialized = true;
    compactRibbon(); themeCards();
    for (const [id, parent] of [['btn-return-base','panel-layers'], ['status-return-base','bottom-bar']]) {
      const b = ui().button('Volver a Capa Base', returnToBase, 'return-base'); b.id = id; b.title = 'Volver a Capa Base / Desactivar capa activa (Esc)';
      if (parent === 'panel-layers') $('layer-list').before(b); else $(parent).insertBefore(b, $('status'));
    }
    document.addEventListener('dblclick', event => {
      const annotation = event.target.closest('.page-editor .layer-block'); if (!annotation) return;
      ui().dialog('Editar anotación de capa', (body, modal) => {
        const content = ui().field('Texto de la anotación', annotation.innerText, 'textarea');
        body.append(content.wrap,ui().button('Guardar nota', () => { annotation.textContent = content.input.value; syncDOMPagesToState(); scheduleProjectSave(); modal.close(); }));
      });
    });
    chrome();
    window.StrataBeta2?.init();
    window.Strata10?.init();
    window.Strata11?.init();
  }
  return { init, chrome, markAnnotation, cleanExportHtml, baseInput, returnToBase };
})();
