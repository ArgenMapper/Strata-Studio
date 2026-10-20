"""Plantillas de proyecto con capas independientes por cada hoja/capítulo y herramientas de estudio/investigación (Strata 6.0)."""

from copy import deepcopy
from datetime import datetime
from . import APP_VERSION


def make_default_sheet_layers(sheet_id: str, include_sample_notes: bool = False) -> list[dict]:
    if include_sample_notes:
        return [
            {
                "id": f"layer_esqueleto_{sheet_id}",
                "name": "Esqueleto / Estructura",
                "description": "Guía estructural de escenas y ritmo del Capítulo 1",
                "color": "#C98F45",
                "visible": True,
                "opacity": 100,
                "is_base": False,
                "order": 2,
                "overlay_html": (
                    "<h3>Estructura del Capítulo 1</h3>"
                    "<p><strong>1. Planteamiento:</strong> Descenso de Elena Vance con la muestra de Cronolito Gris.</p>"
                    "<p><strong>2. Desarrollo:</strong> Violación consciente del Protocolo Véspero en la bóveda.</p>"
                    "<p><strong>3. Clímax:</strong> Primera proyección tridimensional dentro del mineral.</p>"
                ),
                "annotations": [
                    {
                        "id": "ann_1",
                        "sheet_id": sheet_id,
                        "anchor_pid": "p_intro",
                        "anchor_paragraph": 1,
                        "quote": "",
                        "text": "Apertura: establecer la atmósfera silenciosa del descenso antes del amanecer.",
                    },
                    {
                        "id": "ann_2",
                        "sheet_id": sheet_id,
                        "anchor_pid": "p_silueta",
                        "anchor_paragraph": 3,
                        "quote": "",
                        "text": "Clímax de escena: el mineral proyecta una silueta que no corresponde a la bóveda.",
                    },
                ],
            },
            {
                "id": f"layer_revision_{sheet_id}",
                "name": "Notas de revisión (Cap. 1)",
                "description": "Correcciones de estilo y verificación de datos internos",
                "color": "#B86273",
                "visible": True,
                "opacity": 95,
                "is_base": False,
                "order": 1,
                "overlay_html": (
                    "<p><strong>Pendientes de edición (Cap. 1):</strong></p>"
                    "<ul><li>Verificar consistencia temporal del Protocolo Véspero.</li>"
                    "<li>Afinar las descripciones sensoriales de la Cámara de Resonancia.</li></ul>"
                ),
                "annotations": [
                    {
                        "id": "ann_3",
                        "sheet_id": sheet_id,
                        "anchor_pid": "p_protocolo",
                        "anchor_paragraph": 2,
                        "quote": "",
                        "text": "Revisar si conviene detallar aquí la sanción del Protocolo Véspero.",
                    }
                ],
            },
            {
                "id": f"layer_base_{sheet_id}",
                "name": "Capa Base (Texto Final)",
                "description": "Manuscrito principal limpio para exportación",
                "color": "#6889B5",
                "visible": True,
                "opacity": 100,
                "is_base": True,
                "order": 0,
                "overlay_html": "",
                "annotations": [],
            },
        ]

    return [
        {
            "id": f"layer_notas_{sheet_id}",
            "name": "Notas de Capítulo",
            "description": "Apuntes exclusivos de este capítulo",
            "color": "#529E78",
            "visible": True,
            "opacity": 100,
            "is_base": False,
            "order": 1,
            "overlay_html": "<p>Apuntes estructurales exclusivos de este capítulo.</p>",
            "annotations": [],
        },
        {
            "id": f"layer_base_{sheet_id}",
            "name": "Capa Base (Texto Final)",
            "description": "Manuscrito principal limpio para exportación",
            "color": "#6889B5",
            "visible": True,
            "opacity": 100,
            "is_base": True,
            "order": 0,
            "overlay_html": "",
            "annotations": [],
        },
    ]


DEFAULT_DATA = {
    "version": APP_VERSION,
    "document": {
        "title": "El Archivo de los Espejos de Obsidiana",
        "active_sheet_id": "sheet_1",
        "updated_at": "",
        "sheets": [
            {
                "id": "sheet_1",
                "title": "Capítulo 1",
                "active_layer_id": "layer_esqueleto_sheet_1",
                "layers": make_default_sheet_layers("sheet_1", include_sample_notes=True),
                "pages": [
                    (
                        "<h1>I. El descenso al subsuelo</h1>"
                        '<p data-pid="p_intro" style="text-align: justify;">La lluvia llevaba tres días golpeando los vitrales altos cuando Elena Vance descendió por última vez hacia la Cámara de Resonancia. Entre sus guantes de algodón conservaba la esquirla de Cronolito Gris que habían extraído del sótano norte durante la excavación de invierno.</p>'
                        '<p data-pid="p_protocolo" style="text-align: justify;">A pesar de las restricciones impuestas por el Protocolo Véspero, sabía que no disponía de otra noche. Colocó el mineral sobre el atril de bronce, ajustó los espejos cóncavos y aguardó en silencio a que la superficie pulida devolviera el primer destello de luz retenida.</p>'
                        '<hr class="scene-divider">'
                        '<p data-pid="p_silueta" style="text-align: justify;">El silencio de la Cámara de Resonancia no era una simple ausencia de ruido, sino una presión densa que parecía observar cada movimiento de Elena Vance desde los muros octogonales de basalto. En aquel silencio antiguo, el reflejo del cristal repetía un destello constante mientras el reflejo interior dibujaba una figura bajo el último reflejo de la lámpara.</p>'
                        '<p data-pid="p_dialogo_1" style="text-align: justify;">—¿Quién anda ahí? —susurró Elena Vance, sin apartar la vista del espejo mineral.</p>'
                        '<p data-pid="p_dialogo_2" style="text-align: justify;">—Nadie debería estar abajo después del toque de queda —respondió una voz grave desde el umbral de piedra.</p>'
                    ),
                    (
                        "<h2>II. La segunda lectura del cristal</h2>"
                        '<p data-pid="p_segunda_1" style="text-align: justify;">Durante los primeros segundos, Elena Vance pensó que la figura era producto de la fatiga visual advertida en el Protocolo Véspero. Sin embargo, al inclinar la lámpara auxiliar hacia el núcleo del Cronolito Gris, comprobó que la imagen poseía profundidad propia.</p>'
                        '<p data-pid="p_segunda_2" style="text-align: justify;">Anotó las coordenadas angulares en su libreta y preparó el segundo juego de lentes antes de que la temperatura de la Cámara de Resonancia descendiera otros dos grados.</p>'
                    ),
                ],
            },
            {
                "id": "sheet_2",
                "title": "Capítulo 2",
                "active_layer_id": "layer_notas_sheet_2",
                "layers": make_default_sheet_layers("sheet_2", include_sample_notes=False),
                "pages": [
                    (
                        "<h1>III. Los registros prohibidos</h1>"
                        '<p data-pid="p_cap2_1" style="text-align: justify;">Al amanecer, Elena Vance regresó al despacho superior con las lecturas térmicas del Cronolito Gris anotadas en su cuaderno. Ninguno de los archiveros anteriores había documentado una frecuencia semejante bajo las normas del Protocolo Véspero.</p>'
                        '<p data-pid="p_cap2_2" style="text-align: justify;">—Necesitamos abrir el archivo sellado antes del mediodía —dijo al cerrar la carpeta de cuero.</p>'
                        '<p data-pid="p_cap2_3" style="text-align: justify;">Decidió entonces consultar los planos originales de la Cámara de Resonancia antes de que el consejo clausurara definitivamente el acceso subterráneo.</p>'
                    )
                ],
            },
        ],
    },
    "fichas": [
        {
            "id": "ficha_elena",
            "name": "Elena Vance",
            "category": "Personajes",
            "color": "#6889B5",
            "image": "",
            "properties": [
                {"key": "Cargo", "value": "Restauradora Jefe"},
                {"key": "Acceso", "value": "Nivel 4 (Subsuelo)"},
            ],
            "description": "Restauradora de manuscritos antiguos e investigadora principal en el Archivo Subterráneo. Lleva siempre un reloj de bolsillo detenido a las 03:14.",
        },
        {
            "id": "ficha_camara",
            "name": "Cámara de Resonancia",
            "category": "Lugares",
            "color": "#529E78",
            "image": "",
            "properties": [
                {"key": "Profundidad", "value": "-30 metros"},
                {"key": "Material", "value": "Basalto octogonal"},
            ],
            "description": "Bóveda octogonal situada treinta metros bajo la biblioteca universitaria. Sus paredes de basalto absorben cualquier eco externo.",
        },
        {
            "id": "ficha_cronolito",
            "name": "Cronolito Gris",
            "category": "Conceptos",
            "color": "#C98F45",
            "image": "",
            "properties": [
                {"key": "Datación", "value": "Siglo XVII"},
                {"key": "Propiedad", "value": "Retención lumínica"},
            ],
            "description": "Mineral sintético descrito en los tratados del siglo XVII capaz de retener memoria térmica y lumínica durante décadas.",
        },
        {
            "id": "ficha_protocolo",
            "name": "Protocolo Véspero",
            "category": "Datos",
            "color": "#B86273",
            "image": "",
            "properties": [
                {"key": "Año", "value": "1984"},
                {"key": "Límite exposición", "value": "40 minutos"},
            ],
            "description": "Directiva de aislamiento nivel 4 redactada en 1984. Prohíbe la exposición directa al Cronolito Gris por más de cuarenta minutos.",
        },
    ],
    "scraps": [
        {
            "id": "scrap_1",
            "text": "Los relojes del pasillo marcaban horas distintas según la profundidad del nivel, una anomalía magnética que nadie en el departamento había querido firmar en las actas.",
            "time": "00:42",
            "source_layer": "Capa Base (Texto Final)",
        },
        {
            "id": "scrap_2",
            "text": "El doctor Aris había advertido que el mineral reaccionaba a la voz humana antes que al calor de las lámparas.",
            "time": "01:15",
            "source_layer": "Notas de revisión",
        },
    ],
}

EMPTY_PROJECT_TEMPLATE = {
    "version": APP_VERSION,
    "document": {
        "title": "Nuevo manuscrito",
        "active_sheet_id": "sheet_1",
        "updated_at": "",
        "sheets": [
            {
                "id": "sheet_1",
                "title": "Capítulo 1",
                "active_layer_id": "layer_base_sheet_1",
                "layers": [deepcopy(layer) for layer in make_default_sheet_layers("sheet_1", include_sample_notes=False) if layer["is_base"]],
                "pages": ["<p><br></p>"],
            }
        ],
    },
    "fichas": [],
    "scraps": [],
}


# ---------------------------------------------------------------------------
# Catálogo de Plantillas Editoriales y de Investigación para la Pantalla Home
# ---------------------------------------------------------------------------
TEMPLATES_CATALOG = [
    {
        "id": "blanco",
        "name": "Lienzo en Blanco",
        "badge": "Rápido",
        "icon": "filePlus",
        "accent": "#6889B5",
        "description": "Un documento limpio con 1 sección y su Capa Base lista para empezar a redactar o tomar apuntes desde cero sin distracciones.",
        "meta": "1 sección · 2 capas · 0 fichas",
    },
    {
        "id": "investigacion",
        "name": "Investigación Académica",
        "badge": "Académico",
        "icon": "layers",
        "accent": "#529E78",
        "description": "Estructura con Introducción, Marco Teórico y Conclusiones. Incluye citas al pie [1], tabla comparativa y fichas con propiedades bibliográficas.",
        "meta": "3 secciones · Citas y Tabla · 3 fichas",
    },
    {
        "id": "informe",
        "name": "Informe Estratégico",
        "badge": "Ejecutivo",
        "icon": "table",
        "accent": "#C98F45",
        "description": "Diseñado para reportes ejecutivos y diagnósticos: Resumen Ejecutivo, Análisis de Indicadores con tabla de métricas y Plan de Acción.",
        "meta": "3 secciones · Tabla KPI · 3 fichas",
    },
    {
        "id": "estudio",
        "name": "Estudio Analítico",
        "badge": "Estudio",
        "icon": "sliders",
        "accent": "#5B8A9A",
        "description": "Cuaderno de estudio profundo con Hipótesis, Evidencia Empírica, matriz de variables y base de datos de fuentes verificables en la Wiki.",
        "meta": "3 secciones · Matriz de datos · 3 fichas",
    },
    {
        "id": "novela",
        "name": "Novela / Ficción Literaria",
        "badge": "Narrativa",
        "icon": "book",
        "accent": "#B88446",
        "description": "Estructura en 3 capítulos (Planteamiento, Nudo, Clímax) con capas de Arco de Personajes, Ritmo y Corrección, más fichas Wiki iniciales.",
        "meta": "3 capítulos · 3 capas/cap. · 3 fichas",
    },
    {
        "id": "guion",
        "name": "Guion / Crónica Escénica",
        "badge": "Escénico",
        "icon": "scroll",
        "accent": "#B86273",
        "description": "Dividido en Acto I, Acto II y Acto III con capas dedicadas a Acotaciones de Dirección, Subtexto y Ritmo de Diálogos.",
        "meta": "3 actos · 3 capas/acto · 2 fichas",
    },
    {
        "id": "demo",
        "name": "El Archivo de los Espejos (Muestra)",
        "badge": "Ejemplo",
        "icon": "wand",
        "accent": "#7A6B9E",
        "description": "Proyecto completo con notas al margen, fichas con propiedades estructuradas, recortes y texto preparado para probar Rayos X y Pizarra.",
        "meta": "2 capítulos · 258 palabras · 4 fichas",
    },
]


def _make_novel_layers(sheet_id: str, chap_label: str) -> list[dict]:
    return [
        {
            "id": f"layer_trama_{sheet_id}",
            "name": f"Estructura y Ritmo ({chap_label})",
            "description": "Escaleta de escenas, tensión dramática y giros del capítulo",
            "color": "#C98F45",
            "visible": True,
            "opacity": 100,
            "is_base": False,
            "order": 2,
            "overlay_html": f"<h3>Escaleta — {chap_label}</h3><p>Anote aquí los objetivos narrativos y el conflicto central de este capítulo.</p>",
            "annotations": [
                {
                    "id": f"ann_trama_{sheet_id}",
                    "sheet_id": sheet_id,
                    "anchor_pid": f"p_open_{sheet_id}",
                    "anchor_paragraph": 1,
                    "quote": "",
                    "text": f"Gancho inicial de {chap_label}: presentar el tono y la pregunta dramática de la escena.",
                }
            ],
        },
        {
            "id": f"layer_estilo_{sheet_id}",
            "name": "Corrección de Estilo",
            "description": "Notas de reescritura, adjetivación y ritmo de prosa",
            "color": "#B86273",
            "visible": True,
            "opacity": 95,
            "is_base": False,
            "order": 1,
            "overlay_html": "<p>Observaciones de revisión estilística y consistencia de voz narradora.</p>",
            "annotations": [],
        },
        {
            "id": f"layer_base_{sheet_id}",
            "name": "Capa Base (Texto Final)",
            "description": "Manuscrito principal limpio para exportación",
            "color": "#6889B5",
            "visible": True,
            "opacity": 100,
            "is_base": True,
            "order": 0,
            "overlay_html": "",
            "annotations": [],
        },
    ]


def _make_research_layers(sheet_id: str, sec_label: str) -> list[dict]:
    return [
        {
            "id": f"layer_citas_{sheet_id}",
            "name": f"Citas y Fuentes ({sec_label})",
            "description": "Referencias bibliográficas, páginas y respaldo documental",
            "color": "#529E78",
            "visible": True,
            "opacity": 100,
            "is_base": False,
            "order": 2,
            "overlay_html": f"<h3>Fuentes — {sec_label}</h3><p>Registre aquí las referencias primarias y secundarias empleadas en esta sección.</p>",
            "annotations": [
                {
                    "id": f"ann_cita_{sheet_id}",
                    "sheet_id": sheet_id,
                    "anchor_pid": f"p_res_{sheet_id}",
                    "anchor_paragraph": 1,
                    "quote": "",
                    "text": "Verificar paginación exacta de la Fuente Primaria antes de la entrega final.",
                }
            ],
        },
        {
            "id": f"layer_metodo_{sheet_id}",
            "name": "Revisión Metodológica",
            "description": "Contraargumentos, notas al margen y verificación de datos",
            "color": "#C98F45",
            "visible": True,
            "opacity": 95,
            "is_base": False,
            "order": 1,
            "overlay_html": "<p>Apuntes críticos y preguntas abiertas sobre la argumentación.</p>",
            "annotations": [],
        },
        {
            "id": f"layer_base_{sheet_id}",
            "name": "Capa Base (Texto Final)",
            "description": "Texto académico definitivo limpio para exportar a PDF/Word",
            "color": "#6889B5",
            "visible": True,
            "opacity": 100,
            "is_base": True,
            "order": 0,
            "overlay_html": "",
            "annotations": [],
        },
    ]


def _make_script_layers(sheet_id: str, act_label: str) -> list[dict]:
    return [
        {
            "id": f"layer_acot_{sheet_id}",
            "name": f"Dirección y Puesta ({act_label})",
            "description": "Indicaciones de cámara, iluminación, sonido y movimiento escénico",
            "color": "#B86273",
            "visible": True,
            "opacity": 100,
            "is_base": False,
            "order": 2,
            "overlay_html": f"<h3>Notas de Dirección — {act_label}</h3><p>Atmósfera visual, sonido y ritmo escénico del acto.</p>",
            "annotations": [
                {
                    "id": f"ann_acot_{sheet_id}",
                    "sheet_id": sheet_id,
                    "anchor_pid": f"p_act_{sheet_id}",
                    "anchor_paragraph": 1,
                    "quote": "",
                    "text": "Nota de puesta en escena: mantener pausa dramática antes de la primera réplica.",
                }
            ],
        },
        {
            "id": f"layer_subtexto_{sheet_id}",
            "name": "Subtexto de Diálogos",
            "description": "Intención oculta de cada personaje en la escena",
            "color": "#8B6FC0",
            "visible": True,
            "opacity": 95,
            "is_base": False,
            "order": 1,
            "overlay_html": "<p>Qué busca realmente cada personaje frente a lo que dice en voz alta.</p>",
            "annotations": [],
        },
        {
            "id": f"layer_base_{sheet_id}",
            "name": "Capa Base (Texto Final)",
            "description": "Guion principal limpio para exportación",
            "color": "#6889B5",
            "visible": True,
            "opacity": 100,
            "is_base": True,
            "order": 0,
            "overlay_html": "",
            "annotations": [],
        },
    ]


def build_project_from_template(template_id: str, custom_title: str = "") -> dict:
    tid = (template_id or "blanco").strip().lower()
    now_iso = datetime.now().isoformat()

    if tid == "demo":
        proj = deepcopy(DEFAULT_DATA)
        if custom_title.strip():
            proj["document"]["title"] = custom_title.strip()
        proj["document"]["updated_at"] = now_iso
        return proj

    if tid == "investigacion":
        title = custom_title.strip() or "Investigación Académica"
        return {
            "version": APP_VERSION,
            "document": {
                "title": title,
                "active_sheet_id": "sheet_1",
                "updated_at": now_iso,
                "sheets": [
                    {
                        "id": "sheet_1",
                        "title": "1. Introducción",
                        "active_layer_id": "layer_citas_sheet_1",
                        "layers": _make_research_layers("sheet_1", "Introducción"),
                        "pages": [
                            (
                                "<h1>1. Planteamiento del Problema e Hipótesis</h1>"
                                '<p data-pid="p_res_sheet_1" style="text-align: justify;">El presente estudio examina la Hipótesis Central a partir del análisis documental de la Fuente Primaria registrada en la base de conocimientos lateral<sup class="footnote-ref" contenteditable="false" data-fn-num="1" data-fn-text="Vance, E. (2024). Archivos y Memoria Estructural. Editorial Universitaria, pp. 42-48.">[1]</sup>. Este enfoque permite contrastar los hallazgos empíricos sin contaminar el cuerpo principal del texto.</p>'
                                '<table class="strata-table"><thead><tr><th>Dimensión de Análisis</th><th>Fuente Documental</th><th>Estado de Verificación</th></tr></thead><tbody><tr><td>Marco Histórico</td><td>Fuente Primaria (Archivo A)</td><td>Completado (94%)</td></tr><tr><td>Contraste Empírico</td><td>Corpus Secundario (2021-2025)</td><td>En revisión metodológica</td></tr></tbody></table>'
                                '<div class="footnotes-section"><hr class="footnotes-divider"><div class="footnote-item" data-fn-num="1"><span class="footnote-num">[1]</span> <span class="footnote-body">Vance, E. (2024). Archivos y Memoria Estructural. Editorial Universitaria, pp. 42-48.</span></div></div>'
                            )
                        ],
                    },
                    {
                        "id": "sheet_2",
                        "title": "2. Marco Teórico",
                        "active_layer_id": "layer_citas_sheet_2",
                        "layers": _make_research_layers("sheet_2", "Marco Teórico"),
                        "pages": [
                            (
                                "<h1>2. Desarrollo y Marco Conceptual</h1>"
                                '<p data-pid="p_res_sheet_2" style="text-align: justify;">Desarrolle aquí el análisis del Concepto Clave y contraste la evidencia recopilada en sus capas de notas metodológicas.</p>'
                            )
                        ],
                    },
                    {
                        "id": "sheet_3",
                        "title": "3. Conclusiones",
                        "active_layer_id": "layer_citas_sheet_3",
                        "layers": _make_research_layers("sheet_3", "Conclusiones"),
                        "pages": [
                            (
                                "<h1>3. Conclusiones y Referencias</h1>"
                                '<p data-pid="p_res_sheet_3" style="text-align: justify;">Síntesis de hallazgos, líneas futuras de investigación y listado bibliográfico consolidado.</p>'
                            )
                        ],
                    },
                ],
            },
            "fichas": [
                {
                    "id": "ficha_hip",
                    "name": "Hipótesis Central",
                    "category": "Conceptos",
                    "color": "#529E78",
                    "image": "",
                    "properties": [
                        {"key": "Tipo", "value": "Proposición Explicativa"},
                        {"key": "Variables", "value": "Estructura / Retención"},
                        {"key": "Estado", "value": "En validación"},
                    ],
                    "description": "Proposición principal que este trabajo busca demostrar o refutar mediante el análisis documental y empírico.",
                },
                {
                    "id": "ficha_fuente",
                    "name": "Fuente Primaria",
                    "category": "Fuentes",
                    "color": "#6889B5",
                    "image": "",
                    "properties": [
                        {"key": "Autor", "value": "Vance, E."},
                        {"key": "Año", "value": "2024"},
                        {"key": "Referencia", "value": "Editorial Universitaria, pp. 42-48"},
                    ],
                    "description": "Documento, archivo o corpus principal sobre el cual se sustenta la evidencia empírica del estudio.",
                },
                {
                    "id": "ficha_concepto",
                    "name": "Concepto Clave",
                    "category": "Conceptos",
                    "color": "#C98F45",
                    "image": "",
                    "properties": [
                        {"key": "Disciplina", "value": "Epistemología Documental"},
                        {"key": "Métrica", "value": "Índice de Coherencia (IC)"},
                    ],
                    "description": "Definición operativa del término teórico central utilizado a lo largo de la investigación.",
                },
            ],
            "scraps": [
                {
                    "id": "scrap_inv_1",
                    "text": "Cita pendiente de ubicar: «La estructura del archivo determina la estructura de la memoria histórica» (p. 42).",
                    "time": "10:15",
                    "source_layer": "Citas y Fuentes",
                }
            ],
        }

    if tid == "informe":
        title = custom_title.strip() or "Informe Estratégico"
        return {
            "version": APP_VERSION,
            "document": {
                "title": title,
                "active_sheet_id": "sheet_1",
                "updated_at": now_iso,
                "sheets": [
                    {
                        "id": "sheet_1",
                        "title": "1. Resumen Ejecutivo",
                        "active_layer_id": "layer_citas_sheet_1",
                        "layers": _make_research_layers("sheet_1", "Resumen"),
                        "pages": [
                            (
                                "<h1>1. Resumen Ejecutivo y Diagnóstico</h1>"
                                '<p data-pid="p_res_sheet_1" style="text-align: justify;">Este informe sintetiza el desempeño del Indicador Clave (KPI) durante el último trimestre y evalúa la viabilidad de la Iniciativa Prioritaria frente a los objetivos anuales.</p>'
                                '<table class="strata-table"><thead><tr><th>Indicador / Métrica</th><th>Línea Base</th><th>Resultado Actual</th><th>Variación</th></tr></thead><tbody><tr><td>Eficiencia Operativa</td><td>72,4%</td><td>88,1%</td><td>+15,7 pts</td></tr><tr><td>Tiempo de Respuesta</td><td>4,2 días</td><td>1,8 días</td><td>-57,1%</td></tr><tr><td>Adopción de Proceso</td><td>60,0%</td><td>91,5%</td><td>+31,5 pts</td></tr></tbody></table>'
                            )
                        ],
                    },
                    {
                        "id": "sheet_2",
                        "title": "2. Análisis Comparativo",
                        "active_layer_id": "layer_citas_sheet_2",
                        "layers": _make_research_layers("sheet_2", "Análisis"),
                        "pages": [
                            (
                                "<h1>2. Evaluación de Escenarios</h1>"
                                '<p data-pid="p_res_sheet_2" style="text-align: justify;">Desglose de riesgos operativos, costos proyectados y retorno esperado según el Informe de Auditoría.</p>'
                            )
                        ],
                    },
                    {
                        "id": "sheet_3",
                        "title": "3. Plan de Acción",
                        "active_layer_id": "layer_citas_sheet_3",
                        "layers": _make_research_layers("sheet_3", "Plan"),
                        "pages": [
                            (
                                "<h1>3. Hoja de Ruta y Recomendaciones</h1>"
                                '<p data-pid="p_res_sheet_3" style="text-align: justify;">Cronograma de implementación en tres fases y asignación de responsabilidades.</p>'
                            )
                        ],
                    },
                ],
            },
            "fichas": [
                {
                    "id": "ficha_kpi",
                    "name": "Indicador Clave (KPI)",
                    "category": "Datos",
                    "color": "#C98F45",
                    "image": "",
                    "properties": [
                        {"key": "Métrica", "value": "Eficiencia Operativa Neta"},
                        {"key": "Meta Q4", "value": "90,0%"},
                        {"key": "Frecuencia", "value": "Mensual"},
                    ],
                    "description": "Métrica principal de seguimiento para evaluar el impacto de la optimización operativa.",
                },
                {
                    "id": "ficha_iniciativa",
                    "name": "Iniciativa Prioritaria",
                    "category": "Conceptos",
                    "color": "#529E78",
                    "image": "",
                    "properties": [
                        {"key": "Responsable", "value": "Dirección de Operaciones"},
                        {"key": "Horizonte", "value": "6 meses"},
                    ],
                    "description": "Programa de modernización de flujos documentales y automatización de reportes.",
                },
                {
                    "id": "ficha_auditoria",
                    "name": "Informe de Auditoría",
                    "category": "Fuentes",
                    "color": "#6889B5",
                    "image": "",
                    "properties": [
                        {"key": "Autor", "value": "Comité Técnico Interno"},
                        {"key": "Año", "value": "2025"},
                    ],
                    "description": "Revisión trimestral de procesos y cumplimiento normativo.",
                },
            ],
            "scraps": [],
        }

    if tid == "estudio":
        title = custom_title.strip() or "Estudio Analítico"
        return {
            "version": APP_VERSION,
            "document": {
                "title": title,
                "active_sheet_id": "sheet_1",
                "updated_at": now_iso,
                "sheets": [
                    {
                        "id": "sheet_1",
                        "title": "1. Síntesis y Premisas",
                        "active_layer_id": "layer_citas_sheet_1",
                        "layers": _make_research_layers("sheet_1", "Premisas"),
                        "pages": [
                            (
                                "<h1>1. Síntesis Analítica y Variables</h1>"
                                '<p data-pid="p_res_sheet_1" style="text-align: justify;">Cuaderno de estudio estructurado para relacionar la Variable Independiente con el Corpus de Estudio<sup class="footnote-ref" contenteditable="false" data-fn-num="1" data-fn-text="Registro metodológico de laboratorio, Serie B-14 (2025).">[1]</sup>.</p>'
                                '<table class="strata-table"><thead><tr><th>Variable</th><th>Definición Operativa</th><th>Rango Observado</th></tr></thead><tbody><tr><td>Variable Independiente</td><td>Exposición controlada al estímulo</td><td>10 – 45 min</td></tr><tr><td>Tasa de Retención</td><td>Persistencia de lectura post-ensayo</td><td>82% ± 3,4%</td></tr></tbody></table>'
                                '<div class="footnotes-section"><hr class="footnotes-divider"><div class="footnote-item" data-fn-num="1"><span class="footnote-num">[1]</span> <span class="footnote-body">Registro metodológico de laboratorio, Serie B-14 (2025).</span></div></div>'
                            )
                        ],
                    },
                    {
                        "id": "sheet_2",
                        "title": "2. Evidencia Empírica",
                        "active_layer_id": "layer_citas_sheet_2",
                        "layers": _make_research_layers("sheet_2", "Evidencia"),
                        "pages": [
                            (
                                "<h1>2. Registro de Observaciones</h1>"
                                '<p data-pid="p_res_sheet_2" style="text-align: justify;">Documente aquí las pruebas, lecturas comparadas y anomalías detectadas en el Corpus de Estudio.</p>'
                            )
                        ],
                    },
                    {
                        "id": "sheet_3",
                        "title": "3. Discusión",
                        "active_layer_id": "layer_citas_sheet_3",
                        "layers": _make_research_layers("sheet_3", "Discusión"),
                        "pages": [
                            (
                                "<h1>3. Discusión de Resultados</h1>"
                                '<p data-pid="p_res_sheet_3" style="text-align: justify;">Interpretación crítica de los resultados frente a la literatura previa.</p>'
                            )
                        ],
                    },
                ],
            },
            "fichas": [
                {
                    "id": "ficha_var",
                    "name": "Variable Independiente",
                    "category": "Datos",
                    "color": "#5B8A9A",
                    "image": "",
                    "properties": [
                        {"key": "Unidad", "value": "Minutos de exposición"},
                        {"key": "Control", "value": "Doble ciego"},
                    ],
                    "description": "Factor manipulado sistemáticamente para observar su efecto en la retención.",
                },
                {
                    "id": "ficha_corpus",
                    "name": "Corpus de Estudio",
                    "category": "Fuentes",
                    "color": "#529E78",
                    "image": "",
                    "properties": [
                        {"key": "Muestra", "value": "N = 120 registros"},
                        {"key": "Periodo", "value": "2023–2025"},
                    ],
                    "description": "Conjunto de datos estandarizados utilizados para las pruebas comparativas.",
                },
            ],
            "scraps": [],
        }

    if tid == "novela":
        title = custom_title.strip() or "Nueva Novela"
        return {
            "version": APP_VERSION,
            "document": {
                "title": title,
                "active_sheet_id": "sheet_1",
                "updated_at": now_iso,
                "sheets": [
                    {
                        "id": "sheet_1",
                        "title": "Capítulo 1",
                        "active_layer_id": "layer_trama_sheet_1",
                        "layers": _make_novel_layers("sheet_1", "Cap. 1"),
                        "pages": [
                            (
                                "<h1>Capítulo I. El punto de partida</h1>"
                                '<p data-pid="p_open_sheet_1" style="text-align: justify;">Escriba aquí la escena inaugural de su novela. Mencione a su Protagonista o el Escenario Principal para ver cómo se iluminan automáticamente las fichas de su Wiki literaria.</p>'
                                '<p data-pid="p_dial_sheet_1" style="text-align: justify;">—Toda historia comienza con una promesa o con un secreto —dijo mirando hacia el horizonte.</p>'
                            )
                        ],
                    },
                    {
                        "id": "sheet_2",
                        "title": "Capítulo 2",
                        "active_layer_id": "layer_trama_sheet_2",
                        "layers": _make_novel_layers("sheet_2", "Cap. 2"),
                        "pages": [
                            (
                                "<h1>Capítulo II. El desarrollo del conflicto</h1>"
                                '<p data-pid="p_open_sheet_2" style="text-align: justify;">Continúe aquí el segundo capítulo. Las capas que agregue en este capítulo serán independientes del Capítulo 1.</p>'
                            )
                        ],
                    },
                    {
                        "id": "sheet_3",
                        "title": "Capítulo 3",
                        "active_layer_id": "layer_trama_sheet_3",
                        "layers": _make_novel_layers("sheet_3", "Cap. 3"),
                        "pages": [
                            (
                                "<h1>Capítulo III. Desenlace</h1>"
                                '<p data-pid="p_open_sheet_3" style="text-align: justify;">Espacio preparado para el clímax y la resolución de la obra.</p>'
                            )
                        ],
                    },
                ],
            },
            "fichas": [
                {
                    "id": "ficha_prot",
                    "name": "Protagonista",
                    "category": "Personajes",
                    "color": "#6889B5",
                    "image": "",
                    "properties": [
                        {"key": "Rol", "value": "Personaje Principal"},
                        {"key": "Motivación", "value": "Descubrir la verdad"},
                    ],
                    "description": "Ficha del personaje principal: motivación interna, conflicto, rasgos de voz y evolución a lo largo de la obra.",
                },
                {
                    "id": "ficha_ant",
                    "name": "Antagonista",
                    "category": "Personajes",
                    "color": "#B86273",
                    "image": "",
                    "properties": [
                        {"key": "Rol", "value": "Oponente principal"},
                    ],
                    "description": "Fuerza u oponente principal que obstaculiza el objetivo del protagonista.",
                },
                {
                    "id": "ficha_esc",
                    "name": "Escenario Principal",
                    "category": "Lugares",
                    "color": "#529E78",
                    "image": "",
                    "properties": [
                        {"key": "Época", "value": "Actualidad / Atemporal"},
                    ],
                    "description": "Atmósfera, época, reglas del mundo y detalles sensoriales de la locación central.",
                },
            ],
            "scraps": [
                {
                    "id": "scrap_nov_1",
                    "text": "Idea suelta para más adelante: un detalle aparentemente menor del primer capítulo cobra sentido en el desenlace.",
                    "time": "09:00",
                    "source_layer": "Estructura y Ritmo",
                }
            ],
        }

    if tid == "guion":
        title = custom_title.strip() or "Nuevo Guion Escénico"
        return {
            "version": APP_VERSION,
            "document": {
                "title": title,
                "active_sheet_id": "sheet_1",
                "updated_at": now_iso,
                "sheets": [
                    {
                        "id": "sheet_1",
                        "title": "Acto I",
                        "active_layer_id": "layer_acot_sheet_1",
                        "layers": _make_script_layers("sheet_1", "Acto I"),
                        "pages": [
                            (
                                "<h1>ACTO I — Escena 1</h1>"
                                '<p data-pid="p_act_sheet_1"><strong>INT. ESTUDIO PRINCIPAL — NOCHE</strong></p>'
                                '<p data-pid="p_act_dial_1">—No esperaba encontrarte despierta a esta hora —dice al cruzar el umbral.</p>'
                            )
                        ],
                    },
                    {
                        "id": "sheet_2",
                        "title": "Acto II",
                        "active_layer_id": "layer_acot_sheet_2",
                        "layers": _make_script_layers("sheet_2", "Acto II"),
                        "pages": [
                            (
                                "<h1>ACTO II — Confrontación</h1>"
                                '<p data-pid="p_act_sheet_2"><strong>EXT. PATIO DE PIEDRA — AMANECER</strong></p>'
                                "<p>Continúe aquí el segundo acto de la obra.</p>"
                            )
                        ],
                    },
                    {
                        "id": "sheet_3",
                        "title": "Acto III",
                        "active_layer_id": "layer_acot_sheet_3",
                        "layers": _make_script_layers("sheet_3", "Acto III"),
                        "pages": [
                            (
                                "<h1>ACTO III — Resolución</h1>"
                                '<p data-pid="p_act_sheet_3"><strong>INT. SALA DE ARCHIVOS — DÍA</strong></p>'
                                "<p>Escena final y desenlace.</p>"
                            )
                        ],
                    },
                ],
            },
            "fichas": [
                {
                    "id": "ficha_pers_1",
                    "name": "Personaje A",
                    "category": "Personajes",
                    "color": "#B86273",
                    "image": "",
                    "properties": [
                        {"key": "Registro vocal", "value": "Pausado y contenido"},
                    ],
                    "description": "Voz, gesto característico y objetivo dramático en cada acto.",
                },
                {
                    "id": "ficha_loc_1",
                    "name": "Estudio Principal",
                    "category": "Lugares",
                    "color": "#6889B5",
                    "image": "",
                    "properties": [
                        {"key": "Iluminación", "value": "Claroscuro / Lámpara cálida"},
                    ],
                    "description": "Disposición del espacio escénico, utilería clave e iluminación.",
                },
            ],
            "scraps": [],
        }

    # Por defecto: "blanco"
    proj = deepcopy(EMPTY_PROJECT_TEMPLATE)
    proj["document"]["title"] = custom_title.strip() or "Nuevo manuscrito"
    proj["document"]["updated_at"] = now_iso
    return proj
