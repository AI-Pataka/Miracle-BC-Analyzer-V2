"""
Export helpers: render a completed analysis as Markdown, HTML, or PDF.

HTML and PDF wrap the analysis Markdown in a minimal stylesheet so the
report prints cleanly. PDF generation goes through WeasyPrint; if the
native libraries (cairo/pango/gdk-pixbuf) aren't installed, we raise a
clear error rather than silently producing a broken document.
"""

import io
from typing import Optional

import markdown as md


_CSS = """
@page { size: A4; margin: 18mm 16mm 20mm 16mm; }
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #1a1a1a;
  font-size: 11pt;
  line-height: 1.55;
}
h1 { font-size: 22pt; border-bottom: 2px solid #222; padding-bottom: 6pt; margin-top: 0; }
h2 { font-size: 16pt; margin-top: 18pt; border-bottom: 1px solid #bbb; padding-bottom: 3pt; }
h3 { font-size: 13pt; margin-top: 14pt; }
h4 { font-size: 11.5pt; margin-top: 10pt; }
p  { margin: 6pt 0; }
ul, ol { margin: 6pt 0 6pt 20pt; }
li { margin: 2pt 0; }
hr { border: none; border-top: 1px dashed #999; margin: 14pt 0; }
table { border-collapse: collapse; width: 100%; margin: 10pt 0; font-size: 10pt; }
th, td { border: 1px solid #666; padding: 5pt 7pt; text-align: left; vertical-align: top; }
th { background: #eee; }
code { background: #f2f2f2; padding: 1pt 3pt; border-radius: 3pt; font-size: 9.5pt; }
pre  { background: #f6f6f6; padding: 8pt; border-radius: 4pt; overflow-x: auto; font-size: 9.5pt; }
blockquote { border-left: 3px solid #888; margin: 8pt 0; padding: 2pt 10pt; color: #444; }
.metadata { color: #555; font-size: 10pt; margin: 0 0 14pt 0; }
"""


def _metadata_block(meta: Optional[dict]) -> str:
    if not meta:
        return ""
    bits = []
    for label, key in (
        ("Initiative", "initiative_name"),
        ("Client", "client_company"),
        ("Consulting firm", "consulting_company"),
        ("Industry", "industry"),
        ("Generated", "created_at"),
    ):
        val = (meta.get(key) or "").strip()
        if val:
            bits.append(f"<strong>{label}:</strong> {val}")
    if not bits:
        return ""
    return f'<div class="metadata">{" &nbsp;·&nbsp; ".join(bits)}</div>'


def render_markdown(final_output: str) -> bytes:
    """Return the analysis as a UTF-8 Markdown byte stream."""
    return (final_output or "").encode("utf-8")


def render_html(final_output: str, meta: Optional[dict] = None) -> bytes:
    """Wrap rendered Markdown in a standalone HTML document."""
    html_body = md.markdown(
        final_output or "",
        extensions=["extra", "sane_lists", "tables", "toc"],
    )
    title = (meta or {}).get("initiative_name") or "Business Capability Analysis"
    doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>{title}</title>
<style>{_CSS}</style>
</head>
<body>
{_metadata_block(meta)}
{html_body}
</body>
</html>
"""
    return doc.encode("utf-8")


def render_pdf(final_output: str, meta: Optional[dict] = None) -> bytes:
    """Render the analysis as a PDF using WeasyPrint."""
    try:
        from weasyprint import HTML
    except Exception as e:  # OSError on missing libs, ImportError if not installed
        raise RuntimeError(
            "PDF export requires WeasyPrint and its native dependencies "
            "(cairo, pango, gdk-pixbuf). Install them and `pip install weasyprint`. "
            f"Original error: {e}"
        ) from e

    html_bytes = render_html(final_output, meta)
    buf = io.BytesIO()
    HTML(string=html_bytes.decode("utf-8")).write_pdf(buf)
    return buf.getvalue()
