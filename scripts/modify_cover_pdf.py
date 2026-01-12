#!/usr/bin/env python3
"""
Cover PDF modification script using PyMuPDF (fitz)
Modifies the NJU thesis cover template with thesis metadata
"""

import sys
import json
import os
import fitz  # PyMuPDF
from typing import Optional, Dict, Any, Tuple


class CoverPdfModifier:
    """Modifies cover.pdf with thesis metadata"""

    # Page 1: Fixed x position for field values (after the colon, on the underline)
    PAGE1_VALUE_X = 200  # Where to start inserting values on Page 1

    # Page 1 field labels
    PAGE1_LABELS = {
        'title': '论文题目',
        'author': '作者姓名',
        'major': '专业名称',
        'researchDirection': '研究方向',
        'supervisor': '导师姓名',
    }

    # Page 3 placeholder texts to replace (will be centered)
    PAGE3_PLACEHOLDERS = {
        'title': '中文题目',
        'titleEn': '英文题目（新罗马字体）',
    }

    # Page 3 labels to insert text after
    PAGE3_LABELS = {
        'author': '作者：',
        'supervisor': '导师：',
    }

    # Page width for centering calculations
    PAGE_WIDTH = 595.3

    def __init__(self, input_pdf: str, output_pdf: str, font_dir: str = "."):
        self.input_pdf = input_pdf
        self.output_pdf = output_pdf
        self.font_dir = font_dir
        self.doc: Optional[fitz.Document] = None
        self._chinese_font_path: Optional[str] = None

    def load_document(self) -> None:
        """Load the PDF document"""
        self.doc = fitz.open(self.input_pdf)

        # Find Chinese font
        for font_file in ['simsun.ttc', 'simsun.ttf', 'SimSun.ttc', 'SimSun.ttf']:
            font_path = os.path.join(self.font_dir, font_file)
            if os.path.exists(font_path):
                self._chinese_font_path = font_path
                break

    def _find_text_rect(self, page: fitz.Page, search_text: str) -> Optional[fitz.Rect]:
        """Find the bounding rectangle of text on a page"""
        text_instances = page.search_for(search_text)
        if text_instances:
            return text_instances[0]
        return None

    def _get_text_end_position(self, page: fitz.Page, search_text: str) -> Optional[Tuple[float, float]]:
        """Get the position right after a text label"""
        rect = self._find_text_rect(page, search_text)
        if rect:
            # Return position at end of text, same baseline
            return (rect.x1 + 5, rect.y1)
        return None

    def _insert_text_in_box(
        self,
        page: fitz.Page,
        rect: fitz.Rect,
        text: str,
        font_size: float,
        align: int = fitz.TEXT_ALIGN_CENTER,
        fontname: str = "simsun",
        fontfile: Optional[str] = None
    ) -> bool:
        """Insert text in a rectangle with alignment support"""
        try:
            # Use textbox for proper alignment
            page.insert_textbox(
                rect,
                text,
                fontsize=font_size,
                fontname=fontname,
                fontfile=fontfile,
                align=align,
            )
            return True
        except Exception as e:
            print(f"Warning: insert_textbox failed: {e}", file=sys.stderr)
            return False

    def _insert_chinese_text(
        self,
        page: fitz.Page,
        point: Tuple[float, float],
        text: str,
        font_size: float = 14
    ) -> bool:
        """Insert Chinese text using SimSun font"""
        if not text:
            return False

        try:
            if self._chinese_font_path:
                page.insert_text(
                    fitz.Point(point[0], point[1]),
                    text,
                    fontsize=font_size,
                    fontfile=self._chinese_font_path,
                    fontname="simsun",
                )
            else:
                # Fallback: use default font (may not render Chinese well)
                page.insert_text(
                    fitz.Point(point[0], point[1]),
                    text,
                    fontsize=font_size,
                    fontname="helv",
                )
            return True
        except Exception as e:
            print(f"Warning: Failed to insert text '{text[:20]}...': {e}", file=sys.stderr)
            return False

    def _insert_english_text(
        self,
        page: fitz.Page,
        point: Tuple[float, float],
        text: str,
        font_size: float = 14
    ) -> bool:
        """Insert English text using Times New Roman (PDF standard font)"""
        if not text:
            return False

        try:
            page.insert_text(
                fitz.Point(point[0], point[1]),
                text,
                fontsize=font_size,
                fontname="tiro",  # Times-Roman equivalent
            )
            return True
        except Exception as e:
            print(f"Warning: Failed to insert text '{text[:20]}...': {e}", file=sys.stderr)
            return False

    def _replace_text_centered(
        self,
        page: fitz.Page,
        old_text: str,
        new_text: str,
        use_english_font: bool = False,
        font_size: float = 14
    ) -> bool:
        """Replace text and center the new text on the page using textbox"""
        if not new_text:
            return False

        # Find the text location
        text_rect = self._find_text_rect(page, old_text)
        if not text_rect:
            print(f"Warning: Could not find text '{old_text}' on page", file=sys.stderr)
            return False

        # Store y position before redaction
        y0 = text_rect.y0
        y1 = text_rect.y1
        height = y1 - y0

        # Add redaction annotation to remove old text
        page.add_redact_annot(text_rect)
        page.apply_redactions()

        # Create a full-width rectangle at the same y position for centered text
        # Use page margins (50pt on each side)
        new_rect = fitz.Rect(50, y0, self.PAGE_WIDTH - 50, y0 + height + 5)

        # Insert new text centered in the rectangle
        if use_english_font:
            return self._insert_text_in_box(
                page, new_rect, new_text, font_size,
                align=fitz.TEXT_ALIGN_CENTER,
                fontname="tiro",
                fontfile=None
            )
        else:
            return self._insert_text_in_box(
                page, new_rect, new_text, font_size,
                align=fitz.TEXT_ALIGN_CENTER,
                fontname="simsun",
                fontfile=self._chinese_font_path
            )

    def modify_page1(self, data: Dict[str, Any]) -> int:
        """
        Modify Page 1 - Main cover with field entries
        Returns number of fields successfully modified
        """
        if not self.doc or self.doc.page_count < 1:
            return 0

        page = self.doc[0]
        modified_count = 0

        # Field mapping from input data to PDF labels
        field_mapping = {
            'title': data.get('title', ''),
            'author': data.get('author', ''),
            'major': data.get('major', ''),
            'researchDirection': data.get('researchDirection', ''),
            'supervisor': data.get('supervisor', ''),
        }

        for field_name, value in field_mapping.items():
            if not value:
                continue

            label = self.PAGE1_LABELS.get(field_name)
            if not label:
                continue

            # Find the label to get the y position
            label_rect = self._find_text_rect(page, label)
            if label_rect:
                # Create a textbox from the value start position to the right margin
                # The value area starts after the label (with some padding)
                value_rect = fitz.Rect(
                    self.PAGE1_VALUE_X,           # Start x
                    label_rect.y0,                 # Same y as label
                    self.PAGE_WIDTH - 60,          # Right margin
                    label_rect.y1 + 5              # Bottom with padding
                )
                if self._insert_text_in_box(
                    page, value_rect, value, font_size=12,
                    align=fitz.TEXT_ALIGN_LEFT,
                    fontname="simsun",
                    fontfile=self._chinese_font_path
                ):
                    modified_count += 1
            else:
                print(f"Warning: Could not find label '{label}' on Page 1", file=sys.stderr)

        return modified_count

    def modify_page3(self, data: Dict[str, Any]) -> int:
        """
        Modify Page 3 - Inner title page with text replacement
        Returns number of fields successfully modified
        """
        if not self.doc or self.doc.page_count < 3:
            print("Warning: Document doesn't have page 3", file=sys.stderr)
            return 0

        page = self.doc[2]  # 0-indexed, page 3
        modified_count = 0

        # Chinese title replacement (centered)
        title_cn = data.get('title', '')
        if title_cn:
            if self._replace_text_centered(page, self.PAGE3_PLACEHOLDERS['title'], title_cn,
                                           use_english_font=False, font_size=22):
                modified_count += 1

        # English title replacement (centered, Times New Roman)
        title_en = data.get('titleEn', '')
        if title_en:
            if self._replace_text_centered(page, self.PAGE3_PLACEHOLDERS['titleEn'], title_en,
                                           use_english_font=True, font_size=18):
                modified_count += 1

        # Author name - insert after "作者："
        author = data.get('author', '')
        if author:
            position = self._get_text_end_position(page, self.PAGE3_LABELS['author'])
            if position:
                if self._insert_chinese_text(page, position, author, font_size=22):
                    modified_count += 1

        # Supervisor name - insert after "导师："
        supervisor = data.get('supervisor', '')
        if supervisor:
            position = self._get_text_end_position(page, self.PAGE3_LABELS['supervisor'])
            if position:
                if self._insert_chinese_text(page, position, supervisor, font_size=22):
                    modified_count += 1

        return modified_count

    def save(self) -> None:
        """Save the modified PDF"""
        if self.doc:
            self.doc.save(self.output_pdf)
            self.doc.close()

    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Main processing method"""
        self.load_document()

        page1_count = self.modify_page1(data)
        page3_count = self.modify_page3(data)

        self.save()

        return {
            "success": True,
            "output": self.output_pdf,
            "page1_fields_modified": page1_count,
            "page3_fields_modified": page3_count,
        }


def main():
    """CLI entry point"""
    if len(sys.argv) < 4:
        print(
            "Usage: python modify_cover_pdf.py <input.pdf> <output.pdf> <data.json> [font_dir]",
            file=sys.stderr
        )
        sys.exit(1)

    input_pdf = sys.argv[1]
    output_pdf = sys.argv[2]
    data_json = sys.argv[3]
    font_dir = sys.argv[4] if len(sys.argv) > 4 else "."

    # Validate input file exists
    if not os.path.exists(input_pdf):
        print(json.dumps({"success": False, "error": f"Input PDF not found: {input_pdf}"}))
        sys.exit(1)

    # Load metadata
    try:
        with open(data_json, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Failed to load data JSON: {e}"}))
        sys.exit(1)

    # Create output directory if needed
    output_dir = os.path.dirname(output_pdf)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    # Process PDF
    modifier = CoverPdfModifier(input_pdf, output_pdf, font_dir)

    try:
        result = modifier.process(data)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
