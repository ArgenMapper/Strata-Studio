# Strata Studio

Procesador de textos con capítulos, capas, Wiki, investigación y servicios opcionales de cuenta y nube.

## Ejecutar desde el código

Requiere Python 3.15 y un escritorio Windows, macOS 14+ o Linux reciente.

```shell
python -m pip install -r requirements.txt
python main.py
```

En Mac/Linux el comando puede llamarse `python3`. Los paquetes compilados incluyen Python y Qt.

## Crear paquetes

Lee [DISTRIBUCION.md](DISTRIBUCION.md). El flujo manual **Generar instaladores** de GitHub Actions compila y comprueba cada sistema por separado. No publica versiones automáticamente.

Los paquetes de Mac y Linux están preparados para su primera compilación nativa; aún requieren validación en equipos reales antes de anunciarse como compatibles.

No subas la carpeta de trabajo completa: contiene datos personales. Usa `python preparar_github.py` para exportar las fuentes distribuibles.
