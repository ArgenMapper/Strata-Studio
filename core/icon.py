"""Generación del ícono .ico nativo de Strata."""

from pathlib import Path

from PySide6.QtCore import QRectF
from PySide6.QtGui import QImage, QPainter
from PySide6.QtSvg import QSvgRenderer
from .storage import UI_DIR


def generate_app_icon(target: Path) -> Path:
    img=QImage(256,256,QImage.Format.Format_ARGB32);img.fill(0)
    renderer=QSvgRenderer(str(UI_DIR/'logo.svg'))
    if not renderer.isValid(): raise ValueError('No se pudo leer el emblema vectorial.')
    painter=QPainter(img);painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    renderer.render(painter,QRectF(0,0,256,256));painter.end()
    if not img.save(str(target),'ICO'): raise OSError('No se pudo guardar el icono.')
    return target
