#!/usr/bin/env python3
"""
PDF extraction script using PyMuPDF (fitz)
Extracts text with image position markers for LLM processing
"""

import sys
import json
import os
import fitz  # PyMuPDF


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

        # Add page separator
        if page_num < len(doc) - 1:
            result["text_with_images"] += "\n\n"

    doc.close()
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
