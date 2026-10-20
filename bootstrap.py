"""Lanzador estable: Qt permanece empaquetado; el producto se carga desde disco."""
import importlib.machinery
import importlib.util
import runpy
import sys
from pathlib import Path


def run():
    root = Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parent
    if getattr(sys, 'frozen', False) and sys.platform == 'darwin':
        bundle = next((p for p in root.parents if p.suffix == '.app'), None)
        if bundle:
            root = bundle / 'Contents' / 'Resources' / 'strata'
    # PathFinder evita que FrozenImporter anteponga la versión antigua de core.
    spec = importlib.machinery.PathFinder.find_spec("core", [str(root)])
    if spec and (root / "main.py").is_file():
        module = importlib.util.module_from_spec(spec)
        sys.modules["core"] = module
        spec.loader.exec_module(module)
        sys.path.insert(0, str(root))
        runpy.run_path(str(root / "main.py"), run_name="__main__")
    else:
        runpy.run_module("main", run_name="__main__")


if __name__ == "__main__":
    run()
