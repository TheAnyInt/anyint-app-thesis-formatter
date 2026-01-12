import { Injectable, Logger } from '@nestjs/common';
import * as Mustache from 'mustache';
import * as fs from 'fs';
import * as path from 'path';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { ExtractedImage } from '../document/extraction.service';

const execAsync = promisify(exec);

export interface RenderResult {
  texPath: string;
  pdfPath?: string;
  success: boolean;
  error?: string;
}

export interface ImageFile {
  id: string;
  filename: string;
  buffer: Buffer;
}

@Injectable()
export class LatexService {
  private readonly logger = new Logger(LatexService.name);
  private readonly outputDir: string;

  constructor() {
    this.outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Escape special LaTeX characters in text
   */
  escapeLatex(text: string): string {
    if (!text) return '';
    return text
      // First, decode common HTML entities to their actual characters
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      // Then escape LaTeX special characters
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/&/g, '\\&')
      .replace(/%/g, '\\%')
      .replace(/\$/g, '\\$')
      .replace(/#/g, '\\#')
      .replace(/_/g, '\\_')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
      .replace(/~/g, '\\textasciitilde{}')
      .replace(/\^/g, '\\textasciicircum{}');
  }

  /**
   * Prepare document data for Mustache rendering
   * Escapes LaTeX special characters in text fields
   * Adds level flags (isLevel1, isLevel2, isLevel3) for sections
   */
  prepareDocumentData(document: Record<string, any>): Record<string, any> {
    const prepared: Record<string, any> = {};

    // Fields that may contain raw LaTeX code and should not be escaped
    const rawLatexFields = ['content', 'abstract', 'abstract_en', 'references', 'acknowledgements', 'appendix'];

    for (const [key, value] of Object.entries(document)) {
      // Skip escaping for internal fields (prefixed with _)
      if (key.startsWith('_')) {
        prepared[key] = value;
        continue;
      }
      // Skip escaping for raw LaTeX fields (may contain \begin{figure} etc.)
      if (rawLatexFields.includes(key)) {
        prepared[key] = value;
        continue;
      }
      if (typeof value === 'string') {
        // Escape LaTeX special characters
        prepared[key] = this.escapeLatex(value);
      } else if (Array.isArray(value)) {
        // Handle arrays
        prepared[key] = value.map((item) => {
          if (typeof item === 'object') {
            const preparedItem = this.prepareDocumentData(item);
            // Add level flags for sections
            if ('level' in item) {
              preparedItem.isLevel1 = item.level === 1;
              preparedItem.isLevel2 = item.level === 2;
              preparedItem.isLevel3 = item.level === 3;
            }
            return preparedItem;
          }
          return item;
        });
      } else if (typeof value === 'object' && value !== null) {
        prepared[key] = this.prepareDocumentData(value);
      } else {
        prepared[key] = value;
      }
    }

    return prepared;
  }

  /**
   * Render LaTeX template with document data
   * Note: Use triple braces {{{ }}} in templates for unescaped content
   */
  renderTemplate(texTemplate: string, document: Record<string, any>): string {
    const preparedData = this.prepareDocumentData(document);
    return Mustache.render(texTemplate, preparedData);
  }

  /**
   * Compile LaTeX to PDF using tectonic
   */
  async compileToPdf(texPath: string): Promise<{ success: boolean; pdfPath?: string; error?: string }> {
    try {
      const texDir = path.dirname(texPath);
      const texFile = path.basename(texPath);

      this.logger.log(`Compiling ${texFile} with tectonic...`);

      const { stdout, stderr } = await execAsync(`tectonic "${texFile}"`, {
        cwd: texDir,
        timeout: 120000, // 2 minute timeout
      });

      if (stderr && !stderr.includes('note:')) {
        this.logger.warn(`Tectonic warnings: ${stderr}`);
      }

      const pdfPath = texPath.replace(/\.tex$/, '.pdf');

      if (fs.existsSync(pdfPath)) {
        this.logger.log(`PDF generated: ${pdfPath}`);
        return { success: true, pdfPath };
      } else {
        return { success: false, error: 'PDF file not generated' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Tectonic compilation failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Save images to job directory
   */
  saveImages(
    jobDir: string,
    images: Map<string, ExtractedImage>,
  ): Map<string, string> {
    const imageFilenames = new Map<string, string>();

    images.forEach((image, id) => {
      const filename = `${id}.${image.extension}`;
      const imagePath = path.join(jobDir, filename);
      fs.writeFileSync(imagePath, image.buffer);
      imageFilenames.set(id, filename);
      this.logger.log(`Saved image: ${filename}`);
    });

    return imageFilenames;
  }

  /**
   * Copy template assets to job directory
   * Note: cover.pdf is handled separately by modifyCoverPdf()
   */
  copyTemplateAssets(jobDir: string, templateId: string, assets?: string[]): void {
    if (!assets || assets.length === 0) return;

    // Template assets are stored in templates/<templateId>/ directory
    const templateAssetsDir = path.join(process.cwd(), 'templates', templateId);

    if (!fs.existsSync(templateAssetsDir)) {
      this.logger.warn(`Template assets directory not found: ${templateAssetsDir}`);
      return;
    }

    for (const asset of assets) {
      // Skip cover.pdf - it will be handled by modifyCoverPdf()
      if (asset === 'cover.pdf') {
        continue;
      }

      const srcPath = path.join(templateAssetsDir, asset);
      const destPath = path.join(jobDir, asset);

      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        this.logger.log(`Copied template asset: ${asset}`);
      } else {
        this.logger.warn(`Template asset not found: ${srcPath}`);
      }
    }
  }

  /**
   * Modify cover.pdf with thesis metadata using Python/PyMuPDF
   * Falls back to copying original cover.pdf on failure
   */
  modifyCoverPdf(
    jobDir: string,
    templateId: string,
    document: Record<string, any>,
  ): void {
    const templateAssetsDir = path.join(process.cwd(), 'templates', templateId);
    const srcCoverPath = path.join(templateAssetsDir, 'cover.pdf');
    const destCoverPath = path.join(jobDir, 'cover.pdf');

    // Check if cover.pdf exists in template
    if (!fs.existsSync(srcCoverPath)) {
      this.logger.warn(`No cover.pdf found in template ${templateId}`);
      return;
    }

    // Prepare metadata for the Python script
    const coverData = {
      title: document.title || document.metadata?.title || '',
      titleEn: document.titleEn || document.title_en || document.metadata?.title_en || '',
      author: document.author || document.metadata?.author_name || '',
      major: document.major || document.metadata?.major || '',
      researchDirection: document.researchDirection || document.research_direction || document.metadata?.research_direction || '',
      supervisor: document.supervisor || document.metadata?.supervisor || '',
    };

    // Write metadata to temp JSON file
    const dataJsonPath = path.join(jobDir, '_cover_data.json');
    fs.writeFileSync(dataJsonPath, JSON.stringify(coverData, null, 2), 'utf-8');

    // Path to Python script
    const scriptPath = path.join(process.cwd(), 'scripts', 'modify_cover_pdf.py');

    if (!fs.existsSync(scriptPath)) {
      this.logger.warn(`Cover modification script not found: ${scriptPath}, copying original`);
      fs.copyFileSync(srcCoverPath, destCoverPath);
      return;
    }

    try {
      this.logger.log(`Modifying cover.pdf with thesis metadata...`);

      const result = execSync(
        `python3 "${scriptPath}" "${srcCoverPath}" "${destCoverPath}" "${dataJsonPath}" "${templateAssetsDir}"`,
        {
          cwd: jobDir,
          timeout: 30000, // 30 second timeout
          encoding: 'utf-8',
        },
      );

      // Parse result
      const output = JSON.parse(result.trim());
      if (output.success) {
        this.logger.log(
          `Cover PDF modified: ${output.page1_fields_modified} Page 1 fields, ${output.page3_fields_modified} Page 3 fields`,
        );
      } else {
        this.logger.warn(`Cover PDF modification warning: ${output.error}`);
        // Fall back to copying original
        fs.copyFileSync(srcCoverPath, destCoverPath);
      }

      // Clean up temp JSON file
      if (fs.existsSync(dataJsonPath)) {
        fs.unlinkSync(dataJsonPath);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cover PDF modification failed: ${errorMessage}`);

      // Fall back to copying original cover.pdf
      this.logger.log('Falling back to original cover.pdf');
      fs.copyFileSync(srcCoverPath, destCoverPath);

      // Clean up temp JSON file
      if (fs.existsSync(dataJsonPath)) {
        fs.unlinkSync(dataJsonPath);
      }
    }
  }

  /**
   * Full render pipeline: template + compile
   */
  async render(
    jobId: string,
    texTemplate: string,
    document: Record<string, any>,
    images?: Map<string, ExtractedImage>,
    templateId?: string,
    templateAssets?: string[],
  ): Promise<RenderResult> {
    try {
      // Create job-specific directory
      const jobDir = path.join(this.outputDir, jobId);
      if (!fs.existsSync(jobDir)) {
        fs.mkdirSync(jobDir, { recursive: true });
      }

      // Copy template assets (fonts, etc.) if provided
      // Note: cover.pdf is handled separately by modifyCoverPdf()
      if (templateId && templateAssets) {
        this.copyTemplateAssets(jobDir, templateId, templateAssets);

        // Modify cover.pdf with document metadata if template has one
        if (templateAssets.includes('cover.pdf')) {
          this.modifyCoverPdf(jobDir, templateId, document);
        }
      }

      // Save images to job directory if provided
      let imageFilenames = new Map<string, string>();
      if (images && images.size > 0) {
        this.logger.log(`Saving ${images.size} images...`);
        imageFilenames = this.saveImages(jobDir, images);

        // Add image filenames to document data for template rendering
        document._images = Array.from(imageFilenames.entries()).map(
          ([id, filename]) => ({ id, filename }),
        );
        document._imageCount = images.size;
      }

      // Render template
      const renderedTex = this.renderTemplate(texTemplate, document);

      // Write .tex file
      const texPath = path.join(jobDir, `${jobId}.tex`);
      fs.writeFileSync(texPath, renderedTex, 'utf-8');
      this.logger.log(`Generated TeX file: ${texPath}`);

      // Compile to PDF
      const compileResult = await this.compileToPdf(texPath);

      if (compileResult.success) {
        return {
          texPath,
          pdfPath: compileResult.pdfPath,
          success: true,
        };
      } else {
        return {
          texPath,
          success: false,
          error: compileResult.error,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Render failed: ${errorMessage}`);
      return {
        texPath: '',
        success: false,
        error: errorMessage,
      };
    }
  }
}
