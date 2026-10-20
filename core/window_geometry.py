"""Geometría en píxeles lógicos; los monitores ya incorporan el escalado de Qt."""
def fit_window(saved, available):
    x, y, width, height = available
    def number(key, fallback):
        try: return int(saved.get(key, fallback))
        except (TypeError, ValueError, OverflowError): return fallback
    min_w, min_h = min(760, width), min(480, height)
    w = max(min_w, min(width, number('w', min(1480, max(min_w, width-32)))))
    h = max(min_h, min(height, number('h', min(910, max(min_h, height-32)))))
    left = max(x, min(x+width-w, number('x', x+(width-w)//2)))
    top = max(y, min(y+height-h, number('y', y+(height-h)//2)))
    return left, top, w, h, min_w, min_h
