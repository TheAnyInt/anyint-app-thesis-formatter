import { Injectable, Logger } from '@nestjs/common';
import * as mammoth from 'mammoth';
import PizZip from 'pizzip';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export interface ExtractedImage {
  id: string;
  buffer: Buffer;
  extension: string;
  contentType: string;
}

export interface ExtractedTable {
  id: string;
  rows: string[][];  // 2D array of cell text
  rowCount: number;
  colCount: number;
}

export interface ExtractionResult {
  text: string;
  images: Map<string, ExtractedImage>;
  tables: ExtractedTable[];
}

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);
  private popplerAvailable: boolean | null = null;

  async extractText(fileBuffer: Buffer): Promise<string> {
    const result = await this.extractContent(fileBuffer);
    return result.text;
  }

  async extractContent(fileBuffer: Buffer): Promise<ExtractionResult> {
    this.logger.log('Extracting content from uploaded document...');

    const images = new Map<string, ExtractedImage>();
    const tables: ExtractedTable[] = [];
    let imageCounter = 0;

    try {
      // First, extract images directly from the docx archive
      await this.extractImagesFromDocx(fileBuffer, images);

      // Extract tables from docx
      await this.extractTablesFromDocx(fileBuffer, tables);

      // Then extract text with image placeholders
      const result = await mammoth.convertToHtml(
        { buffer: fileBuffer },
        {
          convertImage: mammoth.images.imgElement((image) => {
            imageCounter++;
            // Use same format as PDF extraction for consistency
            const imageId = `docximg${imageCounter}`;
            const extension = image.contentType.split('/')[1] || 'png';

            return image.read().then((imageBuffer) => {
              images.set(imageId, {
                id: imageId,
                buffer: imageBuffer,
                extension,
                contentType: image.contentType,
              });

              // Return a placeholder in same format as PDF extraction
              return { src: `[FIGURE:${imageId}]` };
            });
          }),
        },
      );

      // Convert HTML to plain text but preserve image placeholders
      let text = result.value
        .replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/g, '\n$1\n')
        .replace(/<[^>]+>/g, '')
        // Decode all HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (result.messages && result.messages.length > 0) {
        result.messages.forEach((msg) => {
          this.logger.warn(`Mammoth warning: ${msg.message}`);
        });
      }

      this.logger.log(
        `Extracted ${text.length} characters, ${images.size} images, ${tables.length} tables`,
      );

      return { text, images, tables };
    } catch (error) {
      this.logger.error('Failed to extract content from document', error);
      throw new Error(
        `Document extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async extractImagesFromDocx(
    fileBuffer: Buffer,
    images: Map<string, ExtractedImage>,
  ): Promise<void> {
    try {
      const zip = new PizZip(fileBuffer);
      const mediaFiles = Object.keys(zip.files).filter((name) =>
        name.startsWith('word/media/'),
      );

      this.logger.log(`Found ${mediaFiles.length} media files in document`);

      mediaFiles.forEach((filePath, index) => {
        const file = zip.files[filePath];
        if (!file.dir) {
          const buffer = file.asNodeBuffer();
          const extension = filePath.split('.').pop() || 'png';
          const contentType = this.getContentType(extension);
          const imageId = `media_${index + 1}`;

          images.set(imageId, {
            id: imageId,
            buffer,
            extension,
            contentType,
          });
        }
      });
    } catch (error) {
      this.logger.warn('Could not extract media files from docx', error);
    }
  }

  private getContentType(extension: string): string {
    const types: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
      webp: 'image/webp',
    };
    return types[extension.toLowerCase()] || 'image/png';
  }

  private async extractTablesFromDocx(
    fileBuffer: Buffer,
    tables: ExtractedTable[],
  ): Promise<void> {
    try {
      const zip = new PizZip(fileBuffer);
      const documentXml = zip.files['word/document.xml'];

      if (!documentXml) {
        this.logger.warn('No document.xml found in docx');
        return;
      }

      const xmlContent = documentXml.asText();

      // Simple regex-based table extraction from OOXML
      // Match each table: <w:tbl>...</w:tbl>
      const tableRegex = /<w:tbl[^>]*>([\s\S]*?)<\/w:tbl>/g;
      let tableMatch;
      let tableIndex = 0;

      while ((tableMatch = tableRegex.exec(xmlContent)) !== null) {
        tableIndex++;
        const tableContent = tableMatch[1];
        const rows: string[][] = [];

        // Match each row: <w:tr>...</w:tr>
        const rowRegex = /<w:tr[^>]*>([\s\S]*?)<\/w:tr>/g;
        let rowMatch;

        while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
          const rowContent = rowMatch[1];
          const cells: string[] = [];

          // Match each cell: <w:tc>...</w:tc>
          const cellRegex = /<w:tc[^>]*>([\s\S]*?)<\/w:tc>/g;
          let cellMatch;

          while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
            const cellContent = cellMatch[1];

            // Extract text from cell: <w:t>...</w:t>
            const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
            let cellText = '';
            let textMatch;

            while ((textMatch = textRegex.exec(cellContent)) !== null) {
              cellText += textMatch[1];
            }

            cells.push(cellText.trim());
          }

          if (cells.length > 0) {
            rows.push(cells);
          }
        }

        if (rows.length > 0) {
          const maxCols = Math.max(...rows.map((r) => r.length));
          tables.push({
            id: `table_${tableIndex}`,
            rows,
            rowCount: rows.length,
            colCount: maxCols,
          });
        }
      }

      this.logger.log(`Extracted ${tables.length} tables from document`);
    } catch (error) {
      this.logger.warn('Could not extract tables from docx', error);
    }
  }

  /**
   * 检测 Poppler 是否可用
   */
  private checkPopplerAvailable(): boolean {
    if (this.popplerAvailable !== null) {
      return this.popplerAvailable;
    }
    try {
      execSync('which pdftotext', { encoding: 'utf-8' });
      this.popplerAvailable = true;
      this.logger.log('Poppler is available');
    } catch {
      this.popplerAvailable = false;
      this.logger.warn('Poppler is not installed');
    }
    return this.popplerAvailable;
  }

  /**
   * 从 PDF 文件中提取内容，保留图片位置信息（使用 PyMuPDF）
   * 返回的 text 中包含 [FIGURE:pdfimgX] 标记
   */
  async extractPdfWithLayout(fileBuffer: Buffer): Promise<ExtractionResult> {
    this.logger.log('Extracting PDF content with layout using PyMuPDF...');

    const images = new Map<string, ExtractedImage>();
    const tables: ExtractedTable[] = [];
    const tmpId = uuidv4();
    const tmpPdf = `/tmp/pdf-${tmpId}.pdf`;
    const tmpDir = `/tmp/pdf-extract-${tmpId}`;

    try {
      // 写入临时 PDF 文件
      fs.writeFileSync(tmpPdf, fileBuffer);
      fs.mkdirSync(tmpDir, { recursive: true });

      // 调用 Python 脚本 (2>/dev/null redirects stderr to prevent warnings from mixing with JSON)
      const scriptPath = path.join(__dirname, '../../scripts/extract_pdf.py');
      const output = execSync(
        `python3 "${scriptPath}" "${tmpPdf}" "${tmpDir}" 2>/dev/null`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 },
      );

      // Parse JSON with defensive handling for any remaining non-JSON output
      const result = this.parseJsonFromOutput(output);

      // 读取提取的图片
      for (const img of result.images) {
        const imgPath = path.join(tmpDir, img.filename);
        if (fs.existsSync(imgPath)) {
          const buffer = fs.readFileSync(imgPath);
          const ext = path.extname(img.filename).slice(1) || 'png';
          images.set(img.id, {
            id: img.id,
            buffer,
            extension: ext,
            contentType: this.getContentType(ext),
          });
        }
      }

      this.logger.log(
        `Extracted ${result.text_with_images.length} chars, ${images.size} images with layout`,
      );

      // 清理临时文件
      fs.unlinkSync(tmpPdf);
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true });
      }

      return {
        text: result.text_with_images,
        images,
        tables,
      };
    } catch (error) {
      // 清理临时文件
      if (fs.existsSync(tmpPdf)) fs.unlinkSync(tmpPdf);
      if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });

      this.logger.error('Failed to extract PDF with layout', error);
      throw new Error(
        `PDF layout extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 从 PDF 文件中提取内容（使用 Poppler）
   */
  async extractPdfContent(fileBuffer: Buffer): Promise<ExtractionResult> {
    this.logger.log('Extracting content from PDF document...');

    // 检查 Poppler 是否可用
    if (!this.checkPopplerAvailable()) {
      throw new Error(
        'PDF extraction requires Poppler. Please install: brew install poppler (macOS) or apt install poppler-utils (Linux)',
      );
    }

    const images = new Map<string, ExtractedImage>();
    const tables: ExtractedTable[] = [];
    const tmpId = uuidv4();
    const tmpPdf = `/tmp/pdf-${tmpId}.pdf`;
    const tmpImagesDir = `/tmp/pdf-images-${tmpId}`;

    try {
      // 1. 写入临时 PDF 文件
      fs.writeFileSync(tmpPdf, fileBuffer);
      fs.mkdirSync(tmpImagesDir, { recursive: true });

      // 2. 使用 pdftotext 提取文本
      const text = execSync(`pdftotext "${tmpPdf}" -`, { encoding: 'utf-8' })
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // 3. 使用 pdfimages 提取图片
      try {
        execSync(`pdfimages -all "${tmpPdf}" "${tmpImagesDir}/img"`);

        // 4. 读取提取的图片
        const imageFiles = fs.readdirSync(tmpImagesDir);
        imageFiles.forEach((filename, index) => {
          const imgPath = path.join(tmpImagesDir, filename);
          const buffer = fs.readFileSync(imgPath);
          const ext = path.extname(filename).slice(1) || 'png';
          const imageId = `pdfimg${index + 1}`;

          images.set(imageId, {
            id: imageId,
            buffer,
            extension: ext,
            contentType: this.getContentType(ext),
          });
        });
      } catch (imgError) {
        this.logger.warn(
          'Failed to extract images from PDF, continuing with text only',
        );
      }

      this.logger.log(
        `Extracted ${text.length} characters, ${images.size} images from PDF`,
      );

      // 5. 清理临时文件
      fs.unlinkSync(tmpPdf);
      if (fs.existsSync(tmpImagesDir)) {
        fs.rmSync(tmpImagesDir, { recursive: true });
      }

      return { text, images, tables };
    } catch (error) {
      // 清理临时文件
      if (fs.existsSync(tmpPdf)) fs.unlinkSync(tmpPdf);
      if (fs.existsSync(tmpImagesDir))
        fs.rmSync(tmpImagesDir, { recursive: true });

      this.logger.error('Failed to extract content from PDF', error);
      throw new Error(
        `PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Safely parse JSON from command output, handling cases where
   * the output contains markdown fences, descriptions, or other text
   * surrounding the JSON object
   */
  private parseJsonFromOutput(output: string): any {
    const trimmed = output.trim();

    // Fast path: output starts with valid JSON
    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // Fall through to regex extraction
      }
    }

    // Use regex to find the outermost JSON object { ... }
    // This handles cases like: "```json\n{...}\n```" or "Here is the result:\n{...}"
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      this.logger.error('No JSON object found in Python output:', trimmed.substring(0, 200));
      throw new Error('No JSON found in Python script output');
    }

    const jsonStr = jsonMatch[0];
    this.logger.warn('Extracted JSON from output with surrounding text');
    return JSON.parse(jsonStr);
  }
}
