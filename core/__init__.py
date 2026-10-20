"""Núcleo de Strata: almacenamiento, cuentas, exportación y servidor local."""

APP_VERSION = "11.0.0"

from .platforms import configure_tls as _configure_tls
_configure_tls()
