# Arma carga.html (instalador del marcador) a partir de carga/carga.js
import urllib.parse, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
code = (root / "carga/carga.js").read_text(encoding="utf-8")
href = "javascript:" + urllib.parse.quote(code, safe="")
html = (root / "carga/plantilla.html").read_text(encoding="utf-8").replace("__HREF__", href)
(root / "carga.html").write_text(html, encoding="utf-8")
print("carga.html", len(href), "bytes")
