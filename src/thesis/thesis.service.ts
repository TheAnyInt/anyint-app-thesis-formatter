import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ExtractionService,
  ExtractedImage,
} from '../document/extraction.service';
import { LlmService } from '../llm/llm.service';
import { ReferenceFormatterService } from '../reference/reference-formatter.service';
import { JobService } from '../job/job.service';
import { Job, JobStatus } from '../job/entities/job.entity';
import { TemplateService } from '../template/template.service';
import { LatexService } from '../latex/latex.service';

type InputFormat = 'docx' | 'markdown' | 'txt' | 'pdf';

interface ProcessingData {
  document: Record<string, any>;
  images: Map<string, ExtractedImage>;
}

export interface ExtractionResult {
  extractionId: string;
  document: Record<string, any>;
  images: Array<{
    id: string;
    filename: string;
    contentType: string;
    url: string;
  }>;
  createdAt: Date;
}

interface StoredExtraction {
  document: Record<string, any>;
  images: Map<string, ExtractedImage>;
  createdAt: Date;
}

@Injectable()
export class ThesisService {
  private readonly logger = new Logger(ThesisService.name);
  private readonly extractions = new Map<string, StoredExtraction>();

  constructor(
    private readonly extractionService: ExtractionService,
    private readonly llmService: LlmService,
    private readonly referenceFormatterService: ReferenceFormatterService,
    private readonly jobService: JobService,
    private readonly templateService: TemplateService,
    private readonly latexService: LatexService,
  ) {}

  /**
   * Start async thesis processing
   * @param userToken 用户 JWT token（Gateway 模式需要）
   * @param model 指定的 LLM 模型（可选）
   */
  async startProcessing(
    fileBuffer: Buffer,
    format: InputFormat,
    templateId: string,
    userToken?: string,
    model?: string,
  ): Promise<Job> {
    this.logger.log(`Starting thesis processing with template: ${templateId}${model ? `, model: ${model}` : ''}`);

    // Extract text and images based on format
    let text: string;
    let images = new Map<string, ExtractedImage>();

    if (format === 'docx') {
      const result = await this.extractionService.extractContent(fileBuffer);
      text = result.text;
      images = result.images;
      this.logger.log(`Extracted ${images.size} images from DOCX`);
    } else if (format === 'pdf') {
      // 使用 PyMuPDF 提取，保留图片位置标记
      const result = await this.extractionService.extractPdfWithLayout(fileBuffer);
      text = result.text;
      images = result.images;
      this.logger.log(`Extracted ${images.size} images from PDF with layout markers`);
    } else {
      text = fileBuffer.toString('utf-8');
    }

    // Parse content with LLM
    const document = await this.parseContent(text, format, images, userToken, model);

    // Create job for async LaTeX rendering
    const job = this.jobService.createJob(templateId, document);

    // Process in background with images
    this.processJobAsync(job.id, templateId, document, images);

    return job;
  }

  /**
   * Parse content to structured document
   * @param userToken 用户 JWT token（Gateway 模式需要）
   * @param model 指定的 LLM 模型（可选）
   */
  async parseContent(
    content: string,
    format: InputFormat,
    images?: Map<string, ExtractedImage>,
    userToken?: string,
    model?: string,
  ): Promise<Record<string, any>> {
    this.logger.log(`Parsing content with LLM...${model ? ` (model: ${model})` : ''}`);

    // Use LLM to parse content (returns dynamic ThesisData structure)
    const thesisData = await this.llmService.parseThesisContent(content, userToken, model);

    // Format references if present
    if (thesisData.references && thesisData.references.trim().length > 0) {
      this.logger.log('Formatting references (GB/T 7714-2015)...');
      try {
        thesisData.references =
          await this.referenceFormatterService.parseAndFormatReferences(
            thesisData.references,
          );
      } catch (error) {
        this.logger.warn('Reference formatting failed, keeping original');
      }
    }

    // Add image information to document if images were extracted
    if (images && images.size > 0) {
      const imageList = Array.from(images.entries()).map(([id, img], index) => ({
        id,
        filename: `${id}.${img.extension}`,
        index: index + 1,
        label: `fig:image${index + 1}`,
      }));
      thesisData.figures = imageList;
      this.logger.log(`Added ${imageList.length} figures to document data`);
    }

    return thesisData as Record<string, any>;
  }

  /**
   * Process job asynchronously
   */
  private async processJobAsync(
    jobId: string,
    templateId: string,
    document: Record<string, any>,
    images?: Map<string, ExtractedImage>,
  ): Promise<void> {
    try {
      this.jobService.updateJobStatus(jobId, JobStatus.PROCESSING, 10);

      // Get template by schoolId (templateId is actually schoolId from user)
      const template = this.templateService.findOneBySchool(templateId);
      this.jobService.updateJobProgress(jobId, 30);

      // Render LaTeX and compile to PDF (with images if available)
      this.logger.log(`Rendering LaTeX template: ${templateId}`);
      const result = await this.latexService.render(
        jobId,
        template.texContent,
        document,
        images,
        template.id,
        template.assets,
      );

      this.jobService.updateJobProgress(jobId, 90);

      if (result.success) {
        this.jobService.completeJob(jobId, {
          pdfPath: result.pdfPath,
          texPath: result.texPath,
        });
        this.logger.log(`Job ${jobId} completed successfully`);
      } else {
        this.jobService.failJob(jobId, result.error || 'Unknown error');
        this.logger.error(`Job ${jobId} failed: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.jobService.failJob(jobId, errorMessage);
      this.logger.error(`Job ${jobId} failed: ${errorMessage}`);
    }
  }

  /**
   * Step 1: Extract content and images from file
   * Returns structured data for frontend preview
   * @param userToken 用户 JWT token（Gateway 模式需要）
   * @param model 指定的 LLM 模型（可选）
   */
  async extractFromFile(
    fileBuffer: Buffer,
    format: InputFormat,
    userToken?: string,
    model?: string,
  ): Promise<ExtractionResult> {
    this.logger.log(`Step 1: Extracting content from file...${model ? ` (model: ${model})` : ''}`);

    // Extract text and images based on format
    let text: string;
    let images = new Map<string, ExtractedImage>();

    if (format === 'docx') {
      const result = await this.extractionService.extractContent(fileBuffer);
      text = result.text;
      images = result.images;
      this.logger.log(`Extracted ${images.size} images from DOCX`);
    } else if (format === 'pdf') {
      // 使用 PyMuPDF 提取，保留图片位置标记
      const result = await this.extractionService.extractPdfWithLayout(fileBuffer);
      text = result.text;
      images = result.images;
      this.logger.log(`Extracted ${images.size} images from PDF with layout markers`);
    } else {
      text = fileBuffer.toString('utf-8');
    }

    // Parse content with LLM
    const document = await this.parseContent(text, format, images, userToken, model);

    // Generate extraction ID and store
    const extractionId = uuidv4();
    const createdAt = new Date();

    this.extractions.set(extractionId, {
      document,
      images,
      createdAt,
    });

    // Build image URLs for frontend
    const imageList = Array.from(images.entries()).map(([id, img]) => ({
      id,
      filename: `${id}.${img.extension}`,
      contentType: img.contentType,
      url: `/thesis/extractions/${extractionId}/images/${id}`,
    }));

    this.logger.log(`Created extraction ${extractionId} with ${imageList.length} images`);

    // Clean up old extractions (keep for 1 hour)
    this.cleanupOldExtractions();

    return {
      extractionId,
      document,
      images: imageList,
      createdAt,
    };
  }

  /**
   * Get image from extraction
   */
  getExtractionImage(extractionId: string, imageId: string): ExtractedImage {
    const extraction = this.extractions.get(extractionId);
    if (!extraction) {
      throw new NotFoundException(`Extraction '${extractionId}' not found`);
    }

    const image = extraction.images.get(imageId);
    if (!image) {
      throw new NotFoundException(`Image '${imageId}' not found in extraction`);
    }

    return image;
  }

  /**
   * Get extraction by ID
   */
  getExtraction(extractionId: string): StoredExtraction {
    const extraction = this.extractions.get(extractionId);
    if (!extraction) {
      throw new NotFoundException(`Extraction '${extractionId}' not found`);
    }
    return extraction;
  }

  /**
   * Step 2: Render PDF from extraction or provided document
   */
  async renderFromExtraction(
    extractionId: string,
    templateId: string,
    documentOverride?: Record<string, any>,
  ): Promise<Job> {
    this.logger.log(`Step 2: Rendering from extraction ${extractionId}`);

    const extraction = this.getExtraction(extractionId);

    // Use override document if provided (user may have edited), else use original
    const document = documentOverride || extraction.document;

    // Create job for async LaTeX rendering
    const job = this.jobService.createJob(templateId, document);

    // Process in background with images
    this.processJobAsync(job.id, templateId, document, extraction.images);

    return job;
  }

  /**
   * Native DOCX generation with table/image support using Python
   * @param userToken 用户 JWT token（Gateway 模式需要）
   */
  async convertToDocxNative(
    fileBuffer: Buffer,
    format: InputFormat,
    userToken?: string,
  ): Promise<{ docxPath: string }> {
    this.logger.log('Native DOCX conversion with table/image support');

    // Extract text, images, and tables
    let text: string;
    let images = new Map<string, ExtractedImage>();
    let tables: Array<{ id: string; rows: string[][]; rowCount: number; colCount: number }> = [];

    if (format === 'docx') {
      const result = await this.extractionService.extractContent(fileBuffer);
      text = result.text;
      images = result.images;
      tables = result.tables;
      this.logger.log(`Extracted ${images.size} images and ${tables.length} tables from DOCX`);
    } else if (format === 'pdf') {
      const result = await this.extractionService.extractPdfContent(fileBuffer);
      text = result.text;
      images = result.images;
      tables = result.tables;
      this.logger.log(`Extracted ${images.size} images from PDF`);
    } else {
      text = fileBuffer.toString('utf-8');
    }

    // Parse content with LLM
    const document = await this.parseContent(text, format, images, userToken);

    // Add tables to document data
    (document as any).tables = tables;

    // Create output directory
    const outputId = uuidv4();
    const outputDir = `/tmp/thesis-docx-${outputId}`;
    const fs = await import('fs');
    const path = await import('path');

    fs.mkdirSync(outputDir, { recursive: true });

    // Save images to directory
    const imagesDir = `${outputDir}/images`;
    fs.mkdirSync(imagesDir, { recursive: true });

    const imageList: Array<{ id: string; filename: string }> = [];
    images.forEach((img, id) => {
      const filename = `${id}.${img.extension}`;
      fs.writeFileSync(`${imagesDir}/${filename}`, img.buffer);
      imageList.push({ id, filename });
    });
    (document as any).images = imageList;

    // Write JSON data
    const jsonPath = `${outputDir}/data.json`;
    fs.writeFileSync(jsonPath, JSON.stringify(document, null, 2));

    // Run Python script to generate DOCX
    const docxPath = `${outputDir}/output.docx`;
    const scriptPath = path.join(__dirname, '../../scripts/generate_docx.py');

    const { execSync } = await import('child_process');
    try {
      execSync(`python3 "${scriptPath}" "${jsonPath}" "${docxPath}" --images-dir "${imagesDir}"`, {
        timeout: 60000,
        encoding: 'utf-8',
      });
    } catch (error) {
      this.logger.error('Python DOCX generation failed', error);
      throw new Error('Failed to generate DOCX');
    }

    return { docxPath };
  }

  /**
   * Direct synchronous conversion: extract + render in one call
   * @param userToken 用户 JWT token（Gateway 模式需要）
   */
  async convertDirect(
    fileBuffer: Buffer,
    format: InputFormat,
    templateId: string,
    userToken?: string,
  ): Promise<{ pdfPath: string; texPath: string }> {
    this.logger.log(`Direct conversion with template: ${templateId}`);

    // Extract text and images based on format
    let text: string;
    let images = new Map<string, ExtractedImage>();

    if (format === 'docx') {
      const result = await this.extractionService.extractContent(fileBuffer);
      text = result.text;
      images = result.images;
      this.logger.log(`Extracted ${images.size} images from DOCX`);
    } else if (format === 'pdf') {
      // 使用 PyMuPDF 提取，保留图片位置标记
      const result = await this.extractionService.extractPdfWithLayout(fileBuffer);
      text = result.text;
      images = result.images;
      this.logger.log(`Extracted ${images.size} images from PDF with layout markers`);
    } else {
      text = fileBuffer.toString('utf-8');
    }

    // Parse content with LLM
    const document = await this.parseContent(text, format, images, userToken);

    // Get template
    const template = this.templateService.findOneBySchool(templateId);

    // Render LaTeX and compile to PDF synchronously
    const jobId = uuidv4();
    const result = await this.latexService.render(
      jobId,
      template.texContent,
      document,
      images,
      template.id,
      template.assets,
    );

    if (!result.success) {
      throw new Error(result.error || 'LaTeX compilation failed');
    }

    return {
      pdfPath: result.pdfPath!,
      texPath: result.texPath!,
    };
  }

  /**
   * Clean up extractions older than 1 hour
   */
  private cleanupOldExtractions(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let cleaned = 0;

    this.extractions.forEach((extraction, id) => {
      if (extraction.createdAt < oneHourAgo) {
        this.extractions.delete(id);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} old extractions`);
    }
  }
}
