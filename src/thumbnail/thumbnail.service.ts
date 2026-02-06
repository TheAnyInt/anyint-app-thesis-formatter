import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TemplateService } from '../template/template.service';
import { LatexService } from '../latex/latex.service';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  dpi?: number;
  compressionLevel?: number;
}

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);
  private readonly thumbnailsDir: string;
  private readonly templatesDir: string;
  private readonly customDir: string;

  constructor(
    private readonly templateService: TemplateService,
    private readonly latexService: LatexService,
  ) {
    this.thumbnailsDir = path.join(process.cwd(), 'public', 'thumbnails');
    this.templatesDir = path.join(this.thumbnailsDir, 'templates');
    this.customDir = path.join(this.thumbnailsDir, 'custom');

    // Ensure directories exist
    [this.thumbnailsDir, this.templatesDir, this.customDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(`Created directory: ${dir}`);
      }
    });
  }

  /**
   * Generate thumbnail from PDF buffer
   * Extracts first page and converts to optimized PNG
   */
  async generateFromPdf(
    pdfPath: string,
    options: ThumbnailOptions = {},
  ): Promise<Buffer> {
    const {
      width = 300,
      height = 400,
      dpi = 150,
      compressionLevel = 8,
    } = options;

    try {
      // Create temp directory for conversion
      const tempDir = path.join(process.cwd(), 'output', `thumb-${uuidv4()}`);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const outputPrefix = path.join(tempDir, 'page');

      // Convert first page of PDF to PNG using pdftoppm
      const cmd = `pdftoppm -png -f 1 -l 1 -r ${dpi} "${pdfPath}" "${outputPrefix}"`;
      this.logger.log(`Converting PDF to image: ${cmd}`);

      await execAsync(cmd, { timeout: 30000 });

      // pdftoppm creates files named like "page-01.png" or "page-1.png" depending on version
      let pngPath = `${outputPrefix}-01.png`;
      if (!fs.existsSync(pngPath)) {
        pngPath = `${outputPrefix}-1.png`;
      }

      if (!fs.existsSync(pngPath)) {
        throw new Error(`Failed to generate PNG from PDF: ${pngPath} not found`);
      }

      // Read and optimize image using sharp
      const imageBuffer = await sharp(pngPath)
        .resize(width, height, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .png({ compressionLevel })
        .toBuffer();

      // Cleanup temp files
      fs.rmSync(tempDir, { recursive: true, force: true });

      this.logger.log(`Generated thumbnail: ${imageBuffer.length} bytes`);
      return imageBuffer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to generate thumbnail from PDF: ${errorMessage}`);
      throw new Error(`Thumbnail generation failed: ${errorMessage}`);
    }
  }

  /**
   * Generate thumbnail for a template using sample document
   * Full pipeline: load sample → compile → extract page → optimize
   */
  async generateFromTemplate(
    templateId: string,
    sampleDocument: Record<string, any>,
    options: ThumbnailOptions = {},
  ): Promise<string> {
    try {
      // Get template
      const template = this.templateService.findOne(templateId);
      this.logger.log(`Generating thumbnail for template: ${template.name}`);

      // Compile sample document to PDF
      const jobId = `thumb-${templateId}-${uuidv4()}`;
      const renderResult = await this.latexService.render(
        jobId,
        template.texContent,
        sampleDocument,
        undefined,
        template.id,
        template.assets,
      );

      if (!renderResult.success || !renderResult.pdfPath) {
        throw new Error(`Failed to compile sample document: ${renderResult.error || 'Unknown error'}`);
      }

      // Generate thumbnail from PDF
      const thumbnailBuffer = await this.generateFromPdf(renderResult.pdfPath, options);

      // Save thumbnail
      const thumbnailPath = path.join(this.templatesDir, `${templateId}.png`);
      fs.writeFileSync(thumbnailPath, thumbnailBuffer);
      this.logger.log(`Saved thumbnail: ${thumbnailPath}`);

      // Cleanup compiled files
      const jobDir = path.dirname(renderResult.texPath);
      if (fs.existsSync(jobDir)) {
        fs.rmSync(jobDir, { recursive: true, force: true });
      }

      return thumbnailPath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to generate thumbnail for template ${templateId}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get thumbnail file path for a template
   */
  getThumbnailPath(templateId: string): string {
    return path.join(this.templatesDir, `${templateId}.png`);
  }

  /**
   * Check if thumbnail exists for a template
   */
  thumbnailExists(templateId: string): boolean {
    const thumbnailPath = this.getThumbnailPath(templateId);
    return fs.existsSync(thumbnailPath);
  }

  /**
   * Ensure thumbnail exists, generate if missing (lazy generation)
   */
  async ensureThumbnailExists(
    templateId: string,
    sampleDocument?: Record<string, any>,
    options: ThumbnailOptions = {},
  ): Promise<string> {
    const thumbnailPath = this.getThumbnailPath(templateId);

    if (fs.existsSync(thumbnailPath)) {
      this.logger.log(`Thumbnail already exists: ${templateId}`);
      return thumbnailPath;
    }

    if (!sampleDocument) {
      throw new Error(`Sample document required to generate thumbnail for ${templateId}`);
    }

    this.logger.log(`Thumbnail missing, generating: ${templateId}`);
    return await this.generateFromTemplate(templateId, sampleDocument, options);
  }

  /**
   * Get thumbnail buffer for streaming
   */
  async getThumbnailBuffer(templateId: string): Promise<Buffer> {
    const thumbnailPath = this.getThumbnailPath(templateId);

    if (!fs.existsSync(thumbnailPath)) {
      throw new NotFoundException(`Thumbnail not found for template: ${templateId}`);
    }

    return fs.readFileSync(thumbnailPath);
  }

  /**
   * Get all template thumbnail URLs
   * Returns map of templateId → URL
   */
  getAllThumbnailUrls(): Map<string, string> {
    const thumbnailUrls = new Map<string, string>();
    const templates = this.templateService.findAll();

    templates.forEach((template) => {
      if (this.thumbnailExists(template.id)) {
        thumbnailUrls.set(template.id, `/templates/${template.id}/thumbnail`);
      }
    });

    return thumbnailUrls;
  }

  /**
   * Delete thumbnail for a template
   */
  deleteThumbnail(templateId: string): boolean {
    const thumbnailPath = this.getThumbnailPath(templateId);

    if (!fs.existsSync(thumbnailPath)) {
      return false;
    }

    fs.unlinkSync(thumbnailPath);
    this.logger.log(`Deleted thumbnail: ${templateId}`);
    return true;
  }
}
