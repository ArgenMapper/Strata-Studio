/**
 * Strata 9.5 — Lógica modular del entorno de escritura por capas
 * Conectado a main.py (QWebChannel + servidor HTTP local) y persistencia en config_usuario.json.
 */

/* ==========================================================================
   1. ICONOS VECTORIALES LUCIDE (100% SVG, CERO EMOJIS)
   ========================================================================== */
const ICONS = {
  fullscreen: `<svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/></svg>`,
  canvas: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7 16 3-1 7-7-2-2-7 7-1 3Z"/></svg>`,
  network: `<svg viewBox="0 0 24 24"><circle cx="5" cy="6" r="3"/><circle cx="19" cy="6" r="3"/><circle cx="12" cy="19" r="3"/><path d="M8 6h8M6.5 9 10.5 16M17.5 9 13.5 16"/></svg>`,
  timeline: `<svg viewBox="0 0 24 24"><path d="M3 12h18M6 4v16M12 4v16M18 4v16"/><rect x="3" y="5" width="8" height="4" rx="1"/><rect x="13" y="15" width="8" height="4" rx="1"/></svg>`,
  undo: `<svg viewBox="0 0 24 24"><path d="M3 6h11a7 7 0 0 1 0 14"/><path d="m7 2-4 4 4 4"/></svg>`,
  redo: `<svg viewBox="0 0 24 24"><path d="M21 6H10a7 7 0 0 0 0 14"/><path d="m17 2 4 4-4 4"/></svg>`,
  layers: `<svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  filePlus: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
  folderOpen: `<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  save: `<svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  archive: `<svg viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
  printer: `<svg viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
  fileText: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
  x: `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  settings: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  book: `<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  inbox: `<svg viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
  toolbar: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  focus: `<svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`,
  minimize: `<svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  maximize: `<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1.5"/></svg>`,
  restore: `<svg viewBox="0 0 24 24"><rect x="5" y="7" width="12" height="12" rx="1"/><path d="M9 7V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2"/></svg>`,
  clipboard: `<svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>`,
  scissors: `<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`,
  copy: `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  clipboardType: `<svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><polyline points="9 13 9 11 15 11 15 13"/><line x1="12" y1="11" x2="12" y2="17"/></svg>`,
  chevronDown: `<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>`,
  chevronUp: `<svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>`,
  aUp: `<svg viewBox="0 0 24 24"><path d="M3.5 19L8 7l4.5 12"/><line x1="5" y1="15" x2="11" y2="15"/><polyline points="15 10 18 7 21 10"/><line x1="18" y1="7" x2="18" y2="15"/></svg>`,
  aDown: `<svg viewBox="0 0 24 24"><path d="M3.5 19L8 7l4.5 12"/><line x1="5" y1="15" x2="11" y2="15"/><polyline points="15 12 18 15 21 12"/><line x1="18" y1="7" x2="18" y2="15"/></svg>`,
  eraser: `<svg viewBox="0 0 24 24"><path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L13.4 2.8c.8-.8 2-.8 2.8 0L21 7.6c.8.8.8 2 0 2.8L11 20"/></svg>`,
  bold: `<svg viewBox="0 0 24 24"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>`,
  italic: `<svg viewBox="0 0 24 24"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
  underline: `<svg viewBox="0 0 24 24"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>`,
  strike: `<svg viewBox="0 0 24 24"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>`,
  superscript: `<svg viewBox="0 0 24 24"><path d="m4 7 8 8"/><path d="m12 7-8 8"/><path d="M20 11h-4c0-1.5.44-2 1.5-2.5S20 7.33 20 6c0-.47-.17-.93-.48-1.29a2.11 2.11 0 0 0-2.61-.44c-.42.24-.74.62-.9 1.07"/></svg>`,
  subscript: `<svg viewBox="0 0 24 24"><path d="m4 5 8 8"/><path d="m12 5-8 8"/><path d="M20 19h-4c0-1.5.44-2 1.5-2.5S20 15.33 20 14c0-.47-.17-.93-.48-1.29a2.11 2.11 0 0 0-2.61-.44c-.42.24-.74.62-.9 1.07"/></svg>`,
  baseline: `<svg viewBox="0 0 24 24"><path d="M4 20h16"/><path d="m6 16 6-12 6 12"/><path d="M8 12h8"/></svg>`,
  highlighter: `<svg viewBox="0 0 24 24"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>`,
  list: `<svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  listOrdered: `<svg viewBox="0 0 24 24"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,
  outdent: `<svg viewBox="0 0 24 24"><polyline points="7 8 3 12 7 16"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="18" x2="11" y2="18"/></svg>`,
  indent: `<svg viewBox="0 0 24 24"><polyline points="3 8 7 12 3 16"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="18" x2="11" y2="18"/></svg>`,
  alignLeft: `<svg viewBox="0 0 24 24"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,
  alignCenter: `<svg viewBox="0 0 24 24"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>`,
  alignRight: `<svg viewBox="0 0 24 24"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>`,
  alignJustify: `<svg viewBox="0 0 24 24"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>`,
  quote: `<svg viewBox="0 0 24 24"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>`,
  image: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  divider: `<svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="9" y2="12"/><polygon points="12 9 15 12 12 15 9 12 12 9"/><line x1="15" y1="12" x2="21" y2="12"/></svg>`,
  pageBreak: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v6h16V8z"/><path d="M4 14v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6H4z"/><line x1="2" y1="12" x2="22" y2="12" stroke-dasharray="3 3"/></svg>`,
  messagePlus: `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="7" x2="12" y2="13"/><line x1="9" y1="10" x2="15" y2="10"/></svg>`,
  minus: `<svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  plus: `<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  scroll: `<svg viewBox="0 0 24 24"><path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/></svg>`,
  search: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  grip: `<svg viewBox="0 0 24 24"><circle cx="9" cy="5" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="9" cy="19" r="1.2"/><circle cx="15" cy="5" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="15" cy="19" r="1.2"/></svg>`,
  trash: `<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  palette: `<svg viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.56-2.5 5.56-5.56C21.96 6.01 17.46 2 12 2z"/></svg>`,
  type: `<svg viewBox="0 0 24 24"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
  wand: `<svg viewBox="0 0 24 24"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h0"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>`,
  panels: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
  keyboard: `<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>`,
  eyeOpen: `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  edit: `<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  columns: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`,
  reply: `<svg viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>`,
  duplicate: `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  xray: `<svg viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><path d="M7 12s2.5-4 5-4 5 4 5 4-2.5 4-5 4-5-4-5-4z"/></svg>`,
  home: `<svg viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  table: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
  bookmark: `<svg viewBox="0 0 24 24"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
  sparkles: `<svg viewBox="0 0 24 24"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/><path d="M5 3v4"/><path d="M3 5h4"/></svg>`,
  sliders: `<svg viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`,
  moreHorizontal: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>`,
  pin: `<svg viewBox="0 0 24 24"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`
};

function injectIcons(root = document) {
  root.querySelectorAll(".ic[data-i]").forEach((el) => {
    const name = el.dataset.i;
    if (ICONS[name]) el.innerHTML = ICONS[name];
  });
}

/* ==========================================================================
   2. CONSTANTES Y ESTADO GLOBAL
   ========================================================================== */
const FONTS = [
  { label: "Georgia (Literaria)", value: "Georgia" },
  { label: "Merriweather", value: "Merriweather" },
  { label: "Garamond", value: "Garamond" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Palatino Linotype", value: "Palatino Linotype" },
  { label: "Segoe UI Variable", value: "Segoe UI Variable Text" },
  { label: "Inter / Sans", value: "Inter" },
  { label: "Arial", value: "Arial" },
  { label: "Courier Prime", value: "Courier New" },
  { label: "Consolas (Mono)", value: "Consolas" }
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 60];

const PALETTE_COLORS = [
  "#6889B5", "#529E78", "#C98F45", "#B86273", "#8B6FC0",
  "#4EA8B4", "#D4724E", "#7C9860", "#C4A24E", "#9E788F",
  "#E4E4E7", "#1F1F23", "#EF4444", "#F59E0B", "#10B981"
];

const HIGHLIGHT_COLORS = [
  "rgba(250, 204, 21, 0.35)", "rgba(74, 222, 128, 0.32)", "rgba(96, 165, 250, 0.35)",
  "rgba(244, 114, 182, 0.35)", "rgba(192, 132, 252, 0.35)", "rgba(251, 146, 60, 0.35)",
  "rgba(45, 212, 191, 0.32)", "rgba(248, 113, 113, 0.35)", "rgba(163, 230, 53, 0.32)",
  "rgba(201, 143, 69, 0.35)"
];

const SHORTCUT_LABELS = {
  save: "Guardar proyecto",
  save_as: "Guardar proyecto como…",
  open: "Abrir proyecto",
  new: "Nuevo proyecto",
  export_pdf: "Exportar a PDF",
  paste_plain: "Pegar sin formato",
  focus: "Alternar Modo Foco",
  toggle_wiki: "Mostrar / Ocultar Wiki",
  toggle_layers: "Mostrar / Ocultar Capas",
  toggle_scraps: "Mostrar / Ocultar Recortes",
  toggle_toolbar: "Mostrar / Ocultar Herramientas",
  add_note: "Anclar nota de capa al párrafo",
  new_ficha: "Nueva ficha en Wiki",
  send_scrap: "Mandar selección a Recortes",
  scene_break: "Insertar separador de escena",
  zoom_in: "Acercar hoja (Zoom +)",
  zoom_out: "Alejar hoja (Zoom -)",
  settings: "Abrir Ajustes"
};

const DEFAULT_SHORTCUTS = {
  save: "Ctrl+S",
  save_as: "Ctrl+Shift+S",
  open: "Ctrl+O",
  new: "Ctrl+N",
  export_pdf: "Ctrl+P",
  paste_plain: "Ctrl+Shift+V",
  focus: "F11",
  toggle_wiki: "Ctrl+1",
  toggle_layers: "Ctrl+2",
  toggle_scraps: "Ctrl+3",
  toggle_toolbar: "Ctrl+4",
  add_note: "Ctrl+Shift+M",
  new_ficha: "Ctrl+Shift+F",
  send_scrap: "Ctrl+Shift+R",
  scene_break: "Ctrl+Shift+H",
  zoom_in: "Ctrl+=",
  zoom_out: "Ctrl+-",
  settings: "Ctrl+,"
};

const DEFAULT_TEMPLATES_CATALOG = [
  {
    id: "blanco",
    name: "Lienzo en Blanco",
    badge: "Rápido",
    icon: "filePlus",
    accent: "#6889B5",
    description: "Un documento limpio con 1 sección y su Capa Base lista para empezar a redactar o tomar apuntes desde cero sin distracciones.",
    meta: "1 sección · 2 capas · 0 fichas"
  },
  {
    id: "investigacion",
    name: "Investigación Académica",
    badge: "Académico",
    icon: "layers",
    accent: "#529E78",
    description: "Estructura con Introducción, Marco Teórico y Conclusiones. Incluye citas al pie [1], tabla comparativa y fichas bibliográficas.",
    meta: "3 secciones · Citas y Tabla · 3 fichas"
  },
  {
    id: "informe",
    name: "Informe Estratégico",
    badge: "Ejecutivo",
    icon: "table",
    accent: "#C98F45",
    description: "Diseñado para reportes ejecutivos y diagnósticos: Resumen Ejecutivo, Análisis de Indicadores con tabla de métricas y Plan de Acción.",
    meta: "3 secciones · Tabla KPI · 3 fichas"
  },
  {
    id: "estudio",
    name: "Estudio Analítico",
    badge: "Estudio",
    icon: "sliders",
    accent: "#5B8A9A",
    description: "Cuaderno de estudio profundo con Hipótesis, Evidencia Empírica, matriz de variables y base de datos de fuentes verificables en la Wiki.",
    meta: "3 secciones · Matriz de datos · 2 fichas"
  },
  {
    id: "novela",
    name: "Novela / Ficción Literaria",
    badge: "Narrativa",
    icon: "book",
    accent: "#B88446",
    description: "Estructura en 3 capítulos con capas independientes de Estructura/Trama y Corrección de Estilo, más fichas de Personajes y Lugares.",
    meta: "3 capítulos · 3 capas/cap · 3 fichas"
  },
  {
    id: "guion",
    name: "Guion / Crónica Escénica",
    badge: "Escénico",
    icon: "scroll",
    accent: "#B86273",
    description: "Dividido en Acto I, Acto II y Acto III con capas dedicadas a Acotaciones de Dirección, Subtexto y Ritmo de Diálogos.",
    meta: "3 actos · 3 capas/acto · 2 fichas"
  },
  {
    id: "demo",
    name: "El Archivo de los Espejos (Muestra)",
    badge: "Ejemplo",
    icon: "wand",
    accent: "#7A6B9E",
    description: "Proyecto completo con notas al margen, fichas con propiedades estructuradas, recortes y texto preparado para probar Rayos X y Pizarra.",
    meta: "2 capítulos · 258 palabras · 4 fichas"
  }
];

const state = {
  project: {
    version: "2.0.0-beta2",
    document: {
      title: "",
      active_layer_id: "layer_base",
      active_sheet_id: "sheet_1",
      updated_at: "",
      sheets: [{ id: "sheet_1", title: "Capítulo 1", active_layer_id: "layer_base", pages: ["<p><br></p>"], layers: [] }]
    },
    fichas: [],
    layers: [],
    scraps: []
  },
  config: {
    theme: "grafito",
    show_home_on_startup: true,
    panels: { wiki: true, layers: true, scraps: true, toolbar: true },
    ribbon_collapsed: false,
    focus_level: 0,
    xray_mode: false,
    autoformat: {
      scene_divider: true,
      em_dash: true,
      dash_start: "dialogue",
      auto_numbered: true,
      mini_toolbar: true,
      sanitize_paste: true
    },
    page: { view_mode: "pages", margin: "normal" },
    editor: { font_family: "Georgia", font_size: 16, line_height: 1.75, zoom: 100 },
    autosave: { enabled: true, delay_ms: 800 },
    backups: { on_manual_save: false },
    parallel_sync_scroll: true,
    layout: { left_width: 268, right_width: 292, scraps_height: 150 },
    shortcuts: { ...DEFAULT_SHORTCUTS }
  },
  meta: {
    filePath: "",
    fileName: "proyecto_datos.json",
    dirty: false,
    openedFromCli: false
  },
  ui: {
    homeOpen: false,
    homeActiveTab: "recent",
    creatingProject: false,
    recentProjects: [],
    projectTemplates: [...DEFAULT_TEMPLATES_CATALOG],
    homeSearch: "",
    fichaSearch: "",
    fichaCategory: "ALL",
    editingFichaId: null,
    editingFichaImage: "",
    editingFichaProps: [],
    editingLayerId: null,
    selectedFichaColor: "#6889B5",
    selectedLayerColor: "#C98F45",
    citationMode: "footnote",
    parallelLayerId: null,
    scrapsCollapsed: false,
    activePageIndex: 0,
    draggedLayerId: null,
    draggedScrapId: null,
    draggedSelectionText: "",
    draggedCorkSheetId: null,
    foreColor: "#E4E4E7",
    backColor: "rgba(250, 204, 21, 0.35)",
    paletteMode: null,
    capturingShortcutKey: null,
    dialogCallback: null
  }
};

let pyBridge = null;
let saveTimer = null;
let configTimer = null;
let savedSelectionRange = null; // Selección activa no colapsada para aplicar fuente/tamaño/color
let lastCaretRange = null;      // Último cursor dentro del editor
let selectedImageEl = null;
let activeTableCellEl = null;
let projectRevision = 0;
let saveInFlight = null;
let leaveInFlight = null;
const sessionStartedAt = performance.now();

function updateDirtyIndicator() {
  document.getElementById("dirty-marker").hidden = !state.meta.dirty;
  document.title = `${state.project.document.title || "Strata"}${state.meta.dirty ? " •" : ""} — Strata`;
  pyBridge?.setDirty(state.meta.dirty);
}

async function confirmPendingChanges() {
  clearTimeout(saveTimer);
  if (saveInFlight) await saveInFlight;
  clearTimeout(saveTimer);
  if (!state.meta.dirty) return true;
  try {
    const result = await apiPost("/api/confirm-unsaved", {});
    if (result.choice === "discard") return true;
    if (result.choice === "save") return await commitProjectSave(true);
  } catch (err) {
    showToast("No se pudo confirmar el cierre. El proyecto permanece abierto.");
  }
  return false;
}

window.__strataRequestClose = function () {
  if (!pyBridge || !document.body || document.body.classList.contains("booting")) return false;
  if (leaveInFlight || state.ui.creatingProject) {
    pyBridge.finishClose(false);
    return true;
  }
  leaveInFlight = (async () => {
    let accepted = false;
    try {
      accepted = await confirmPendingChanges();
      if (accepted) {
        clearTimeout(configTimer);
        await apiPost("/api/config", state.config);
      }
    } catch (err) {
      accepted = false;
      showToast("No se pudo completar el cierre. Inténtalo nuevamente.");
    } finally {
      leaveInFlight = null;
      pyBridge.finishClose(accepted);
    }
  })();
  return true;
};

/* ==========================================================================
   3. CONEXIÓN CON BACKEND PYTHON (QWEBCHANNEL + HTTP FALLBACK)
   ========================================================================== */
async function apiGet(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return await res.json();
}

async function apiPost(url, body = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return await res.json();
}

function initBridgeAndBoot() {
  injectIcons(document);
  populateFontSelects();
  populateSizePopover();

  if (typeof qt !== "undefined" && qt.webChannelTransport && typeof QWebChannel !== "undefined") {
    try {
      new QWebChannel(qt.webChannelTransport, (channel) => {
        pyBridge = channel.objects.pyBridge;
        window.pyBridge = pyBridge;
        updateDirtyIndicator();
      });
    } catch (err) {
      console.warn("QWebChannel fallback a HTTP:", err);
    }
  }

  bootApplication();
}

async function bootApplication() {
  try {
    const [cfg, proj, catalog] = await Promise.all([
      apiGet("/api/config"),
      apiGet("/api/state"),
      apiGet("/api/projects").catch(() => ({ recent: [], templates: DEFAULT_TEMPLATES_CATALOG }))
    ]);
    applyConfigObject(cfg);
    applyProjectObject(proj);
    state.meta.openedFromCli = Boolean(proj && proj._opened_from_cli);
    state.ui.recentProjects = Array.isArray(catalog.recent) ? catalog.recent : [];
    state.ui.projectTemplates =
      Array.isArray(catalog.templates) && catalog.templates.length
        ? catalog.templates
        : [...DEFAULT_TEMPLATES_CATALOG];
  } catch (err) {
    console.error("Error al iniciar estado:", err);
  } finally {
    initEventListeners();
    renderAll(true);
    if (state.config.show_home_on_startup !== false && !state.meta.openedFromCli) {
      openHomeScreen(false);
    }
    document.body.classList.remove("booting");
  }
}

// Snapshot invocado por main.py en closeEvent antes de cerrar la ventana
window.__strataSnapshot = function () {
  syncDOMPagesToState();
  return JSON.stringify({
    project: buildProjectPayload(),
    config: state.config
  });
};

/* ==========================================================================
   4. UTILIDADES GENERALES Y CAPAS INDEPENDIENTES POR HOJA/CAPÍTULO
   ========================================================================== */
function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getByPath(obj, dotPath) {
  return dotPath.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}

function setByPath(obj, dotPath, val) {
  const parts = dotPath.split(".");
  const last = parts.pop();
  const target = parts.reduce((acc, k) => {
    if (!acc[k] || typeof acc[k] !== "object") acc[k] = {};
    return acc[k];
  }, obj);
  target[last] = val;
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("open");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove("open"), 2400);
}

function setSaveStatus(statusText, cls = "") {
  const el = document.getElementById("save-indicator");
  if (!el) return;
  el.textContent = statusText;
  el.className = `save-indicator ${cls}`.trim();
}

function stripEphemeralHtml(rawHtml) {
  const tmp = document.createElement("div");
  tmp.innerHTML = rawHtml || "";
  tmp.querySelectorAll("span.ficha-ref, span.xray-repeat").forEach((sp) => {
    sp.replaceWith(document.createTextNode(sp.textContent));
  });
  tmp.querySelectorAll(".drop-target, .anchor-flash, .img-selected, .xray-dialogue").forEach((el) => {
    el.classList.remove("drop-target", "anchor-flash", "img-selected", "xray-dialogue");
    if (el.getAttribute("class") === "") el.removeAttribute("class");
  });
  return tmp.innerHTML;
}

function createDefaultSheetLayers() {
  return [
    {
      id: "layer_base",
      name: "Capa Base (Texto Final)",
      color: "#6889B5",
      visible: true,
      opacity: 100,
      is_base: true,
      order: 0,
      description: "Manuscrito definitivo de este capítulo.",
      overlay_html: "",
      annotations: []
    },
    {
      id: uid("layer"),
      name: "Notas de Capítulo",
      color: "#C98F45",
      visible: true,
      opacity: 95,
      is_base: false,
      order: 1,
      description: "Anotaciones al margen exclusivas de este capítulo.",
      overlay_html: "<p><br></p>",
      annotations: []
    }
  ];
}

function ensureSheetLayersStructure(sheet) {
  if (!sheet) return [];
  if (!Array.isArray(sheet.layers) || sheet.layers.length === 0) {
    sheet.layers = createDefaultSheetLayers();
  }
  if (!sheet.layers.some((l) => l.is_base || l.id === "layer_base")) {
    sheet.layers.unshift({
      id: "layer_base",
      name: "Capa Base (Texto Final)",
      color: "#6889B5",
      visible: true,
      opacity: 100,
      is_base: true,
      order: 0,
      description: "Manuscrito definitivo de este capítulo.",
      overlay_html: "",
      annotations: []
    });
  }
  if (!sheet.active_layer_id || !sheet.layers.some((l) => l.id === sheet.active_layer_id)) {
    sheet.active_layer_id = sheet.layers.find(l => l.is_base).id;
  }
  return sheet.layers;
}

function getActiveSheet() {
  const sheets = state.project.document.sheets || [];
  if (!sheets.length) {
    sheets.push({
      id: "sheet_1",
      title: "Capítulo 1",
      active_layer_id: "layer_base",
      pages: ["<p><br></p>"],
      layers: createDefaultSheetLayers()
    });
  }
  const active = sheets.find((s) => s.id === state.project.document.active_sheet_id) || sheets[0];
  ensureSheetLayersStructure(active);
  return active;
}

function getSheetLayers(sheet = getActiveSheet()) {
  return ensureSheetLayersStructure(sheet);
}

function getActiveLayerId() {
  const sheet = getActiveSheet();
  return sheet.active_layer_id || "layer_base";
}

function setActiveLayerId(layerId) {
  const sheet = getActiveSheet();
  sheet.active_layer_id = layerId || "layer_base";
  state.project.document.active_layer_id = sheet.active_layer_id;
}

function getActiveLayer() {
  const sheet = getActiveSheet();
  const layers = getSheetLayers(sheet);
  return (
    layers.find((l) => l.id === sheet.active_layer_id) ||
    layers.find((l) => l.is_base) ||
    layers[0]
  );
}

function getSortedLayers(sheet = getActiveSheet()) {
  return [...getSheetLayers(sheet)].sort((a, b) => {
    if (a.is_base && !b.is_base) return 1;
    if (!a.is_base && b.is_base) return -1;
    return (b.order ?? 0) - (a.order ?? 0);
  });
}

/* ==========================================================================
   5. CARGA Y GUARDADO DE PROYECTO Y CONFIG_USUARIO.JSON
   ========================================================================== */
function applyConfigObject(cfg) {
  if (!cfg || typeof cfg !== "object") return;
  state.config = {
    ...state.config,
    ...cfg,
    panels: { ...state.config.panels, ...(cfg.panels || {}) },
    autoformat: { ...state.config.autoformat, ...(cfg.autoformat || {}) },
    page: { ...state.config.page, ...(cfg.page || {}) },
    editor: { ...state.config.editor, ...(cfg.editor || {}) },
    autosave: { ...state.config.autosave, ...(cfg.autosave || {}) },
    backups: { ...state.config.backups, ...(cfg.backups || {}) },
    layout: { ...state.config.layout, ...(cfg.layout || {}) },
    shortcuts: { ...DEFAULT_SHORTCUTS, ...(cfg.shortcuts || {}) }
  };
}

function applyProjectObject(data) {
  if (!data || typeof data !== "object") return;
  clearTimeout(saveTimer);
  projectRevision++;
  state.meta.dirty = false;
  savedSelectionRange = lastCaretRange = null;
  state.meta.filePath = data._file_path || state.meta.filePath;
  state.meta.fileName = data._file_name || state.meta.fileName;

  const doc = data.document || {};
  const legacyLayers = Array.isArray(data.layers) ? data.layers : [];

  const sheets = Array.isArray(doc.sheets) && doc.sheets.length
    ? doc.sheets.map((s) => {
        const sid = s.id || uid("sheet");
        let sheetLayers = Array.isArray(s.layers) && s.layers.length
          ? JSON.parse(JSON.stringify(s.layers))
          : null;
        if (!sheetLayers && legacyLayers.length) {
          sheetLayers = JSON.parse(JSON.stringify(legacyLayers)).map((l) => ({
            ...l,
            annotations: (l.annotations || []).filter((a) => !a.sheet_id || a.sheet_id === sid)
          }));
        }
        const sheetObj = {
          ...s,
          id: sid,
          title: s.title || "Capítulo",
          active_layer_id: s.active_layer_id || doc.active_layer_id || "layer_base",
          pages: Array.isArray(s.pages) && s.pages.length ? s.pages : [s.base_html || "<p><br></p>"],
          layers: sheetLayers || createDefaultSheetLayers()
        };
        ensureSheetLayersStructure(sheetObj);
        return sheetObj;
      })
    : [
        {
          id: "sheet_1",
          title: "Capítulo 1",
          active_layer_id: "layer_base",
          pages: ["<p><br></p>"],
          layers: createDefaultSheetLayers()
        }
      ];

  state.project = {
    ...data,
    version: "9.5",
    document: {
      ...doc,
      title: doc.title || "Proyecto sin título",
      active_layer_id: doc.active_layer_id || "layer_base",
      active_sheet_id: doc.active_sheet_id || sheets[0].id,
      updated_at: doc.updated_at || "",
      sheets
    },
    fichas: Array.isArray(data.fichas) ? data.fichas : [],
    layers: sheets[0].layers,
    scraps: Array.isArray(data.scraps) ? data.scraps : []
  };

  state.ui.activePageIndex = 0;
  state.ui.parallelLayerId = null;
  state.ui.fichaCategory = "ALL";
  window.StrataV8?.loadProject();
  setSaveStatus("Guardado");
}

function syncDOMPagesToState() {
  const sheet = getActiveSheet();
  if (!sheet) return;
  const editors = [...document.querySelectorAll("#pages-stack .page-editor")];
  if (editors.length > 0) {
    sheet.pages = editors.map((ed) => stripEphemeralHtml(ed.innerHTML));
  }
  const parallelEd = document.getElementById("parallel-editor");
  const parallelPane = document.getElementById("parallel-pane");
  if (parallelEd && parallelPane && !parallelPane.hidden && state.ui.parallelLayerId) {
    const pLayer = getSheetLayers(sheet).find((l) => l.id === state.ui.parallelLayerId);
    if (pLayer) {
      pLayer.overlay_html = stripEphemeralHtml(parallelEd.innerHTML);
    }
  }
  state.project.layers = sheet.layers;
}

function buildProjectPayload() {
  syncDOMPagesToState();
  state.project.document.updated_at = new Date().toISOString();
  return JSON.parse(JSON.stringify(state.project));
}

function scheduleProjectSave() {
  projectRevision++;
  state.meta.dirty = true;
  updateDirtyIndicator();
  clearTimeout(saveTimer);
  if (!state.config.autosave.enabled) {
    setSaveStatus("Sin guardar", "dirty");
    return;
  }
  setSaveStatus("Guardando…", "dirty");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => commitProjectSave(false), state.config.autosave.delay_ms || 800);
}

async function commitProjectSave(manual = false) {
  clearTimeout(saveTimer);
  if (saveInFlight) {
    await saveInFlight;
    if (!state.meta.dirty) return true;
    return commitProjectSave(manual);
  }
  const revision = projectRevision;
  const payload = buildProjectPayload();
  saveInFlight = (async () => {
  try {
    const res = await apiPost("/api/save", payload);
    if (res && res.ok) {
      state.meta.dirty = revision !== projectRevision;
      state.meta.filePath = res.file_path || state.meta.filePath;
      state.meta.fileName = res.file_name || state.meta.fileName;
      setSaveStatus(state.meta.dirty ? "Sin guardar" : "Guardado", state.meta.dirty ? "dirty" : "");
      renderTopChrome();
      if (manual) {
        if (state.config.backups.on_manual_save) {
          await apiPost("/api/file/backup", { payload });
          showToast(`Guardado + copia en backups/ (${state.meta.fileName})`);
        } else {
          showToast(`Guardado en ${state.meta.fileName}`);
        }
      }
      return !state.meta.dirty;
    } else {
      setSaveStatus("Error", "error");
    }
  } catch (err) {
    console.error("Error guardando proyecto:", err);
    setSaveStatus("Error", "error");
  }
  return false;
  })();
  try { return await saveInFlight; }
  finally { saveInFlight = null; updateDirtyIndicator(); }
}

function scheduleConfigSave() {
  clearTimeout(configTimer);
  configTimer = setTimeout(async () => {
    try {
      await apiPost("/api/config", state.config);
    } catch (e) {
      console.warn("No se pudo guardar config_usuario.json:", e);
    }
  }, 250);
}

/* ==========================================================================
   6. PANTALLA DE INICIO / GESTOR DE PROYECTOS Y ACCIONES DE ARCHIVO NATIVO
   ========================================================================== */
function formatRelativeTime(isoStr) {
  if (!isoStr) return "Reciente";
  const dt = new Date(isoStr);
  if (isNaN(dt.getTime())) return "Reciente";
  const diffSec = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 1000));
  if (diffSec < 60) return "Hace instantes";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Hace ${days} día${days === 1 ? "" : "s"}`;
  return dt.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

async function openHomeScreen(refreshFromServer = true) {
  closeAllMenusAndPopovers();
  hideMiniToolbar();
  deselectImage();

  // Mostrar la pantalla de Inicio de forma inmediata para evitar parpadeos o dobles clics
  state.ui.homeOpen = true;
  document.body.classList.add("home-open");
  const homeEl = document.getElementById("home-screen");
  if (homeEl) {
    homeEl.setAttribute("aria-hidden", "false");
    homeEl.scrollTop = 0;
  }
  renderHomeScreen();

  if (refreshFromServer) {
    try {
      const catalog = await apiGet("/api/projects");
      if (catalog && catalog.ok) {
        state.ui.recentProjects = Array.isArray(catalog.recent) ? catalog.recent : [];
        if (Array.isArray(catalog.templates) && catalog.templates.length) {
          state.ui.projectTemplates = catalog.templates;
        }
      }
    } catch (err) {
      console.warn("No se pudo refrescar catálogo de proyectos:", err);
    }
    if (state.ui.homeOpen) {
      renderHomeScreen();
    }
  }
}

function closeHomeScreen() {
  state.ui.homeOpen = false;
  document.body.classList.remove("home-open");
  const homeEl = document.getElementById("home-screen");
  if (homeEl) homeEl.setAttribute("aria-hidden", "true");
  requestAnimationFrame(() => renderMarginNotes());
}

function toggleHomeScreen() {
  if (state.ui.homeOpen) {
    closeHomeScreen();
  } else {
    openHomeScreen(true);
  }
}

async function createProjectFromTemplate(templateId = "blanco") {
  if (state.ui.creatingProject || leaveInFlight) return;
  state.ui.creatingProject = true;
  clearTimeout(saveTimer);

  const titleInput = document.getElementById("home-new-title");
  const customTitle = titleInput ? titleInput.value.trim() : "";

  try {
    if (!await confirmPendingChanges()) return;
    const res = await apiPost("/api/file/new-template", {
      template_id: templateId || "blanco",
      title: customTitle
    });
    if (res && res.ok && res.state) {
      if (titleInput) titleInput.value = "";
      state.config.page.view_mode = "pages";
      state.meta.dirty = false;
      state.ui.planningView = null;
      applyProjectObject(res.state);
      // El DOM aún representa el proyecto anterior: reconstruir antes de sincronizar.
      closeHomeScreen();
      renderAll(true);
      requestAnimationFrame(() => {
        const firstEd = document.querySelector("#pages-stack .page-editor");
        if (firstEd) firstEd.focus();
      });
      showToast(`Proyecto creado: «${state.project.document.title}»`);
      return true;
    } else {
      showToast(res?.error || "No se pudo crear el proyecto");
    }
  } catch (err) {
    console.error("Error creando proyecto desde plantilla:", err);
    showToast("Error al crear el proyecto desde la plantilla");
  } finally {
    state.ui.creatingProject = false;
  }
}

async function openRecentProject(filePath) {
  if (!filePath || state.ui.creatingProject || leaveInFlight) return;
  state.ui.creatingProject = true;
  clearTimeout(saveTimer);

  try {
    if (!await confirmPendingChanges()) return;
    const res = await apiPost("/api/file/open-recent", { path: filePath });
    if (res && res.ok && res.state) {
      state.meta.dirty = false;
      applyProjectObject(res.state);
      closeHomeScreen();
      renderAll(true);
      showToast(`Abierto: ${state.project.document.title || state.meta.fileName}`);
    } else {
      showToast(res?.error || "No se encontró el archivo del proyecto");
    }
  } catch (err) {
    console.error("Error abriendo proyecto reciente:", err);
    showToast("No se pudo abrir el proyecto seleccionado");
  } finally {
    state.ui.creatingProject = false;
  }
}

async function removeRecentProject(filePath) {
  if (!filePath) return;
  try {
    const res = await apiPost("/api/file/remove-recent", { path: filePath });
    if (res && res.ok) {
      state.ui.recentProjects = Array.isArray(res.recent) ? res.recent : [];
      renderHomeScreen();
      showToast("Quitado de Proyectos Recientes");
    }
  } catch (err) {
    console.warn("No se pudo quitar de recientes:", err);
  }
}

async function togglePinRecentProject(filePath) {
  if (!filePath) return;
  try {
    const res = await apiPost("/api/file/pin-recent", { path: filePath });
    if (res && res.ok) {
      state.ui.recentProjects = Array.isArray(res.recent) ? res.recent : [];
      renderHomeScreen();
      showToast("Orden de proyectos actualizado");
    }
  } catch (err) {
    console.warn("No se pudo fijar el proyecto:", err);
  }
}

async function duplicateRecentProject(filePath) {
  if (!filePath) return;
  try {
    const res = await apiPost("/api/file/duplicate-recent", { path: filePath });
    if (res && res.ok) {
      state.ui.recentProjects = Array.isArray(res.recent) ? res.recent : [];
      renderHomeScreen();
      showToast("Proyecto duplicado");
    }
  } catch (err) {
    console.warn("No se pudo duplicar el proyecto:", err);
  }
}

function promptRenameRecentProject(rc) {
  openInputDialog(
    "Renombrar proyecto",
    "Escribe el nuevo título para este documento:",
    rc.title || "",
    async (newTitle) => {
      if (!newTitle || !newTitle.trim()) return;
      try {
        const res = await apiPost("/api/file/rename-recent", { path: rc.file_path, title: newTitle.trim() });
        if (res && res.ok) {
          state.ui.recentProjects = Array.isArray(res.recent) ? res.recent : [];
          if (rc.is_current) {
            state.project.document.title = newTitle.trim();
            renderTopChrome();
          }
          renderHomeScreen();
          showToast("Proyecto renombrado");
        }
      } catch (err) {
        console.warn("No se pudo renombrar:", err);
      }
    }
  );
}

async function deleteRecentProjectFromDisk(rc) {
  if (!rc || !rc.file_path) return;
  try {
    const res = await apiPost("/api/file/delete-recent", { path: rc.file_path });
    if (res && res.ok) {
      state.ui.recentProjects = Array.isArray(res.recent) ? res.recent : [];
      renderHomeScreen();
      showToast("Archivo eliminado del disco");
    }
  } catch (err) {
    console.warn("No se pudo eliminar del disco:", err);
  }
}

function openRecentCardMenu(x, y, rc) {
  openCustomContextMenu(x, y, [
    {
      label: "Ver ubicación en el disco",
      icon: "folderOpen",
      action: async () => {
        try {
          const result = pyBridge?.revealProject
            ? await new Promise((resolve) => pyBridge.revealProject(rc.file_path, (raw) => resolve(JSON.parse(raw))))
            : await apiPost("/api/file/reveal", { path: rc.file_path });
          if (!result.ok) showToast(result.error || "No se pudo abrir la ubicación.");
        } catch (err) { showToast("No se pudo abrir la ubicación."); }
      }
    },
    {
      label: rc.is_pinned ? "Desfijar de arriba" : "Fijar arriba",
      icon: "pin",
      action: () => togglePinRecentProject(rc.file_path)
    },
    {
      label: "Renombrar proyecto…",
      icon: "edit",
      action: () => promptRenameRecentProject(rc)
    },
    {
      label: "Duplicar proyecto",
      icon: "duplicate",
      action: () => duplicateRecentProject(rc.file_path)
    },
    { sep: true },
    {
      label: "Quitar de recientes",
      icon: "x",
      action: () => removeRecentProject(rc.file_path)
    },
    {
      label: "Eliminar del disco",
      icon: "trash",
      danger: true,
      disabled: Boolean(rc.is_current),
      action: () => deleteRecentProjectFromDisk(rc)
    }
  ]);
}

function switchHomeTab(tabName) {
  state.ui.homeActiveTab = tabName === "templates" ? "templates" : "recent";
  const isRec = state.ui.homeActiveTab === "recent";
  const btnRec = document.getElementById("home-tab-recent");
  const btnTpl = document.getElementById("home-tab-templates");
  const paneRec = document.getElementById("home-pane-recent");
  const paneTpl = document.getElementById("home-pane-templates");
  if (btnRec) {
    btnRec.classList.toggle("active", isRec);
    btnRec.setAttribute("aria-selected", String(isRec));
  }
  if (btnTpl) {
    btnTpl.classList.toggle("active", !isRec);
    btnTpl.setAttribute("aria-selected", String(!isRec));
  }
  if (paneRec) {
    paneRec.hidden = !isRec;
    paneRec.classList.toggle("active", isRec);
  }
  if (paneTpl) {
    paneTpl.hidden = isRec;
    paneTpl.classList.toggle("active", !isRec);
  }
}

function getTemplateSvgIllustration(tplId) {
  switch (tplId) {
    case "investigacion":
      return `<svg viewBox="0 0 160 64" fill="none"><rect x="16" y="8" width="84" height="48" rx="5" stroke="currentColor" stroke-width="1.6" opacity=".85"/><line x1="26" y1="20" x2="68" y2="20" stroke="currentColor" stroke-width="2.2"/><line x1="26" y1="29" x2="88" y2="29" stroke="currentColor" stroke-width="1.4" opacity=".6"/><line x1="26" y1="36" x2="82" y2="36" stroke="currentColor" stroke-width="1.4" opacity=".6"/><rect x="108" y="12" width="36" height="18" rx="4" stroke="currentColor" stroke-width="1.5"/><rect x="108" y="36" width="36" height="18" rx="4" stroke="currentColor" stroke-width="1.5" opacity=".7"/><circle cx="91" cy="19" r="3" fill="currentColor"/></svg>`;
    case "informe":
      return `<svg viewBox="0 0 160 64" fill="none"><rect x="18" y="8" width="124" height="48" rx="5" stroke="currentColor" stroke-width="1.6"/><line x1="18" y1="22" x2="142" y2="22" stroke="currentColor" stroke-width="1.5"/><line x1="62" y1="22" x2="62" y2="56" stroke="currentColor" stroke-width="1.3" opacity=".6"/><line x1="104" y1="22" x2="104" y2="56" stroke="currentColor" stroke-width="1.3" opacity=".6"/><line x1="18" y1="38" x2="142" y2="38" stroke="currentColor" stroke-width="1.3" opacity=".6"/></svg>`;
    case "estudio":
      return `<svg viewBox="0 0 160 64" fill="none"><rect x="16" y="10" width="56" height="44" rx="5" stroke="currentColor" stroke-width="1.6"/><rect x="88" y="10" width="56" height="44" rx="5" stroke="currentColor" stroke-width="1.6" opacity=".8"/><path d="M72 32H88" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3 3"/><circle cx="32" cy="24" r="3" fill="currentColor"/><line x1="40" y1="24" x2="62" y2="24" stroke="currentColor" stroke-width="1.6"/><line x1="26" y1="36" x2="62" y2="36" stroke="currentColor" stroke-width="1.4" opacity=".65"/><line x1="98" y1="24" x2="134" y2="24" stroke="currentColor" stroke-width="1.6"/><line x1="98" y1="36" x2="128" y2="36" stroke="currentColor" stroke-width="1.4" opacity=".65"/></svg>`;
    case "novela":
      return `<svg viewBox="0 0 160 64" fill="none"><path d="M36 12H78C82 12 85 15 85 19V52C85 49 82 47 78 47H36V12Z" stroke="currentColor" stroke-width="1.6"/><path d="M124 12H82C78 12 75 15 75 19V52C75 49 78 47 82 47H124V12Z" stroke="currentColor" stroke-width="1.6" opacity=".85"/><line x1="45" y1="23" x2="72" y2="23" stroke="currentColor" stroke-width="1.5"/><line x1="45" y1="31" x2="72" y2="31" stroke="currentColor" stroke-width="1.3" opacity=".6"/><line x1="88" y1="23" x2="115" y2="23" stroke="currentColor" stroke-width="1.5"/><line x1="88" y1="31" x2="115" y2="31" stroke="currentColor" stroke-width="1.3" opacity=".6"/></svg>`;
    case "guion":
      return `<svg viewBox="0 0 160 64" fill="none"><rect x="24" y="8" width="112" height="48" rx="5" stroke="currentColor" stroke-width="1.6"/><line x1="58" y1="18" x2="102" y2="18" stroke="currentColor" stroke-width="2"/><line x1="42" y1="29" x2="118" y2="29" stroke="currentColor" stroke-width="1.4" opacity=".7"/><line x1="62" y1="40" x2="98" y2="40" stroke="currentColor" stroke-width="1.8"/><line x1="46" y1="48" x2="114" y2="48" stroke="currentColor" stroke-width="1.3" opacity=".6"/></svg>`;
    case "demo":
      return `<svg viewBox="0 0 160 64" fill="none"><rect x="20" y="10" width="76" height="44" rx="5" stroke="currentColor" stroke-width="1.6"/><rect x="104" y="14" width="36" height="15" rx="4" stroke="currentColor" stroke-width="1.5"/><rect x="104" y="35" width="36" height="15" rx="4" stroke="currentColor" stroke-width="1.5" opacity=".75"/><line x1="96" y1="22" x2="104" y2="22" stroke="currentColor" stroke-width="1.4"/><line x1="30" y1="22" x2="74" y2="22" stroke="currentColor" stroke-width="2"/><line x1="30" y1="32" x2="84" y2="32" stroke="currentColor" stroke-width="1.4" opacity=".65"/></svg>`;
    default:
      return `<svg viewBox="0 0 160 64" fill="none"><rect x="44" y="8" width="72" height="48" rx="5" stroke="currentColor" stroke-width="1.6"/><line x1="80" y1="22" x2="80" y2="42" stroke="currentColor" stroke-width="1.8"/><line x1="70" y1="32" x2="90" y2="32" stroke="currentColor" stroke-width="1.8"/></svg>`;
  }
}

function updateTemplateButtonsCta() {
  const titleInput = document.getElementById("home-new-title");
  const typed = titleInput ? titleInput.value.trim() : "";
  const shortTitle = typed.length > 22 ? typed.slice(0, 22) + "…" : typed;
  document.querySelectorAll("#home-templates-grid .tpl-cta").forEach((el) => {
    el.textContent = typed ? `+ Crear «${shortTitle}» →` : "+ Usar plantilla →";
  });
}

function renderHomeScreen() {
  switchHomeTab(state.ui.homeActiveTab || "recent");

  const resumeLbl = document.getElementById("home-resume-label");
  if (resumeLbl) {
    const curTitle = (state.project.document.title || "Documento actual").trim();
    resumeLbl.textContent = `Continuar «${curTitle.length > 26 ? curTitle.slice(0, 26) + "…" : curTitle}»`;
  }

  const chkStartup = document.getElementById("home-chk-startup");
  if (chkStartup) {
    chkStartup.checked = state.config.show_home_on_startup !== false;
  }

  const recents = state.ui.recentProjects || [];
  const recBadge = document.getElementById("home-recent-count");
  if (recBadge) recBadge.textContent = String(recents.length);

  // Estadísticas globales de todos los proyectos recientes
  const totalWords = recents.reduce((acc, r) => acc + (Number(r.words) || 0), 0);
  const totalSheets = recents.reduce((acc, r) => acc + (Number(r.sheets_count) || 0), 0);
  const totalFichas = recents.reduce((acc, r) => acc + (Number(r.fichas_count) || 0), 0);

  const globalStatsEl = document.getElementById("home-global-stats");
  if (globalStatsEl) {
    globalStatsEl.innerHTML = `
      <span class="home-stat-pill"><b>${recents.length}</b> proyecto${recents.length === 1 ? "" : "s"}</span>
      <span class="home-stat-pill"><b>${totalWords.toLocaleString("es-AR")}</b> palabras totales</span>
      <span class="home-stat-pill"><b>${totalSheets}</b> secciones / cap.</span>
      <span class="home-stat-pill"><b>${totalFichas}</b> fichas y fuentes</span>
    `;
  }

  // Renderizar galería de plantillas con ilustraciones SVG limpias
  const tplGrid = document.getElementById("home-templates-grid");
  if (tplGrid) {
    tplGrid.innerHTML = "";
    const templatesList =
      Array.isArray(state.ui.projectTemplates) && state.ui.projectTemplates.length
        ? state.ui.projectTemplates
        : DEFAULT_TEMPLATES_CATALOG;

    templatesList.forEach((tpl) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tpl-card";
      btn.style.setProperty("--tpl-c", tpl.accent || "#6889B5");
      btn.innerHTML = `
        <div class="tpl-illustration">${getTemplateSvgIllustration(tpl.id)}</div>
        <div class="tpl-top">
          <div class="tpl-icon"><i class="ic" data-i="${tpl.icon || "filePlus"}"></i></div>
          <span class="tpl-badge">${tpl.badge || "Plantilla"}</span>
        </div>
        <div class="tpl-name">${tpl.name}</div>
        <div class="tpl-desc">${tpl.description}</div>
        <div class="tpl-foot">
          <span>${tpl.meta || ""}</span>
          <span class="tpl-cta">+ Usar plantilla →</span>
        </div>
      `;
      injectIcons(btn);
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        createProjectFromTemplate(tpl.id);
      });
      tplGrid.appendChild(btn);
    });
    updateTemplateButtonsCta();
  }

  // Renderizar tarjetas de Proyectos Recientes con miniatura de hoja y menú ⋯
  const recGrid = document.getElementById("home-recent-grid");
  if (!recGrid) return;
  recGrid.innerHTML = "";

  const q = (state.ui.homeSearch || "").trim().toLowerCase();
  const filtered = recents.filter((r) => {
    if (!q) return true;
    return (
      (r.title || "").toLowerCase().includes(q) ||
      (r.file_name || "").toLowerCase().includes(q) ||
      (r.excerpt || "").toLowerCase().includes(q)
    );
  });

  if (!filtered.length) {
    recGrid.innerHTML = `<div class="empty-hint" style="grid-column:1/-1;padding:28px;">No se encontraron proyectos recientes que coincidan con la búsqueda. Puedes cambiar a la pestaña «Crear Nuevo / Plantillas» o abrir un archivo desde tu PC.</div>`;
    return;
  }

  const maxWords = Math.max(500, ...filtered.map((r) => Number(r.words) || 0));

  filtered.forEach((rc) => {
    const card = document.createElement("div");
    card.className = `recent-card ${rc.is_current ? "is-current" : ""}`.trim();
    const words = Number(rc.words) || 0;
    const chars = Number(rc.chars) || 0;
    const pct = words > 0 ? Math.max(6, Math.min(100, Math.round((words / maxWords) * 100))) : 0;
    const pvLines = Array.isArray(rc.preview_lines) && rc.preview_lines.length
      ? rc.preview_lines.slice(0, 4)
      : [rc.excerpt || "Documento sin texto"];

    card.innerHTML = `
      <div class="rc-head">
        <div class="rc-title-wrap">
          <div class="rc-title" title="${rc.title}">
            ${rc.is_pinned ? `<span class="rc-pin-tag" title="Proyecto fijado"><i class="ic" data-i="pin"></i></span>` : ""}
            <span>${rc.title}</span>
          </div>
          <div class="rc-file" title="${rc.file_path}">${rc.file_name}</div>
        </div>
        ${rc.is_current ? `<span class="rc-active-badge">Activo</span>` : ""}
        <button type="button" class="rc-more-btn" title="Opciones del proyecto (Renombrar, Duplicar, Fijar, Eliminar)">
          <i class="ic" data-i="moreHorizontal"></i>
        </button>
      </div>

      <div class="rc-body-split">
        <div class="rc-page-preview" title="Vista previa en miniatura de la hoja">
          <div class="rc-pv-title"></div>
          ${pvLines.map((ln) => `<div class="rc-pv-line"></div>`).join("")}
        </div>
        <div class="rc-info-col">
          <div class="rc-words-box">
            <div class="rc-words-top">
              <div class="rc-words-num">${words.toLocaleString("es-AR")}<span>palabras</span></div>
              <div class="rc-chars">${chars.toLocaleString("es-AR")} caract.</div>
            </div>
            <div class="rc-progress" title="${words.toLocaleString("es-AR")} palabras">
              <div class="rc-progress-bar" style="width:${pct}%"></div>
            </div>
          </div>
          <div class="rc-excerpt"></div>
        </div>
      </div>

      <div class="rc-foot">
        <div class="rc-badges">
          <span title="Capítulos / secciones"><b>${rc.sheets_count || 1}</b> sec.</span>
          <span title="Fichas y fuentes en la Wiki"><b>${rc.fichas_count || 0}</b> fichas</span>
          <span title="Notas de capa ancladas"><b>${rc.notes_count || 0}</b> notas</span>
        </div>
        <span class="rc-time">${formatRelativeTime(rc.updated_at)}</span>
      </div>
    `;
    card.querySelector(".rc-excerpt").textContent = rc.excerpt || "Sin contenido escrito todavía.";
    const pvEls = card.querySelectorAll(".rc-pv-line");
    pvLines.forEach((ln, idx) => {
      if (pvEls[idx]) pvEls[idx].textContent = ln;
    });
    injectIcons(card);

    card.addEventListener("click", (e) => {
      if (e.target.closest(".rc-more-btn")) return;
      if (rc.is_current) {
        closeHomeScreen();
      } else {
        openRecentProject(rc.file_path);
      }
    });

    card.querySelector(".rc-more-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      openRecentCardMenu(rect.left, rect.bottom + 4, rc);
    });

    recGrid.appendChild(card);
  });
}

async function handleFileAction(action) {
  closeAllMenusAndPopovers();

  if (action === "home") {
    openHomeScreen(true);
    return;
  }

  if (action === "new") {
    await createProjectFromTemplate("blanco");
    return;
  }

  if (action === "open") {
    if (state.ui.creatingProject || leaveInFlight) return;
    state.ui.creatingProject = true;
    try {
    if (!await confirmPendingChanges()) return;
    const res = await apiPost("/api/file/open", {});
    if (res && res.ok && res.state) {
      state.meta.dirty = false;
      applyProjectObject(res.state);
      closeHomeScreen();
      renderAll(true);
      showToast(`Proyecto abierto: ${state.meta.fileName}`);
    }
    } finally { state.ui.creatingProject = false; }
    return;
  }

  if (action === "save") {
    await commitProjectSave(true);
    return;
  }

  if (action === "save-as") {
    clearTimeout(saveTimer);
    if (saveInFlight) await saveInFlight;
    clearTimeout(saveTimer);
    const revision = projectRevision;
    const payload = buildProjectPayload();
    const res = await apiPost("/api/file/save-as", { payload });
    if (res && res.ok) {
      state.meta.filePath = res.file_path;
      state.meta.fileName = res.file_name;
      state.meta.dirty = revision !== projectRevision;
      setSaveStatus(state.meta.dirty ? "Sin guardar" : "Guardado", state.meta.dirty ? "dirty" : "");
      renderTopChrome();
      showToast(`Guardado como ${res.file_name}`);
    }
    return;
  }

  if (action === "backup") {
    const payload = buildProjectPayload();
    const res = await apiPost("/api/file/backup", { payload });
    if (res && res.ok) {
      showToast(`Copia creada: ${res.file_name}`);
    }
    return;
  }

  if (action.startsWith("export-")) {
    const fmt = action.replace("export-", "");
    await exportManuscript(fmt);
    return;
  }

  if (action === "quit") {
    await apiPost("/api/window/close", {});
  }
}

async function exportManuscript(fmt) {
  syncDOMPagesToState();
  const sheets = state.project.document.sheets || [];
  const combinedHtml = sheets
    .map((sh, sIdx) => {
      const pagesHtml = (window.StrataV8 ? window.StrataV8.exportPages(sh) : (sh.pages || []))
        .map((p, pIdx) => (pIdx > 0 ? `<div class="page-break"></div>${p}` : p))
        .join("\n");
      return `${sIdx > 0 ? '<div class="page-break"></div>' : ""}${pagesHtml}`;
    })
    .join("\n");

  showToast(`Exportando documento (${fmt.toUpperCase()})…`);
  const res = await apiPost("/api/file/export", {
    format: fmt,
    title: state.project.document.title || "Documento",
    base_html: window.StrataEditorial ? StrataEditorial.cleanExportHtml(combinedHtml) : combinedHtml,
    font_family: state.config.editor.font_family || "Georgia",
    font_size: state.config.editor.font_size || 16,
    line_height: state.config.editor.line_height || 1.75
    , page_layout: state.project.document.layout || {}
  });

  if (res && res.ok) {
    showToast(`Exportado: ${res.file_name}`);
  } else if (res && !res.cancelled) {
    showToast(`Error al exportar: ${res.error || "desconocido"}`);
  }
}

/* ==========================================================================
   7. SELECCIÓN DE TEXTO, MINI-BARRA FLOTANTE Y FORMATO ESTILO WORD 365
   ========================================================================== */
function isNodeInRichEditor(node) {
  if (!node) return false;
  const el = node.nodeType === 1 ? node : node.parentElement;
  return Boolean(el && el.closest(".rich-editor"));
}

function getActiveRichEditor() {
  if (lastCaretRange) {
    const el =
      lastCaretRange.startContainer.nodeType === 1
        ? lastCaretRange.startContainer
        : lastCaretRange.startContainer.parentElement;
    const ed = el && el.closest(".rich-editor");
    if (ed?.isConnected && !ed.closest("[hidden]")) return ed;
  }
  return document.querySelector(`.page-editor[data-page-index="${state.ui.activePageIndex}"]`) ||
         document.querySelector(".page-editor");
}

function ensureParagraphIds(editorEl) {
  if (!editorEl) return;
  editorEl.querySelectorAll("p, h1, h2, h3, blockquote, li").forEach((block) => {
    if (!block.dataset.pid) {
      block.dataset.pid = uid("p");
    }
  });
}

function captureSelectionAndSyncToolbar(showMini = false) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!isNodeInRichEditor(range.commonAncestorContainer)) return;

  lastCaretRange = range.cloneRange();
  if (!range.collapsed && range.toString().trim().length > 0) {
    savedSelectionRange = range.cloneRange();
    if (showMini && state.config.autoformat.mini_toolbar) {
      positionAndShowMiniToolbar(range);
    }
  } else {
    savedSelectionRange = null;
    hideMiniToolbar();
  }

  updateToolbarActiveStates(range);
}

function positionAndShowMiniToolbar(range) {
  const bar = document.getElementById("mini-toolbar");
  if (!bar) return;
  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) return;

  bar.classList.add("open");
  bar.setAttribute("aria-hidden", "false");

  const bw = bar.offsetWidth || 320;
  const bh = bar.offsetHeight || 68;
  let left = rect.left + rect.width / 2 - bw / 2;
  left = Math.max(12, Math.min(window.innerWidth - bw - 12, left));

  let top = rect.top - bh - 10;
  if (top < 50) {
    top = rect.bottom + 10;
  }

  bar.style.left = `${Math.round(left)}px`;
  bar.style.top = `${Math.round(top)}px`;
}

function hideMiniToolbar() {
  const bar = document.getElementById("mini-toolbar");
  if (!bar) return;
  bar.classList.remove("open");
  bar.setAttribute("aria-hidden", "true");
}

function restoreSelection(preferNonCollapsed = true) {
  const sel = window.getSelection();
  if (!sel) return false;
  const target = preferNonCollapsed && savedSelectionRange ? savedSelectionRange : lastCaretRange;
  if (target) {
    try {
      if (!target.startContainer.isConnected || !isNodeInRichEditor(target.startContainer)) return false;
      const el = target.startContainer.nodeType === 1 ? target.startContainer : target.startContainer.parentElement;
      el.closest(".rich-editor").focus({ preventScroll: true });
      sel.removeAllRanges();
      sel.addRange(target);
      return true;
    } catch (_e) {
      return false;
    }
  }
  return false;
}

function updateToolbarActiveStates(range) {
  const node = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
  if (!node) return;

  // Estados booleanos (bold, italic, etc.)
  document.querySelectorAll("[data-state]").forEach((btn) => {
    const cmd = btn.dataset.state;
    let active = false;
    try {
      active = document.queryCommandState(cmd);
    } catch (_e) {}
    btn.classList.toggle("on", active);
  });

  // Estilo de bloque (p, h1, h2, h3)
  const blockEl = node.closest("h1, h2, h3, blockquote, p");
  const tag = blockEl ? blockEl.tagName.toLowerCase() : "p";
  document.querySelectorAll(".style-chip[data-block]").forEach((chip) => {
    chip.classList.toggle("on", chip.dataset.block === tag);
  });

  // Fuente y tamaño computados del nodo bajo el cursor
  const comp = window.getComputedStyle(node);
  setFontControls(comp.fontFamily.split(",")[0].replace(/["']/g, "").trim());
  const px = parseFloat(comp.fontSize) || state.config.editor.font_size || 16;
  const pt = Math.round((px * 0.75) * 2) / 2;

  const rbSize = document.getElementById("rb-size");
  const mtSize = document.getElementById("mt-size");
  if (rbSize && document.activeElement !== rbSize) rbSize.value = String(pt);
  if (mtSize && document.activeElement !== mtSize) mtSize.value = String(pt);
}

function parseUserFontSize(rawVal) {
  const s = String(rawVal || "").trim().toLowerCase().replace(",", ".");
  if (!s) return null;
  if (s.endsWith("x")) {
    const mult = parseFloat(s.slice(0, -1));
    if (isNaN(mult) || mult <= 0) return null;
    const basePt = (state.config.editor.font_size || 16) * 0.75;
    return Math.max(6, Math.min(140, Math.round(basePt * mult * 10) / 10));
  }
  const num = parseFloat(s.replace(/pt|px/g, ""));
  if (isNaN(num) || num <= 0) return null;
  return Math.max(6, Math.min(140, Math.round(num * 10) / 10));
}

function applyFontSizeToSelection(rawInput) {
  const pt = parseUserFontSize(rawInput);
  if (!pt) return;

  const rbSize = document.getElementById("rb-size");
  const mtSize = document.getElementById("mt-size");
  if (rbSize) rbSize.value = String(pt);
  if (mtSize) mtSize.value = String(pt);

  // Si hay una selección activa guardada, se aplica SOLO a las palabras seleccionadas
  if (savedSelectionRange && !savedSelectionRange.collapsed) {
    restoreSelection(true);
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      document.execCommand("styleWithCSS", false, true);
      document.execCommand("fontSize", false, "7");
      const editor = getActiveRichEditor();
      if (editor) {
        const spans = editor.querySelectorAll('font[size="7"], span[style*="xxx-large"], span[style*="webkit-xxx-large"]');
        spans.forEach((el) => {
          if (el.tagName === "FONT") {
            const span = document.createElement("span");
            span.style.fontSize = `${pt}pt`;
            span.innerHTML = el.innerHTML;
            el.replaceWith(span);
          } else {
            el.style.fontSize = `${pt}pt`;
          }
        });
        if (sel.rangeCount > 0) {
          savedSelectionRange = sel.getRangeAt(0).cloneRange();
        }
        scheduleProjectSave();
        return;
      }
    }
  }

  // Si no hay palabras seleccionadas, cambia el tamaño base del documento
  state.config.editor.font_size = Math.round(pt / 0.75);
  applyEditorTypographyVars();
  scheduleConfigSave();
}

function stepFontSize(deltaPt) {
  const rbSize = document.getElementById("rb-size");
  const curPt = parseUserFontSize(rbSize ? rbSize.value : 12) || 12;
  const nextPt = Math.max(6, Math.min(120, curPt + deltaPt));
  applyFontSizeToSelection(nextPt);
}

function applyFontFamilyToSelection(fontFamily) {
  if (!fontFamily) return;
  setFontControls(fontFamily);

  if (savedSelectionRange && !savedSelectionRange.collapsed) {
    restoreSelection(true);
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("fontName", false, fontFamily);
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRange = sel.getRangeAt(0).cloneRange();
    }
    scheduleProjectSave();
    return;
  }

  state.config.editor.font_family = fontFamily;
  applyEditorTypographyVars();
  scheduleConfigSave();
}

function applyColorToSelection(mode, colorValue) {
  restoreSelection(true);
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  document.execCommand("styleWithCSS", false, true);
  if (mode === "fore") {
    state.ui.foreColor = colorValue || "inherit";
    document.querySelectorAll('[data-colorbar="fore"]').forEach((b) => b.style.setProperty("--bar", colorValue || "var(--text)"));
    if (colorValue) {
      document.execCommand("foreColor", false, colorValue);
    } else {
      document.execCommand("removeFormat", false, null);
    }
  } else {
    state.ui.backColor = colorValue || "transparent";
    document.querySelectorAll('[data-colorbar="back"]').forEach((b) => b.style.setProperty("--bar", colorValue || "transparent"));
    document.execCommand("hiliteColor", false, colorValue || "transparent");
  }

  if (sel.rangeCount > 0 && !sel.isCollapsed) {
    savedSelectionRange = sel.getRangeAt(0).cloneRange();
  }
  scheduleProjectSave();
}

function executeRibbonCommand(cmd, val = null, triggerBtn = null) {
  if (cmd === "pick-fore") {
    openColorPalette("fore", triggerBtn);
    return;
  }
  if (cmd === "pick-back") {
    openColorPalette("back", triggerBtn);
    return;
  }
  if (cmd === "grow") {
    stepFontSize(1);
    return;
  }
  if (cmd === "shrink") {
    stepFontSize(-1);
    return;
  }
  if (cmd === "image") {
    pickAndInsertImage();
    return;
  }
  if (cmd === "table") {
    openTableModal();
    return;
  }
  if (cmd === "citation") {
    openCitationModal();
    return;
  }
  if (cmd === "scene") {
    insertSceneDivider();
    return;
  }
  if (cmd === "new-page") {
    addNewA4Page(state.ui.activePageIndex);
    return;
  }
  if (cmd === "note") {
    createMarginNoteAtSelection();
    return;
  }
  if (cmd === "zoom-in") {
    changeZoom(15);
    return;
  }
  if (cmd === "zoom-out") {
    changeZoom(-15);
    return;
  }
  if (cmd === "paste") {
    restoreSelection(false);
    navigator.clipboard.readText().then((txt) => {
      if (txt) document.execCommand("insertText", false, txt);
    }).catch(() => document.execCommand("paste"));
    return;
  }
  if (cmd === "paste-plain") {
    restoreSelection(false);
    navigator.clipboard.readText().then((txt) => {
      if (txt) document.execCommand("insertText", false, txt);
    });
    return;
  }
  if (cmd === "cut" || cmd === "copy") {
    restoreSelection(true);
    document.execCommand(cmd);
    return;
  }

  restoreSelection(true);
  const ed = getActiveRichEditor();
  if (ed && document.activeElement !== ed) ed.focus();

  if (cmd === "block") {
    const tag = val || "p";
    document.execCommand("formatBlock", false, `<${tag}>`);
  } else {
    document.execCommand(cmd, false, val);
  }

  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    lastCaretRange = sel.getRangeAt(0).cloneRange();
    if (!lastCaretRange.collapsed) savedSelectionRange = lastCaretRange.cloneRange();
    updateToolbarActiveStates(lastCaretRange);
  }
  scheduleProjectSave();
}

function insertSceneDivider() {
  restoreSelection(false);
  const ed = getActiveRichEditor();
  if (!ed) return;
  if (document.activeElement !== ed) ed.focus();
  document.execCommand("insertHTML", false, `<hr class="scene-divider"><p data-pid="${uid("p")}"><br></p>`);
  ensureParagraphIds(ed);
  scheduleProjectSave();
}

/* ==========================================================================
   8. AUTO-FORMATO DE ESCRITOR ESTILO WORD (CONFIGURABLE EN AJUSTES)
   ========================================================================== */
function handleEditorKeyDown(e, editorEl) {
  // Enter sobre línea con --- o *** -> Separador de escena automático
  if (e.key === "Enter" && !e.shiftKey && state.config.autoformat.scene_divider) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
      const node = sel.anchorNode;
      const block = (node.nodeType === 1 ? node : node.parentElement)?.closest("p, div");
      if (block && editorEl.contains(block)) {
        const txt = (block.textContent || "").trim();
        if (txt === "---" || txt === "***" || txt === "* * *") {
          e.preventDefault();
          const hr = document.createElement("hr");
          hr.className = "scene-divider";
          const nextP = document.createElement("p");
          nextP.dataset.pid = uid("p");
          nextP.innerHTML = "<br>";
          block.replaceWith(hr, nextP);

          const r = document.createRange();
          r.setStart(nextP, 0);
          r.collapse(true);
          sel.removeAllRanges();
          sel.addRange(r);
          lastCaretRange = r.cloneRange();
          scheduleProjectSave();
          return;
        }
      }
    }
  }
}

function applyLiveAutoFormat(editorEl) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return;
  const node = sel.anchorNode;
  if (!node || node.nodeType !== Node.TEXT_NODE) return;

  const offset = sel.anchorOffset;
  const text = node.nodeValue || "";

  // 1) "--" -> "—" (Raya de diálogo literario)
  if (state.config.autoformat.em_dash && offset >= 2 && text.slice(offset - 2, offset) === "--") {
    // No convertir si el usuario está escribiendo "---" al inicio del párrafo para un separador
    const before = text.slice(0, offset - 2);
    if (before.trim() !== "-" && text.slice(0, offset) !== "---") {
      node.nodeValue = text.slice(0, offset - 2) + "—" + text.slice(offset);
      const r = document.createRange();
      r.setStart(node, offset - 1);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      return;
    }
  }

  // 2) "- " al inicio del párrafo -> Diálogo literario ("—") o Lista con viñetas
  const block = node.parentElement?.closest("p, div");
  if (block && editorEl.contains(block) && node === block.firstChild) {
    if (offset === 2 && (text.startsWith("- ") || text.startsWith("-\u00A0"))) {
      const mode = state.config.autoformat.dash_start || "dialogue";
      if (mode === "dialogue") {
        node.nodeValue = "—" + text.slice(2);
        const r = document.createRange();
        r.setStart(node, 1);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        return;
      } else if (mode === "list") {
        node.nodeValue = text.slice(2);
        document.execCommand("insertUnorderedList");
        return;
      }
    }

    // 3) "1. " al inicio del párrafo -> Lista numerada automática
    if (state.config.autoformat.auto_numbered && offset === 3 && /^1\.\s/.test(text)) {
      node.nodeValue = text.slice(3);
      document.execCommand("insertOrderedList");
    }
  }
}

/* ==========================================================================
   9. RESALTADO DE FICHAS DE WIKI Y TARJETA HOVER (POPOVER)
   ========================================================================== */
function buildFichaMatcher() {
  const valid = (state.project.fichas || [])
    .filter((f) => f.name && f.name.trim().length > 0)
    .sort((a, b) => b.name.length - a.name.length);
  if (!valid.length) return null;

  const mapByLower = new Map();
  valid.forEach((f) => mapByLower.set(f.name.trim().toLowerCase(), f));
  const pattern = valid.map((f) => escapeRegExp(f.name.trim())).join("|");
  const regex = new RegExp(`(?<![\\p{L}\\p{N}_])(${pattern})(?![\\p{L}\\p{N}_])`, "giu");
  return { regex, mapByLower };
}

function syncFichaHighlights(containerEl, isLiveTyping = false) {
  if (!containerEl) return;
  const sel = window.getSelection();
  if (isLiveTyping && sel && !sel.isCollapsed) return;

  const matcher = buildFichaMatcher();
  const focusNode = sel && sel.rangeCount > 0 ? sel.focusNode : null;
  const focusOffset = sel && sel.rangeCount > 0 ? sel.focusOffset : 0;

  containerEl.querySelectorAll("span.ficha-ref").forEach((span) => {
    const cur = (span.textContent || "").trim().toLowerCase();
    const matched = matcher ? matcher.mapByLower.get(cur) : null;
    if (!matched || span.textContent.toLowerCase() !== matched.name.trim().toLowerCase()) {
      const hasCaret = span.contains(focusNode);
      const tn = document.createTextNode(span.textContent);
      span.replaceWith(tn);
      if (hasCaret && sel) {
        const r = document.createRange();
        r.setStart(tn, Math.min(tn.length, focusOffset));
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    } else {
      span.dataset.fichaId = matched.id;
      span.style.setProperty("--ficha-color", matched.color || "#6889B5");
    }
  });

  if (!matcher) return;
  const { regex, mapByLower } = matcher;

  const walker = document.createTreeWalker(containerEl, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (
        n.parentElement &&
        n.parentElement.closest("span.ficha-ref, sup.footnote-ref, .footnotes-section")
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);

  nodes.forEach((textNode) => {
    const text = textNode.nodeValue;
    if (!text || !text.trim()) return;
    regex.lastIndex = 0;
    const matches = [...text.matchAll(regex)];
    if (!matches.length) return;

    const isFocused = sel && sel.focusNode === textNode;
    const curOffset = isFocused ? sel.focusOffset : null;
    if (isLiveTyping && isFocused) {
      const touching = matches.some((m) => curOffset >= m.index && curOffset <= m.index + m[0].length);
      if (touching) return;
    }

    const frag = document.createDocumentFragment();
    let lastIdx = 0;
    let restored = null;

    matches.forEach((m) => {
      const matchText = m[0];
      const startIdx = m.index;
      if (startIdx > lastIdx) {
        const pre = document.createTextNode(text.slice(lastIdx, startIdx));
        frag.appendChild(pre);
        if (curOffset !== null && curOffset >= lastIdx && curOffset <= startIdx) {
          restored = { node: pre, offset: curOffset - lastIdx };
        }
      }
      const ficha = mapByLower.get(matchText.toLowerCase());
      if (ficha) {
        const span = document.createElement("span");
        span.className = "ficha-ref";
        span.spellcheck = false;
        span.dataset.fichaId = ficha.id;
        span.style.setProperty("--ficha-color", ficha.color || "#6889B5");
        const inner = document.createTextNode(matchText);
        span.appendChild(inner);
        frag.appendChild(span);
        if (curOffset !== null && curOffset > startIdx && curOffset <= startIdx + matchText.length) {
          restored = { node: inner, offset: curOffset - startIdx };
        }
      }
      lastIdx = startIdx + matchText.length;
    });

    if (lastIdx < text.length) {
      const post = document.createTextNode(text.slice(lastIdx));
      frag.appendChild(post);
      if (curOffset !== null && curOffset >= lastIdx) {
        restored = { node: post, offset: curOffset - lastIdx };
      }
    }

    textNode.replaceWith(frag);
    if (restored && sel) {
      const r = document.createRange();
      r.setStart(restored.node, Math.min(restored.node.length, restored.offset));
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  });
}

function syncXRayHighlights(containerEl, isLiveTyping = false) {
  if (!containerEl) return;
  const sel = window.getSelection();
  if (isLiveTyping && sel && !sel.isCollapsed) return;

  const focusNode = sel && sel.rangeCount > 0 ? sel.focusNode : null;
  const focusOffset = sel && sel.rangeCount > 0 ? sel.focusOffset : 0;

  // 1) Limpiar marcas previas de Rayos X preservando cursor si aplica
  containerEl.querySelectorAll("span.xray-repeat").forEach((sp) => {
    const hasCaret = sp.contains(focusNode);
    const tn = document.createTextNode(sp.textContent);
    sp.replaceWith(tn);
    if (hasCaret && sel) {
      const r = document.createRange();
      r.setStart(tn, Math.min(tn.length, focusOffset));
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  });
  containerEl.querySelectorAll(".xray-dialogue").forEach((el) => el.classList.remove("xray-dialogue"));

  if (!state.config.xray_mode) return;

  // 2) Analizar cada bloque (párrafo) para diálogos y palabras largas (>= 5 letras) repetidas >= 3 veces
  containerEl.querySelectorAll("p, blockquote, li").forEach((block) => {
    if (block.closest(".footnotes-section")) return;
    const rawText = (block.textContent || "").trim();
    if (!rawText) return;

    if (/^(—|–|-\s|«|")/.test(rawText) || rawText.includes("—")) {
      block.classList.add("xray-dialogue");
    }

    const words = rawText.toLowerCase().match(/[\p{L}]{5,}/gu) || [];
    if (words.length < 3) return;

    const counts = new Map();
    words.forEach((w) => counts.set(w, (counts.get(w) || 0) + 1));
    const repeated = [...counts.entries()].filter(([, c]) => c >= 3).map(([w]) => w);
    if (!repeated.length) return;

    const pattern = repeated.sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
    const rx = new RegExp(`(?<![\\p{L}\\p{N}_])(${pattern})(?![\\p{L}\\p{N}_])`, "giu");

    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (
          n.parentElement &&
          n.parentElement.closest("span.xray-repeat, span.ficha-ref, sup.footnote-ref, .footnotes-section")
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const tNodes = [];
    let tn;
    while ((tn = walker.nextNode())) tNodes.push(tn);

    tNodes.forEach((tNode) => {
      const val = tNode.nodeValue;
      if (!val || !val.trim()) return;
      rx.lastIndex = 0;
      const matches = [...val.matchAll(rx)];
      if (!matches.length) return;

      const isFocused = sel && sel.focusNode === tNode;
      const curOff = isFocused ? sel.focusOffset : null;
      if (isLiveTyping && isFocused) {
        const touching = matches.some((m) => curOff >= m.index && curOff <= m.index + m[0].length);
        if (touching) return;
      }

      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      let restored = null;

      matches.forEach((m) => {
        const mText = m[0];
        const sIdx = m.index;
        if (sIdx > lastIdx) {
          const pre = document.createTextNode(val.slice(lastIdx, sIdx));
          frag.appendChild(pre);
          if (curOff !== null && curOff >= lastIdx && curOff <= sIdx) {
            restored = { node: pre, offset: curOff - lastIdx };
          }
        }
        const totalRep = counts.get(mText.toLowerCase()) || 3;
        const sp = document.createElement("span");
        sp.className = "xray-repeat";
        sp.title = `Eco léxico: «${mText}» aparece ${totalRep} veces en este párrafo`;
        const inner = document.createTextNode(mText);
        sp.appendChild(inner);
        frag.appendChild(sp);
        if (curOff !== null && curOff > sIdx && curOff <= sIdx + mText.length) {
          restored = { node: inner, offset: curOff - sIdx };
        }
        lastIdx = sIdx + mText.length;
      });

      if (lastIdx < val.length) {
        const post = document.createTextNode(val.slice(lastIdx));
        frag.appendChild(post);
        if (curOff !== null && curOff >= lastIdx) {
          restored = { node: post, offset: curOff - lastIdx };
        }
      }

      tNode.replaceWith(frag);
      if (restored && sel) {
        const r = document.createRange();
        r.setStart(restored.node, Math.min(restored.node.length, restored.offset));
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    });
  });
}

function setupFichaHoverCard() {
  const card = document.getElementById("ficha-card");
  if (!card) return;
  let currentFichaId = null, anchor = null, openTimer = null, closeTimer = null;
  const cancelOpen = () => { clearTimeout(openTimer); openTimer = null; };
  const cancelClose = () => { clearTimeout(closeTimer); closeTimer = null; };
  const close = () => {
    cancelOpen(); cancelClose(); anchor = null; currentFichaId = null;
    card.classList.remove("open"); card.setAttribute("aria-hidden", "true");
  };
  const deferClose = () => {
    cancelOpen();
    // No reiniciar el plazo al cruzar otros elementos: el cierre tiene un límite real.
    if (closeTimer === null) closeTimer = setTimeout(close, 120);
  };
  card.setAttribute("aria-hidden", "true");
  card.addEventListener("mouseenter", cancelClose);
  card.addEventListener("mouseleave", deferClose);
  document.addEventListener("mouseout", (e) => {
    const ref = e.target.closest("span.ficha-ref, .wiki-mention");
    if (ref && !ref.contains(e.relatedTarget)) {
      if (card.contains(e.relatedTarget)) { cancelOpen(); cancelClose(); }
      else deferClose();
    }
  });

  document.addEventListener("mouseover", (e) => {
    const ref = e.target.closest("span.ficha-ref, .wiki-mention");
    if (ref) {
      if (e.buttons) { close(); return; }
      cancelClose();
      if (anchor === ref) return;
      cancelOpen(); anchor = ref;
      openTimer = setTimeout(() => {
      openTimer = null;
      if (!ref.isConnected || anchor !== ref) { close(); return; }
      const selection = getSelection();
      if (selection && !selection.isCollapsed) { close(); return; }
      const ficha = state.project.fichas.find((f) => f.id === ref.dataset.fichaId);
      if (!ficha) { close(); return; }
      currentFichaId = ficha.id;

      document.getElementById("fc-name").textContent = ficha.name;
      const catEl = document.getElementById("fc-cat");
      catEl.textContent = ficha.category || "General";
      catEl.style.setProperty("--pill-color", ficha.color || "#6889B5");
      document.getElementById("fc-desc").textContent = ficha.description || "Sin descripción.";
      const mentions = countFichaMentions(ficha.name);
      document.getElementById("fc-mentions").textContent = `${mentions} mención${mentions === 1 ? "" : "es"} en esta sección`;

      // Avatar en popover
      const avatarWrap = document.getElementById("fc-avatar-wrap");
      const avatarImg = document.getElementById("fc-avatar-img");
      if (avatarWrap && avatarImg) {
        if (ficha.image) {
          avatarImg.src = ficha.image;
          avatarWrap.hidden = false;
        } else {
          avatarImg.src = "";
          avatarWrap.hidden = true;
        }
      }

      // Propiedades estructuradas en popover
      const propsWrap = document.getElementById("fc-props");
      if (propsWrap) {
        const props = visibleFichaProps(ficha);
        if (props.length) {
          propsWrap.hidden = false;
          propsWrap.innerHTML = props
            .map(
              (p) =>
                `<div class="fc-prop-row"><span class="fc-prop-k"></span><span class="fc-prop-v"></span></div>`
            )
            .join("");
          const rows = propsWrap.querySelectorAll(".fc-prop-row");
          props.forEach((p, idx) => {
            if (rows[idx]) {
              rows[idx].querySelector(".fc-prop-k").textContent = `${String(p.key || "Dato").replace(/[:：\s]+$/, "").trim()}:`;
              rows[idx].querySelector(".fc-prop-v").textContent = p.value || "";
            }
          });
        } else {
          propsWrap.hidden = true;
          propsWrap.innerHTML = "";
        }
      }

      const rect = ref.getBoundingClientRect();
      card.classList.add("open");
      card.setAttribute("aria-hidden", "false");
      const cardH = card.offsetHeight || 210;
      const left = Math.max(12, Math.min(window.innerWidth - card.offsetWidth - 12, rect.left));
      const top = rect.bottom + 8 + cardH > window.innerHeight ? rect.top - cardH - 8 : rect.bottom + 8;
      card.style.left = `${Math.round(left)}px`;
      card.style.top = `${Math.round(Math.max(48, top))}px`;
      }, 160);
    } else if (!e.target.closest("#ficha-card")) {
      if (anchor || card.classList.contains("open")) deferClose();
    }
  });
  document.addEventListener("pointerdown", e => { if (!card.contains(e.target)) close(); }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape" || !card.contains(e.target)) close(); }, true);
  document.addEventListener("scroll", e => { if (!card.contains(e.target)) close(); }, true);
  document.documentElement.addEventListener("mouseleave", close);
  document.addEventListener("visibilitychange", () => { if (document.hidden) close(); });
  window.addEventListener("blur", close); window.addEventListener("resize", close);

  document.getElementById("fc-edit").addEventListener("click", () => {
    const id = currentFichaId; close();
    if (id) openFichaModal(id);
  });

  const fcCite = document.getElementById("fc-cite");
  if (fcCite) {
    fcCite.addEventListener("click", () => {
      const id = currentFichaId; close();
      if (id) openCitationModal(id);
    });
  }
}

function countFichaMentions(name) {
  if (!name) return 0;
  const sheet = getActiveSheet();
  if (!sheet) return 0;
  const htmlText = (sheet.pages || []).join(" ");
  const tmp = document.createElement("div");
  tmp.innerHTML = htmlText;
  const rx = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(name.trim())}(?![\\p{L}\\p{N}_])`, "giu");
  return ((tmp.textContent || "").match(rx) || []).length;
}

/* ==========================================================================
   10. CONTROL DE IMÁGENES PEGADAS O INSERTADAS (REDIMENSIONADO Y ALINEACIÓN)
   ========================================================================== */
async function pickAndInsertImage() {
  const res = await apiPost("/api/file/pick-image", {});
  if (res && res.ok && res.data_url) {
    insertImageDataUrl(res.data_url);
  }
}

function insertImageDataUrl(dataUrl) {
  restoreSelection(false);
  const ed = getActiveRichEditor();
  if (!ed) return;
  if (document.activeElement !== ed) ed.focus();

  const img = document.createElement("img");
  img.src = dataUrl;
  img.style.maxWidth = "100%";
  img.style.height = "auto";
  img.style.width = "75%";

  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && ed.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    const r = sel.getRangeAt(0);
    r.deleteContents();
    r.insertNode(img);
  } else {
    ed.appendChild(img);
  }

  selectImageElement(img);
  scheduleProjectSave();
}

function selectImageElement(imgEl) {
  deselectImage();
  selectedImageEl = imgEl;
  imgEl.classList.add("img-selected");
  updateImageResizerOverlay();
}

function deselectImage() {
  if (selectedImageEl) {
    selectedImageEl.classList.remove("img-selected");
    selectedImageEl = null;
  }
  const box = document.getElementById("img-resizer");
  if (box) box.classList.remove("open");
}

function updateImageResizerOverlay() {
  const box = document.getElementById("img-resizer");
  if (!box || !selectedImageEl || !document.body.contains(selectedImageEl)) {
    deselectImage();
    return;
  }
  const rect = selectedImageEl.getBoundingClientRect();
  box.classList.add("open");
  box.style.left = `${Math.round(rect.left)}px`;
  box.style.top = `${Math.round(rect.top)}px`;
  box.style.width = `${Math.round(rect.width)}px`;
  box.style.height = `${Math.round(rect.height)}px`;
}

function setupImageResizerEvents() {
  const box = document.getElementById("img-resizer");
  if (!box) return;

  box.querySelectorAll(".img-bar button[data-img]").forEach((btn) => {
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", () => {
      if (!selectedImageEl) return;
      const act = btn.dataset.img;
      if (["25", "50", "75", "100"].includes(act)) {
        selectedImageEl.style.width = `${act}%`;
        selectedImageEl.style.maxWidth = "100%";
        selectedImageEl.style.height = "auto";
      } else if (act === "left") {
        selectedImageEl.style.marginLeft = "0";
        selectedImageEl.style.marginRight = "auto";
      } else if (act === "center") {
        selectedImageEl.style.marginLeft = "auto";
        selectedImageEl.style.marginRight = "auto";
      } else if (act === "right") {
        selectedImageEl.style.marginLeft = "auto";
        selectedImageEl.style.marginRight = "0";
      } else if (act === "delete") {
        selectedImageEl.remove();
        deselectImage();
        scheduleProjectSave();
        return;
      }
      updateImageResizerOverlay();
      scheduleProjectSave();
    });
  });

  box.querySelectorAll(".handle[data-h]").forEach((handle) => {
    handle.addEventListener("mousedown", (e) => {
      if (!selectedImageEl) return;
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = selectedImageEl.getBoundingClientRect().width;
      const dir = handle.dataset.h.includes("w") ? -1 : 1;
      const parentW = selectedImageEl.parentElement?.clientWidth || 600;

      const onMove = (ev) => {
        const nextW = Math.max(60, Math.min(parentW, startW + (ev.clientX - startX) * dir));
        selectedImageEl.style.width = `${Math.round(nextW)}px`;
        selectedImageEl.style.maxWidth = "100%";
        selectedImageEl.style.height = "auto";
        updateImageResizerOverlay();
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        scheduleProjectSave();
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  });
}

/* ==========================================================================
   11. RENDERIZADO PRINCIPAL (CHROME, PÁGINAS A4, PIZARRA, NOTAS, PARALELO)
   ========================================================================== */
function renderAll(forcePages = false) {
  renderTopChrome();
  if (forcePages) {
    renderPagesStack();
  }
  if (state.config.page.view_mode === "corkboard") {
    renderCorkboardView();
  }
  renderParallelPane();
  renderMarginNotes();
  renderSheetTabs();
  renderWikiPanel();
  renderLayersPanel();
  renderScrapsDrawer();
  updateStatusBar();
  window.StrataV8?.render();
}

function applyEditorTypographyVars() {
  const ed = state.config.editor;
  document.documentElement.style.setProperty("--editor-font", `"${ed.font_family || "Georgia"}", Georgia, serif`);
  document.documentElement.style.setProperty("--editor-size", `${ed.font_size || 16}px`);
  document.documentElement.style.setProperty("--editor-lh", String(ed.line_height || 1.75));
  document.documentElement.style.setProperty("--left-w", `${state.config.layout.left_width || 268}px`);
  document.documentElement.style.setProperty("--right-w", `${state.config.layout.right_width || 292}px`);
  document.documentElement.style.setProperty("--scraps-h", `${state.config.layout.scraps_height || 150}px`);

  const sheetLayout = document.getElementById("sheet-layout");
  if (sheetLayout) {
    sheetLayout.style.zoom = `${ed.zoom || 100}%`;
  }
}

function renderTopChrome() {
  updateDirtyIndicator();
  const cfg = state.config;
  document.body.dataset.theme = cfg.theme || "grafito";
  document.body.dataset.pageMargin = cfg.page.margin || "normal";
  document.body.classList.toggle("xray-active", Boolean(cfg.xray_mode));

  const xrayBtn = document.getElementById("btn-xray");
  if (xrayBtn) {
    xrayBtn.classList.toggle("on", Boolean(cfg.xray_mode));
  }

  // Visibilidad individual de paneles
  document.body.classList.toggle("hide-wiki", !cfg.panels.wiki);
  document.body.classList.toggle("hide-layers", !cfg.panels.layers);
  document.body.classList.toggle("hide-scraps", !cfg.panels.scraps);
  document.body.classList.toggle("hide-toolbar", !cfg.panels.toolbar || cfg.ribbon_collapsed);

  // Modo foco progresivo (0, 1, 2, 3)
  document.body.classList.remove("focus-1", "focus-2", "focus-3");
  if (cfg.focus_level >= 1 && cfg.focus_level <= 3) {
    document.body.classList.add(`focus-${cfg.focus_level}`);
  }
  const focusBtn = document.getElementById("btn-focus");
  const focusLbl = document.getElementById("focus-label");
  if (focusBtn && focusLbl) {
    focusBtn.classList.toggle("on", cfg.focus_level > 0);
    const names = ["Foco", "Foco 1", "Foco 2", "Zen"];
    focusLbl.textContent = names[cfg.focus_level] || "Foco";
  }

  // Interruptores superiores de paneles
  document.querySelectorAll(".panel-toggles .toggle-chip[data-panel]").forEach((btn) => {
    const key = btn.dataset.panel;
    const isOn = key === "toolbar" ? cfg.panels.toolbar && !cfg.ribbon_collapsed : Boolean(cfg.panels[key]);
    btn.classList.toggle("on", isOn);
  });

  // Título y chip de archivo
  const titleInput = document.getElementById("doc-title");
  if (titleInput && document.activeElement !== titleInput) {
    titleInput.value = state.project.document.title || "";
  }
  const fileChip = document.getElementById("file-chip");
  if (fileChip) fileChip.textContent = state.meta.fileName || "";

  // Controles de la cinta
  setFontControls(cfg.editor.font_family || "Georgia");
  document.getElementById("rb-line-height").value = String(cfg.editor.line_height || 1.75);
  document.getElementById("rb-zoom").value = String(cfg.editor.zoom || 100);

  const viewMode = cfg.page.view_mode || "pages";
  document.querySelectorAll("#seg-view button[data-view]").forEach((b) => {
    b.classList.toggle("on", b.dataset.view === viewMode);
  });

  const isCorkboard = viewMode === "corkboard";
  const sheetLayout = document.getElementById("sheet-layout");
  const corkboardView = document.getElementById("corkboard-view");
  if (sheetLayout) sheetLayout.hidden = isCorkboard;
  if (corkboardView) {
    corkboardView.hidden = !isCorkboard;
    if (isCorkboard) {
      hideTableToolbar();
      deselectImage();
      renderCorkboardView();
    }
  }

  const stack = document.getElementById("pages-stack");
  if (stack) {
    stack.classList.toggle("continuous", viewMode === "continuous");
  }

  // Atajos en el menú Archivo
  document.querySelectorAll("kbd[data-sc]").forEach((k) => {
    k.textContent = cfg.shortcuts[k.dataset.sc] || "";
  });

  applyEditorTypographyVars();
}

function renderCorkboardView() {
  const grid = document.getElementById("corkboard-grid");
  if (!grid) return;
  syncDOMPagesToState();

  const sheets = state.project.document.sheets || [];
  const activeId = getActiveSheet().id;
  grid.innerHTML = "";

  sheets.forEach((sheet, idx) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = (sheet.pages || []).join(" ");
    const plain = (tmp.textContent || "").replace(/\s+/g, " ").trim();
    const words = plain ? plain.split(/\s+/).length : 0;
    const notesCount = (sheet.layers || []).reduce(
      (acc, l) => acc + (Array.isArray(l.annotations) ? l.annotations.length : 0),
      0
    );
    const layersCount = Math.max(1, (sheet.layers || []).length);

    const card = document.createElement("div");
    card.className = `cb-card ${sheet.id === activeId ? "active" : ""}`.trim();
    card.draggable = true;
    card.dataset.sheetId = sheet.id;

    card.innerHTML = `
      <div class="cb-card-head">
        <span class="cb-num">#${idx + 1}</span>
        <div class="cb-title"></div>
        <span class="drag-grip" title="Arrastra para reordenar"><i class="ic" data-i="grip"></i></span>
      </div>
      <div class="cb-excerpt"></div>
      <div class="cb-foot">
        <div class="cb-stats">
          <span><b>${words}</b> pal.</span>
          <span><b>${(sheet.pages || []).length}</b> pág.</span>
          <span><b>${layersCount}</b> cap. · <b>${notesCount}</b> notas</span>
        </div>
        <button type="button" class="cb-open-btn">Abrir →</button>
      </div>
    `;
    card.querySelector(".cb-title").textContent = sheet.title || `Sección ${idx + 1}`;
    card.querySelector(".cb-excerpt").textContent =
      plain.slice(0, 220) || "Sección vacía. Haz clic para comenzar a redactar.";
    injectIcons(card);

    card.addEventListener("click", () => {
      state.project.document.active_sheet_id = sheet.id;
      state.config.page.view_mode = "pages";
      state.ui.activePageIndex = 0;
      renderAll(true);
      scheduleConfigSave();
      scheduleProjectSave();
    });

    card.addEventListener("dragstart", (e) => {
      state.ui.draggedCorkboardSheetId = sheet.id;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", sheet.id);
    });

    card.addEventListener("dragend", () => {
      state.ui.draggedCorkboardSheetId = null;
      card.classList.remove("dragging");
      grid.querySelectorAll(".cb-card").forEach((c) => c.classList.remove("drag-over"));
    });

    card.addEventListener("dragover", (e) => {
      if (!state.ui.draggedCorkboardSheetId || state.ui.draggedCorkboardSheetId === sheet.id) return;
      e.preventDefault();
      card.classList.add("drag-over");
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("drag-over");
    });

    card.addEventListener("drop", (e) => {
      e.preventDefault();
      card.classList.remove("drag-over");
      const draggedId = state.ui.draggedCorkboardSheetId;
      if (!draggedId || draggedId === sheet.id) return;
      const fromIdx = sheets.findIndex((s) => s.id === draggedId);
      const toIdx = sheets.findIndex((s) => s.id === sheet.id);
      if (fromIdx < 0 || toIdx < 0) return;
      const [moved] = sheets.splice(fromIdx, 1);
      sheets.splice(toIdx, 0, moved);
      renderCorkboardView();
      renderSheetTabs();
      scheduleProjectSave();
      showToast("Orden de secciones actualizado");
    });

    grid.appendChild(card);
  });
}

function renderPagesStack() {
  deselectImage();
  hideTableToolbar();
  const stack = document.getElementById("pages-stack");
  if (!stack) return;
  const sheet = getActiveSheet();
  if (!sheet) return;

  stack.innerHTML = "";
  stack.classList.toggle("continuous", state.config.page.view_mode === "continuous");
  const pages = sheet.pages || ["<p><br></p>"];

  pages.forEach((pageHtml, idx) => {
    const pageEl = document.createElement("div");
    pageEl.className = "a4-page";
    pageEl.dataset.pageIndex = String(idx);

    const meta = document.createElement("div");
    meta.className = "page-meta";
    meta.innerHTML = `
      <span>${sheet.title} · Página ${idx + 1}</span>
      ${pages.length > 1 ? `<button class="btn-del-page" title="Eliminar esta página">Eliminar página</button>` : `<span></span>`}
    `;
    const delBtn = meta.querySelector(".btn-del-page");
    if (delBtn) {
      delBtn.addEventListener("click", () => {
        syncDOMPagesToState();
        if (sheet.pages.length <= 1) return;
        sheet.pages.splice(idx, 1);
        state.ui.activePageIndex = Math.max(0, idx - 1);
        renderPagesStack();
        renderMarginNotes();
        updateStatusBar();
        scheduleProjectSave();
      });
    }

    const editor = document.createElement("div");
    editor.className = "page-editor rich-editor";
    editor.contentEditable = "true";
    editor.setAttribute("role", "textbox");
    editor.setAttribute("aria-multiline", "true");
    editor.setAttribute("aria-label", `Texto de ${sheet.title} · Página ${idx + 1}`);
    editor.spellcheck = true;
    editor.lang = "es";
    editor.dataset.pageIndex = String(idx);
    editor.innerHTML = pageHtml || "<p><br></p>";

    ensureParagraphIds(editor);
    editor.querySelectorAll("img").forEach((img) => {
      img.style.maxWidth = "100%";
      img.style.height = "auto";
    });
    syncFichaHighlights(editor, false);
    syncXRayHighlights(editor, false);

    bindRichEditorEvents(editor, idx);

    const foot = document.createElement("div");
    foot.className = "page-foot";
    foot.innerHTML = `
      <span>Página ${idx + 1} de ${pages.length}</span>
      <button class="add-page"><i class="ic" data-i="plus"></i><span>Añadir página A4</span></button>
    `;
    injectIcons(foot);
    foot.querySelector(".add-page").addEventListener("click", () => addNewA4Page(idx));

    pageEl.appendChild(meta);
    pageEl.appendChild(editor);
    pageEl.appendChild(foot);
    stack.appendChild(pageEl);
  });

  requestAnimationFrame(() => renderMarginNotes());
  window.StrataV8?.editors();
}

function bindRichEditorEvents(editor, pageIdx = 0) {
  editor.addEventListener("focus", () => {
    state.ui.activePageIndex = pageIdx;
  });

  editor.addEventListener("beforeinput", e => window.StrataEditorial?.baseInput(e, editor));
  editor.addEventListener("keydown", (e) => handleEditorKeyDown(e, editor));

  editor.addEventListener("input", () => {
    state.ui.activePageIndex = pageIdx;
    ensureParagraphIds(editor);
    applyLiveAutoFormat(editor);
    syncFichaHighlights(editor, true);
    if (state.config.xray_mode) {
      syncXRayHighlights(editor, true);
    }
    syncDOMPagesToState();
    updateStatusBar();
    renderMarginNotes();
    if (selectedImageEl) updateImageResizerOverlay();
    scheduleProjectSave();
  });

  editor.addEventListener("mouseup", () => {
    setTimeout(() => captureSelectionAndSyncToolbar(true), 10);
  });

  editor.addEventListener("keyup", () => {
    captureSelectionAndSyncToolbar(false);
  });

  editor.addEventListener("click", (e) => {
    const img = e.target.closest("img");
    if (img && editor.contains(img)) {
      selectImageElement(img);
    } else if (selectedImageEl) {
      deselectImage();
    }

    const cell = e.target.closest("table.strata-table td, table.strata-table th");
    if (cell && editor.contains(cell)) {
      selectTableCell(cell);
    } else {
      hideTableToolbar();
    }

    const fnRef = e.target.closest("sup.footnote-ref");
    if (fnRef && editor.contains(fnRef)) {
      const fnNum = (fnRef.dataset.fn || fnRef.textContent || "").replace(/\D+/g, "");
      const sec = editor.querySelector(".footnotes-section");
      if (sec) {
        const items = sec.querySelectorAll(".footnote-item");
        const targetItem = items[Math.max(0, (parseInt(fnNum, 10) || 1) - 1)] || sec;
        targetItem.scrollIntoView({ behavior: "smooth", block: "center" });
        targetItem.classList.remove("anchor-flash");
        void targetItem.offsetWidth;
        targetItem.classList.add("anchor-flash");
      }
    }
  });

  // Pegado de imágenes y limpieza opcional de formato externo
  editor.addEventListener("paste", (e) => {
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) return;
        const reader = new FileReader();
        reader.onload = (ev) => insertImageDataUrl(ev.target.result);
        reader.readAsDataURL(blob);
        return;
      }
    }
    if (state.config.autoformat.sanitize_paste) {
      const htmlData = e.clipboardData?.getData("text/html");
      const plainData = e.clipboardData?.getData("text/plain");
      if (htmlData) {
        e.preventDefault();
        const clean = sanitizeExternalHtml(htmlData);
        document.execCommand("insertHTML", false, clean);
        ensureParagraphIds(editor);
        scheduleProjectSave();
      } else if (plainData) {
        e.preventDefault();
        document.execCommand("insertText", false, plainData);
        scheduleProjectSave();
      }
    }
  });

  // Arrastrar selección hacia el cajón de recortes
  editor.addEventListener("dragstart", () => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      state.ui.draggedSelectionText = sel.toString();
    }
  });

  // 4. DRAG & DROP DE CAPAS DIRECTAMENTE SOBRE CUALQUIER PÁRRAFO + RECORTES
  editor.addEventListener("dragover", (e) => {
    const layerId = state.ui.draggedLayerId;
    const scrapId = state.ui.draggedScrapId;
    if (!layerId && !scrapId) return;
    e.preventDefault();

    if (layerId) {
      const layer = getSheetLayers().find((l) => l.id === layerId);
      const targetBlock = findParagraphUnderPoint(editor, e.clientX, e.clientY);
      clearDropTargetHighlights();
      if (targetBlock && layer) {
        targetBlock.classList.add("drop-target");
        targetBlock.style.setProperty("--drop-c", layer.color || "#6366F1");
        showDropHint(e.clientX, e.clientY, `+ Anclar nota de «${layer.name}»`, layer.color);
      }
    }
  });

  editor.addEventListener("dragleave", (e) => {
    if (!editor.contains(e.relatedTarget)) {
      clearDropTargetHighlights();
      hideDropHint();
    }
  });

  editor.addEventListener("drop", (e) => {
    clearDropTargetHighlights();
    hideDropHint();

    // Caso A: Soltar una Capa sobre un párrafo -> crear nota anclada y enfocarla
    const layerId = e.dataTransfer?.getData("application/x-strata-layer") || state.ui.draggedLayerId;
    if (layerId) {
      e.preventDefault();
      state.ui.draggedLayerId = null;
      const targetBlock = findParagraphUnderPoint(editor, e.clientX, e.clientY) || editor.querySelector("p, h1, h2, h3");
      if (targetBlock) {
        ensureParagraphIds(editor);
        anchorNewNoteToBlock(layerId, targetBlock);
      }
      return;
    }

    // Caso B: Soltar un Recorte en la hoja
    const scrapId = e.dataTransfer?.getData("application/x-strata-scrap") || state.ui.draggedScrapId;
    if (scrapId) {
      e.preventDefault();
      state.ui.draggedScrapId = null;
      const scrap = state.project.scraps.find((s) => s.id === scrapId);
      if (!scrap) return;
      editor.focus({ preventScroll: true });

      if (document.caretRangeFromPoint) {
        const r = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (r && editor.contains(r.startContainer)) {
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(r);
          lastCaretRange = r.cloneRange();
        } else return;
      }
      document.execCommand("insertText", false, scrap.text);
      state.project.scraps = state.project.scraps.filter((s) => s.id !== scrapId);
      renderScrapsDrawer();
      scheduleProjectSave();
    }
  });
}

function sanitizeExternalHtml(rawHtml) {
  const doc = new DOMParser().parseFromString(rawHtml, "text/html");
  const allowedTags = new Set([
    "P", "H1", "H2", "H3", "STRONG", "B", "EM", "I", "U", "S",
    "UL", "OL", "LI", "BLOCKQUOTE", "BR", "HR", "SUP",
    "TABLE", "THEAD", "TBODY", "TR", "TH", "TD"
  ]);
  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.nodeValue);
    if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
    const tag = node.tagName.toUpperCase();
    const frag = document.createDocumentFragment();
    node.childNodes.forEach((ch) => frag.appendChild(cleanNode(ch)));
    if (allowedTags.has(tag)) {
      const el = document.createElement(tag.toLowerCase());
      if (tag === "P") el.dataset.pid = uid("p");
      if (tag === "TABLE") el.className = "strata-table";
      el.appendChild(frag);
      return el;
    }
    return frag;
  }
  const wrapper = document.createElement("div");
  doc.body.childNodes.forEach((ch) => wrapper.appendChild(cleanNode(ch)));
  return wrapper.innerHTML;
}

function findParagraphUnderPoint(editorEl, x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el || !editorEl.contains(el)) return null;
  const block = el.closest("p, h1, h2, h3, blockquote, li");
  return block && editorEl.contains(block) ? block : null;
}

function clearDropTargetHighlights() {
  document.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
}

function showDropHint(x, y, text, color) {
  const hint = document.getElementById("drop-hint");
  if (!hint) return;
  hint.textContent = text;
  hint.style.setProperty("--c", color || "var(--accent)");
  hint.style.left = `${x + 14}px`;
  hint.style.top = `${y + 14}px`;
  hint.classList.add("open");
}

function hideDropHint() {
  const hint = document.getElementById("drop-hint");
  if (hint) hint.classList.remove("open");
}

function addNewA4Page(afterIndex = null) {
  syncDOMPagesToState();
  const sheet = getActiveSheet();
  if (!sheet) return;
  const idx = afterIndex !== null ? afterIndex + 1 : sheet.pages.length;
  sheet.pages.splice(idx, 0, `<p data-pid="${uid("p")}"><br></p>`);
  state.ui.activePageIndex = idx;
  renderPagesStack();
  updateStatusBar();
  scheduleProjectSave();

  requestAnimationFrame(() => {
    const newEd = document.querySelector(`.page-editor[data-page-index="${idx}"]`);
    if (newEd) {
      newEd.focus();
      newEd.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
  showToast(`Página ${idx + 1} añadida`);
}

/* ==========================================================================
   12. ANOTACIONES DE CAPA ANCLADAS A PÁRRAFOS Y VISTA PARALELA
   ========================================================================== */
function getAllBlocksInActiveSheet() {
  return [...document.querySelectorAll("#pages-stack .page-editor")].flatMap((ed) => [
    ...ed.querySelectorAll("p, h1, h2, h3, blockquote, li")
  ]);
}

function anchorNewNoteToBlock(layerId, blockEl, quoteText = "") {
  const layers = getSheetLayers();
  let layer = layers.find((l) => l.id === layerId);
  if (!layer || layer.is_base) {
    layer = layers.find((l) => !l.is_base);
  }
  if (!layer) {
    showToast("Crea primero una capa superior en este capítulo para anclar notas");
    return;
  }

  layer.visible = true;
  setActiveLayerId(layer.id);

  if (!blockEl.dataset.pid) blockEl.dataset.pid = uid("p");
  const allBlocks = getAllBlocksInActiveSheet();
  const pIndex = Math.max(1, allBlocks.indexOf(blockEl) + 1);

  const newAnn = {
    id: uid("ann"),
    sheet_id: getActiveSheet().id,
    anchor_pid: blockEl.dataset.pid,
    anchor_paragraph: pIndex,
    quote: quoteText || "",
    text: ""
  };

  layer.annotations = layer.annotations || [];
  layer.annotations.push(newAnn);

  blockEl.classList.remove("anchor-flash");
  void blockEl.offsetWidth;
  blockEl.classList.add("anchor-flash");

  syncDOMPagesToState();
  renderLayersPanel();
  renderMarginNotes(newAnn.id);
  scheduleProjectSave();
}

function createMarginNoteAtSelection() {
  hideMiniToolbar();
  restoreSelection(true);
  const sel = window.getSelection();
  let blockEl = null;
  let quote = "";

  if (sel && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0);
    if (!r.collapsed) quote = r.toString().trim().slice(0, 90);
    const node = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
    blockEl = node?.closest("p, h1, h2, h3, blockquote, li");
  }

  if (!blockEl) {
    const ed = getActiveRichEditor();
    blockEl = ed?.querySelector("p, h1, h2, h3, blockquote, li");
  }
  if (!blockEl) return;

  const targetLayer = getActiveLayer();
  anchorNewNoteToBlock(targetLayer ? targetLayer.id : null, blockEl, quote);
}

function renderMarginNotes(focusNoteId = null) {
  const col = document.getElementById("notes-col");
  const layout = document.getElementById("sheet-layout");
  if (!col || !layout) return;

  const activeSheetId = getActiveSheet().id;
  const visibleLayers = getSortedLayers().filter((l) => !l.is_base && l.visible !== false);

  const items = [];
  visibleLayers.forEach((layer) => {
    (layer.annotations || []).forEach((ann) => {
      if (!ann.sheet_id || ann.sheet_id === activeSheetId) {
        items.push({ layer, ann });
      }
    });
  });

  col.innerHTML = "";
  if (!items.length) return;

  const allBlocks = getAllBlocksInActiveSheet();
  const layoutRect = layout.getBoundingClientRect();
  const zoomFactor = (state.config.editor.zoom || 100) / 100;

  // Calcular posición vertical de cada nota alineada con su párrafo anclado
  const positioned = items.map(({ layer, ann }) => {
    let block = allBlocks.find((b) => b.dataset.pid && b.dataset.pid === ann.anchor_pid);
    if (!block && ann.anchor_paragraph) {
      block = allBlocks[Math.min(allBlocks.length - 1, Math.max(0, ann.anchor_paragraph - 1))];
    }
    let desiredTop = 16;
    if (block) {
      const bRect = block.getBoundingClientRect();
      desiredTop = Math.max(0, (bRect.top - layoutRect.top) / zoomFactor - 40);
    }
    return { layer, ann, block, desiredTop };
  });

  positioned.sort((a, b) => a.desiredTop - b.desiredTop);

  let minTop = 0;
  positioned.forEach(({ layer, ann, block, desiredTop }) => {
    const card = document.createElement("div");
    card.className = "note-card strata-layer-annotation";
    card.dataset.export = "ignore";
    card.dataset.noteId = ann.id;
    card.style.setProperty("--c", layer.color || "#C98F45");
    card.style.opacity = String((layer.opacity ?? 100) / 100);

    const top = Math.max(minTop, Math.round(desiredTop));
    card.style.top = `${top}px`;

    card.innerHTML = `
      <div class="nc-head">
        <span class="nc-layer" title="Ir al párrafo anclado">${layer.name}</span>
        <button class="icon-btn btn-del-note" title="Eliminar nota"><i class="ic" data-i="x"></i></button>
      </div>
      ${ann.quote ? `<div class="nc-quote">«${ann.quote}»</div>` : ""}
      <div class="nc-body" contenteditable="true" spellcheck="true"></div>
    `;
    injectIcons(card);

    const bodyEl = card.querySelector(".nc-body");
    bodyEl.textContent = ann.text || "";

    bodyEl.addEventListener("focus", () => {
      card.classList.add("focused");
      if (block) {
        block.classList.remove("anchor-flash");
        void block.offsetWidth;
        block.classList.add("anchor-flash");
      }
    });
    bodyEl.addEventListener("blur", () => card.classList.remove("focused"));

    bodyEl.addEventListener("input", () => {
      ann.text = bodyEl.textContent;
      scheduleProjectSave();
    });

    card.querySelector(".nc-layer").addEventListener("click", () => {
      if (block) {
        block.scrollIntoView({ behavior: "smooth", block: "center" });
        block.classList.remove("anchor-flash");
        void block.offsetWidth;
        block.classList.add("anchor-flash");
      }
    });

    card.querySelector(".btn-del-note").addEventListener("click", () => {
      layer.annotations = (layer.annotations || []).filter((a) => a.id !== ann.id);
      renderMarginNotes();
      renderLayersPanel();
      scheduleProjectSave();
    });

    col.appendChild(card);
    minTop = top + (card.offsetHeight || 86) + 10;

    if (focusNoteId && ann.id === focusNoteId) {
      requestAnimationFrame(() => {
        bodyEl.focus();
      });
    }
  });
}

function renderParallelPane() {
  const pane = document.getElementById("parallel-pane");
  const editor = document.getElementById("parallel-editor");
  if (!pane || !editor) return;

  const layer = getSheetLayers().find((l) => l.id === state.ui.parallelLayerId && !l.is_base);
  if (!layer) {
    pane.hidden = true;
    state.ui.parallelLayerId = null;
    return;
  }

  pane.hidden = false;
  pane.style.setProperty("--c", layer.color || "#C98F45");
  document.getElementById("parallel-dot").style.background = layer.color || "#C98F45";
  document.getElementById("parallel-title").textContent = layer.name;

  if (document.activeElement !== editor) {
    editor.innerHTML = layer.overlay_html || "<p><br></p>";
    syncFichaHighlights(editor, false);
  }
}

/* ==========================================================================
   13. PANEL IZQUIERDO (WIKI), PANEL DERECHO (CAPAS), RECORTES Y PESTAÑAS
   ========================================================================== */
function renderWikiPanel() {
  const catsEl = document.getElementById("ficha-cats");
  const listEl = document.getElementById("ficha-list");
  if (!catsEl || !listEl) return;

  const fichas = state.project.fichas || [];
  const categories = ["ALL", ...new Set([...(state.project.categories || []).map(c => c.name), ...fichas.map((f) => f.category || "General")])];
  if (!categories.includes(state.ui.fichaCategory)) state.ui.fichaCategory = "ALL";

  catsEl.innerHTML = "";
  categories.forEach((cat) => {
    const b = document.createElement("button");
    b.className = state.ui.fichaCategory === cat ? "on" : "";
    b.textContent = cat === "ALL" ? "Todas" : cat;
    b.addEventListener("click", () => {
      state.ui.fichaCategory = cat;
      renderWikiPanel();
    });
    catsEl.appendChild(b);
  });
  window.StrataV8?.categoryControls(catsEl);

  const q = (state.ui.fichaSearch || "").trim().toLowerCase();
  const filtered = fichas.filter((f) => {
    const matchCat = state.ui.fichaCategory === "ALL" || (f.category || "General") === state.ui.fichaCategory;
    const propsText = Array.isArray(fichaProps(f))
      ? fichaProps(f).map((p) => `${p.key} ${p.value}`).join(" ").toLowerCase()
      : "";
    const matchQ =
      !q ||
      f.name.toLowerCase().includes(q) ||
      (f.description || "").toLowerCase().includes(q) ||
      propsText.includes(q);
    return matchCat && matchQ && (!window.Strata95 || Strata95.matchesWiki(f));
  });

  listEl.innerHTML = "";
  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty-hint">Sin fichas en esta vista.<br>Pulsa + para añadir fuentes, datos, personajes o conceptos.</div>`;
    return;
  }

  filtered.forEach((ficha) => {
    const row = document.createElement("div");
    row.dataset.fichaId = ficha.id;
    row.className = `ficha-row view-${ficha.card_view || state.config.wiki_view || "portrait"}`;
    row.tabIndex = 0; row.setAttribute("role", "button"); row.setAttribute("aria-label", `${ficha.name} · Abrir ficha`);
    row.style.setProperty("--c", ficha.color || "#6889B5");
    const initial = (ficha.name || "?").trim().charAt(0).toUpperCase();
    const props = visibleFichaProps(ficha).slice(0, 3);

    row.innerHTML = `
      <div class="fr-avatar">
        ${ficha.image ? `<img alt="" />` : `<span>${initial}</span>`}
      </div>
      <div class="fr-main">
        <div class="fr-top">
          <span class="fr-name"></span>
          <span class="pill" style="--pill-color:${ficha.color || "#6889B5"}"></span>
        </div>
        <div class="fr-desc"></div>
        ${props.length ? `<div class="fr-props"></div>` : ""}
      </div>
    `;
    if (ficha.image) row.querySelector(".fr-avatar img").src = ficha.image;
    row.querySelector(".fr-name").textContent = ficha.name;
    row.querySelector(".pill").textContent = ficha.category || "General";
    row.querySelector(".fr-desc").textContent = ficha.description || "";

    const propsEl = row.querySelector(".fr-props");
    if (propsEl && props.length) {
      props.forEach((p) => {
        const chip = document.createElement("span");
        chip.className = "fr-prop-chip";
        const b = document.createElement("b");
        b.textContent = `${String(p.key || "").replace(/[:：\s]+$/, "").trim()}: `;
        chip.appendChild(b);
        chip.appendChild(document.createTextNode(p.value));
        propsEl.appendChild(chip);
      });
    }

    row.addEventListener("contextmenu", e => { e.preventDefault(); e.stopPropagation(); closeAllMenusAndPopovers(); openFichaModal(ficha.id); });
    row.addEventListener("click", () => window.Strata95 ? Strata95.inspectFicha(ficha) : openFichaModal(ficha.id));
    row.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); row.click(); }
    });
    row.querySelector(".fr-avatar").addEventListener("click", (e) => {
      if (!ficha.image) return;
      e.stopPropagation();
      window.StrataV8?.lightbox(ficha.image, ficha.name);
    });
    if (!ficha.image) row.querySelector(".fr-avatar")?.remove();
    listEl.appendChild(row);
  });
}

function fichaProps(ficha) {
  if (!ficha || !Array.isArray(ficha.properties)) return [];
  return ficha.properties.filter((p) => p && (String(p.key || "").trim() || String(p.value || "").trim()));
}

function visibleFichaProps(ficha) {
  const narrative = /^(personajes?|lugares?|lugar)$/i.test((ficha.category || "").trim());
  return fichaProps(ficha).filter((p) => {
    const key = String(p.key || "").trim().replace(/:$/, "").toLowerCase();
    const bibliographic = /^(fuente\s*\/\s*autor|fecha\s*\/\s*año|fuente|autor|fecha|año)$/.test(key);
    return String(p.value || "").trim() && !(narrative && bibliographic);
  });
}

function renderLayersPanel() {
  const listEl = document.getElementById("layer-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  const activeSheet = getActiveSheet();
  const badgeEl = document.getElementById("layer-sheet-badge");
  if (badgeEl) {
    badgeEl.textContent = activeSheet.title || "Capítulo";
  }

  const activeLayerId = getActiveLayerId();
  const sorted = getSortedLayers(activeSheet);
  sorted.forEach((layer) => {
    const isActive = activeLayerId === layer.id;
    const isParallel = state.ui.parallelLayerId === layer.id;
    const isVisible = layer.visible !== false;
    const notesCount = (layer.annotations || []).filter((a) => !a.sheet_id || a.sheet_id === activeSheet.id).length;

    const row = document.createElement("div");
    row.className = `layer-row ${isActive ? "active" : ""} ${!isVisible ? "hidden-layer" : ""}`.trim();
    row.dataset.layerId = layer.id;
    row.style.setProperty("--c", layer.color || "#6889B5");
    row.draggable = false;

    row.innerHTML = `
      <div class="lr-top">
        <span class="drag-grip" title="${layer.is_base ? "Capa Base fija" : "Arrastra para reordenar o suelta sobre un párrafo"}">
          <i class="ic" data-i="grip"></i>
        </span>
        <span class="lr-swatch"></span>
        <span class="lr-name">${layer.name}</span>
        ${layer.is_base ? `<span class="lr-base-tag">Base</span>` : ""}
        <div class="lr-actions">
          ${
            !layer.is_base
              ? `<button class="icon-btn btn-layer-parallel ${isParallel ? "on" : ""}" title="Abrir en Vista Paralela junto al manuscrito"><i class="ic" data-i="columns"></i></button>
                 <button class="icon-btn btn-layer-edit" title="Editar capa"><i class="ic" data-i="edit"></i></button>
                 <button class="icon-btn btn-layer-delete" title="Eliminar capa"><i class="ic" data-i="trash"></i></button>`
              : ""
          }
          <button class="icon-btn lr-eye ${!isVisible ? "off" : ""}" title="${isVisible ? "Ocultar capa" : "Mostrar capa"}">
            <i class="ic" data-i="${isVisible ? "eyeOpen" : "eyeOff"}"></i>
          </button>
        </div>
      </div>
      <div class="lr-meta">
        <span class="lr-desc">${layer.description || (layer.is_base ? "Manuscrito principal" : "Capa de anotaciones")}</span>
        ${!layer.is_base ? `<span class="lr-notes-badge">${notesCount} nota${notesCount === 1 ? "" : "s"}</span>` : ""}
        ${
          !layer.is_base
            ? `<div class="lr-figma-opacity" draggable="false" title="Opacidad de las notas de esta capa">
                 <input type="range" class="layer-opacity-slider" min="15" max="100" value="${layer.opacity ?? 100}" draggable="false" />
                 <span class="lr-op-val">${layer.opacity ?? 100}%</span>
               </div>`
            : ""
        }
      </div>
    `;
    injectIcons(row);
    row.querySelector(".btn-layer-delete")?.addEventListener("click", (e) => {
      e.stopPropagation(); window.StrataV8?.deleteLayer(layer.id);
    });

    // Seleccionar capa activa al hacer clic en la fila
    row.addEventListener("click", (e) => {
      if (e.target.closest("button, input")) return;
      setActiveLayerId(layer.id);
      renderLayersPanel();
      updateStatusBar();
    });

    // Botón Vista Paralela
    const btnParallel = row.querySelector(".btn-layer-parallel");
    if (btnParallel) {
      btnParallel.addEventListener("click", (e) => {
        e.stopPropagation();
        state.ui.parallelLayerId = state.ui.parallelLayerId === layer.id ? null : layer.id;
        renderParallelPane();
        renderLayersPanel();
        renderMarginNotes();
      });
    }

    // Botón Editar Capa
    const btnEdit = row.querySelector(".btn-layer-edit");
    if (btnEdit) {
      btnEdit.addEventListener("click", (e) => {
        e.stopPropagation();
        openLayerModal(layer.id);
      });
    }

    // Botón Visibilidad (Ojo)
    const btnEye = row.querySelector(".lr-eye");
    if (btnEye) {
      btnEye.addEventListener("click", (e) => {
        e.stopPropagation();
        if (layer.is_base) return;
        layer.visible = !isVisible;
        window.StrataV8?.applyLayers();
        renderLayersPanel();
        renderMarginNotes();
        scheduleProjectSave();
      });
    }

    // Slider de Opacidad compacto estilo Figma aislado del Drag & Drop
    const slider = row.querySelector(".layer-opacity-slider");
    if (slider) {
      const pctLabel = row.querySelector(".lr-op-val");
      ["mousedown", "pointerdown", "touchstart", "click"].forEach((evName) => {
        slider.addEventListener(evName, (ev) => {
          ev.stopPropagation();
          row.draggable = false;
        });
      });
      slider.addEventListener("dragstart", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
      });
      slider.addEventListener("input", (ev) => {
        ev.stopPropagation();
        const val = Number(slider.value);
        layer.opacity = val;
        if (pctLabel) pctLabel.textContent = `${val}%`;
        renderMarginNotes();
        scheduleProjectSave();
      });
    }

    // Drag & Drop activado desde el grip (o fila cuando no es el slider)
    const grip = row.querySelector(".drag-grip");
    if (!layer.is_base && grip) {
      grip.addEventListener("mousedown", () => {
        row.draggable = true;
      });
      row.addEventListener("mouseup", () => {
        row.draggable = false;
      });
      row.addEventListener("dragstart", (e) => {
        if (!row.draggable) {
          e.preventDefault();
          return;
        }
        state.ui.draggedLayerId = layer.id;
        row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "copyMove";
        e.dataTransfer.setData("application/x-strata-layer", layer.id);
      });
      row.addEventListener("dragend", () => {
        row.draggable = false;
        row.classList.remove("dragging");
        state.ui.draggedLayerId = null;
        clearLayerDropIndicators();
        clearDropTargetHighlights();
        hideDropHint();
      });
      row.addEventListener("dragover", (e) => {
        if (!state.ui.draggedLayerId || state.ui.draggedLayerId === layer.id) return;
        e.preventDefault();
        clearLayerDropIndicators();
        const rect = row.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        row.classList.add(before ? "drop-before" : "drop-after");
      });
      row.addEventListener("drop", (e) => {
        const draggedId = state.ui.draggedLayerId;
        if (!draggedId || draggedId === layer.id) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = row.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        reorderLayersVertical(draggedId, layer.id, before);
        clearLayerDropIndicators();
      });
    }

    listEl.appendChild(row);
  });
}

function clearLayerDropIndicators() {
  document.querySelectorAll(".layer-row.drop-before, .layer-row.drop-after").forEach((el) => {
    el.classList.remove("drop-before", "drop-after");
  });
}

function reorderLayersVertical(draggedId, targetId, insertBefore) {
  const upper = getSortedLayers().filter((l) => !l.is_base);
  const fromIdx = upper.findIndex((l) => l.id === draggedId);
  const toIdx = upper.findIndex((l) => l.id === targetId);
  if (fromIdx < 0 || toIdx < 0) return;

  const [moved] = upper.splice(fromIdx, 1);
  const adjIdx = upper.findIndex((l) => l.id === targetId);
  upper.splice(insertBefore ? adjIdx : adjIdx + 1, 0, moved);

  upper.forEach((l, i) => {
    l.order = upper.length - i;
  });

  renderLayersPanel();
  renderMarginNotes();
  scheduleProjectSave();
}

function renderScrapsDrawer() {
  if (window.StrataV8?.ready) return window.StrataV8.scraps.render();
  const drawer = document.getElementById("scraps-drawer");
  const listEl = document.getElementById("scraps-list");
  const countEl = document.getElementById("scraps-count");
  if (!drawer || !listEl || !countEl) return;

  drawer.classList.toggle("collapsed", state.ui.scrapsCollapsed);
  const scraps = state.project.scraps || [];
  countEl.textContent = String(scraps.length);

  listEl.innerHTML = "";
  if (!scraps.length) {
    listEl.innerHTML = `<div class="scraps-empty">Cajón vacío. Selecciona texto y usa clic derecho → «Mandar selección a Recortes» o arrástralo aquí.</div>`;
    return;
  }

  scraps.forEach((sc) => {
    const card = document.createElement("div");
    card.className = "scrap-card";
    card.draggable = true;

    card.innerHTML = `
      <div class="sc-text"></div>
      <div class="sc-foot">
        <span>${sc.time || ""} · ${sc.source_layer || "Manuscrito"}</span>
        <button class="icon-btn btn-insert-scrap" title="Insertar en el cursor"><i class="ic" data-i="reply"></i></button>
        <button class="icon-btn btn-del-scrap" title="Eliminar recorte"><i class="ic" data-i="trash"></i></button>
      </div>
    `;
    card.querySelector(".sc-text").textContent = sc.text;
    injectIcons(card);

    card.addEventListener("dragstart", (e) => {
      state.ui.draggedScrapId = sc.id;
      e.dataTransfer.setData("application/x-strata-scrap", sc.id);
    });
    card.addEventListener("dragend", () => {
      state.ui.draggedScrapId = null;
    });

    card.querySelector(".btn-insert-scrap").addEventListener("click", () => {
      restoreSelection(false);
      const ed = getActiveRichEditor();
      if (ed && document.activeElement !== ed) ed.focus();
      document.execCommand("insertText", false, sc.text);
      state.project.scraps = state.project.scraps.filter((s) => s.id !== sc.id);
      renderScrapsDrawer();
      scheduleProjectSave();
    });

    card.querySelector(".btn-del-scrap").addEventListener("click", () => {
      state.project.scraps = state.project.scraps.filter((s) => s.id !== sc.id);
      renderScrapsDrawer();
      scheduleProjectSave();
    });

    listEl.appendChild(card);
  });
}

function sendSelectionToScraps() {
  hideMiniToolbar();
  restoreSelection(true);
  const sel = window.getSelection();
  const text = sel ? sel.toString().trim() : "";
  if (!text) {
    showToast("Selecciona primero un fragmento de texto");
    return;
  }
  const layer = getActiveLayer();
  state.project.scraps.unshift({
    id: uid("scrap"),
    text,
    time: nowHHMM(),
    source_layer: layer ? layer.name : "Capa Base"
  });
  document.execCommand("delete");
  state.config.panels.scraps = true;
  state.ui.scrapsCollapsed = false;
  renderTopChrome();
  renderScrapsDrawer();
  scheduleProjectSave();
  showToast("Fragmento guardado en Recortes");
}

function renderSheetTabs() {
  const bar = document.getElementById("sheet-tabs");
  if (!bar) return;
  bar.innerHTML = "";

  const sheets = state.project.document.sheets || [];
  const activeId = getActiveSheet().id;

  sheets.forEach((sheet) => {
    const tab = document.createElement("button");
    tab.className = `sheet-tab ${sheet.id === activeId ? "active" : ""}`.trim();
    tab.dataset.sheetId = sheet.id;
    const label = document.createElement("span");
    label.textContent = sheet.title;
    tab.appendChild(label);
    tab.draggable = true;
    tab.addEventListener("dragstart", (e) => {
      if (tab.querySelector("input")) { e.preventDefault(); return; }
      state.ui.draggedSheetId = sheet.id;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("application/x-strata-sheet", sheet.id);
      tab.classList.add("dragging");
    });
    tab.addEventListener("dragover", (e) => {
      if (!state.ui.draggedSheetId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      bar.querySelectorAll(".drop-before, .drop-after").forEach((el) => el.classList.remove("drop-before", "drop-after"));
      const rect = tab.getBoundingClientRect();
      tab.classList.add(e.clientX < rect.left + rect.width / 2 ? "drop-before" : "drop-after");
      const bounds = bar.getBoundingClientRect();
      if (e.clientX > bounds.right - 35) bar.scrollLeft += 24;
      if (e.clientX < bounds.left + 35) bar.scrollLeft -= 24;
    });
    tab.addEventListener("dragleave", () => tab.classList.remove("drop-before", "drop-after"));
    tab.addEventListener("drop", (e) => {
      if (!state.ui.draggedSheetId) return;
      e.preventDefault();
      const rect = tab.getBoundingClientRect();
      reorderSheets(state.ui.draggedSheetId, sheet.id, e.clientX < rect.left + rect.width / 2);
      state.ui.draggedSheetId = null;
      renderSheetTabs();
    });
    tab.addEventListener("dragend", () => {
      state.ui.draggedSheetId = null;
      bar.querySelectorAll(".sheet-tab").forEach((el) => el.classList.remove("dragging", "drop-before", "drop-after"));
    });

    tab.addEventListener("click", () => {
      if (sheet.id === state.project.document.active_sheet_id) return;
      syncDOMPagesToState();
      state.project.document.active_sheet_id = sheet.id;
      state.ui.activePageIndex = 0;
      const nextLayers = getSheetLayers(sheet);
      if (state.ui.parallelLayerId && !nextLayers.some((l) => l.id === state.ui.parallelLayerId && !l.is_base)) {
        state.ui.parallelLayerId = null;
      }
      renderAll(true);
      scheduleProjectSave();
    });

    tab.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      startInlineTabRename(sheet, tab);
    });

    tab.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openSheetTabContextMenu(e.clientX, e.clientY, sheet, tab);
    });

    bar.appendChild(tab);
  });

  const addBtn = document.createElement("button");
  addBtn.className = "tab-add";
  addBtn.title = "Nuevo capítulo / hoja (con sus propias capas independientes)";
  addBtn.innerHTML = `<i class="ic" data-i="plus"></i>`;
  injectIcons(addBtn);
  addBtn.addEventListener("click", () => {
    syncDOMPagesToState();
    const nextNum = sheets.length + 1;
    const newSheet = {
      id: uid("sheet"),
      title: `Capítulo ${nextNum}`,
      active_layer_id: "layer_base",
      pages: [`<h2>Capítulo ${nextNum}</h2><p data-pid="${uid("p")}"><br></p>`],
      layers: createDefaultSheetLayers()
    };
    sheets.push(newSheet);
    state.project.document.active_sheet_id = newSheet.id;
    state.ui.activePageIndex = 0;
    state.ui.parallelLayerId = null;
    renderAll(true);
    scheduleProjectSave();
    showToast(`Creado «${newSheet.title}» con capas independientes`);
  });
  bar.appendChild(addBtn);
}

function startInlineTabRename(sheet, tabEl) {
  tabEl.draggable = false;
  const input = document.createElement("input");
  input.type = "text";
  input.value = sheet.title;
  tabEl.innerHTML = "";
  tabEl.appendChild(input);
  input.focus();
  input.select();

  const finish = () => {
    const val = input.value.trim();
    if (val) sheet.title = val;
    renderSheetTabs();
    renderLayersPanel();
    renderPagesStack();
    scheduleProjectSave();
  };
  input.addEventListener("blur", finish);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur();
    if (e.key === "Escape") {
      input.value = sheet.title;
      input.blur();
    }
  });
}

function updateStatusBar() {
  const statusEl = document.getElementById("status");
  if (!statusEl) return;
  const sheet = getActiveSheet();
  const tmp = document.createElement("div");
  tmp.innerHTML = (sheet.pages || []).join(" ");
  const text = (tmp.textContent || "").trim();
  const words = text ? text.split(/\s+/).length : 0;
  const chars = text.length;
  const pagesCount = (sheet.pages || []).length;
  const layer = getActiveLayer();

  statusEl.innerHTML = `
    <span><b>${words}</b> palabras</span>
    <span><b>${pagesCount}</b> páginas</span>
  `;
}

function reorderSheets(draggedId, targetId, before) {
  if (draggedId === targetId) return;
  const sheets = state.project.document.sheets;
  const moving = sheets.find((sheet) => sheet.id === draggedId);
  if (!moving || !sheets.some((sheet) => sheet.id === targetId)) return;
  syncDOMPagesToState();
  const reordered = sheets.filter((sheet) => sheet.id !== draggedId);
  const at = reordered.findIndex((sheet) => sheet.id === targetId);
  reordered.splice(at + (before ? 0 : 1), 0, moving);
  state.project.document.sheets = reordered;
  renderSheetTabs();
  if (state.config.page.view_mode === "corkboard") renderCorkboardView();
  scheduleProjectSave();
}

/* ==========================================================================
   14. MENÚ DE CLIC DERECHO PROPIO (EDITOR Y PESTAÑAS DE CAPÍTULOS)
   ========================================================================== */
function openCustomContextMenu(x, y, items) {
  const menu = document.getElementById("ctx-menu");
  if (!menu) return;
  menu.innerHTML = "";

  items.forEach((it) => {
    if (it.sep) {
      const s = document.createElement("div");
      s.className = "menu-sep";
      menu.appendChild(s);
      return;
    }
    const btn = document.createElement("button");
    if (it.danger) btn.classList.add("danger");
    if (it.disabled) btn.disabled = true;
    btn.innerHTML = `<i class="ic" data-i="${it.icon || "fileText"}"></i><span>${it.label}</span>${it.kbd ? `<kbd>${it.kbd}</kbd>` : ""}`;
    injectIcons(btn);
    btn.addEventListener("click", () => {
      menu.classList.remove("open");
      if (!it.disabled && it.action) it.action();
    });
    menu.appendChild(btn);
  });

  menu.classList.add("open");
  const mw = menu.offsetWidth || 260;
  const mh = menu.offsetHeight || 220;
  menu.style.left = `${Math.min(window.innerWidth - mw - 10, Math.max(10, x))}px`;
  menu.style.top = `${Math.min(window.innerHeight - mh - 10, Math.max(10, y))}px`;
}

function openEditorContextMenu(e) {
  if (window.StrataV8?.contextMenu(e)) return;
  e.preventDefault();
  captureSelectionAndSyncToolbar(false);
  const selText = savedSelectionRange && !savedSelectionRange.collapsed ? savedSelectionRange.toString().trim() : "";

  openCustomContextMenu(e.clientX, e.clientY, [
    { label: "Cortar", icon: "scissors", kbd: "Ctrl+X", disabled: !selText, action: () => executeRibbonCommand("cut") },
    { label: "Copiar", icon: "copy", kbd: "Ctrl+C", disabled: !selText, action: () => executeRibbonCommand("copy") },
    { label: "Pegar sin formato", icon: "clipboardType", kbd: state.config.shortcuts.paste_plain, action: () => executeRibbonCommand("paste-plain") },
    { sep: true },
    {
      label: "+ Crear Ficha en Wiki con selección",
      icon: "book",
      disabled: !selText,
      action: () => openFichaModal(null, selText.slice(0, 60))
    },
    {
      label: "+ Anclar Nota de Capa aquí",
      icon: "messagePlus",
      kbd: state.config.shortcuts.add_note,
      action: () => createMarginNoteAtSelection()
    },
    {
      label: "Mandar selección a Recortes",
      icon: "inbox",
      kbd: state.config.shortcuts.send_scrap,
      disabled: !selText,
      action: () => sendSelectionToScraps()
    }
  ]);
}

function openSheetTabContextMenu(x, y, sheet, tabEl) {
  const sheets = state.project.document.sheets || [];
  openCustomContextMenu(x, y, [
    { label: "Renombrar capítulo", icon: "edit", action: () => startInlineTabRename(sheet, tabEl) },
    {
      label: "Duplicar capítulo",
      icon: "duplicate",
      action: () => {
        syncDOMPagesToState();
        const newSheetId = uid("sheet");
        const clonedLayers = JSON.parse(JSON.stringify(getSheetLayers(sheet))).map((l) => ({
          ...l,
          id: l.is_base ? "layer_base" : uid("layer"),
          annotations: (l.annotations || []).map((a) => ({ ...a, id: uid("ann"), sheet_id: newSheetId }))
        }));
        const copy = {
          id: newSheetId,
          title: `${sheet.title} (Copia)`,
          active_layer_id: "layer_base",
          pages: window.StrataV8 ? StrataV8.cloneSheetContent(sheet, clonedLayers) : [...(sheet.pages || ["<p><br></p>"])],
          layers: clonedLayers
        };
        const idx = sheets.findIndex((s) => s.id === sheet.id);
        sheets.splice(idx + 1, 0, copy);
        state.project.document.active_sheet_id = copy.id;
        state.ui.parallelLayerId = null;
        renderAll(true);
        scheduleProjectSave();
      }
    },
    { sep: true },
    {
      label: "Eliminar capítulo",
      icon: "trash",
      danger: true,
      disabled: sheets.length <= 1,
      action: () => {
        if (sheets.length <= 1) return;
        const idx = sheets.findIndex((s) => s.id === sheet.id);
        sheets.splice(idx, 1);
        if (state.project.document.active_sheet_id === sheet.id) {
          state.project.document.active_sheet_id = sheets[Math.max(0, idx - 1)].id;
        }
        state.ui.parallelLayerId = null;
        renderAll(true);
        scheduleProjectSave();
      }
    }
  ]);
}

/* ==========================================================================
   15. POPOVERS (PALETA DE COLORES Y LISTA DE TAMAÑOS)
   ========================================================================== */
function populateFontSelects() {
  document.getElementById("set-font").innerHTML = FONTS.map((f) => `<option value="${f.value}" style="font-family:'${f.value}'">${f.label}</option>`).join("");
  const menu = document.createElement("div");
  menu.id = "pop-font";
  menu.className = "font-menu";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", "Fuente");
  document.body.appendChild(menu);
  let trigger = null;
  FONTS.forEach((font) => {
    const option = document.createElement("button");
    option.type = "button";
    option.setAttribute("role", "option");
    option.style.fontFamily = `"${font.value}"`;
    option.textContent = font.label;
    option.dataset.font = font.value;
    option.addEventListener("mousedown", (e) => e.preventDefault());
    option.addEventListener("click", () => {
      closeFontMenu();
      applyFontFamilyToSelection(font.value);
    });
    menu.appendChild(option);
  });
  ["rb-font", "mt-font"].forEach((id) => {
    const button = document.getElementById(id);
    button.addEventListener("mousedown", (e) => {
      captureSelectionAndSyncToolbar(false);
      e.preventDefault();
    });
    button.addEventListener("click", () => {
      const wasOpen = menu.classList.contains("open") && trigger === button;
      closeFontMenu();
      if (wasOpen) return;
      trigger = button;
      const rect = button.getBoundingClientRect();
      menu.style.left = `${Math.min(rect.left, window.innerWidth - 250)}px`;
      menu.style.top = `${Math.min(rect.bottom + 4, window.innerHeight - 300)}px`;
      menu.classList.add("open");
      button.setAttribute("aria-expanded", "true");
      menu.querySelectorAll("button").forEach((option) => option.setAttribute("aria-selected", String(option.dataset.font === button.value)));
      (menu.querySelector('[aria-selected="true"]') || menu.firstElementChild).focus();
    });
  });
  menu.addEventListener("keydown", (e) => {
    const options = [...menu.children];
    const index = options.indexOf(document.activeElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const next = e.key === "Home" ? 0 : e.key === "End" ? options.length - 1 : (index + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      options[next].focus();
    } else if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      closeFontMenu();
      trigger?.focus();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
      options.find((option) => option.textContent.toLowerCase().startsWith(e.key.toLowerCase()))?.focus();
    }
    e.stopPropagation();
  });
  document.addEventListener("mousedown", (e) => {
    if (!e.target.closest("#pop-font, #rb-font, #mt-font")) closeFontMenu();
  });
}

function closeFontMenu() {
  document.getElementById("pop-font")?.classList.remove("open");
  ["rb-font", "mt-font"].forEach((id) => document.getElementById(id)?.setAttribute("aria-expanded", "false"));
}

function setFontControls(font) {
  ["rb-font", "mt-font"].forEach((id) => {
    const button = document.getElementById(id);
    button.value = font;
    button.textContent = font;
    button.style.fontFamily = `"${font}"`;
  });
}

function populateSizePopover() {
  const pop = document.getElementById("pop-size");
  if (!pop) return;
  pop.innerHTML = FONT_SIZES.map((sz) => `<button data-sz="${sz}">${sz}</button>`).join("");
  pop.querySelectorAll("button[data-sz]").forEach((btn) => {
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", () => {
      pop.classList.remove("open");
      applyFontSizeToSelection(btn.dataset.sz);
    });
  });
}

function openColorPalette(mode, btnEl) {
  const pop = document.getElementById("pop-palette");
  const swWrap = document.getElementById("palette-swatches");
  if (!pop || !swWrap || !btnEl) return;

  state.ui.paletteMode = mode;
  document.getElementById("palette-title").textContent = mode === "fore" ? "Color de texto" : "Color de resaltado";
  const colors = mode === "fore" ? PALETTE_COLORS : HIGHLIGHT_COLORS;

  swWrap.innerHTML = "";
  colors.forEach((col) => {
    const b = document.createElement("button");
    b.className = "swatch";
    b.style.setProperty("--c", col);
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", () => {
      pop.classList.remove("open");
      applyColorToSelection(mode, col);
    });
    swWrap.appendChild(b);
  });

  const rect = btnEl.getBoundingClientRect();
  pop.classList.add("open");
  pop.style.left = `${Math.min(window.innerWidth - 200, Math.max(10, rect.left))}px`;
  pop.style.top = `${rect.bottom + 6}px`;
}

function closeAllMenusAndPopovers() {
  document.getElementById("menu-file")?.classList.remove("open");
  document.getElementById("ctx-menu")?.classList.remove("open");
  document.getElementById("pop-palette")?.classList.remove("open");
  document.getElementById("pop-size")?.classList.remove("open");
}

/* ==========================================================================
   16. MODALES (FICHAS, CAPAS Y AJUSTES COMPLETOS CON ATAJOS INTERACTIVOS)
   ========================================================================== */
function openModal(modalId) {
  const bd = document.getElementById("modal-backdrop");
  bd.classList.add("open");
  bd.querySelectorAll(".modal").forEach((m) => m.classList.toggle("open", m.id === modalId));
}

function closeModals() {
  const bd = document.getElementById("modal-backdrop");
  bd.classList.remove("open");
  bd.querySelectorAll(".modal").forEach((m) => m.classList.remove("open"));
  state.ui.capturingShortcutKey = null;
}

function renderInlineSwatches(containerId, selectedColor, onSelect) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = "";
  PALETTE_COLORS.slice(0, 10).forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `swatch ${c.toLowerCase() === (selectedColor || "").toLowerCase() ? "on" : ""}`;
    b.style.setProperty("--c", c);
    b.addEventListener("click", () => {
      onSelect(c);
      renderInlineSwatches(containerId, c, onSelect);
    });
    el.appendChild(b);
  });
}

function openFichaModal(fichaId = null, prefillName = "") {
  state.ui.editingFichaId = fichaId;
  const ficha = state.project.fichas.find((f) => f.id === fichaId);
  document.getElementById("ficha-modal-title").textContent = ficha ? "Editar ficha / fuente" : "Nueva ficha / fuente";
  document.getElementById("ficha-name").value = ficha ? ficha.name : prefillName;
  document.getElementById("ficha-category").value = ficha ? ficha.category : "Fuentes";
  document.getElementById("ficha-desc").value = ficha ? ficha.description : "";
  document.getElementById("ficha-delete").style.visibility = ficha ? "visible" : "hidden";

  // Poblar sugerencias de categorías
  const catList = document.getElementById("ficha-cat-list");
  if (catList) {
    const cats = new Set([
      "Fuentes",
      "Datos",
      "Conceptos",
      "Hallazgos",
      "Personajes",
      "Lugares",
      "Objetos",
      ...(state.project.fichas || []).map((x) => x.category || "General")
    ]);
    catList.innerHTML = [...cats].map((c) => `<option value="${c}"></option>`).join("");
  }

  state.ui.selectedFichaColor = ficha ? ficha.color : "#6889B5";
  renderInlineSwatches("ficha-colors", state.ui.selectedFichaColor, (c) => {
    state.ui.selectedFichaColor = c;
  });

  // Avatar / imagen redondeada
  state.ui.fichaAvatarDataUrl = ficha && ficha.image ? ficha.image : "";
  renderFichaAvatarInModal();

  // Propiedades estructuradas (Fuente, Fecha, Métrica, Rol...)
  const existingProps =
    ficha && Array.isArray(ficha.properties) && ficha.properties.length
      ? ficha.properties.map((p) => ({ key: p.key || "", value: p.value || "" }))
      : [
          { key: "Fuente / Autor", value: "" },
          { key: "Fecha / Año", value: "" }
        ];
  state.ui.fichaPropsDraft = existingProps;
  renderFichaPropsEditor();

  openModal("modal-ficha");
  window.StrataV8?.fichaModal(ficha);
  setTimeout(() => document.getElementById("ficha-name").focus(), 30);
}

function renderFichaAvatarInModal() {
  const prev = document.getElementById("ficha-avatar-preview");
  const ph = document.getElementById("ficha-avatar-placeholder");
  const clearBtn = document.getElementById("btn-ficha-avatar-clear");
  const hasImg = Boolean(state.ui.fichaAvatarDataUrl);

  if (prev) {
    prev.src = hasImg ? state.ui.fichaAvatarDataUrl : "";
    prev.hidden = !hasImg;
  }
  if (ph) ph.hidden = hasImg;
  if (clearBtn) clearBtn.hidden = !hasImg;
}

function renderFichaPropsEditor() {
  const wrap = document.getElementById("ficha-props-editor");
  if (!wrap) return;
  wrap.innerHTML = "";

  const list = state.ui.fichaPropsDraft || [];
  list.forEach((prop, idx) => {
    const row = document.createElement("div");
    row.className = "ficha-prop-edit-row";
    row.innerHTML = `
      <input type="text" class="s-input prop-key-in" placeholder="Campo (ej. Fuente, Fecha, Métrica)" />
      <input type="text" class="s-input prop-val-in" placeholder="Valor (ej. Archivo Nacional, 2026, 94%)" />
      <button type="button" class="icon-btn prop-del-btn" title="Quitar campo"><i class="ic" data-i="x"></i></button>
    `;
    injectIcons(row);
    const keyIn = row.querySelector(".prop-key-in");
    const valIn = row.querySelector(".prop-val-in");
    keyIn.value = prop.key || "";
    valIn.value = prop.value || "";

    keyIn.addEventListener("input", () => {
      prop.key = keyIn.value;
    });
    valIn.addEventListener("input", () => {
      prop.value = valIn.value;
    });
    row.querySelector(".prop-del-btn").addEventListener("click", () => {
      state.ui.fichaPropsDraft.splice(idx, 1);
      renderFichaPropsEditor();
    });
    wrap.appendChild(row);
  });
}

function saveFichaModal() {
  const name = document.getElementById("ficha-name").value.trim();
  if (!name) return;
  const category = document.getElementById("ficha-category").value.trim() || "General";
  const description = document.getElementById("ficha-desc").value.trim();
  const color = state.ui.selectedFichaColor || "#6889B5";
  const image = state.ui.fichaAvatarDataUrl || "";
  const card_view = document.getElementById("ficha-card-view")?.value || "portrait";
  const properties = (state.ui.fichaPropsDraft || [])
    .map((p) => ({ key: String(p.key || "").trim(), value: String(p.value || "").trim() }))
    .filter((p) => p.key || p.value);

  if (state.ui.editingFichaId) {
    const f = state.project.fichas.find((x) => x.id === state.ui.editingFichaId);
    if (f) Object.assign(f, { name, category, description, color, image, properties, card_view });
  } else {
    state.project.fichas.push({
      id: uid("ficha"),
      name,
      category,
      description,
      color,
      image,
      properties
      , card_view
    });
  }

  closeModals();
  document.querySelectorAll("#pages-stack .page-editor").forEach((ed) => syncFichaHighlights(ed, false));
  renderWikiPanel();
  window.StrataPlanning?.refresh();
  scheduleProjectSave();
}

function openInputDialog(title, text, defaultValue = "", onConfirm = null) {
  const titleEl = document.getElementById("dialog-title");
  const textEl = document.getElementById("dialog-text");
  const inputEl = document.getElementById("dialog-input");
  const okBtn = document.getElementById("dialog-ok");
  const cancelBtn = document.getElementById("dialog-cancel");
  if (!titleEl || !inputEl || !okBtn || !cancelBtn) return;

  titleEl.textContent = title || "Entrada";
  if (textEl) textEl.textContent = text || "";
  inputEl.style.display = "block";
  inputEl.value = defaultValue || "";

  const finish = (accepted) => {
    const val = inputEl.value;
    closeModals();
    if (accepted && onConfirm) onConfirm(val);
  };

  okBtn.onclick = () => finish(true);
  cancelBtn.onclick = () => finish(false);
  inputEl.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finish(true);
    }
  };

  openModal("modal-dialog");
  setTimeout(() => {
    inputEl.focus();
    inputEl.select();
  }, 30);
}

/* ==========================================================================
   16-B. HERRAMIENTAS DE INVESTIGACIÓN: CITAS / NOTAS AL PIE [1] Y TABLAS
   ========================================================================== */
function openCitationModal(prefillFichaId = null) {
  hideMiniToolbar();
  const selEl = document.getElementById("cit-ficha-select");
  const textEl = document.getElementById("cit-text");
  const locEl = document.getElementById("cit-locator");
  if (!selEl || !textEl || !locEl) return;

  const fichas = state.project.fichas || [];
  selEl.innerHTML =
    `<option value="">— Escribir referencia manual —</option>` +
    fichas.map((f) => `<option value="${f.id}">${f.name} (${f.category || "Ficha"})</option>`).join("");

  locEl.value = "";
  textEl.value = "";

  if (prefillFichaId && fichas.some((f) => f.id === prefillFichaId)) {
    selEl.value = prefillFichaId;
    fillCitationFromFicha(prefillFichaId);
  } else {
    selEl.value = "";
  }

  openModal("modal-citation");
  setTimeout(() => textEl.focus(), 30);
}

function fillCitationFromFicha(fichaId) {
  const textEl = document.getElementById("cit-text");
  if (!textEl) return;
  const f = (state.project.fichas || []).find((x) => x.id === fichaId);
  if (!f) return;

  const props = fichaProps(f);
  const propMap = {};
  props.forEach((p) => {
    propMap[(p.key || "").toLowerCase()] = p.value;
  });

  const fuente =
    propMap["fuente"] ||
    propMap["autor"] ||
    propMap["fuente / autor"] ||
    propMap["institución"] ||
    f.name;
  const fecha = propMap["fecha"] || propMap["año"] || propMap["fecha / año"] || new Date().getFullYear();
  const extra = f.description ? ` ${f.description}` : "";
  textEl.value = `${fuente} (${fecha}). ${f.name}.${extra}`.trim();
}

function insertCitationOrFootnote() {
  const selEl = document.getElementById("cit-ficha-select");
  const textEl = document.getElementById("cit-text");
  const locEl = document.getElementById("cit-locator");
  const activeModeBtn = document.querySelector("#cit-mode-seg button.active");
  const mode = activeModeBtn ? activeModeBtn.dataset.citMode : "footnote";

  let refText = (textEl?.value || "").trim();
  const locator = (locEl?.value || "").trim();
  const fichaId = selEl?.value || "";
  const ficha = (state.project.fichas || []).find((x) => x.id === fichaId);

  if (!refText && ficha) {
    fillCitationFromFicha(ficha.id);
    refText = (textEl?.value || "").trim();
  }
  if (!refText) {
    showToast("Escribe o selecciona una referencia para insertar");
    return;
  }
  if (locator) {
    refText = `${refText.replace(/\.$/, "")}, ${locator}.`;
  }

  closeModals();
  restoreSelection(false);
  const ed = getActiveRichEditor();
  if (!ed) return;
  if (document.activeElement !== ed) ed.focus();

  if (mode === "inline") {
    let inlineStr = `(${refText})`;
    if (ficha) {
      const props = fichaProps(ficha);
      const yearProp = props.find((p) => /año|fecha/i.test(p.key || ""));
      const year = yearProp ? yearProp.value : new Date().getFullYear();
      inlineStr = `(${ficha.name}, ${year}${locator ? `, ${locator}` : ""})`;
    }
    document.execCommand("insertText", false, ` ${inlineStr} `);
  } else {
    const existingRefs = ed.querySelectorAll("sup.footnote-ref");
    const nextNum = existingRefs.length + 1;
    const supHtml = `<sup class="footnote-ref" data-fn="${nextNum}" contenteditable="false" title="${refText.replace(/"/g, "&quot;")}">[${nextNum}]</sup>&nbsp;`;
    document.execCommand("insertHTML", false, supHtml);

    let fnSec = ed.querySelector(".footnotes-section");
    if (!fnSec) {
      fnSec = document.createElement("div");
      fnSec.className = "footnotes-section";
      fnSec.innerHTML = `<hr class="footnotes-divider" /><div class="footnotes-title">Notas y Referencias</div>`;
      ed.appendChild(fnSec);
    }
    const item = document.createElement("div");
    item.className = "footnote-item";
    item.innerHTML = `<b>[${nextNum}]</b> <span></span>`;
    item.querySelector("span").textContent = refText;
    fnSec.appendChild(item);
    renumberFootnotesInEditor(ed);
  }

  ensureParagraphIds(ed);
  syncFichaHighlights(ed, false);
  syncDOMPagesToState();
  scheduleProjectSave();
  showToast(mode === "inline" ? "Cita en línea insertada" : "Nota al pie numerada insertada");
}

function renumberFootnotesInEditor(editorEl) {
  if (!editorEl) return;
  const sups = editorEl.querySelectorAll("sup.footnote-ref");
  sups.forEach((s, idx) => {
    const n = idx + 1;
    s.dataset.fn = String(n);
    s.textContent = `[${n}]`;
  });
  const items = editorEl.querySelectorAll(".footnotes-section .footnote-item");
  items.forEach((it, idx) => {
    const b = it.querySelector("b");
    if (b) b.textContent = `[${idx + 1}]`;
  });
}

function openTableModal() {
  hideMiniToolbar();
  document.getElementById("tbl-cols").value = "3";
  document.getElementById("tbl-rows").value = "3";
  document.getElementById("tbl-headers").value = "";
  openModal("modal-table");
  setTimeout(() => document.getElementById("tbl-headers").focus(), 30);
}

function insertStrataTable() {
  const cols = Math.max(1, Math.min(10, parseInt(document.getElementById("tbl-cols").value, 10) || 3));
  const rows = Math.max(1, Math.min(30, parseInt(document.getElementById("tbl-rows").value, 10) || 3));
  const rawHeaders = (document.getElementById("tbl-headers").value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  closeModals();
  restoreSelection(false);
  const ed = getActiveRichEditor();
  if (!ed) return;
  if (document.activeElement !== ed) ed.focus();

  let ths = "";
  for (let c = 0; c < cols; c++) {
    const label = rawHeaders[c] || `Columna ${c + 1}`;
    ths += `<th>${label}</th>`;
  }

  let trs = "";
  for (let r = 0; r < rows; r++) {
    let tds = "";
    for (let c = 0; c < cols; c++) {
      tds += `<td>Dato</td>`;
    }
    trs += `<tr>${tds}</tr>`;
  }

  const tableHtml = `
    <table class="strata-table">
      <thead><tr>${ths}</tr></thead>
      <tbody>${trs}</tbody>
    </table>
    <p data-pid="${uid("p")}"><br></p>
  `;

  document.execCommand("insertHTML", false, tableHtml);
  ensureParagraphIds(ed);
  syncDOMPagesToState();
  scheduleProjectSave();
  showToast("Tabla de estudio insertada");
}

function selectTableCell(cellEl) {
  state.ui.activeTableCell = cellEl;
  updateTableToolbarPosition();
}

function hideTableToolbar() {
  state.ui.activeTableCell = null;
  const bar = document.getElementById("table-toolbar");
  if (bar) bar.hidden = true;
}

function updateTableToolbarPosition() {
  const bar = document.getElementById("table-toolbar");
  const cell = state.ui.activeTableCell;
  if (!bar || !cell || !document.body.contains(cell)) {
    hideTableToolbar();
    return;
  }
  const table = cell.closest("table.strata-table");
  if (!table) {
    hideTableToolbar();
    return;
  }
  const rect = table.getBoundingClientRect();
  bar.hidden = false;
  const bw = bar.offsetWidth || 340;
  const left = Math.max(12, Math.min(window.innerWidth - bw - 12, rect.left));
  const top = Math.max(52, rect.top - 40);
  bar.style.left = `${Math.round(left)}px`;
  bar.style.top = `${Math.round(top)}px`;
}

function setupTableToolbarEvents() {
  const bar = document.getElementById("table-toolbar");
  if (!bar) return;

  bar.querySelectorAll("button[data-tbl]").forEach((btn) => {
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", () => {
      const cell = state.ui.activeTableCell;
      if (!cell || !document.body.contains(cell)) return;
      const table = cell.closest("table.strata-table");
      const row = cell.closest("tr");
      if (!table || !row) return;

      const act = btn.dataset.tbl;
      const colIdx = [...row.children].indexOf(cell);
      const colsCount = row.children.length;

      if (act === "add-row") {
        const tbody = table.querySelector("tbody") || table;
        const newTr = document.createElement("tr");
        for (let i = 0; i < colsCount; i++) {
          const td = document.createElement("td");
          td.textContent = "Dato";
          newTr.appendChild(td);
        }
        if (row.parentElement.tagName === "THEAD") {
          tbody.prepend(newTr);
        } else {
          row.after(newTr);
        }
      } else if (act === "add-col") {
        table.querySelectorAll("tr").forEach((tr) => {
          const isHead = tr.parentElement.tagName === "THEAD";
          const el = document.createElement(isHead ? "th" : "td");
          el.textContent = isHead ? "Columna" : "Dato";
          const ref = tr.children[Math.max(0, colIdx)];
          if (ref) ref.after(el);
          else tr.appendChild(el);
        });
      } else if (act === "del-row") {
        const allRows = table.querySelectorAll("tbody tr");
        if (row.parentElement.tagName === "TBODY" && allRows.length > 1) {
          row.remove();
          hideTableToolbar();
        } else {
          showToast("La tabla debe conservar al menos una fila de datos");
        }
      } else if (act === "del-col") {
        if (colsCount <= 1) {
          showToast("La tabla debe conservar al menos una columna");
        } else {
          table.querySelectorAll("tr").forEach((tr) => {
            if (tr.children[colIdx]) tr.children[colIdx].remove();
          });
          hideTableToolbar();
        }
      } else if (act === "delete-table") {
        table.remove();
        hideTableToolbar();
      }

      updateTableToolbarPosition();
      syncDOMPagesToState();
      scheduleProjectSave();
    });
  });
}

function openLayerModal(layerId = null) {
  state.ui.editingLayerId = layerId;
  const sheet = getActiveSheet();
  const layer = getSheetLayers(sheet).find((l) => l.id === layerId);
  document.getElementById("layer-modal-title").textContent = layer
    ? `Editar capa (${sheet.title})`
    : `Nueva capa en ${sheet.title}`;
  document.getElementById("layer-name").value = layer ? layer.name : "";
  document.getElementById("layer-desc").value = layer ? layer.description || "" : "";
  document.getElementById("layer-delete").style.visibility = layer && !layer.is_base ? "visible" : "hidden";

  state.ui.selectedLayerColor = layer ? layer.color : "#C98F45";
  renderInlineSwatches("layer-colors", state.ui.selectedLayerColor, (c) => {
    state.ui.selectedLayerColor = c;
  });

  window.Strata95?.layerForm(layer);
  openModal("modal-layer");
  setTimeout(() => document.getElementById("layer-name").focus(), 30);
}

function saveLayerModal() {
  const name = document.getElementById("layer-name").value.trim();
  if (!name) return;
  const description = document.getElementById("layer-desc").value.trim();
  const color = state.ui.selectedLayerColor || "#C98F45";
  const layers = getSheetLayers();

  if (state.ui.editingLayerId) {
    const l = layers.find((x) => x.id === state.ui.editingLayerId);
    if (l) Object.assign(l, { name, description, color, mode: document.getElementById("layer-mode")?.value || "margin", category: document.getElementById("layer-category")?.value.trim() || "General" });
  } else {
    const maxOrder = Math.max(0, ...layers.map((l) => l.order || 0));
    const newL = {
      id: uid("layer"),
      name,
      description,
      color,
      mode: document.getElementById("layer-mode")?.value || "margin",
      category: document.getElementById("layer-category")?.value.trim() || "General",
      visible: true,
      opacity: 100,
      is_base: false,
      order: maxOrder + 1,
      overlay_html: `<p><br></p>`,
      annotations: []
    };
    layers.push(newL);
    setActiveLayerId(newL.id);
  }

  closeModals();
  renderLayersPanel();
  renderMarginNotes();
  renderParallelPane();
  updateStatusBar();
  scheduleProjectSave();
}

function openSettingsModal() {
  syncSettingsModalUI();
  openModal("modal-settings");
}

function syncSettingsModalUI() {
  const cfg = state.config;
  document.querySelectorAll("#theme-cards .theme-card").forEach((c) => {
    c.classList.toggle("on", c.dataset.themeChoice === cfg.theme);
  });

  document.getElementById("set-font").value = cfg.editor.font_family || "Georgia";
  document.getElementById("set-font-size").value = cfg.editor.font_size || 16;
  document.getElementById("set-line-height").value = cfg.editor.line_height || 1.75;
  document.getElementById("set-file-path").value = state.meta.filePath || state.meta.fileName;

  document.querySelectorAll("#modal-settings input[type='checkbox'][data-cfg]").forEach((chk) => {
    chk.checked = Boolean(getByPath(cfg, chk.dataset.cfg));
  });

  document.querySelectorAll("#modal-settings [data-cfg-seg]").forEach((seg) => {
    const curVal = getByPath(cfg, seg.dataset.cfgSeg);
    seg.querySelectorAll("button[data-val]").forEach((b) => {
      b.classList.toggle("on", b.dataset.val === curVal);
    });
  });

  renderShortcutList();
}

function renderShortcutList() {
  const list = document.getElementById("shortcut-list");
  if (!list) return;
  list.innerHTML = "";

  Object.entries(SHORTCUT_LABELS).forEach(([key, label]) => {
    const row = document.createElement("div");
    row.className = "sc-row";
    const curCombo = state.config.shortcuts[key] || "";
    const isCap = state.ui.capturingShortcutKey === key;

    row.innerHTML = `
      <span>${label}</span>
      <button class="sc-key ${isCap ? "capturing" : ""}" data-sc-key="${key}">
        ${isCap ? "Presiona teclas…" : curCombo}
      </button>
    `;

    row.querySelector(".sc-key").addEventListener("click", () => {
      state.ui.capturingShortcutKey = state.ui.capturingShortcutKey === key ? null : key;
      renderShortcutList();
    });

    list.appendChild(row);
  });
}

/* ==========================================================================
   17. ZOOM, FOCO Y REDIMENSIONADO DE PANELES LATERALES
   ========================================================================== */
function changeZoom(delta) {
  const cur = Number(state.config.editor.zoom) || 100;
  const next = Math.max(75, Math.min(200, cur + delta));
  state.config.editor.zoom = next;
  renderTopChrome();
  renderMarginNotes();
  scheduleConfigSave();
}

function cycleFocusLevel(forceLevel = null) {
  state.config.focus_level = forceLevel !== null ? forceLevel : (state.config.focus_level + 1) % 4;
  renderTopChrome();
  renderMarginNotes();
  scheduleConfigSave();
}

function setupSplitters() {
  document.querySelectorAll(".splitter[data-split]").forEach((sp) => {
    sp.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const side = sp.dataset.split;
      sp.classList.add("dragging");
      document.body.classList.add("resizing");

      const onMove = (ev) => {
        const physicallyLeft = (side === "left") !== Boolean(state.config.custom_theme?.swapped);
        const distance = (physicallyLeft ? ev.clientX : window.innerWidth - ev.clientX) - 16;
        if (side === "left") {
          const w = Math.max(120, Math.min(window.innerWidth-280, distance));
          state.config.layout.left_width = w;
        } else {
          const w = Math.max(120, Math.min(window.innerWidth-280, distance));
          state.config.layout.right_width = w;
        }
        applyEditorTypographyVars();
        renderMarginNotes();
      };
      const onUp = () => {
        sp.classList.remove("dragging");
        document.body.classList.remove("resizing");
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        scheduleConfigSave();
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  });
}

/* ==========================================================================
   18. INICIALIZACIÓN DE TODOS LOS EVENTOS DE LA INTERFAZ
   ========================================================================== */
function initEventListeners() {
  window.StrataV8?.init();
  setupQuickInsert();
  setInterval(() => {
    document.getElementById("session-clock").textContent = `⏱ ${Math.floor((performance.now() - sessionStartedAt) / 60000)} min en sesión`;
  }, 1000);
  setupFichaHoverCard();
  setupImageResizerEvents();
  setupTableToolbarEvents();
  setupSplitters();

  // Arrastre de ventana Frameless desde la barra superior
  const tbDrag = document.getElementById("tb-drag");
  const titlebar = document.getElementById("titlebar");
  titlebar.addEventListener("mousedown", (e) => {
    if (e.target.closest("button, input, select, .dropdown-menu, .brand")) return;
    if (e.detail === 2) {
      apiPost("/api/window/maximize", {});
      return;
    }
    if (pyBridge && pyBridge.startWindowDrag) {
      pyBridge.startWindowDrag();
    } else {
      apiPost("/api/window/drag", {});
    }
  });
  if (tbDrag) {
    tbDrag.addEventListener("dblclick", () => apiPost("/api/window/maximize", {}));
  }

  // Botones de ventana (Minimizar, Maximizar, Cerrar)
  document.getElementById("win-min").addEventListener("click", () => apiPost("/api/window/minimize", {}));
  document.getElementById("win-max").addEventListener("click", () => apiPost("/api/window/maximize", {}));
  document.getElementById("win-close").addEventListener("click", () => handleFileAction("quit"));

  // Menú Archivo
  const btnFile = document.getElementById("btn-file-menu");
  const menuFile = document.getElementById("menu-file");
  btnFile.addEventListener("click", (e) => {
    e.stopPropagation();
    menuFile.classList.toggle("open");
  });
  document.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => handleFileAction(btn.dataset.action));
  });

  // Botón Ajustes (arriba a la izquierda junto a Archivo)
  document.getElementById("btn-settings").addEventListener("click", openSettingsModal);

  // Pantalla de Inicio / Gestor de Proyectos ("Home" — 2 Pestañas Segmentadas)
  const btnHome = document.getElementById("btn-home");
  if (btnHome) btnHome.addEventListener("click", () => openHomeScreen(true));
  const brandHome = document.getElementById("brand-home");
  if (brandHome) brandHome.addEventListener("click", () => openHomeScreen(true));
  const btnHomeResume = document.getElementById("btn-home-resume");
  if (btnHomeResume) btnHomeResume.addEventListener("click", () => closeHomeScreen());
  const btnHomeOpenPc = document.getElementById("btn-home-open-pc");
  if (btnHomeOpenPc) btnHomeOpenPc.addEventListener("click", () => handleFileAction("open"));
  document.getElementById("btn-home-new-blank")?.addEventListener("click", () => createProjectFromTemplate("blanco"));
  document.getElementById("btn-new-blank")?.addEventListener("click", () => createProjectFromTemplate("blanco"));
  const btnHomeCreateTitle = document.getElementById("btn-home-create-title");
  if (btnHomeCreateTitle) btnHomeCreateTitle.addEventListener("click", () => createProjectFromTemplate("blanco"));

  const tabRec = document.getElementById("home-tab-recent");
  if (tabRec) tabRec.addEventListener("click", () => switchHomeTab("recent"));
  const tabTpl = document.getElementById("home-tab-templates");
  if (tabTpl) tabTpl.addEventListener("click", () => switchHomeTab("templates"));

  const homeSearch = document.getElementById("home-search");
  if (homeSearch) {
    homeSearch.addEventListener("input", (e) => {
      state.ui.homeSearch = e.target.value;
      renderHomeScreen();
    });
  }
  const homeChkStartup = document.getElementById("home-chk-startup");
  if (homeChkStartup) {
    homeChkStartup.addEventListener("change", (e) => {
      state.config.show_home_on_startup = e.target.checked;
      syncSettingsModalUI();
      scheduleConfigSave();
    });
  }
  const homeNewTitle = document.getElementById("home-new-title");
  if (homeNewTitle) {
    homeNewTitle.addEventListener("input", () => updateTemplateButtonsCta());
    homeNewTitle.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        createProjectFromTemplate("blanco");
      }
    });
  }

  // Pizarra de Estructura (Corkboard)
  const btnCbNew = document.getElementById("btn-corkboard-new-sheet");
  if (btnCbNew) {
    btnCbNew.addEventListener("click", () => {
      syncDOMPagesToState();
      const sheets = state.project.document.sheets || [];
      const nextNum = sheets.length + 1;
      const newSheet = {
        id: uid("sheet"),
        title: `Sección ${nextNum}`,
        active_layer_id: "layer_base",
        pages: [`<h2>Sección ${nextNum}</h2><p data-pid="${uid("p")}"><br></p>`],
        layers: createDefaultSheetLayers()
      };
      sheets.push(newSheet);
      state.project.document.active_sheet_id = newSheet.id;
      renderCorkboardView();
      renderSheetTabs();
      scheduleProjectSave();
      showToast(`Añadida «${newSheet.title}» a la Pizarra`);
    });
  }
  const btnCbExit = document.getElementById("btn-corkboard-exit");
  if (btnCbExit) {
    btnCbExit.addEventListener("click", () => {
      state.config.page.view_mode = "pages";
      renderAll(true);
      scheduleConfigSave();
    });
  }

  // Título del documento
  const docTitle = document.getElementById("doc-title");
  docTitle.addEventListener("input", () => {
    state.project.document.title = docTitle.value;
    scheduleProjectSave();
  });

  // Interruptores individuales de paneles: [Wiki] [Capas] [Recortes] [Herramientas]
  document.querySelectorAll(".panel-toggles .toggle-chip[data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.panel;
      if (key === "toolbar") {
        if (state.config.ribbon_collapsed) {
          state.config.ribbon_collapsed = false;
          state.config.panels.toolbar = true;
        } else {
          state.config.panels.toolbar = !state.config.panels.toolbar;
        }
      } else {
        state.config.panels[key] = !state.config.panels[key];
      }
      renderTopChrome();
      renderMarginNotes();
      scheduleConfigSave();
    });
  });

  // Modo Foco y salida de Zen
  document.getElementById("btn-focus").addEventListener("click", () => cycleFocusLevel());
  document.getElementById("zen-exit").addEventListener("click", () => cycleFocusLevel(0));

  // Colapsar cinta de herramientas
  document.getElementById("btn-collapse-ribbon").addEventListener("click", () => {
    state.config.ribbon_collapsed = !state.config.ribbon_collapsed;
    renderTopChrome();
    scheduleConfigSave();
  });

  // Comandos de la Cinta y de la Mini-Barra Flotante (preservando selección)
  document.querySelectorAll("#ribbon [data-cmd], #mini-toolbar [data-cmd]").forEach((btn) => {
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      executeRibbonCommand(btn.dataset.cmd, btn.dataset.value || null, btn);
    });
  });

  // Tamaño numérico libre en Cinta y Mini-Barra (conservando savedSelectionRange)
  ["rb-size", "mt-size"].forEach((id) => {
    const inp = document.getElementById(id);
    inp.addEventListener("mousedown", () => captureSelectionAndSyncToolbar(false));
    inp.addEventListener("focus", () => inp.select());
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyFontSizeToSelection(inp.value);
      }
    });
    inp.addEventListener("change", () => applyFontSizeToSelection(inp.value));
  });

  // Botón desplegable de lista de tamaños
  document.querySelectorAll("[data-size-combo] .size-drop").forEach((btn) => {
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const pop = document.getElementById("pop-size");
      const rect = btn.parentElement.getBoundingClientRect();
      pop.classList.toggle("open");
      pop.style.left = `${rect.left}px`;
      pop.style.top = `${rect.bottom + 4}px`;
    });
  });

  // Interlineado y Zoom en la Cinta
  document.getElementById("rb-line-height").addEventListener("change", (e) => {
    state.config.editor.line_height = parseFloat(e.target.value) || 1.75;
    applyEditorTypographyVars();
    scheduleConfigSave();
  });
  document.getElementById("rb-zoom").addEventListener("change", (e) => {
    state.config.editor.zoom = parseInt(e.target.value, 10) || 100;
    applyEditorTypographyVars();
    renderMarginNotes();
    scheduleConfigSave();
  });

  // Selector Vista A4 / Continua / Pizarra en la Cinta
  document.querySelectorAll("#seg-view button[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.config.page.view_mode = btn.dataset.view;
      renderTopChrome();
      renderMarginNotes();
      scheduleConfigSave();
    });
  });

  // Botón Modo Rayos X Editorial (Toque Extra Beta 1.0)
  const xrayBtn = document.getElementById("btn-xray");
  if (xrayBtn) {
    xrayBtn.addEventListener("click", () => {
      state.config.xray_mode = !state.config.xray_mode;
      renderTopChrome();
      document.querySelectorAll("#pages-stack .page-editor").forEach((ed) => syncXRayHighlights(ed, false));
      scheduleConfigSave();
      showToast(
        state.config.xray_mode
          ? "Modo Rayos X Editorial activado (diálogos y ecos léxicos)"
          : "Modo Rayos X Editorial desactivado"
      );
    });
  }

  // Paleta de color: sin color y color personalizado
  document.getElementById("palette-none").addEventListener("click", () => {
    document.getElementById("pop-palette").classList.remove("open");
    applyColorToSelection(state.ui.paletteMode, "");
  });
  document.getElementById("palette-custom").addEventListener("input", (e) => {
    applyColorToSelection(state.ui.paletteMode, e.target.value);
  });

  // Wiki de Fichas (con Avatar redondeado y Propiedades estructuradas)
  document.getElementById("btn-new-ficha").addEventListener("click", () => openFichaModal());
  document.getElementById("ficha-search").addEventListener("input", (e) => {
    state.ui.fichaSearch = e.target.value;
    renderWikiPanel();
  });
  document.getElementById("ficha-save").addEventListener("click", saveFichaModal);
  document.getElementById("ficha-delete").addEventListener("click", () => {
    if (!state.ui.editingFichaId) return;
    state.project.fichas = state.project.fichas.filter((f) => f.id !== state.ui.editingFichaId);
    window.StrataPlanning?.prune();
    closeModals();
    document.querySelectorAll("#pages-stack .page-editor").forEach((ed) => syncFichaHighlights(ed, false));
    renderWikiPanel();
    scheduleProjectSave();
  });

  const avatarBox = document.getElementById("ficha-avatar-box");
  if (avatarBox) {
    avatarBox.addEventListener("click", async (e) => {
      if (e.target.closest("#btn-ficha-avatar-clear")) return;
      const res = await apiPost("/api/file/pick-image", {});
      if (res && res.ok && res.data_url) {
        state.ui.fichaAvatarDataUrl = res.data_url;
        renderFichaAvatarInModal();
      }
    });
  }
  const avatarClearBtn = document.getElementById("btn-ficha-avatar-clear");
  if (avatarClearBtn) {
    avatarClearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.ui.fichaAvatarDataUrl = "";
      renderFichaAvatarInModal();
    });
  }
  const modalFichaEl = document.getElementById("modal-ficha");
  if (modalFichaEl) {
    modalFichaEl.addEventListener("paste", (e) => {
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (!blob) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            state.ui.fichaAvatarDataUrl = ev.target.result;
            renderFichaAvatarInModal();
            showToast("Imagen aplicada al avatar de la ficha");
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    });
  }
  const btnAddProp = document.getElementById("btn-ficha-add-prop");
  if (btnAddProp) {
    btnAddProp.addEventListener("click", () => {
      state.ui.fichaPropsDraft = state.ui.fichaPropsDraft || [];
      state.ui.fichaPropsDraft.push({ key: "", value: "" });
      renderFichaPropsEditor();
      const inputs = document.querySelectorAll("#ficha-props-editor .prop-key-in");
      if (inputs.length) inputs[inputs.length - 1].focus();
    });
  }

  // Modal de Citas Bibliográficas y Notas al Pie [1]
  const citSel = document.getElementById("cit-ficha-select");
  if (citSel) {
    citSel.addEventListener("change", () => {
      if (citSel.value) fillCitationFromFicha(citSel.value);
    });
  }
  document.querySelectorAll("#cit-mode-seg button[data-cit-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#cit-mode-seg button").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });
  const citInsertBtn = document.getElementById("cit-insert-btn");
  if (citInsertBtn) citInsertBtn.addEventListener("click", insertCitationOrFootnote);

  // Modal Constructor de Tablas
  const tblInsertBtn = document.getElementById("tbl-insert-btn");
  if (tblInsertBtn) tblInsertBtn.addEventListener("click", insertStrataTable);

  // Panel de Capas y Vista Paralela (Independientes por Capítulo)
  document.getElementById("btn-new-layer").addEventListener("click", () => openLayerModal());
  document.getElementById("layer-save").addEventListener("click", saveLayerModal);
  document.getElementById("layer-delete").addEventListener("click", () => {
    const id = state.ui.editingLayerId;
    if (window.StrataV8?.ready) { StrataV8.deleteLayer(id); closeModals(); return; }
    const sheet = getActiveSheet();
    const layers = getSheetLayers(sheet);
    const layer = layers.find((l) => l.id === id);
    if (!layer || layer.is_base) return;
    sheet.layers = layers.filter((l) => l.id !== id);
    if (sheet.active_layer_id === id) {
      setActiveLayerId("layer_base");
    }
    if (state.ui.parallelLayerId === id) {
      state.ui.parallelLayerId = null;
    }
    closeModals();
    renderLayersPanel();
    renderMarginNotes();
    renderParallelPane();
    updateStatusBar();
    scheduleProjectSave();
  });

  document.getElementById("btn-close-parallel").addEventListener("click", () => {
    state.ui.parallelLayerId = null;
    renderParallelPane();
    renderLayersPanel();
    renderMarginNotes();
  });

  const parallelEd = document.getElementById("parallel-editor");
  parallelEd.addEventListener("input", () => {
    const pLayer = getSheetLayers().find((l) => l.id === state.ui.parallelLayerId);
    if (pLayer) {
      pLayer.overlay_html = stripEphemeralHtml(parallelEd.innerHTML);
      syncFichaHighlights(parallelEd, true);
      scheduleProjectSave();
    }
  });
  parallelEd.addEventListener("mouseup", () => setTimeout(() => captureSelectionAndSyncToolbar(true), 10));

  // Cajón de Recortes independiente
  document.getElementById("btn-scraps-collapse").addEventListener("click", () => {
    state.ui.scrapsCollapsed = !state.ui.scrapsCollapsed;
    renderScrapsDrawer();
  });
  document.getElementById("btn-hide-scraps").addEventListener("click", () => {
    state.config.panels.scraps = false;
    renderTopChrome();
    scheduleConfigSave();
  });
  const scrapsDrawer = document.getElementById("scraps-drawer");
  scrapsDrawer.addEventListener("dragover", (e) => {
    if (state.ui.draggedSelectionText) {
      e.preventDefault();
      scrapsDrawer.classList.add("drag-over");
    }
  });
  scrapsDrawer.addEventListener("dragleave", () => scrapsDrawer.classList.remove("drag-over"));
  scrapsDrawer.addEventListener("drop", (e) => {
    scrapsDrawer.classList.remove("drag-over");
    const txt = state.ui.draggedSelectionText || e.dataTransfer?.getData("text/plain");
    if (txt && txt.trim()) {
      e.preventDefault();
      state.project.scraps.unshift({
        id: uid("scrap"),
        text: txt.trim(),
        time: nowHHMM(),
        source_layer: getActiveLayer()?.name || "Capa Base"
      });
      state.ui.draggedSelectionText = "";
      renderScrapsDrawer();
      scheduleProjectSave();
      showToast("Recorte añadido al cajón");
    }
  });

  // Scroll del editor: actualizar resizer de imagen, barra de tabla y ocultar mini-barra
  document.getElementById("editor-scroll").addEventListener("scroll", () => {
    if (selectedImageEl) updateImageResizerOverlay();
    if (state.ui.activeTableCell) updateTableToolbarPosition();
    hideMiniToolbar();
  });

  // Zoom con Ctrl + Rueda del mouse
  document.getElementById("editor-scroll").addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        changeZoom(e.deltaY < 0 ? 10 : -10);
      }
    },
    { passive: false }
  );

  // Menú contextual propio en todo el programa (desactiva el nativo del navegador)
  document.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".rich-editor")) {
      openEditorContextMenu(e);
    } else if (!e.target.closest(".sheet-tab")) {
      e.preventDefault();
      closeAllMenusAndPopovers();
    }
  });

  // Cerrar menús y mini-barra al hacer clic fuera
  document.addEventListener("mousedown", (e) => {
    if (!e.target.closest("#mini-toolbar, #pop-palette, #pop-size, .rich-editor")) {
      hideMiniToolbar();
    }
    if (!e.target.closest("#table-toolbar, table.strata-table")) {
      hideTableToolbar();
    }
    if (!e.target.closest(".menu-wrap, #ctx-menu, #pop-palette, #pop-size, [data-size-combo], .color-btn, .rc-more-btn")) {
      closeAllMenusAndPopovers();
    }
  });

  // Modal de Ajustes: navegación por pestañas y cambios en vivo
  document.querySelectorAll("#modal-settings .snav[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll("#modal-settings .snav").forEach((b) => b.classList.toggle("active", b === btn));
      document.querySelectorAll("#modal-settings .stab").forEach((s) => s.classList.toggle("active", s.dataset.tab === tab));
    });
  });

  document.querySelectorAll("#theme-cards .theme-card[data-theme-choice]").forEach((card) => {
    card.addEventListener("click", () => {
      state.config.theme = card.dataset.themeChoice;
      syncSettingsModalUI();
      renderTopChrome();
      scheduleConfigSave();
    });
  });

  document.querySelectorAll("#modal-settings input[type='checkbox'][data-cfg]").forEach((chk) => {
    chk.addEventListener("change", () => {
      setByPath(state.config, chk.dataset.cfg, chk.checked);
      renderTopChrome();
      scheduleConfigSave();
    });
  });

  document.querySelectorAll("#modal-settings [data-cfg-seg]").forEach((seg) => {
    const path = seg.dataset.cfgSeg;
    seg.querySelectorAll("button[data-val]").forEach((b) => {
      b.addEventListener("click", () => {
        setByPath(state.config, path, b.dataset.val);
        syncSettingsModalUI();
        renderTopChrome();
        renderMarginNotes();
        scheduleConfigSave();
      });
    });
  });

  document.getElementById("set-font").addEventListener("change", (e) => {
    state.config.editor.font_family = e.target.value;
    renderTopChrome();
    scheduleConfigSave();
  });
  document.getElementById("set-font-size").addEventListener("change", (e) => {
    state.config.editor.font_size = parseFloat(e.target.value) || 16;
    renderTopChrome();
    scheduleConfigSave();
  });
  document.getElementById("set-line-height").addEventListener("change", (e) => {
    state.config.editor.line_height = parseFloat(e.target.value) || 1.75;
    renderTopChrome();
    scheduleConfigSave();
  });

  document.getElementById("btn-reset-shortcuts").addEventListener("click", () => {
    state.config.shortcuts = { ...DEFAULT_SHORTCUTS };
    renderShortcutList();
    renderTopChrome();
    scheduleConfigSave();
    showToast("Atajos restaurados");
  });

  // Botones de cerrar modales
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModals));
  document.getElementById("modal-backdrop").addEventListener("mousedown", (e) => {
    if (e.target.id === "modal-backdrop") closeModals();
  });

  // Captura de atajos de teclado globales y grabador de atajos en Ajustes
  window.addEventListener("keydown", handleGlobalKeyDown);
}

function formatKeyEventToCombo(e) {
  if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return null;
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  parts.push(k);
  return parts.join("+");
}

function handleGlobalKeyDown(e) {
  if (e.defaultPrevented) return;
  if (e.target.closest?.("dialog[open]")) return;
  // Si el usuario está grabando un nuevo atajo en Ajustes -> Atajos
  if (state.ui.capturingShortcutKey) {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      state.ui.capturingShortcutKey = null;
      renderShortcutList();
      return;
    }
    const combo = formatKeyEventToCombo(e);
    if (!combo) return;
    state.config.shortcuts[state.ui.capturingShortcutKey] = combo;
    state.ui.capturingShortcutKey = null;
    renderShortcutList();
    renderTopChrome();
    scheduleConfigSave();
    return;
  }

  if (e.key === "Escape") {
    if (document.getElementById("modal-backdrop").classList.contains("open")) {
      closeModals();
      return;
    }
    if (state.ui.homeOpen) {
      closeHomeScreen();
      return;
    }
    if (state.config.focus_level === 3) {
      cycleFocusLevel(0);
      return;
    }
    window.StrataEditorial?.returnToBase();
    hideMiniToolbar();
    hideTableToolbar();
    closeAllMenusAndPopovers();
    deselectImage();
    return;
  }

  const combo = formatKeyEventToCombo(e);
  if (!combo) return;
  const sc = state.config.shortcuts || {};

  if (combo === sc.save) { e.preventDefault(); handleFileAction("save"); }
  else if (combo === sc.save_as) { e.preventDefault(); handleFileAction("save-as"); }
  else if (combo === sc.open) { e.preventDefault(); handleFileAction("open"); }
  else if (combo === sc.new) { e.preventDefault(); handleFileAction("new"); }
  else if (combo === sc.export_pdf) { e.preventDefault(); handleFileAction("export-pdf"); }
  else if (combo === sc.focus) { e.preventDefault(); cycleFocusLevel(); }
  else if (combo === sc.toggle_wiki) { e.preventDefault(); state.config.panels.wiki = !state.config.panels.wiki; renderTopChrome(); scheduleConfigSave(); }
  else if (combo === sc.toggle_layers) { e.preventDefault(); state.config.panels.layers = !state.config.panels.layers; renderTopChrome(); scheduleConfigSave(); }
  else if (combo === sc.toggle_scraps) { e.preventDefault(); state.config.panels.scraps = !state.config.panels.scraps; renderTopChrome(); scheduleConfigSave(); }
  else if (combo === sc.toggle_toolbar) { e.preventDefault(); state.config.panels.toolbar = !state.config.panels.toolbar; renderTopChrome(); scheduleConfigSave(); }
  else if (combo === sc.add_note) { e.preventDefault(); createMarginNoteAtSelection(); }
  else if (combo === sc.new_ficha) { e.preventDefault(); openFichaModal(); }
  else if (combo === sc.send_scrap) { e.preventDefault(); sendSelectionToScraps(); }
  else if (combo === sc.scene_break) { e.preventDefault(); insertSceneDivider(); }
  else if (combo === sc.zoom_in) { e.preventDefault(); changeZoom(15); }
  else if (combo === sc.zoom_out) { e.preventDefault(); changeZoom(-15); }
  else if (combo === sc.settings) { e.preventDefault(); openSettingsModal(); }
}

function setupQuickInsert() {
  const menu = document.createElement("div");
  menu.id = "quick-insert";
  menu.className = "quick-insert";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", "Comandos y menciones");
  document.body.appendChild(menu);
  let context = null;
  let active = 0;
  let suppressInput = false;
  const normalize = (text) => String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const commands = [
    { label: "Título 1", run: () => executeRibbonCommand("block", "h1") },
    { label: "Título 2", run: () => executeRibbonCommand("block", "h2") },
    { label: "Tabla", run: () => openTableModal() },
    { label: "Separador de escena", run: () => insertSceneDivider() },
    { label: "Cita al pie", run: () => {
      openCitationModal();
      document.querySelectorAll("#cit-mode-seg [data-cit-mode]").forEach((b) => b.classList.toggle("active", b.dataset.citMode === "footnote"));
    } },
    { label: "Nota de capa", run: () => createMarginNoteAtSelection() }
  ];
  function close() {
    if (context) {
      context.editor.removeAttribute("aria-activedescendant");
      context.editor.removeAttribute("aria-controls");
    }
    context = null;
    menu.classList.remove("open");
  }
  function paint() {
    menu.replaceChildren();
    context.items.forEach((item, index) => {
      const button = document.createElement("button");
      button.id = `quick-option-${index}`;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(index === active));
      button.textContent = item.label;
      button.addEventListener("mousedown", (e) => e.preventDefault());
      button.addEventListener("click", () => choose(index));
      menu.appendChild(button);
    });
    context.editor.setAttribute("aria-activedescendant", `quick-option-${active}`);
    menu.children[active]?.scrollIntoView({ block: "nearest" });
  }
  function choose(index) {
    if (!context || !context.range.startContainer.isConnected) { close(); return; }
    const { range, items, editor } = context;
    const item = items[index];
    suppressInput = true;
    try {
      editor.focus({ preventScroll: true });
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      close();
      // execCommand keeps deleting the trigger and inserting the result in native undo history.
      document.execCommand("insertText", false, item.ficha ? `${item.ficha.name} ` : "");
      savedSelectionRange = null;
      captureSelectionAndSyncToolbar(false);
      if (item.run) item.run();
      else syncFichaHighlights(editor, true);
      syncDOMPagesToState();
      updateStatusBar();
      scheduleProjectSave();
    } finally { suppressInput = false; }
  }
  document.addEventListener("input", (e) => {
    const editor = e.target.closest(".page-editor, #parallel-editor");
    if (suppressInput || e.isComposing || !editor) { close(); return; }
    const selection = window.getSelection();
    if (!selection?.isCollapsed || !selection.rangeCount) { close(); return; }
    const caret = selection.getRangeAt(0);
    const node = caret.startContainer;
    if (node.nodeType !== Node.TEXT_NODE || !editor.contains(node)) { close(); return; }
    const prefix = node.textContent.slice(0, caret.startOffset);
    const match = prefix.match(/(?:^|\s)([/@])([^\s/@]*)$/u);
    if (!match) { close(); return; }
    const start = caret.startOffset - match[2].length - 1;
    // Check the preceding text across inline spans too (e.g. email addresses).
    const block = node.parentElement.closest("p, h1, h2, h3, li, td, th, blockquote") || editor;
    const before = document.createRange();
    before.selectNodeContents(block);
    before.setEnd(node, start);
    if (before.toString() && !/\s$/.test(before.toString())) { close(); return; }
    const source = match[1] === "/" ? commands : state.project.fichas.map((ficha) => ({ label: ficha.name, ficha }));
    const items = source.filter((item) => normalize(item.label).includes(normalize(match[2]))).slice(0, 12);
    if (!items.length) { close(); return; }
    const range = caret.cloneRange();
    range.setStart(node, start);
    close();
    context = { range, items, editor };
    active = 0;
    editor.setAttribute("aria-controls", "quick-insert");
    menu.classList.add("open");
    paint();
    const rect = caret.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - menu.offsetWidth - 8))}px`;
    menu.style.top = `${Math.max(8, rect.bottom + menu.offsetHeight + 8 > window.innerHeight ? rect.top - menu.offsetHeight - 6 : rect.bottom + 6)}px`;
  });
  document.addEventListener("keydown", (e) => {
    if (!context || e.isComposing) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); e.stopPropagation();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + context.items.length) % context.items.length;
      paint();
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault(); e.stopPropagation(); choose(active);
    } else if (e.key === "Escape") {
      e.preventDefault(); e.stopPropagation(); close();
    } else if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) || e.ctrlKey || e.metaKey) close();
  }, true);
  document.addEventListener("mousedown", (e) => { if (!menu.contains(e.target)) close(); });
  document.getElementById("editor-scroll").addEventListener("scroll", close);
  window.addEventListener("resize", close);
}

document.addEventListener("DOMContentLoaded", initBridgeAndBoot);

