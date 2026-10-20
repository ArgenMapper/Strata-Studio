/* Strata 9.5. Extensiones sobre los contratos del editor existente. */
window.Strata95 = (() => {
  const $ = id => document.getElementById(id);
  const u = () => StrataV8.ui;
  let ready = false;
  let authCapabilities = {provider:"local",google:false,password_recovery:false,cloud_backups:false,plans:false};
  let wikiMode = "all", account = null, copiedFormat = null, wordBaseline = 0;
  const modes = [["margin", "Notas al margen"], ["draft", "Borrador / Texto intercalado"], ["evidence", "Marcador de evidencia"]];
  const icons = {
    text: '<path d="M4 5h16M12 5v15M8 20h8"/>',
    page: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M8 3v18M8 8h13"/>',
    layers: '<path d="m3 7 9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    voice: '<path d="M4 9h4l5-5v16l-5-5H4zM16 8q6 4 0 8M19 4q9 8 0 16"/>',
    quote: '<path d="M4 12h6v8H3v-8q0-7 7-8M15 12h6v8h-7v-8q0-7 7-8"/>',
    pen: '<path d="m4 16 12-12 4 4L8 20H4zM13 7l4 4"/>',
    chart: '<path d="M3 3v18h18M7 17v-5h3v5M13 17V8h3v9M19 17V4h2v13"/>',
    undo: '<path d="M8 4 3 9l5 5M3 9h10a7 7 0 0 1 0 14"/>',
    redo: '<path d="m16 4 5 5-5 5M21 9H11a7 7 0 0 0 0 14"/>',
    brush: '<path d="m12 13 7-10 3 3-10 8M12 14q1 7-9 7 3-2 2-5 1-4 7-2z"/>'
  };
  function svg(name = "page") { return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.page}</svg>`; }
  function tool(label, action, icon = "page", description = "", shortcut = "") {
    const b = u().button(label, action, "rb-btn v95-tool");
    b.prepend(document.createRange().createContextualFragment(svg(icon)));
    b.dataset.tip = label; b.dataset.help = description || `Abre ${label.toLocaleLowerCase("es")} para aplicarlo al documento o al texto seleccionado.`;
    b.dataset.shortcut = shortcut; b.setAttribute("aria-label", label);
    b.addEventListener("mousedown", e => { captureSelectionAndSyncToolbar(false); e.preventDefault(); });
    return b;
  }
  function group(tab, name, actions) {
    const g = u().el("div", "rb-group"), body = u().el("div", "rb-body v8-ribbon-actions");
    g.dataset.ribbonTab = tab;
    actions.forEach(args => body.append(tool(...args)));
    g.append(body, u().el("div", "rb-label", name)); $("ribbon").insertBefore(g, $("btn-collapse-ribbon"));
    return g;
  }
  function insert(raw) {
    document.querySelectorAll("dialog[open]").forEach(d => d.close());
    restoreSelection(false); const editor = getActiveRichEditor() || document.querySelector(".page-editor");
    if (!editor) return; editor.focus(); restoreSelection(false);
    document.execCommand("insertHTML", false, raw); syncDOMPagesToState(); scheduleProjectSave();
  }
  function textDialog(title, label, run, initial = "") {
    u().dialog(title, (body, modal) => {
      const f = u().field(label, initial, "textarea");
      body.append(f.wrap, u().button("Aplicar", () => { run(f.input.value); modal.close(); }, "btn primary"));
    });
  }
  function table(headers, rows) {
    const t = u().el("table", "strata-table"), head = t.createTHead().insertRow();
    headers.forEach(h => { const cell = document.createElement("th"); cell.textContent = h; head.append(cell); });
    const body = t.createTBody(); rows.forEach(row => { const tr = body.insertRow(); row.forEach(value => tr.insertCell().textContent = String(value ?? "")); });
    insert(t.outerHTML + "<p><br></p>");
  }
  function ribbon() {
    // Conservar controles tipográficos, sus IDs y los eventos que preservan Range.
    group("inicio", "Portapapeles y edición", [
      ["Copiar formato", formatPainter, "brush", "Selecciona texto de origen, copia su formato y elige Aplicar sobre otra selección."],
      ["Aa · Mayúsculas", changeCase, "text"], ["Buscar y reemplazar", replaceDialog, "search", "Busca coincidencias y reemplaza la siguiente o todas sin perder el formato del resto.", "Ctrl+H"],
      ["Leer en voz alta", speech, "voice", "Lee la selección o la hoja con una voz de Windows. Vuelve a pulsar para detener."],
      ["Seleccionar todo", () => executeRibbonCommand("selectAll"), "text", "Selecciona el texto de la hoja activa.", "Ctrl+A"]
    ]);
    group("inicio", "Estilos editoriales", [["Normal", () => executeRibbonCommand("block", "p"), "text"], ["Título 1", () => executeRibbonCommand("block", "h1"), "text"], ["Título 2", () => executeRibbonCommand("block", "h2"), "text"], ["Título 3", () => executeRibbonCommand("block", "h3"), "text"], ["Cita en bloque", () => executeRibbonCommand("block", "blockquote"), "quote"], ["Código", () => executeRibbonCommand("block", "pre"), "text"]]);
    group("insertar", "Páginas y datos", [["Portada editorial", cover, "page"], ["Salto de página", () => insert('<div class="page-break" contenteditable="false"></div><p><br></p>'), "page"], ["Página en blanco", () => addNewA4Page(state.ui.activePageIndex), "page"], ["Tabla · filas × columnas", tablePicker, "table"], ["Matriz comparativa", () => table(["Criterio", "Opción A", "Opción B"], [["Descripción", "", ""], ["Ventajas", "", ""], ["Limitaciones", "", ""]]), "table"], ["Gráfico de barras", chart, "chart"]]);
    group("insertar", "Elementos editoriales", [["Cuadro destacado", callout, "quote"], ["Símbolos especiales", symbols, "text"], ["Encabezado y pie", headers, "layout"], ["Número de página", () => { layout().page_numbers = !layout().page_numbers; changedLayout(); }, "page"]]);
    group("hoja", "Hoja en vivo", [["Márgenes", () => chooseLayout("preset", [["normal", "Normal · 2.5 cm"], ["narrow", "Estrecho · 1.27 cm"], ["apa", "APA · 2.54 cm"], ["wide", "Ancho · 3.8 cm"]]), "layout"], ["Orientación", () => chooseLayout("orientation", [["portrait", "Vertical"], ["landscape", "Horizontal"]]), "layout"], ["Tamaño de papel", () => chooseLayout("paper", [["a4", "A4"], ["letter", "Carta"], ["oficio", "Oficio"], ["book", "Libro · 15 × 23 cm"]]), "page"], ["Columnas", () => chooseLayout("columns", [[1, "Una"], [2, "Dos"], [3, "Tres"]]), "layout"]]);
    group("hoja", "Párrafo y fondo", [["Sangría APA · 1.27 cm", () => { layout().indent_cm = 1.27; changedLayout(); }, "text"], ["Espaciado de párrafo", spacing, "text"], ["Marca de agua", watermark, "page"], ["Bordes de página", () => chooseLayout("border", [["none", "Ninguno"], ["simple", "Cuadro simple"], ["double", "Doble filete"]]), "layout"], ["Color y textura", paperAppearance, "pen"]]);
    group("referencias", "Citas y biblioteca", [["Insertar cita (Autor, Año)", citation, "quote"], ["Nota al pie [1]", () => { openCitationModal(); document.querySelector('[data-cit-mode="footnote"]')?.click(); }, "quote"], ["Nueva fuente bibliográfica", () => StrataResearch.library(), "page"], ["Matriz de literatura", literature, "table"], ["Extractor de citas y datos", extractor, "search"]]);
    group("referencias", "Normas y revisión", [["Aplicar formato APA", apa, "layout", "Aplica márgenes de 2.54 cm, doble interlineado y sangría inicial de 1.27 cm a toda la hoja."], ["Auditor de rigor", audit, "search", "Marca frases con generalizaciones o cifras sin citas cercanas. Es una revisión heurística para comprobar fuentes."], ["Quitar marcas de revisión", clearAudit, "pen"]]);
    const norms = $("citation-style"); if (norms && !norms.querySelector('[value="vancouver"]')) { const o = new Option("Vancouver", "vancouver"); norms.add(o); }
    group("estructura", "Capas funcionales", [["Tipo de capa", () => openLayerModal(getActiveLayer()?.is_base ? null : getActiveLayerId()), "layers"], ["Categorías de capas", layerCategories, "layers"], ["Usar capa activa", useLayer, "pen", "Notas al margen: anota el párrafo. Borrador: inserta texto intercalado. Evidencia: marca la selección."], ["Fusionar con texto final", () => mergeLayer(getActiveLayerId()), "layers"], ["Vaciar capa", () => emptyLayer(getActiveLayerId()), "layers"], ["Eliminar capa", () => StrataV8.deleteLayer(getActiveLayerId()), "layers"]]);
    group("estructura", "Vistas y sesión", [["A4", () => view("pages"), "page"], ["Continua", () => view("continuous"), "page"], ["Pizarra de tarjetas", () => view("corkboard"), "layout"], ["Meta de palabras", wordGoal, "text"]]);
    decorate();
  }
  function decorate() {
    document.querySelectorAll("#ribbon button, #seg-view button, .lr-actions button").forEach(b => {
      const name = b.dataset.tip || b.title || b.getAttribute("aria-label") || b.textContent.trim() || b.dataset.cmd || "Herramienta";
      b.dataset.tip ||= name; b.dataset.help ||= `Aplica ${name.toLocaleLowerCase("es")} al texto o a la vista actual.`;
      b.dataset.shortcut ||= (name.match(/Ctrl\+[^)]+|F\d+/)?.[0] || "");
      if (!b.closest(".block-style-gallery") && !b.querySelector("svg, .ic")) b.prepend(document.createRange().createContextualFragment(svg(b.dataset.cmd === "table" ? "table" : "page")));
      if (!b.closest(".block-style-gallery") && !b.dataset.iconOnly && !b.textContent.trim() && b.dataset.cmd && !["bold", "italic", "underline", "strikeThrough"].includes(b.dataset.cmd)) b.append(u().el("span", "rb-action-label", name.replace(/\s*\(.*/, "")));
      // El tooltip propio reemplaza al nativo: evita dos ayudas superpuestas.
      b.removeAttribute("title");
    });
  }
  function titlebar() {
    const center = u().el("div", "tb-center"); $("tb-drag").append(center);
    center.append($("doc-title"), $("autosave-toggle"));
    $("autosave-toggle").addEventListener("click", () => requestAnimationFrame(chrome));
    ["undo", "redo"].forEach(cmd => { const b = tool(cmd === "undo" ? "Deshacer" : "Rehacer", () => executeRibbonCommand(cmd), cmd, "Recorre el historial de edición.", cmd === "undo" ? "Ctrl+Z" : "Ctrl+Y"); b.className = "tb-btn editor-only v95-history"; b.innerHTML = svg(cmd); document.querySelector(".tb-left").append(b); });
    const old = $("account-button"), next = old.cloneNode(false); old.replaceWith(next);
    next.addEventListener("click", profile);
    document.querySelectorAll(".panel-toggles button, #btn-focus").forEach(b => { b.dataset.tip = b.title; b.dataset.help = "Muestra u oculta esta herramienta del espacio de escritura."; b.classList.add("editor-only"); });
    $("doc-title").classList.add("editor-only");
  }
  function chrome(light = false) {
    if (!ready) return;
    const dot = $("autosave-toggle");
    if (dot) { dot.textContent = "●"; dot.classList.toggle("pending", state.meta.dirty); dot.dataset.tip = state.meta.dirty ? "Cambios pendientes" : "Guardado"; dot.dataset.help = `Autoguardado ${state.config.autosave.enabled ? "activado" : "desactivado"}. Pulsa para alternarlo.`; dot.setAttribute("aria-label", dot.dataset.tip + ". " + dot.dataset.help); }
    const b = $("account-button");
    if (b) {
      const name = account?.name || "Invitado", avatar = account?.avatar || "";
      if (b.dataset.accountName !== name || (b.querySelector("img")?.getAttribute("src") || "") !== avatar || (!avatar && b.textContent !== name.slice(0,1).toUpperCase())) {
        b.dataset.accountName=name; b.dataset.tip=account?.name || "Modo invitado"; b.setAttribute("aria-label",`Perfil de ${name}`);
        b.textContent = name.slice(0,1).toUpperCase(); b.title = account?.name || "Modo invitado";
        if (avatar) { const img=u().el("img"); img.src=avatar; img.alt=name; b.replaceChildren(img); }
      }
    }
    if (light !== true) { pageDecorations(); decorate(); }
  }
  async function startup() {
    try { const result = await apiPost("/api/auth/status", {}); account = result.user; if (result.capabilities) authCapabilities=result.capabilities; if (!account) login(); chrome(); }
    catch { login(); }
  }
  function login() {
    if ($("strata-login")) return;
    let timer=null, busy=false, oauthPending=false;
    const modal=u().dialog("Tu espacio en Strata", (body, modal)=>{
      modal.id="strata-login"; modal.classList.add("login-screen","professional-login");
      modal.querySelector(".v8-dialog-head button").hidden=true;
      const brand=elLogin("div","login-brand","STRATA"), intro=elLogin("p","login-intro","Un lugar para escribir, investigar y dar forma a tus ideas.");
      brand.textContent=state.config.studio_name||'Strata Studio';const logo=elLogin('img','login-logo');logo.src='/ui/logo.svg';logo.alt='';brand.prepend(logo);
      const badge=elLogin("span","login-environment","Comprobando el servicio de cuentas…");
      const tabs=elLogin("div","login-tabs"); tabs.setAttribute("role","tablist");
      const loginTab=u().button("Iniciar sesión",()=>changeMode("login")), registerTab=u().button("Crear cuenta",()=>changeMode("register"));
      for(const b of [loginTab,registerTab]) b.setAttribute("role","tab"); tabs.append(loginTab,registerTab);
      const form=elLogin("form","login-form"); form.noValidate=true;
      const name=u().field("Nombre"), email=u().field("Correo electrónico","","email"), password=u().field("Contraseña","","password"), confirm=u().field("Repite la contraseña","","password");
      name.input.autocomplete="name"; name.input.maxLength=80; email.input.autocomplete="username"; email.input.required=true;
      password.input.autocomplete="current-password"; password.input.required=true; password.input.maxLength=1024; confirm.input.maxLength=1024; confirm.input.autocomplete="new-password";
      const reveal=u().button("Mostrar",()=>{ const visible=password.input.type==="password"; password.input.type=confirm.input.type=visible?"text":"password"; reveal.textContent=visible?"Ocultar":"Mostrar"; reveal.setAttribute("aria-pressed",String(visible)); },"password-reveal"); reveal.setAttribute("aria-label","Mostrar u ocultar contraseña"); password.wrap.classList.add("password-field"); password.wrap.append(reveal);
      const hint=elLogin("small","login-password-hint","Usa al menos 10 caracteres."), keep=elLogin("label","remember-session"), check=elLogin("input"); check.type="checkbox"; check.checked=true; keep.append(check,document.createTextNode("Mantener sesión iniciada"));
      const status=elLogin("p","login-status"); status.setAttribute("role","status"); status.setAttribute("aria-live","polite");
      const submit=u().button("Entrar a Strata",()=>{} ,"btn primary login-submit"); submit.type="submit";
      const recovery=u().button("¿Olvidaste tu contraseña?",async()=>{
        if(busy)return; if(!email.input.checkValidity()||!email.input.value.trim()) { message("Escribe primero el correo de tu cuenta.",true); email.input.focus(); return; }
        setBusy(true); try{ const r=await apiPost("/api/auth/recover",{email:email.input.value.trim()}); message(r.message||r.error,!r.ok); }catch{ message("No se pudo solicitar la recuperación. Intenta de nuevo.",true); }finally{setBusy(false);}
      },"text-btn login-recovery");
      const google=u().button("Continuar con Google",async()=>{
        if(busy || !authCapabilities.google)return;
        setBusy(true); message("Abriendo el navegador para continuar…");
        try {
          const r=await apiPost("/api/auth/google",{remember:check.checked}); message(r.error||r.message,!r.ok);
          if(r.pending) { oauthPending=true; guest.disabled=false; const deadline=Date.now()+300000; let polling=false; clearInterval(timer); timer=setInterval(async()=>{
            if(!modal.isConnected || Date.now()>deadline){ clearInterval(timer); setBusy(false); if(modal.isConnected)message("El acceso venció. Puedes intentarlo de nuevo.",true);return; }
            if(polling)return; polling=true;
            try{const result=await apiPost("/api/auth/status",{}); if(result.user){account=result.user;oauthPending=false;clearInterval(timer);modal.close();chrome();}}
            catch{message("Esperando la conexión con el servicio…");}finally{polling=false;}
          },1800); } else setBusy(false);
        }catch{message("No se pudo abrir el acceso con Google.",true);setBusy(false);}
      },"btn google-login");
      const guest=u().button("Continuar en modo invitado",()=>modal.close(),"text-btn login-guest");
      let mode="login";
      function message(text,error=false){status.textContent=text||"";status.classList.toggle("error",error);}
      function setBusy(value){busy=value;form.setAttribute("aria-busy",String(value));submit.disabled=value;loginTab.disabled=registerTab.disabled=reveal.disabled=value;google.disabled=value||!authCapabilities.google;recovery.disabled=value||!authCapabilities.password_recovery;guest.disabled=value&&!oauthPending;}
      function changeMode(next){mode=next;name.wrap.hidden=confirm.wrap.hidden=hint.hidden=mode!=="register";name.input.required=confirm.input.required=mode==="register";password.input.minLength=mode==="register"?10:1;password.input.autocomplete=mode==="register"?"new-password":"current-password";loginTab.classList.toggle("active",mode==="login");registerTab.classList.toggle("active",mode==="register");loginTab.setAttribute("aria-selected",String(mode==="login"));registerTab.setAttribute("aria-selected",String(mode==="register"));submit.textContent=mode==="register"?"Crear mi cuenta":"Entrar a Strata";recovery.hidden=mode!=="login"||!authCapabilities.password_recovery;message("");}
      form.addEventListener("submit",async e=>{
        e.preventDefault(); if(busy)return;
        if(!email.input.value.trim()||!email.input.checkValidity()){message("Introduce un correo electrónico válido.",true);email.input.focus();return;}
        if(!password.input.value || (mode==="register" && password.input.value.length<10)){message(mode==="register"?"La contraseña debe tener al menos 10 caracteres.":"Introduce tu contraseña.",true);password.input.focus();return;}
        if(mode==="register" && (!name.input.value.trim() || confirm.input.value!==password.input.value)){message(!name.input.value.trim()?"Escribe tu nombre.":"Las contraseñas no coinciden.",true);return;}
        setBusy(true);message(mode==="register"?"Creando tu cuenta…":"Iniciando sesión…");
        try{const r=await apiPost(`/api/auth/${mode}`,{name:name.input.value.trim(),email:email.input.value.trim(),password:password.input.value,remember:check.checked});if(!modal.isConnected)return; if(r.ok&&r.user){account=r.user;modal.close();chrome();if(r.message)showToast(r.message);}else message(r.error||r.message||"Confirma tu correo y luego inicia sesión.",!r.ok);}
        catch{message("No se pudo conectar. Tu trabajo local sigue disponible.",true);}finally{password.input.value=confirm.input.value="";setBusy(false);}
      });
      function updateCapabilities(caps){authCapabilities=caps;badge.textContent=caps.provider==="supabase"?"Cuenta conectada · Acceso en la nube":"Cuenta local · Este equipo";badge.classList.toggle("remote",caps.provider==="supabase");google.hidden=!caps.google;recovery.hidden=mode!=="login"||!caps.password_recovery;description.textContent=caps.provider==="supabase"?(caps.cloud_backups?"Tus documentos siguen en tu equipo. Puedes guardar copias privadas en la nube desde tu perfil.":"Tu cuenta puede usarse en otros equipos. Las copias en la nube aún no están habilitadas."):"Puedes crear una cuenta local o escribir como invitado. Tus documentos se guardan en este equipo.";google.disabled=busy||!caps.google;recovery.disabled=busy||!caps.password_recovery;}
      const description=elLogin("p","login-provider-description","");
      form.append(name.wrap,email.wrap,password.wrap,hint,confirm.wrap,keep,recovery,submit,status);
      body.append(brand,intro,badge,tabs,form,google,guest,description); changeMode("login");updateCapabilities(authCapabilities);
      apiPost("/api/auth/capabilities",{}).then(r=>{if(r.ok&&modal.isConnected)updateCapabilities(r.capabilities);}).catch(()=>message("El servicio de cuentas no está disponible. Puedes continuar como invitado.",true));
    });
    modal.addEventListener("close",()=>{clearInterval(timer);if(oauthPending)apiPost("/api/auth/cancel",{}).catch(()=>{});});modal.addEventListener("cancel",e=>e.preventDefault());
  }
  function elLogin(tag,classes="",text=""){return u().el(tag,classes,text);}
  async function profile() {
    const existing = document.getElementById('profile-dialog'); if (existing?.open) return;
    const paint = (body, modal) => {
      body.replaceChildren();
      const row = u().el("div", "profile-heading"), avatar = u().button("", async () => {
        if (!account) return;
        const image = await apiPost("/api/file/pick-image", {}); if (!image.ok) return;
        const result = await apiPost("/api/auth/profile", { name: account.name, avatar: image.data_url });
        if (result.ok) { account = result.user; paintAvatar(); chrome(); } else showToast(result.error);
      }, "profile-avatar-button");
      avatar.title = "Cambiar foto de perfil"; avatar.setAttribute("aria-label", "Cambiar foto de perfil");
      const paintAvatar = () => { avatar.replaceChildren(); if (account?.avatar) { const image = u().el("img"); image.src = account.avatar; image.alt = account.name; avatar.append(image); } else avatar.append(u().el("span", "", (account?.name || "Invitado")[0].toUpperCase())); };
      paintAvatar(); const info = u().el("div"); info.append(u().el("strong", "", account?.name || "Invitado"), u().el("p", "", account?.email || "Documentos guardados en este equipo")); row.append(avatar, info); body.append(row);
      const membership=u().el("section","profile-membership"); membership.append(u().el("strong","",account?.plan==="pro"?"Strata Pro":account?.plan_error?"Plan sin verificar":"Plan Gratuito"),u().el("p","",authCapabilities.provider==="supabase"?"Cuenta conectada al servicio de Strata.":"Cuenta y documentos locales en este equipo.")); body.append(membership);
      if(account && authCapabilities.cloud_backups) body.append(u().button("Copias privadas en la nube",()=>{modal.close();cloudBackups();},"btn"));
      else body.append(u().el("p","account-cloud-hint","Las copias en la nube no están conectadas en esta instalación. Tu trabajo permanece en el disco."));
      if (account) body.append(u().button("Editar perfil", async () => {
        modal.close(); await StrataV8.openAccount();
        const editor=[...document.querySelectorAll("dialog")].at(-1);
        editor?.addEventListener("close",async()=>{try{const r=await apiPost("/api/auth/status",{});if(r.ok){account=r.user;chrome();}}catch{}},{once:true});
      }));
      if(account)body.append(u().button('Activar licencia Pro',()=>{modal.close();StrataBeta2.license();},'btn primary'));
      for (const label of ["Cambiar cuenta", "Cerrar sesión"]) body.append(u().button(label, async () => { if (!await confirmPendingChanges()) return; await apiPost("/api/auth/logout", {}); account = null; modal.close(); chrome(); login(); }));
    };
    const modal = u().dialog("Perfil de usuario", paint); modal.id = 'profile-dialog';
    const status = u().el('p','profile-sync','Actualizando cuenta…'); status.setAttribute('role','status'); modal.querySelector('.v8-dialog-body').append(status);
    try {
      const result = await apiPost('/api/auth/status', {});
      if (!modal.open) return;
      if (result.ok) { account = result.user; if(result.capabilities) authCapabilities=result.capabilities; paint(modal.querySelector('.v8-dialog-body'),modal); chrome(); }
      else status.textContent = result.error || 'No se pudo actualizar la cuenta.';
    } catch { if(modal.open) status.textContent='Sin conexión. Se muestran los últimos datos disponibles.'; }
  }
  function cloudBackups() {
    u().dialog("Copias privadas en la nube",(body,modal)=>{
      const status=u().el("p","v8-message"),list=u().el("div","cloud-copy-list");status.setAttribute("role","status");let busy=false;
      const upload=u().button("Subir copia del proyecto actual",async()=>{
        if(busy)return;busy=true;upload.disabled=true;status.textContent="Subiendo una copia privada…";
        try{const r=await apiPost("/api/cloud/upload",{project:buildProjectPayload()});status.textContent=r.message||r.error;if(r.ok)await refresh();}catch{status.textContent="No se pudo subir la copia. El proyecto local se conserva.";}finally{busy=false;upload.disabled=false;}
      },"btn primary");
      const reload=u().button("Actualizar lista",()=>refresh(),"btn");
      body.append(u().el("p","v8-muted","Cada subida crea una copia independiente. Al abrir una copia se crea un proyecto local nuevo; no se sobrescriben tus archivos."),upload,reload,status,list);
      async function refresh(){reload.disabled=true;try{const r=await apiPost("/api/cloud/list",{});if(!r.ok){status.textContent=r.error;return;}list.replaceChildren();if(!r.copies.length)list.append(u().el("p","empty-hint","Todavía no hay copias en tu cuenta."));r.copies.forEach(copy=>{const row=u().el("article","cloud-copy-row"),name=u().el("span","",copy.name);row.append(name,u().button("Abrir como proyecto nuevo",async()=>{if(busy || !await confirmPendingChanges())return;busy=true;status.textContent="Descargando copia…";try{const result=await apiPost("/api/cloud/restore",{name:copy.name});if(result.ok){applyProjectObject(result.state);closeHomeScreen();renderAll(true);modal.close();}else status.textContent=result.error;}catch{status.textContent="No se pudo descargar la copia.";}finally{busy=false;}},"btn"));list.append(row);});}catch{status.textContent="No se pudo consultar la nube.";}finally{reload.disabled=false;}}
      refresh();
    });
  }
  const layout = () => state.project.document.layout;
  function changedLayout() { StrataV8.chrome(); pageDecorations(); scheduleProjectSave(); }
  function chooseLayout(key, choices) {
    u().dialog("Disposición en vivo", (body, modal) => {
      choices.forEach(([id, label]) => body.append(u().button(label, () => {
        layout()[key] = id;
        if (key === "preset") { const n = { normal: 2.5, narrow: 1.27, apa: 2.54, wide: 3.8 }[id]; layout().margins = { top: n, right: n, bottom: n, left: n }; }
        changedLayout(); modal.close();
      })));
    });
  }
  function pageDecorations() {
    const l = layout(); if (!l) return;
    document.querySelectorAll(".a4-page").forEach((p, i) => {
      p.classList.add("page-sheet"); p.dataset.watermark = l.watermark || ""; p.dataset.border = l.border || "none"; p.dataset.texture = l.texture || "none";
      if (l.color) {
        p.style.setProperty("background-color", l.color);
        const rgb = l.color.match(/[a-f0-9]{2}/gi)?.map(c => parseInt(c, 16)) || [255,255,255];
        const ink = rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114 > 150 ? "#202124" : "#eeeeef";
        p.style.setProperty("--page-text", ink); p.style.setProperty("--page-heading", ink);
      } else { p.style.removeProperty("background-color"); p.style.removeProperty("--page-text"); p.style.removeProperty("--page-heading"); }
      const editor = p.querySelector(".page-editor");
      if (editor) { editor.style.setProperty("--space-before", `${l.space_before || 0}pt`); editor.style.setProperty("--space-after", `${l.space_after ?? 9}pt`); }
      for (const [kind, content] of [["header", l.header], ["footer", [l.footer, l.page_numbers ? String(i + 1) : ""].filter(Boolean).join(" · ")]]) {
        let node = p.querySelector(`.editorial-${kind}`);
        if (!content) { node?.remove(); continue; }
        if (!node) { node = u().el("div", `editorial-${kind}`); node.contentEditable = "false"; p.append(node); }
        node.textContent = content;
      }
    });
    $("pages-stack").style.setProperty("--doc-line-height", l.line_height || state.config.editor.line_height || 1.75);
  }
  function spacing() {
    u().dialog("Espaciado del párrafo", (body, modal) => {
      const before = u().field("Antes (pt)", layout().space_before || 0, "number"), after = u().field("Después (pt)", layout().space_after ?? 9, "number");
      [before, after].forEach(f => { f.input.min = 0; f.input.max = 100; });
      body.append(before.wrap, after.wrap, u().button("Aplicar", () => { layout().space_before = Math.max(0, Math.min(100, +before.input.value)); layout().space_after = Math.max(0, Math.min(100, +after.input.value)); changedLayout(); modal.close(); }));
    });
  }
  function watermark() {
    u().dialog("Marca de agua", (body, modal) => {
      const f = u().field("Texto personalizado", layout().watermark || ""); body.append(f.wrap);
      for (const label of ["Borrador", "Confidencial", "Sin marca"]) body.append(u().button(label, () => { layout().watermark = label === "Sin marca" ? "" : label; changedLayout(); modal.close(); }));
      body.append(u().button("Aplicar texto", () => { layout().watermark = f.input.value.slice(0, 100); changedLayout(); modal.close(); }));
    });
  }
  function paperAppearance() {
    u().dialog("Papel", (body, modal) => {
      const c = u().field("Color de hoja", layout().color || "#ffffff", "color"), t = u().select("Textura", [["none", "Lisa"], ["lines", "Rayado tenue"], ["dots", "Puntos"]], layout().texture || "none");
      c.input.id='paper-color'; t.input.id='paper-texture';
      const apply=()=>{layout().color=c.input.value;layout().texture=t.input.value;changedLayout();};
      const presets=u().el('div','paper-presets');
      const paint=()=>{presets.replaceChildren();for(const preset of state.config.paper_presets||[])presets.append(u().button(preset.name,()=>{c.input.value=preset.color;t.input.value=preset.texture;apply();}));};
      const name=u().field('Nombre del papel','Mi papel');
      body.append(u().el('p','s-help','Se guarda con este proyecto. Los colores de la aplicación se cambian por separado en Personalización.'),c.wrap,t.wrap,u().button('Aplicar y conservar en este proyecto',()=>{apply();modal.close();},'btn primary'),name.wrap,u().button('Guardar tipo de papel',()=>{const label=name.input.value.trim().slice(0,80);if(!label)return;apply();state.config.paper_presets ||= [];const preset={name:label,color:c.input.value,texture:t.input.value};const old=state.config.paper_presets.find(p=>p.name===label);if(old)Object.assign(old,preset);else state.config.paper_presets.push(preset);scheduleConfigSave();paint();showToast('Tipo de papel guardado.');}),presets,u().button('Usar el papel del tema',()=>{delete layout().color;layout().texture='none';changedLayout();modal.close();}));paint();
    });
  }
  function headers() {
    u().dialog("Encabezado y pie de página", (body, modal) => {
      const h = u().field("Encabezado", layout().header || ""), f = u().field("Pie", layout().footer || "");
      body.append(h.wrap, f.wrap, u().button("Aplicar", () => { layout().header = h.input.value; layout().footer = f.input.value; changedLayout(); modal.close(); }));
    });
  }
  function apa() {
    Object.assign(layout(), { preset: "apa", margins: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 }, indent_cm: 1.27, line_height: 2 });
    state.config.editor.line_height = 2;
    document.querySelectorAll(".page-editor [style]").forEach(n => n.style.removeProperty("line-height"));
    syncDOMPagesToState(); changedLayout(); scheduleConfigSave();
  }
  function view(mode) { StrataPlanning.show(null); state.config.page.view_mode = mode; renderTopChrome(); renderPagesStack(); scheduleConfigSave(); }
  function changeCase() {
    const value = savedSelectionRange?.toString(); if (!value) return showToast("Selecciona texto primero.");
    u().dialog("Mayúsculas y minúsculas", (body, modal) => {
      for (const [label, text] of [["MAYÚSCULAS", value.toLocaleUpperCase("es")], ["minúsculas", value.toLocaleLowerCase("es")], ["Tipo oración", value[0].toLocaleUpperCase("es") + value.slice(1).toLocaleLowerCase("es")]]) body.append(u().button(label, () => { modal.close(); restoreSelection(true); document.execCommand("insertText", false, text); syncDOMPagesToState(); scheduleProjectSave(); modal.close(); }));
    });
  }
  function formatPainter() {
    if (!copiedFormat) {
      const range = savedSelectionRange || lastCaretRange; const node = range?.startContainer; const parent = node?.nodeType === 1 ? node : node?.parentElement;
      if (!parent?.closest(".page-editor")) return showToast("Selecciona el texto cuyo formato deseas copiar.");
      const cs = getComputedStyle(parent); copiedFormat = Object.fromEntries(["fontFamily", "fontSize", "fontWeight", "fontStyle", "textDecoration", "color", "backgroundColor"].map(k => [k, cs[k]]));
      showToast("Formato copiado. Selecciona el destino y vuelve a pulsar Copiar formato."); return;
    }
    if (!savedSelectionRange || savedSelectionRange.collapsed) return showToast("Selecciona el texto de destino.");
    restoreSelection(true); const span = u().el("span"); Object.assign(span.style, copiedFormat); span.append(getSelection().getRangeAt(0).cloneContents()); insert(span.outerHTML); copiedFormat = null;
  }
  let speaking = false;
  async function speech() { const r = await apiPost("/api/speech", { stop: speaking, text: savedSelectionRange?.toString() || getActiveRichEditor()?.innerText || "" }); if (!r.ok) showToast(r.error); else { speaking = !speaking; showToast(speaking ? "Lectura iniciada. Pulsa otra vez para detener." : "Lectura detenida."); } }
  function replaceDialog() {
    u().dialog("Buscar y reemplazar", (body) => {
      const find = u().field("Buscar"), replacement = u().field("Reemplazar por"), result = u().el("p", "v8-message");
      function replace(all) {
        const needle = find.input.value; if (!needle) return;
        const editor = getActiveRichEditor() || document.querySelector(".page-editor"); if (!editor) return;
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT), matches = []; let node;
        while ((node = walker.nextNode())) { if (node.parentElement.closest('[contenteditable="false"]')) continue; let at = -1; while ((at = node.data.indexOf(needle, at + 1)) >= 0) matches.push({ node, at }); }
        const targets = all ? matches : matches.slice(0, 1);
        for (const {node, at} of targets.reverse()) { const range = document.createRange(); range.setStart(node, at); range.setEnd(node, at + needle.length); editor.focus(); getSelection().removeAllRanges(); getSelection().addRange(range); document.execCommand("insertText", false, replacement.input.value); }
        syncDOMPagesToState(); scheduleProjectSave(); result.textContent = `${targets.length} reemplazo(s).`;
      }
      body.append(find.wrap, replacement.wrap, u().button("Buscar siguiente", () => { const ed = getActiveRichEditor() || document.querySelector(".page-editor"); ed?.focus(); window.find(find.input.value, false, false, true); }), u().button("Reemplazar siguiente", () => replace(false)), u().button("Reemplazar todos", () => replace(true)), result);
    }, false);
  }
  function cover() {
    u().dialog("Portada editorial", (body, modal) => {
      const title = u().field("Título", state.project.document.title), subtitle = u().field("Subtítulo"), author = u().field("Autor", account?.name || "");
      body.append(title.wrap, subtitle.wrap, author.wrap, u().button("Insertar portada", () => { const section = u().el("section", "editorial-cover"); section.append(u().el("h1", "", title.input.value), u().el("p", "", subtitle.input.value), u().el("p", "", author.input.value)); section.style.cssText = "text-align:center;min-height:650px;display:flex;flex-direction:column;justify-content:center;break-after:page"; insert(section.outerHTML + "<p><br></p>"); modal.close(); }));
    });
  }
  function tablePicker() {
    u().dialog("Insertar tabla", (body, modal) => {
      const hint = u().el("p", "", "Elige filas × columnas"), grid = u().el("div", "table-picker");
      for (let r = 1; r <= 8; r++) for (let c = 1; c <= 8; c++) { const b = u().button(`${r} × ${c}`, () => { table(Array.from({length:c}, (_, i) => `Columna ${i + 1}`), Array.from({length:r}, () => Array(c).fill(""))); modal.close(); }, "table-picker-cell"); b.setAttribute("aria-label", `${r} filas por ${c} columnas`); b.onmouseenter = () => { hint.textContent = `${r} filas × ${c} columnas`; [...grid.children].forEach((cell, i) => cell.classList.toggle("on", Math.floor(i / 8) < r && i % 8 < c)); }; grid.append(b); }
      body.append(hint, grid);
    });
  }
  function chart() {
    textDialog("Gráfico de barras", "Una fila por dato: etiqueta; valor", value => {
      const rows = value.split("\n").map(line => { const at = line.lastIndexOf(";"); return [line.slice(0, at).trim(), Number(line.slice(at + 1).replace(",", "."))]; }).filter(([label, n]) => label && Number.isFinite(n) && n >= 0);
      if (!rows.length) return showToast("Escribe datos como: Lecturas; 12");
      const max = Math.max(1, ...rows.map(r => r[1])), figure = u().el("figure", "data-chart");
      figure.contentEditable = "false"; figure.append(u().el("figcaption", "", "Comparación de datos"));
      rows.forEach(([label, n]) => { const row = u().el("div", "chart-row"), bar = u().el("span", "chart-bar"); row.style.cssText = "display:flex;align-items:center;gap:8px;margin:8px 0"; bar.style.cssText = `display:inline-block;background:#647da4;height:18px;width:${Math.round(n/max*65)}%`; row.append(u().el("span", "", label), bar, u().el("b", "", String(n))); figure.append(row); }); insert(figure.outerHTML + "<p><br></p>");
    }, "Lecturas; 12\nFuentes; 8\nCapítulos; 4");
  }
  function callout() {
    u().dialog("Cuadro destacado", (body, modal) => {
      const type = u().select("Tipo", ["Nota", "Advertencia", "Hipótesis", "Definición"].map(n => [n, n]), "Nota"), text = u().field("Contenido", "", "textarea");
      body.append(type.wrap, text.wrap, u().button("Insertar", () => { const node = u().el("aside", "editorial-callout"); node.style.cssText = "border-left:3px solid #7796bd;background:#7796bd18;padding:14px;margin:16px 0"; node.append(u().el("strong", "", type.input.value), u().el("p", "", text.input.value)); insert(node.outerHTML + "<p><br></p>"); modal.close(); }));
    });
  }
  function symbols() { u().dialog("Símbolos especiales", (body, modal) => ["—", "«", "»", "§", "†", "‡", "…", "©", "±", "×"].forEach(s => body.append(u().button(s, () => { const n = u().el("span", "", s); insert(n.outerHTML); modal.close(); })))); }
  function citation() { if (!state.project.research.citations.length) return StrataResearch.library(); u().dialog("Insertar cita", (body, modal) => state.project.research.citations.forEach(c => body.append(u().button(`${c.author} (${c.year || "s. f."}) · ${c.title}`, () => { modal.close(); StrataResearch.quoteDialog(c); })))); }
  function sources() {
    const items = [...state.project.research.citations];
    state.project.fichas.filter(f => /fuente|datos?|papers?|libros?/i.test(f.category || "")).forEach(f => {
      const props = fichaProps(f), val = re => props.find(p => re.test(p.key))?.value || "";
      const c = { id: f.id, author: val(/autor|fuente/i) || f.name, year: val(/año|fecha/i), title: val(/título/i) || f.name, publisher: val(/editorial|revista|publicación/i), stance: val(/postura|hipótesis/i), findings: val(/hallazgo|resultado/i) || f.description };
      if (!items.some(x => x.title === c.title && x.author === c.author)) items.push(c);
    }); return items;
  }
  function bibliography() {
    const entries = sources().sort((a, b) => (a.author || a.title).localeCompare(b.author || b.title, "es"));
    if (!entries.length) { StrataResearch.library(() => bibliography()); return; }
    syncDOMPagesToState(); const section = u().el("section", "auto-bibliography"); section.dataset.generated = "bibliography"; section.append(u().el("h2", "", "Referencias Bibliográficas"));
    entries.forEach(c => { const p = u().el("p", "bibliography-entry"); p.style.cssText = "padding-left:2em;text-indent:-2em;margin-left:0"; p.append(document.createTextNode(`${c.author || c.title} (${c.year || "s. f."}). `), u().el("em", "", c.title), document.createTextNode(`.${c.publisher ? " " + c.publisher.replace(/\.$/, "") + "." : ""}`)); section.append(p); });
    const sheets = state.project.document.sheets;
    sheets.forEach(s => s.pages = s.pages.map(raw => { const node = u().el("div"); node.innerHTML = raw; node.querySelectorAll(".auto-bibliography").forEach(n => n.remove()); return node.innerHTML; }));
    const last = sheets.at(-1); last.pages[last.pages.length - 1] += section.outerHTML; renderPagesStack(); scheduleProjectSave(); showToast("Referencias Bibliográficas actualizadas en formato APA 7.");
  }
  function literature() { const rows = sources(); if (!rows.length) return StrataResearch.library(); table(["Autor", "Año", "Postura", "Hallazgos"], rows.map(c => [c.author, c.year, c.stance || "Por analizar", c.findings || c.title])); }
  function extractor() {
    const selection = savedSelectionRange?.toString() || "";
    u().dialog("Extractor de citas y datos", (body, modal) => {
      const content = u().field("Texto seleccionado / extracto", selection, "textarea"), category = u().select("Guardar como", [["Extractos", "Extracto textual"], ["Datos", "Dato estadístico"]], "Extractos"), name = u().field("Nombre de la ficha");
      body.append(name.wrap, category.wrap, content.wrap, u().button("Guardar en la Wiki", () => { if (!content.input.value.trim()) return; state.project.fichas.push({ id: uid("ficha"), name: name.input.value.trim() || content.input.value.slice(0, 48), category: category.input.value, description: content.input.value, color: "#6889b5", properties: [], image: "" }); wikiMode = "research"; renderWikiPanel(); scheduleProjectSave(); modal.close(); }));
    });
  }
  function clearAudit() { document.querySelectorAll(".academic-review").forEach(n => { n.classList.remove("academic-review"); n.removeAttribute("title"); }); }
  function audit() {
    clearAudit(); let count = 0;
    document.querySelectorAll(".page-editor p").forEach(p => { if (p.closest(".auto-bibliography,.footnotes-section")) return; const t = p.textContent; if (t.length > 35 && !p.querySelector(".saved-citation,.footnote-ref") && !/\([^)]*\d{4}[^)]*\)/.test(t) && /\d+\s*%|siempre|nunca|todos|demuestra|estudios|según|evidente|sin duda|la mayoría/i.test(t)) { p.classList.add("academic-review"); p.title = "Comprueba la precisión de esta afirmación y añade una fuente verificable."; count++; } });
    showToast(`${count} afirmación(es) para revisar. La detección es orientativa.`);
  }
  function matchesWiki(f) {
    if (wikiMode === "all") return true;
    const custom = state.project.categories.find(c => c.name === f.category);
    const narrative = custom?.mode ? custom.mode === "narrative" : /personaje|lugar|lugares|objeto|facción|facciones|evento/i.test(f.category || "");
    return wikiMode === "narrative" ? narrative : !narrative;
  }
  function wiki() {
    const mode = u().select("Enfoque de la Wiki", [["all", "Toda la Wiki"], ["narrative", "Narrativo / Creación"], ["research", "Investigación / Estudio"]], wikiMode);
    mode.wrap.classList.add("wiki-mode"); mode.input.id = "wiki-mode"; $("ficha-cats").before(mode.wrap);
    mode.input.onchange = () => { wikiMode = mode.input.value; state.ui.fichaCategory = "ALL"; renderWikiPanel(); };
    const inspector = u().el("section", "wiki-inspector"); inspector.id = "wiki-inspector"; inspector.hidden = true; $("ficha-list").after(inspector);
  }
  function inspectFicha(f) {
    const panel = $("wiki-inspector"); panel.replaceChildren(); panel.hidden = false; panel.dataset.fichaId = f.id;
    const head = u().el("header"); head.append(u().el("strong", "", f.name), u().button("✕", () => panel.hidden = true, "icon-btn"));
    panel.append(head, u().el("small", "", f.category), u().el("p", "", f.description || "Sin descripción"));
    visibleFichaProps(f).forEach(p => panel.append(u().el("p", "", `${String(p.key || "").replace(/[:：\s]+$/, "").trim()}: ${p.value}`)));
    panel.append(u().button("Editar ficha", () => openFichaModal(f.id), "btn"));
    document.querySelectorAll(".ficha-row").forEach(n => n.classList.toggle("selected", n.dataset.fichaId === f.id));
  }
  function layerForm(layer) {
    if (!$("layer-mode")) {
      const mode = u().select("Modo funcional", modes, "margin"), cat = u().field("Categoría visual", "General"); mode.input.id = "layer-mode"; cat.input.id = "layer-category";
      $("layer-desc").after(mode.wrap, cat.wrap);
    }
    $("layer-mode").value = layer?.mode || "margin"; $("layer-category").value = layer?.category || "General";
  }
  function layerCategories() { const layer = getActiveLayer(); if (!layer || layer.is_base) return showToast("Selecciona una capa de trabajo."); textDialog("Categoría de capa", "Nombre del grupo visual", value => { layer.category = value.trim() || "General"; renderLayersPanel(); scheduleProjectSave(); }, layer.category || "General"); }
  function mergeLayer(id) {
    const layer = getSheetLayers().find(l => l.id === id); if (!layer || layer.is_base) return;
    for (const note of layer.annotations || []) {
      if (!note.text?.trim()) continue;
      const p = u().el("p", "", note.text); p.dataset.pid = uid("p");
      const anchor = [...document.querySelectorAll(".page-editor [data-pid]")].find(n => n.dataset.pid === note.anchor_pid);
      if (anchor) anchor.after(p); else document.querySelector(".page-editor")?.append(p);
    }
    const overlay = u().el("div"); overlay.innerHTML = layer.overlay_html || "";
    if (overlay.textContent.trim()) document.querySelector(".page-editor")?.append(...overlay.childNodes);
    syncDOMPagesToState(); StrataV8.deleteLayer(id);
  }
  function emptyLayer(id) {
    const layer = getSheetLayers().find(l => l.id === id); if (!layer || layer.is_base) return showToast("Selecciona una capa de trabajo.");
    u().dialog("Vaciar capa", (body, modal) => { body.append(u().el("p", "", "Se quitarán sus borradores, notas y marcas. El texto marcado como evidencia se conserva."), u().button("Vaciar contenido", () => { document.querySelectorAll(".page-editor [data-layer-id]").forEach(n => { if (n.dataset.layerId !== id) return; if (n.classList.contains("layer-block")) n.remove(); else n.replaceWith(...n.childNodes); }); layer.annotations = []; layer.overlay_html = "<p><br></p>"; syncDOMPagesToState(); renderAll(false); scheduleProjectSave(); modal.close(); }, "btn danger")); });
  }
  function useLayer() {
    const layer = getActiveLayer(); if (!layer || layer.is_base) return showToast("Selecciona una capa de trabajo.");
    const mode = layer.mode || "margin";
    if (mode === "margin") return createMarginNoteAtSelection();
    if (mode === "draft") { const p = u().el("p", "layer-block"); p.dataset.layerId = layer.id; p.dataset.pid = uid("p"); p.append(document.createElement("br")); insert(p.outerHTML); }
    else { if (!savedSelectionRange || savedSelectionRange.collapsed) return showToast("Selecciona la frase que quieres marcar como evidencia."); const span = u().el("span", "layer-inline"); span.dataset.layerId = layer.id; span.append(savedSelectionRange.cloneContents()); insert(span.outerHTML); }
    StrataV8.applyLayers(); renderLayersPanel();
  }
  function layerPanel() {
    const list = $("layer-list"); if (!list) return;
    let previous = "";
    const layers = getSheetLayers();
    // Agrupar sólo en la presentación. El orden guardado y el arrastre se conservan.
    const rows = [...list.querySelectorAll(".layer-row")]; rows.sort((a, b) => { const x = layers.find(l => l.id === a.dataset.layerId), y = layers.find(l => l.id === b.dataset.layerId); return x.is_base ? -1 : y.is_base ? 1 : (x.category || "General").localeCompare(y.category || "General", "es"); });
    rows.forEach(row => {
      const layer = layers.find(l => l.id === row.dataset.layerId); if (!layer) return;
      const category = layer.is_base ? "Texto final" : layer.category || "General";
      if (category !== previous) list.append(u().el("div", "layer-category-heading", category)); previous = category; list.append(row);
      const desc = row.querySelector(".lr-desc"); if (desc && !layer.is_base) desc.textContent = modes.find(m => m[0] === (layer.mode || "margin"))?.[1] || "Notas al margen";
      row.addEventListener("contextmenu", e => {
        e.preventDefault(); e.stopPropagation();
        openCustomContextMenu(e.clientX, e.clientY, [
          { label: "Editar / cambiar tipo y color", action: () => openLayerModal(layer.id), disabled: layer.is_base },
          { label: "Duplicar capa", disabled: layer.is_base, action: () => duplicateLayer(layer) },
          { label: "Fusionar con texto final", disabled: layer.is_base, action: () => mergeLayer(layer.id) },
          { label: "Vaciar", disabled: layer.is_base, action: () => emptyLayer(layer.id) },
          { label: "Eliminar", disabled: layer.is_base, action: () => StrataV8.deleteLayer(layer.id) }
        ]);
      });
    });
    const active = getActiveLayer();
    if (active?.mode === "evidence") {
      const summary = u().el("section", "evidence-summary"); summary.append(u().el("strong", "", "Evidencias recopiladas"));
      let count = 0;
      document.querySelectorAll(".page-editor .layer-inline").forEach(n => {
        if (n.dataset.layerId !== active.id) return;
        const item = u().button(n.textContent, () => {
          if (!n.isConnected) return;
          if (state.ui.planningView && !state.ui.timelineSplit) StrataPlanning.show(null);
          n.scrollIntoView({ behavior: "smooth", block: "center" });
          n.classList.remove("evidence-flash"); void n.offsetWidth; n.classList.add("evidence-flash");
          setTimeout(() => n.classList.remove("evidence-flash"), 1800);
        }, "evidence-jump"); item.title = "Ir al fragmento en el manuscrito"; summary.append(item); count++;
      });
      if (!count) summary.append(u().el("p", "", "Selecciona una frase y pulsa Usar capa activa para recopilarla."));
      list.append(summary);
    }
    decorate();
  }
  function duplicateLayer(layer) {
    const copy = JSON.parse(JSON.stringify(layer)); copy.id = uid("layer"); copy.name += " (copia)"; copy.order = Math.max(...getSheetLayers().map(l => l.order || 0)) + 1;
    copy.annotations.forEach(a => a.id = uid("note")); getSheetLayers().push(copy);
    document.querySelectorAll(".page-editor .layer-inline, .page-editor .layer-block").forEach(n => { if (n.dataset.layerId !== layer.id) return; if (n.classList.contains("layer-inline")) {
        const wrapper = n.cloneNode(false); wrapper.dataset.layerId = copy.id; n.replaceWith(wrapper); wrapper.append(n);
      } else {
        const clone = n.cloneNode(true); clone.dataset.layerId = copy.id; if (clone.dataset.pid) clone.dataset.pid = uid("p"); n.after(clone);
      } });
    syncDOMPagesToState(); setActiveLayerId(copy.id); renderAll(false); scheduleProjectSave();
  }
  function wordCount() { return [...document.querySelectorAll(".page-editor")].reduce((n, ed) => n + (ed.innerText.trim().match(/\S+/g) || []).length, 0); }
  function wordGoal() { textDialog("Meta de palabras de la sesión", "Palabras nuevas", value => { state.ui.wordGoal = Math.max(1, Math.min(100000, parseInt(value) || 500)); wordBaseline = wordCount(); updateGoal(); }, String(state.ui.wordGoal || 500)); }
  function updateGoal() { let b = $("session-goal"); if (!state.ui.wordGoal) return; if (!b) { b = u().el("span", "session-goal"); b.id = "session-goal"; document.getElementById("bottom-bar")?.insertBefore(b, document.getElementById("session-clock")); } b.textContent = `Meta: ${Math.max(0, wordCount() - wordBaseline)} / ${state.ui.wordGoal}`; }
  function settings() {
    const cards = $("theme-cards");
    [["oxford", "Azul Noche Académico (Oxford)"], ["library", "Verde Biblioteca Clásica"], ["ink", "Alto Contraste Tinta"]].forEach(([id, name]) => {
      const b = u().button(name, () => { state.config.theme = id; state.config.custom_theme = {}; renderAll(false); syncSettingsModalUI(); scheduleConfigSave(); }, "theme-card"); b.dataset.themeChoice = id; b.dataset.previewTheme = id; cards.append(b);
    });
    const editor = document.querySelector('.stab[data-tab="editor"]');
    editor.append(u().button("Diccionario personalizado", () => textDialog("Diccionario personalizado", "Una palabra por línea", value => { state.config.personal_dictionary = [...new Set(value.split("\n").map(s => s.trim()).filter(Boolean))]; scheduleConfigSave(); StrataV8.editors(); }, (state.config.personal_dictionary || []).join("\n")), "btn"));
    document.querySelector('.stab[data-tab="page"]').append(u().button("Formato del proyecto", () => StrataV8.pageDialog(), "btn"), u().button("Usar esta disposición por defecto", () => { state.config.default_layout = JSON.parse(JSON.stringify(layout())); scheduleConfigSave(); showToast("Disposición guardada para proyectos nuevos en blanco."); }, "btn"));
    document.querySelector('.stab[data-tab="panels"]').append(u().button("Personalizar / intercambiar paneles", () => StrataV8.themeDialog(), "btn"));
    const saving = document.querySelector('.stab[data-tab="saving"]');
    const updateSection=u().el("section","settings-update-section");
    saving.append(updateSection);
    updateSection.append(u().el("h3", "", "Actualización rápida"), u().el("p", "s-help", "Selecciona la carpeta del código actualizado. Se conservan tus proyectos y preferencias. Reinicia Strata después de aplicarla."), u().button("Aplicar Actualización Rápida", async () => { if (!await confirmPendingChanges()) return; const r = await apiPost("/api/update", {}); if (!r.cancelled) showToast(r.ok ? `${r.files} archivos actualizados. Cierra y vuelve a abrir Strata.` : r.error); }, "btn"));
  }
  function tooltips() {
    const card = u().el("div", "strata-tooltip"); card.id = "strata-tooltip"; card.setAttribute("role", "tooltip"); card.hidden = true; document.body.append(card); let timer, target;
    const hide = () => { clearTimeout(timer); card.hidden = true; target?.removeAttribute("aria-describedby"); target = null; };
    document.addEventListener("pointerover", e => {
      const b = e.target.closest("button"); if (!b || b === target || e.buttons || b.disabled) return; hide(); target = b;
      const title = b.dataset.tip || b.title || b.getAttribute("aria-label") || b.textContent.trim(); if (!title) return;
      b.dataset.tip ||= title; b.removeAttribute("title");
      if (!b.getAttribute("aria-label")) b.setAttribute("aria-label", title);
      timer = setTimeout(() => { if (!b.isConnected || target !== b) return; card.replaceChildren(u().el("strong", "", title), u().el("p", "", b.dataset.help || `Abre ${title.toLocaleLowerCase("es")} y elige la opción que quieres aplicar.`)); if (b.dataset.shortcut) card.append(u().el("kbd", "", b.dataset.shortcut)); b.setAttribute("aria-describedby", card.id); card.hidden = false; const r = b.getBoundingClientRect(); card.style.left = `${Math.max(8, Math.min(r.left, innerWidth - card.offsetWidth - 8))}px`; card.style.top = `${r.bottom + card.offsetHeight + 12 < innerHeight ? r.bottom + 8 : Math.max(8, r.top - card.offsetHeight - 8)}px`; }, 400);
    });
    document.addEventListener("pointerout", e => { if (target && !target.contains(e.relatedTarget)) hide(); });
    document.addEventListener("pointerdown", hide); document.addEventListener("keydown", hide); window.addEventListener("scroll", hide, true);
    window.addEventListener("blur",hide); window.addEventListener("resize",hide);
    document.documentElement.addEventListener("pointerleave",hide);
    document.addEventListener("visibilitychange",()=>{if(document.hidden)hide();});
  }
  function init() {
    titlebar(); ribbon(); wiki(); settings(); tooltips();
    const oldChrome = renderTopChrome; renderTopChrome = function () { oldChrome(); chrome(); };
    const oldRender = renderLayersPanel; renderLayersPanel = function () { oldRender(); layerPanel(); };
    const oldWiki = renderWikiPanel;
    renderWikiPanel = function () { oldWiki(); const panel = $("wiki-inspector"); if (panel && !state.project.fichas.some(f => f.id === panel.dataset.fichaId)) panel.hidden = true; };
    const oldPages = renderPagesStack; renderPagesStack = function (...args) { const r = oldPages(...args); pageDecorations(); return r; };
    const oldDirty = updateDirtyIndicator; updateDirtyIndicator = function () { oldDirty(); chrome(true); };
    const oldNew = createProjectFromTemplate;
    createProjectFromTemplate = async function (...args) {
      const created = await oldNew(...args);
      if (!created) return false;
      if (args[0] === "blanco" && state.config.default_layout) {
        Object.assign(layout(), JSON.parse(JSON.stringify(state.config.default_layout))); changedLayout();
      }
      await new Promise(requestAnimationFrame);
      const editor = document.querySelector(".page-editor");
      if (editor) { editor.focus(); const range = document.createRange(); range.selectNodeContents(editor); range.collapse(true); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); lastCaretRange = range.cloneRange(); savedSelectionRange = null; }
      return true;
    };
    const oldAnchor = anchorNewNoteToBlock;
    anchorNewNoteToBlock = function (id, block, quote) {
      let layer = getSheetLayers().find(l => l.id === id);
      if (!layer || layer.is_base) {
        layer = getSheetLayers().find(l => !l.is_base && (!l.mode || l.mode === "margin"));
        if (!layer) { layer = { id: uid("layer"), name:"Notas al margen", description:"Anotaciones del capítulo", color:"#9976bc", mode:"margin", category:"Notas", visible:true, opacity:100, is_base:false, order:Math.max(...getSheetLayers().map(l=>l.order || 0))+1, annotations:[], overlay_html:"" }; getSheetLayers().push(layer); }
        id = layer.id;
      }
      if (!["draft", "evidence"].includes(layer.mode)) return oldAnchor(id, block, quote);
      setActiveLayerId(id); layer.visible = true;
      if (layer.mode === "draft") { const p = u().el("p", "layer-block"); p.dataset.layerId = id; p.dataset.pid = uid("p"); p.append(document.createElement("br")); block.after(p); const range = document.createRange(); range.selectNodeContents(p); range.collapse(true); getSelection().removeAllRanges(); getSelection().addRange(range); lastCaretRange = range.cloneRange(); }
      else { const mark = u().el("span", "layer-inline"); mark.dataset.layerId = id; mark.append(...block.childNodes); block.append(mark); }
      StrataV8.applyLayers(); syncDOMPagesToState(); renderLayersPanel(); scheduleProjectSave();
    };
    const oldNote = createMarginNoteAtSelection;
    createMarginNoteAtSelection = function () { if (["draft", "evidence"].includes(getActiveLayer()?.mode)) return useLayer(); return oldNote(); };
    StrataResearch.bibliography = bibliography;
    document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h" && !e.target.closest("dialog, .modal")) { e.preventDefault(); e.stopImmediatePropagation(); if(window.StrataSearch)StrataSearch.open(true);else replaceDialog(); } }, true);
    document.addEventListener("input", e => { if (e.target.closest(".page-editor")) updateGoal(); });
    const oldStrip = stripEphemeralHtml; stripEphemeralHtml = raw => { const n = u().el("div"); n.innerHTML = raw; n.querySelectorAll(".academic-review").forEach(p => { p.classList.remove("academic-review"); p.removeAttribute("title"); }); return oldStrip(n.innerHTML); };
    ready = true; window.StrataEditorial?.init(); chrome(); startup();
  }
  async function refreshAccount(){const r=await apiPost('/api/auth/status',{});if(r.ok){account=r.user;if(r.capabilities)authCapabilities=r.capabilities;chrome();}return r;}
  return { get ready() { return ready; }, chrome, init, matchesWiki, inspectFicha, layerForm, bibliography, sources, useLayer, apa, tablePicker, replaceDialog, pageDecorations,refreshAccount, paperAppearance };
})();
