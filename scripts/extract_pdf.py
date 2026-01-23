#!/usr/bin/env python3
"""
PDF extraction script using PyMuPDF (fitz)
Extracts text with image position markers for LLM processing
"""

import sys
import json
import os
import re
import fitz  # PyMuPDF

# Unicode math symbols that indicate potential formulas
UNICODE_MATH_CHARS = set('𝛼𝛽𝛾𝛿𝜀𝜁𝜂𝜃𝜄𝜅𝜆𝜇𝜈𝜉𝜊𝜋𝜌𝜎𝜏𝜐𝜑𝜒𝜓𝜔'
                         '𝛢𝛣𝛤𝛥𝛦𝛧𝛨𝛩𝛪𝛫𝛬𝛭𝛮𝛯𝛰𝛱𝛲𝛳𝛴𝛵𝛶𝛷𝛸𝛹𝛺'
                         '𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧'
                         '𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍'
                         '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎'
                         '∑∏∫∬∭∮∯∰∇∂∆∀∃∈∉⊂⊃⊆⊇∪∩∧∨¬⊕⊗⊙'
                         '≤≥≠≈≡≢∝∞±×÷√∛∜')

def is_formula_line(line: str) -> bool:
    """Check if a line is part of a formula"""
    stripped = line.strip()
    if not stripped:
        return False

    # Count Unicode math characters
    math_count = sum(1 for c in stripped if c in UNICODE_MATH_CHARS)

    # Check for formula indicators
    has_math_symbol = any(c in stripped for c in '∑∏∫∂∇=±×÷')
    has_significant_math = math_count >= 2

    # Short lines with math chars (like "𝑁", "𝑖=1", "𝐿= −")
    is_short_math = len(stripped) <= 10 and math_count >= 1

    # Lines that look like formula parts
    is_formula_part = re.match(r'^[𝑎-𝑧𝐴-𝑍a-zA-Z]=', stripped) is not None
    is_subscript_part = re.match(r'^[𝑖𝑗𝑘ijk]=\d', stripped) is not None

    return has_math_symbol or has_significant_math or is_short_math or is_formula_part or is_subscript_part


def mark_formulas(text: str) -> str:
    """
    Detect and mark potential formulas containing Unicode math symbols.
    Groups consecutive formula lines into a single block.
    """
    lines = text.split('\n')
    result = []
    formula_buffer = []

    def flush_formula_buffer():
        """Output the formula buffer as a single block"""
        nonlocal formula_buffer
        if not formula_buffer:
            return

        if len(formula_buffer) == 1:
            # Single line formula
            result.append(f'[FORMULA: {formula_buffer[0].strip()} :END_FORMULA]')
        else:
            # Multi-line formula block - join with special separator
            content = ' '.join(line.strip() for line in formula_buffer if line.strip())
            result.append(f'[FORMULA_BLOCK: {content} :END_FORMULA_BLOCK]')

        formula_buffer = []

    for i, line in enumerate(lines):
        stripped = line.strip()

        if is_formula_line(line):
            formula_buffer.append(line)
        else:
            # Not a formula line
            if formula_buffer:
                # Check if this non-formula line is "其中" which often follows formulas
                if stripped.startswith('其中') and any(c in stripped for c in UNICODE_MATH_CHARS):
                    formula_buffer.append(line)
                    continue

                flush_formula_buffer()

            result.append(line)

    # Flush any remaining formula content
    flush_formula_buffer()

    return '\n'.join(result)


def extract_tables_with_pymupdf(page) -> list:
    """Extract tables using PyMuPDF's built-in detection."""
    try:
        tables = []
        for table in page.find_tables().tables:
            cell_data = table.extract()
            rows = [row for row in cell_data if any(cell and cell.strip() for cell in row)]
            if len(rows) >= 2:
                tables.append({
                    'bbox': table.bbox,
                    'rows': rows,
                    'col_count': table.col_count
                })
        return tables
    except Exception as e:
        sys.stderr.write(f"Warning: PyMuPDF table detection failed: {e}\n")
        return []


def format_table_as_markers(table_data: dict) -> str:
    """Convert detected table to [TABLE_START]...[TABLE_END] format with row hints."""
    lines = ['[TABLE_START]']
    for row_idx, row in enumerate(table_data['rows']):
        lines.append(f'[TABLE_ROW:{row_idx}]')
        for cell in row:
            cell_text = (cell or '').replace('\n', ' ').strip()
            lines.append(f'[TABLE_CELL: {cell_text}]' if cell_text else '[TABLE_CELL: ]')
    lines.append('[TABLE_END]')
    return '\n'.join(lines)


def detect_table_structure(text: str) -> str:
    """
    Detect potential table data based on patterns:
    - Multiple numbers/values separated by spaces on a line
    - Lines with consistent columnar structure
    - PDF-extracted tables where each cell is on its own line
    """
    lines = text.split('\n')
    result = []
    table_buffer = []
    in_potential_table = False

    def is_table_cell_candidate(line: str) -> bool:
        """Check if a line looks like a single table cell from PDF extraction"""
        stripped = line.strip()
        if not stripped or len(stripped) > 100:  # Empty or too long for a cell
            return False
        # Exclude section headers (e.g., "4.2 实验结果", "第一章")
        if re.match(r'^[\d]+\.\d+\s+.+$', stripped) or stripped.startswith('第'):
            return False
        # Exclude numbered list items (e.g., "1. xxx", "• xxx")
        if re.match(r'^[\d]+[.、]\s+.{5,}', stripped) or stripped.startswith(('•', '–')):
            return False
        # Check for numeric patterns (including comma-separated numbers like "50,000")
        if re.match(r'^[\d,.\-+%]+$', stripped) and len(stripped) >= 1:
            return True
        # Dataset names like CIFAR-10, ImageNet
        if re.match(r'^[A-Za-z][\w\-]+$', stripped) and len(stripped) <= 15:
            return True
        # Short Chinese text that could be a header (not ending with sentence punctuation)
        if len(stripped) <= 10 and not stripped.endswith(('。', '：', '；')):
            return True
        # Medium-length English text (headers like "Accuracy", "Model Parameters")
        if re.match(r'^[A-Za-z][A-Za-z\s\-]{0,40}$', stripped):
            return True
        # Chinese text up to 20 chars
        if len(stripped) <= 20 and re.match(r'^[\u4e00-\u9fa5]+', stripped):
            return True
        # Percentage values
        if re.match(r'^[\d,.]+%$', stripped):
            return True
        return False

    def looks_like_table_sequence(buffer: list) -> bool:
        """Check if a sequence of lines looks like table data"""
        if len(buffer) < 4:  # Need at least header row + 1 data row (assuming 2+ cols)
            return False
        # Count numeric entries
        num_count = sum(1 for line in buffer if re.match(r'^[\d,.\-+%]+$', line.strip()))
        # Should have at least one number or enough cells
        return num_count >= 1 or len(buffer) >= 4

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Check if this looks like a table row (multi-column per line)
        parts = stripped.split()
        has_numbers = any(re.match(r'^[\d,.]+$', p) for p in parts)
        looks_like_multi_col_row = len(parts) >= 3 and has_numbers

        # Check if this looks like a single table cell (PDF extraction pattern)
        looks_like_single_cell = is_table_cell_candidate(stripped)

        if looks_like_multi_col_row:
            # Traditional table row with multiple columns
            if not in_potential_table:
                in_potential_table = True
            table_buffer.append(stripped)
        elif looks_like_single_cell and (in_potential_table or len(table_buffer) > 0):
            # Continue collecting potential table cells
            if not in_potential_table:
                in_potential_table = True
            table_buffer.append(stripped)
        elif looks_like_single_cell and i + 1 < len(lines) and is_table_cell_candidate(lines[i + 1]):
            # Start of a potential table sequence
            in_potential_table = True
            table_buffer.append(stripped)
        else:
            if in_potential_table and len(table_buffer) >= 2:
                # Check if it looks like a real table
                if looks_like_table_sequence(table_buffer) or any(re.match(r'^[\d,.]+$', l.strip()) for l in table_buffer):
                    # Mark the buffered content as a table
                    result.append('[TABLE_START]')
                    for row in table_buffer:
                        result.append(f'[TABLE_CELL: {row}]')
                    result.append('[TABLE_END]')
                else:
                    # Not enough table-like content, output normally
                    result.extend(table_buffer)
                table_buffer = []
            elif table_buffer:
                # Not enough rows to be a table, just output normally
                result.extend(table_buffer)
                table_buffer = []
            in_potential_table = False
            result.append(line)

    # Handle remaining buffer
    if len(table_buffer) >= 2 and looks_like_table_sequence(table_buffer):
        result.append('[TABLE_START]')
        for row in table_buffer:
            result.append(f'[TABLE_CELL: {row}]')
        result.append('[TABLE_END]')
    elif table_buffer:
        result.extend(table_buffer)

    return '\n'.join(result)


def extract_pdf_with_layout(pdf_path: str, output_dir: str) -> dict:
    """
    Extract PDF content with image position information.

    Args:
        pdf_path: Path to the PDF file
        output_dir: Directory to save extracted images

    Returns:
        dict with text_with_images and images list
    """
    doc = fitz.open(pdf_path)
    result = {
        "text_with_images": "",
        "images": []
    }

    image_counter = 0

    for page_num, page in enumerate(doc):
        # Extract tables using PyMuPDF native detection
        page_tables = extract_tables_with_pymupdf(page)
        table_bboxes = [t['bbox'] for t in page_tables]

        # Get all blocks (text and images)
        blocks = page.get_text("dict")["blocks"]

        # Get image info with xrefs for extraction
        image_info_list = page.get_image_info(xrefs=True)

        # Create a mapping of bbox to image info
        # Use center point for matching
        image_map = {}
        for img_info in image_info_list:
            bbox = img_info["bbox"]
            center_y = (bbox[1] + bbox[3]) / 2
            image_map[center_y] = img_info

        # Sort blocks by y coordinate (top to bottom)
        sorted_blocks = sorted(blocks, key=lambda b: b["bbox"][1])

        for block in sorted_blocks:
            bbox = block["bbox"]

            if block["type"] == 0:  # Text block
                block_text = ""
                for line in block["lines"]:
                    line_text = ""
                    for span in line["spans"]:
                        line_text += span["text"]
                    block_text += line_text + "\n"
                result["text_with_images"] += block_text

            elif block["type"] == 1:  # Image block
                image_counter += 1
                img_id = f"pdfimg{image_counter}"

                # Try to find matching image info by bbox proximity
                block_center_y = (bbox[1] + bbox[3]) / 2
                matched_img = None
                min_distance = float('inf')

                for center_y, img_info in image_map.items():
                    distance = abs(center_y - block_center_y)
                    if distance < min_distance and distance < 50:  # 50pt tolerance
                        min_distance = distance
                        matched_img = img_info

                # Extract and save image
                if matched_img and matched_img.get("xref", 0) > 0:
                    try:
                        xref = matched_img["xref"]
                        img_data = doc.extract_image(xref)
                        ext = img_data.get("ext", "png")
                        filename = f"{img_id}.{ext}"
                        img_path = os.path.join(output_dir, filename)

                        with open(img_path, "wb") as f:
                            f.write(img_data["image"])

                        result["images"].append({
                            "id": img_id,
                            "filename": filename,
                            "page": page_num + 1,
                            "bbox": list(bbox)
                        })

                        # Insert image marker in text
                        result["text_with_images"] += f"\n[FIGURE:{img_id}]\n"

                    except Exception as e:
                        # If extraction fails, still add marker but note the error
                        result["text_with_images"] += f"\n[FIGURE:{img_id}:extraction_failed]\n"
                        sys.stderr.write(f"Warning: Failed to extract image {img_id}: {e}\n")
                else:
                    # Image block found but no xref match
                    result["text_with_images"] += f"\n[FIGURE:{img_id}:no_xref]\n"

        # Insert formatted table markers from PyMuPDF native detection
        for table in sorted(page_tables, key=lambda t: t['bbox'][1]):
            result["text_with_images"] += f"\n{format_table_as_markers(table)}\n"

        # Add page separator
        if page_num < len(doc) - 1:
            result["text_with_images"] += "\n\n"

    doc.close()

    # Post-process to mark formulas and tables
    result["text_with_images"] = mark_formulas(result["text_with_images"])
    result["text_with_images"] = detect_table_structure(result["text_with_images"])

    return result


def main():
    if len(sys.argv) < 3:
        print("Usage: python extract_pdf.py <pdf_path> <output_dir>", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_dir = sys.argv[2]

    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)

    try:
        result = extract_pdf_with_layout(pdf_path, output_dir)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
