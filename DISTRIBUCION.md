# Distribuir Strata en Windows, Mac y Linux

Una página de descarga puede elegir el paquete correcto. El ejecutable sigue siendo diferente en cada sistema: PyInstaller no compila Windows para Mac/Linux. Los usuarios no necesitan Python.

## Primeros pasos con tu cuenta de GitHub

1. Ejecuta `python preparar_github.py`. Genera `build/Strata-fuentes-11.0.0.zip`. Solo contiene fuentes, recursos públicos y el proceso de compilación; excluye manuscritos, cuentas, sesiones, copias y claves administrativas. No subas toda esta carpeta de trabajo.
2. En GitHub pulsa **+ → New repository**. Nombre sugerido: `strata-studio`. Elige **Private** para comenzar. No es necesario añadir un README ni una licencia: ya hay un README entre los archivos.
3. Extrae el ZIP en una carpeta nueva. Para conservar `.github/workflows` y el resto de carpetas, usa **GitHub Desktop → File → Clone repository**, clona tu repositorio y copia DENTRO los archivos extraídos, incluida la carpeta `.github`. No copies el ZIP ni una carpeta envolvente. En GitHub Desktop escribe “Preparar compilaciones” en Summary, pulsa **Commit to main** y luego **Push origin**. No necesitas escribir comandos Git.
4. Abre el repositorio en la web → **Actions → Generar instaladores → Run workflow**. Selecciona `all` para generar los tres paquetes, o `windows`, `macos` o `linux` para repetir solo uno. Si GitHub pide habilitar Actions para tu repositorio, habilítalo. No pide contraseñas de Supabase ni certificados para esta primera prueba.
5. Cuando finalice, abre la ejecución. En **Artifacts** estarán `Strata-Windows`, `Strata-macOS` y `Strata-Linux`. Un fallo conserva los informes de diagnóstico; el paquete de ese sistema no se ofrece como verificado. Cada artefacto de GitHub es un ZIP que contiene el instalador y un JSON con su SHA-256.

Con el plan de GitHub que tengas, los minutos gratuitos para repositorios privados pueden tener un límite. No hacen falta ejecuciones programadas: el flujo solo arranca cuando lo solicitas.

## Qué genera cada compilación

| Sistema | Archivo | Destino inicial |
| --- | --- | --- |
| Windows | `Strata-11.0.0-windows-x64.exe` | Windows 10/11 de 64 bits |
| Mac | `Strata-11.0.0-macos-universal.dmg` | macOS 14+, Intel y Apple Silicon |
| Linux | `Strata-11.0.0-linux-x86_64.tar.gz` | Ubuntu 24.04 de escritorio o compatible reciente, x86_64 |

Mac utiliza Python oficial universal2. Se comprueba que todos los binarios Mach-O incluyan **arm64 y x86_64**; si falta una arquitectura, la compilación falla. No se anuncia una descarga universal falsa. La prueba de arranque en el runner comprueba su arquitectura nativa; todavía hay que probar el resultado en un Mac Intel y un Mac Apple Silicon.

El cifrado usa cryptography actual. Su módulo Intel se compila con OpenSSL estático y se combina con la rueda ARM64 oficial de la misma versión; ambos archivos se verifican contra los SHA-256 publicados por PyPI. CFFI se compila para las dos arquitecturas usando libffi del SDK de Apple. El preparador no recurre a versiones antiguas de cifrado para obtener soporte Intel.

En Windows se incluye `python3t.dll`, necesaria para las ruedas ABI de Python 3.15. Si el Python del runner la omite, se obtiene del paquete embebible oficial de la misma versión y arquitectura, comprobando su SHA-256. No modifica el Python de tu equipo.

Linux conserva los enlaces simbólicos y permisos del runtime en el TAR. Extraer la carpeta completa y ejecutar `sh instalar.sh` instala por usuario sin sudo, registra el icono y el formato `.strata`. También se puede ejecutar directamente `./Strata` desde la carpeta extraída. Linux ARM y distribuciones antiguas requieren otra compilación.

Bibliotecas de escritorio en Ubuntu 24.04 (no hace falta instalar Python):

```shell
sudo apt install libegl1 libgl1 libnss3 libxkbcommon0 libxkbcommon-x11-0 libxcb-cursor0 libxcb-icccm4 libxcb-image0 libxcb-keysyms1 libxcb-render-util0 libxcb-xinerama0 libxcb-randr0 libxcb-shape0 libxcb-xfixes0 libxcomposite1 libxdamage1 libxrandr2 libasound2t64 libdbus-1-3 libsecret-1-0
```

## Datos y cuentas

- Windows conserva las rutas existentes.
- Mac: `~/Library/Application Support/Strata`.
- Linux: `$XDG_DATA_HOME/strata` o `~/.local/share/strata`.
- Los documentos `.strata` se pueden compartir entre sistemas. La cuenta remota de Supabase es la misma. Las cuentas locales y sesiones de cada equipo no se copian al paquete.
- Windows protege las sesiones con DPAPI. Mac/Linux guardan la clave de cifrado en el llavero del sistema (Keychain / Secret Service). Si no hay un llavero disponible y desbloqueado, la sesión permanece solo hasta cerrar Strata; nunca se guarda un token sin cifrar.
- La URL y la clave **pública anon/publishable** de Supabase están destinadas al cliente y se incluyen para que la nube funcione. Las reglas de acceso del servidor siguen siendo necesarias. El exportador rechaza una clave `service_role`. Nunca incluyas claves privadas, contraseñas ni credenciales de firma en el repositorio.
- La actualización de código no modifica una `.app` de Mac ni una AppImage. Para Mac se sustituye la aplicación completa; los datos están fuera del paquete.

## De las pruebas a la página de descarga

Los artefactos de un repositorio privado son privados y caducan (este flujo los guarda 14 días). Sirven para probar y descargarlos tú; no son enlaces públicos de distribución.

Después de probar los tres paquetes, puedes crear un repositorio público dedicado **solo a descargas**, por ejemplo `strata-descargas`, sin publicar el código. En **Releases → Draft a new release**, usa la etiqueta `v11.0.0` y adjunta los instaladores reales extraídos de Artifacts. Elige Publish release cuando estés listo. No se hace desde este flujo.

La carpeta `downloads` es una página estática. En su `config.json` escribe `{"repository":"TU_USUARIO/strata-descargas"}`. Súbela como contenido de una página con HTTPS, por ejemplo GitHub Pages; para Pages utiliza esos cuatro archivos en la raíz de una rama o carpeta configurada para publicarse. Detecta Windows, Mac y Linux, permite elegir otro sistema y consulta la última Release pública. Solo habilita el botón cuando existe el archivo correcto. No contiene enlaces a paquetes inexistentes ni pide tokens privados en el navegador.

## Firma y pruebas antes de distribuir

Windows: este flujo conserva el instalador actual; no añade una firma Authenticode. Sin certificado/reputación puede seguir apareciendo SmartScreen.

Mac: sin credenciales el resultado tiene firma **ad hoc**, útil para desarrollo; no equivale a Developer ID ni a notarización. La descarga pública debe firmarse con un certificado Developer ID y notarizarse con Apple para un uso normal de Gatekeeper. El compilador admite `STRATA_CODESIGN_IDENTITY` y `STRATA_NOTARY_PROFILE` en un runner cuyo llavero esté configurado. El workflow inicial no almacena ni solicita certificados y no garantiza que un DMG de desarrollo abra con doble clic en otro Mac.

El flujo comprueba arranque real de Qt, WebEngine, QWebChannel y editor, además de pruebas de núcleo. Antes de publicar, probar en máquinas reales: crear/guardar/reabrir, Enter y atajos, exportar Word/PDF, capas, Wiki, sesión/nube, pantalla completa, asociación `.strata`, instalación/actualización. Este host Windows no puede dar por verificadas las compilaciones nativas de Mac/Linux.

Referencias: [PyInstaller](https://pyinstaller.org/en/stable/), [plataformas Qt](https://doc.qt.io/qt-6.12/supported-platforms.html), [Python en macOS](https://docs.python.org/3/using/mac.html), [GitHub Actions](https://docs.github.com/en/actions).
