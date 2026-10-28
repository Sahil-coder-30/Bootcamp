"""
layout.py
=========
Column-aware document layout reconstruction for PDF (PyMuPDF) and DOCX (python-docx).
Handles 2-column templates (Overleaf, Canva), running headers/footers, and text boxes.
"""

from __future__ import annotations

import io
import unicodedata
from typing import Any
import pymupdf as fitz
import docx  # python-docx
from talent_match.resume.models import Block, Line


def normalize(text: str) -> str:
    """Normalize unicode, clean odd bullets and strip PUA glyphs."""
    if not text:
        return ""
    # NFKC unrolls ligatures like 'fi', 'fl'
    t = unicodedata.normalize("NFKC", text)
    # Strip Unicode Private Use Area
    t = "".join(ch for ch in t if not (0xE000 <= ord(ch) <= 0xF8FF))
    # Standardize bullet symbols
    for b in ("•", "▪", "●", "➢", "◦", "–", "—", "►", "*"):
        t = t.replace(b, "- ")
    return t.strip()


def detect_gutter(blocks: list[Block], page_w: float, body_top: float, body_bot: float) -> float | None:
    """Detect empty vertical gutter for two-column resumes (e.g. Overleaf/Canva)."""
    narrow = [b for b in blocks if b.width < 0.62 * page_w and body_top <= b.y0 <= body_bot]
    if len(narrow) < 6:
        return None

    bin_width = 4
    num_bins = int(page_w) // bin_width + 1
    bins = [0.0] * num_bins

    for b in narrow:
        start_bin = max(0, int(b.x0) // bin_width)
        end_bin = min(num_bins - 1, int(b.x1) // bin_width)
        for i in range(start_bin, end_bin + 1):
            bins[i] += b.height

    lo = int(0.20 * num_bins)
    hi = int(0.80 * num_bins)

    best_start = None
    best_len = 0
    cur_start = None
    cur_len = 0

    for i in range(lo, hi):
        if bins[i] == 0.0:
            if cur_start is None:
                cur_start = i
                cur_len = 1
            else:
                cur_len += 1
        else:
            if cur_start is not None and cur_len > best_len:
                best_start = cur_start
                best_len = cur_len
            cur_start = None
            cur_len = 0

    if cur_start is not None and cur_len > best_len:
        best_start = cur_start
        best_len = cur_len

    if best_start is not None and (best_len * bin_width) >= 8:
        gutter_center = (best_start + best_len / 2.0) * bin_width
        return float(gutter_center)

    return None


def strip_running_lines(pages: list[list[Line]]) -> list[Line]:
    """Strip repeating header/footer lines across multiple pages (e.g. 'Page 1 of 2')."""
    if len(pages) <= 1:
        return [line for page in pages for line in page]

    # Count occurrences of normalized text near top/bottom 7%
    repeats: set[str] = set()
    first_page_top = {normalize(l.text) for l in pages[0][:4]}
    first_page_bot = {normalize(l.text) for l in pages[0][-3:]}

    for p in pages[1:]:
        for l in p[:4]:
            norm = normalize(l.text)
            if norm and norm in first_page_top:
                repeats.add(norm)
        for l in p[-3:]:
            norm = normalize(l.text)
            if norm and norm in first_page_bot:
                repeats.add(norm)

    clean: list[Line] = []
    for p in pages:
        for l in p:
            if normalize(l.text) not in repeats:
                clean.append(l)
    return clean


def extract_pdf_lines(data: bytes) -> list[Line]:
    """Extract structured lines from PDF with two-column gutter detection."""
    doc = fitz.open(stream=data, filetype="pdf")
    pages_lines: list[list[Line]] = []

    for page_idx, page in enumerate(doc, 1):
        page_w = float(page.rect.width)
        page_h = float(page.rect.height)
        d = page.get_text("dict")
        blocks_data = d.get("blocks", [])

        page_blocks: list[Block] = []

        for b in blocks_data:
            if b.get("type") != 0:  # skip image blocks
                continue
            lines: list[Line] = []
            for l in b.get("lines", []):
                text_parts: list[str] = []
                max_size = 10.0
                is_bold = False

                for span in l.get("spans", []):
                    span_text = span.get("text", "")
                    if span_text:
                        text_parts.append(span_text)
                        max_size = max(max_size, float(span.get("size", 10.0)))
                        flags = span.get("flags", 0)
                        if flags & 2 or "bold" in span.get("font", "").lower():
                            is_bold = True

                full_line = "".join(text_parts).strip()
                if full_line:
                    bbox = l.get("bbox", (0, 0, 0, 0))
                    lines.append(
                        Line(
                            text=full_line,
                            page=page_idx,
                            x0=float(bbox[0]),
                            y0=float(bbox[1]),
                            x1=float(bbox[2]),
                            y1=float(bbox[3]),
                            font_size=max_size,
                            is_bold=is_bold,
                            is_caps=full_line.isupper() and len(full_line) > 3,
                        )
                    )

            if lines:
                b_bbox = b.get("bbox", (0, 0, 0, 0))
                page_blocks.append(
                    Block(
                        lines=lines,
                        x0=float(b_bbox[0]),
                        y0=float(b_bbox[1]),
                        x1=float(b_bbox[2]),
                        y1=float(b_bbox[3]),
                        page=page_idx,
                    )
                )

        # Gutter detection
        body_top = 0.08 * page_h
        body_bot = 0.92 * page_h
        gutter_x = detect_gutter(page_blocks, page_w, body_top, body_bot)

        if gutter_x is not None:
            # Reorder blocks: header full-width, left column, right column, footer
            top_blocks = [b for b in page_blocks if b.y1 < body_top or b.width >= 0.70 * page_w]
            left_blocks = [b for b in page_blocks if b not in top_blocks and b.x1 <= gutter_x]
            right_blocks = [b for b in page_blocks if b not in top_blocks and b.x0 >= gutter_x]
            mid_blocks = [b for b in page_blocks if b not in top_blocks and b not in left_blocks and b not in right_blocks]

            top_blocks.sort(key=lambda b: b.y0)
            left_blocks.sort(key=lambda b: b.y0)
            right_blocks.sort(key=lambda b: b.y0)
            mid_blocks.sort(key=lambda b: b.y0)

            ordered_blocks = top_blocks + left_blocks + right_blocks + mid_blocks
        else:
            ordered_blocks = sorted(page_blocks, key=lambda b: (b.y0, b.x0))

        page_lines = [line for b in ordered_blocks for line in b.lines]
        pages_lines.append(page_lines)

    return strip_running_lines(pages_lines)


def extract_docx_lines(data: bytes) -> list[Line]:
    """Extract structured lines from DOCX, iterating tables and text boxes in order."""
    doc = docx.Document(io.BytesIO(data))
    lines: list[Line] = []

    # Include header paragraphs
    for section in doc.sections:
        for p in section.header.paragraphs:
            text = normalize(p.text)
            if text:
                lines.append(Line(text=text, page=1, font_size=9.0, is_bold=False))

    # Iterate main document elements
    for element in doc.element.body:
        tag = element.tag.split("}")[-1] if "}" in element.tag else element.tag

        if tag == "p":
            p = docx.text.paragraph.Paragraph(element, doc)
            text = normalize(p.text)
            if text:
                is_bold = any(run.bold for run in p.runs if run.bold)
                lines.append(
                    Line(
                        text=text,
                        page=1,
                        font_size=11.0,
                        is_bold=is_bold,
                        is_caps=text.isupper() and len(text) > 3,
                        docx_style=p.style.name if p.style else None,
                    )
                )

        elif tag == "tbl":
            tbl = docx.table.Table(element, doc)
            for row in tbl.rows:
                # In 2-cell layout rows, read left cell then right cell
                for cell in row.cells:
                    for p in cell.paragraphs:
                        text = normalize(p.text)
                        if text:
                            lines.append(Line(text=text, page=1, font_size=10.0, is_bold=False))

    return lines


def extract_document_lines(data: bytes, file_name: str, mime: str = "") -> list[Line]:
    """Master entry point for extracting reading-ordered lines from PDF or DOCX."""
    fname = file_name.lower()
    if fname.endswith(".docx") or "wordprocessingml" in mime:
        return extract_docx_lines(data)
    else:
        # Default to PDF
        return extract_pdf_lines(data)
