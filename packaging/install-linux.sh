#!/bin/sh
# Instalación por usuario; no usa sudo ni escribe dentro de los manuscritos.
set -eu
source_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
target="$HOME/.local/opt/strata"
data_home=${XDG_DATA_HOME:-"$HOME/.local/share"}
case "$data_home" in /*) ;; *) data_home="$HOME/.local/share" ;; esac
if [ ! -x "$source_dir/Strata" ]; then
  printf '%s\n' 'Extrae la carpeta completa antes de ejecutar instalar.sh.' >&2
  exit 1
fi
if command -v pgrep >/dev/null 2>&1 && pgrep -x Strata >/dev/null 2>&1; then
  printf '%s\n' 'Cierra Strata antes de instalar o actualizar.' >&2
  exit 1
fi
# Los campos Exec de un .desktop necesitan dos niveles de escape.
case "$target" in *'"'*|*'\'*|*'`'*|*'$'*|*'%'*)
  printf '%s\n' 'La ruta de usuario contiene caracteres no admitidos por este instalador.' >&2
  exit 1 ;;
esac
mkdir -p "$HOME/.local/opt" "$data_home/applications" "$data_home/icons/hicolor/512x512/apps" "$data_home/mime/packages"
stage=$(mktemp -d "$HOME/.local/opt/.strata-new.XXXXXX")
trap 'rmdir "$stage" 2>/dev/null || true' EXIT
cp -a "$source_dir/." "$stage/"
if [ -e "$target" ]; then
  backup="$HOME/.local/opt/strata-anterior-$(date +%Y%m%d%H%M%S)"
  mv "$target" "$backup"
  printf 'Versión anterior conservada en: %s\n' "$backup"
fi
mv "$stage" "$target"
printf '[Desktop Entry]\nType=Application\nName=Strata Studio\nExec="%s/Strata" %%f\nIcon=strata\nTerminal=false\nCategories=Office;WordProcessor;\nMimeType=application/x-strata;\nStartupWMClass=Strata\n' "$target" > "$data_home/applications/strata.desktop"
cp "$target/strata.png" "$data_home/icons/hicolor/512x512/apps/strata.png"
cp "$target/strata-mime.xml" "$data_home/mime/packages/strata.xml"
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$data_home/applications" || true
command -v update-mime-database >/dev/null 2>&1 && update-mime-database "$data_home/mime" || true
printf '%s\n' 'Strata está instalado. Búscalo en el menú de aplicaciones.'
