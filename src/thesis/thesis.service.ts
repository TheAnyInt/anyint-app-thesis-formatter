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
import { LatexTemplate } from '../template/entities/template.entity';
import { LatexService } from '../latex/latex.service';
import { AnalysisService } from './analysis.service';
import {
  ThesisData,
  AnalysisResult,
  ThesisMetadata,
  Section,
} from './dto/thesis-data.dto';

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

import { StoredAnalysis } from './dto/thesis-data.dto';

@Injectable()
export class ThesisService {
  private readonly logger = new Logger(ThesisService.name);
  private readonly extractions = new Map<string, StoredExtraction>();
  private readonly analyses = new Map<string, StoredAnalysis>();

  constructor(
    private readonly extractionService: ExtractionService,
    private readonly llmService: LlmService,
    private readonly referenceFormatterService: ReferenceFormatterService,
    private readonly jobService: JobService,
    private readonly templateService: TemplateService,
    private readonly latexService: LatexService,
    private readonly analysisService: AnalysisService,
  ) {}

  /**
   * Start async thesis processing
   * @param userId 用户 ID（从 JWT 提取）
   * @param userToken 用户 JWT token（Gateway 模式需要）
   * @param model 指定的 LLM 模型（可选）
   */
  async startProcessing(
    fileBuffer: Buffer,
    format: InputFormat,
    templateId: string,
    userId: string,
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

    // Get template for template-aware extraction
    const template = this.templateService.findOne(templateId);

    // Parse content with LLM
    const document = await this.parseContent(text, format, images, userToken, model, template);

    // Create job for async LaTeX rendering
    const job = await this.jobService.createJob(templateId, document, userId);

    // Process in background with images
    this.processJobAsync(job.id, templateId, document, images);

    return job;
  }

  /**
   * Parse content to structured document
   * @param userToken 用户 JWT token（Gateway 模式需要）
   * @param model 指定的 LLM 模型（可选）
   * @param template LaTeX 模板（用于模板感知字段提取）
   */
  async parseContent(
    content: string,
    format: InputFormat,
    images?: Map<string, ExtractedImage>,
    userToken?: string,
    model?: string,
    template?: LatexTemplate,
  ): Promise<Record<string, any>> {
    this.logger.log(`Parsing content with LLM...${model ? ` (model: ${model})` : ''}`);

    // Use LLM to parse content (returns dynamic ThesisData structure)
    // Pass template's required fields to enable template-aware extraction
    const thesisData = await this.llmService.parseThesisContent(
      content,
      userToken,
      model,
      template?.requiredFields,
    );

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
      await this.jobService.updateJobStatus(jobId, JobStatus.PROCESSING, 10);

      // Get template by ID
      const template = this.templateService.findOne(templateId);
      await this.jobService.updateJobProgress(jobId, 30);

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

      await this.jobService.updateJobProgress(jobId, 90);

      if (result.success) {
        await this.jobService.completeJob(jobId, {
          pdfPath: result.pdfPath,
          texPath: result.texPath,
        });
        this.logger.log(`Job ${jobId} completed successfully`);
      } else {
        await this.jobService.failJob(jobId, result.error || 'Unknown error');
        this.logger.error(`Job ${jobId} failed: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.jobService.failJob(jobId, errorMessage);
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
   * Step 2/3: Render PDF from extraction or analysis or provided document
   * Supports both old flow (extractionId) and new flow (analysisId)
   * @param userId 用户 ID（从 JWT 提取）
   * @param isAnalysis whether the ID is for analysis (new flow) or extraction (old flow)
   */
  async renderFromExtraction(
    id: string,
    templateId: string,
    userId: string,
    documentOverride?: Record<string, any>,
    isAnalysis: boolean = false,
  ): Promise<Job> {
    this.logger.log(
      `Step 2/3: Rendering from ${isAnalysis ? 'analysis' : 'extraction'} ${id}`,
    );

    let document: Record<string, any>;
    let images: Map<string, ExtractedImage>;

    if (isAnalysis) {
      // New flow: retrieve from analysis
      const analysis = this.getAnalysis(id);
      document = documentOverride || (analysis.extractedData as Record<string, any>);
      images = analysis.images;
    } else {
      // Old flow: retrieve from extraction
      const extraction = this.getExtraction(id);
      document = documentOverride || extraction.document;
      images = extraction.images;
    }

    // Create job for async LaTeX rendering
    const job = await this.jobService.createJob(templateId, document, userId);

    // Process in background with images
    this.processJobAsync(job.id, templateId, document, images);

    return job;
  }

  /**
   * Step 1 (New Flow): Analyze document with AI
   * Extract content using AI and compare against template requirements
   * Different templates will produce different analysis results based on their requirements
   */
  async analyzeDocument(
    fileBuffer: Buffer,
    format: InputFormat,
    templateId: string,
    userToken?: string,
    model?: string,
  ): Promise<AnalysisResult> {
    this.logger.log(`Analyzing document with template: ${templateId}${model ? `, model: ${model}` : ''}`);

    // Extract text and images based on format
    let text: string;
    let images = new Map<string, ExtractedImage>();

    if (format === 'docx') {
      const result = await this.extractionService.extractContent(fileBuffer);
      text = result.text;
      images = result.images;
      this.logger.log(`Extracted ${images.size} images from DOCX`);
    } else if (format === 'pdf') {
      const result = await this.extractionService.extractPdfWithLayout(fileBuffer);
      text = result.text;
      images = result.images;
      this.logger.log(`Extracted ${images.size} images from PDF with layout markers`);
    } else {
      text = fileBuffer.toString('utf-8');
    }

    // Get template first for template-aware extraction
    const template = this.templateService.findOne(templateId);

    // Use AI parsing to extract content with template awareness
    this.logger.log('Using AI to parse document content...');
    const parsedDocument = await this.parseContent(text, format, images, userToken, model, template);

    // Convert Record<string, any> to ThesisData type
    const extractedData = parsedDocument as ThesisData;

    // Analyze completeness against template-specific requirements
    const analysis = this.analysisService.analyzeDocument(extractedData, template);

    // Generate analysis ID and store
    const analysisId = uuidv4();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 60 * 60 * 1000); // 1 hour

    this.storeAnalysis(analysisId, {
      originalText: text,
      extractedData,
      images,
      analysis,
      createdAt,
    });

    // Build image URLs for frontend
    const imageList = Array.from(images.entries()).map(([id, img]) => ({
      id,
      filename: `${id}.${img.extension}`,
      contentType: img.contentType,
      url: `/thesis/analyses/${analysisId}/images/${id}`,
    }));

    this.logger.log(`Created analysis ${analysisId} for template ${templateId} with ${imageList.length} images`);

    // Clean up old analyses (keep for 1 hour)
    this.cleanupOldAnalyses();

    return {
      analysisId,
      extractedData,
      templateRequirements: {
        requiredFields: template.requiredFields,
        requiredSections: template.requiredSections,
      },
      analysis,
      model,
      images: imageList,
      createdAt,
      expiresAt,
    };
  }

  /**
   * Parse document structure without LLM (using regex and heuristics)
   * This provides a basic extraction for analysis purposes
   */
  private parseWithoutGeneration(
    text: string,
    images: Map<string, ExtractedImage>,
  ): ThesisData {
    this.logger.log('Parsing document structure with regex/heuristics (no LLM)');

    // Extract basic metadata from beginning of document
    const metadata = this.extractMetadataWithRegex(text);

    // Extract abstract (look for common patterns)
    const abstract = this.extractSectionByPattern(
      text,
      /(?:摘\s*要|Abstract)\s*[：:]\s*\n([\s\S]*?)(?=\n\s*(?:关键词|Keywords|第[一二三四五六七八九十]|Chapter|1\.|引言|绪论)|$)/i,
    );

    const abstract_en = this.extractSectionByPattern(
      text,
      /(?:Abstract)\s*[：:]\s*\n([\s\S]*?)(?=\n\s*(?:Keywords|摘要|第[一二三四五六七八九十]|Chapter|1\.|引言|绪论)|$)/i,
    );

    // Extract keywords
    const keywords = this.extractSectionByPattern(
      text,
      /(?:关键词|Keywords)\s*[：:]\s*(.*?)(?=\n|$)/i,
    );

    const keywords_en = this.extractSectionByPattern(
      text,
      /(?:Keywords)\s*[：:]\s*(.*?)(?=\n|$)/i,
    );

    // Extract sections (basic structure parsing)
    const sections = this.extractSectionsWithRegex(text);

    // Extract references
    const references = this.extractSectionByPattern(
      text,
      /(?:参考文献|References)\s*\n([\s\S]*?)(?=\n\s*(?:致谢|Acknowledgements|附录)|$)/i,
    );

    // Extract acknowledgements
    const acknowledgements = this.extractSectionByPattern(
      text,
      /(?:致\s*谢|Acknowledgements)\s*\n([\s\S]*?)(?=\n\s*(?:附录|Appendix)|$)/i,
    );

    // Add image information to document
    const figures = Array.from(images.entries()).map(([id, img], index) => ({
      id,
      filename: `${id}.${img.extension}`,
      index: index + 1,
      label: `fig:image${index + 1}`,
    }));

    const thesisData: ThesisData = {
      metadata,
      sections,
      abstract: abstract || undefined,
      abstract_en: abstract_en || undefined,
      keywords: keywords || undefined,
      keywords_en: keywords_en || undefined,
      references: references || undefined,
      acknowledgements: acknowledgements || undefined,
      figures: figures.length > 0 ? figures : undefined,
    };

    this.logger.log(`Extracted ${sections.length} sections without LLM`);
    return thesisData;
  }

  /**
   * Extract metadata using regex patterns
   */
  private extractMetadataWithRegex(text: string): ThesisMetadata {
    const firstPage = text.substring(0, 3000); // Look in first 3000 chars

    // Common patterns for metadata
    const titleMatch = firstPage.match(/(?:论文题目|题\s*目|Title)\s*[：:]\s*(.*?)(?=\n|$)/i);
    const title_enMatch = firstPage.match(/(?:Title)\s*[：:]\s*(.*?)(?=\n|$)/i);
    const authorMatch = firstPage.match(/(?:作\s*者|姓\s*名|学生|Author)\s*[：:]\s*(.*?)(?=\n|$)/i);
    const studentIdMatch = firstPage.match(/(?:学\s*号|Student ID)\s*[：:]\s*(.*?)(?=\n|$)/i);
    const schoolMatch = firstPage.match(/(?:学\s*院|院\s*系|School|Department)\s*[：:]\s*(.*?)(?=\n|$)/i);
    const majorMatch = firstPage.match(/(?:专\s*业|Major)\s*[：:]\s*(.*?)(?=\n|$)/i);
    const supervisorMatch = firstPage.match(/(?:导\s*师|指导教师|Supervisor)\s*[：:]\s*(.*?)(?=\n|$)/i);
    const dateMatch = firstPage.match(/(?:日\s*期|Date)\s*[：:]\s*(.*?)(?=\n|$)/i);

    return {
      title: titleMatch?.[1]?.trim() || '',
      title_en: title_enMatch?.[1]?.trim() || undefined,
      author_name: authorMatch?.[1]?.trim() || '',
      student_id: studentIdMatch?.[1]?.trim() || undefined,
      school: schoolMatch?.[1]?.trim() || undefined,
      major: majorMatch?.[1]?.trim() || undefined,
      supervisor: supervisorMatch?.[1]?.trim() || undefined,
      date: dateMatch?.[1]?.trim() || undefined,
    };
  }

  /**
   * Extract section by regex pattern
   */
  private extractSectionByPattern(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match?.[1]?.trim() || null;
  }

  /**
   * Extract sections using regex (basic chapter/section detection)
   */
  private extractSectionsWithRegex(text: string): Section[] {
    const sections: Section[] = [];

    // Pattern for common section headers
    // Matches: "第一章 标题", "Chapter 1 Title", "1. 标题", "1 标题"
    const sectionPattern = /^(?:第[一二三四五六七八九十百]+章|Chapter\s+\d+|[1-9]\d*\.?)\s+(.+?)$/gm;

    let match;
    const matches: Array<{ title: string; index: number; level: 1 | 2 | 3 }> = [];

    while ((match = sectionPattern.exec(text)) !== null) {
      const title = match[1]?.trim();
      if (title && title.length > 0 && title.length < 100) {
        // Determine level based on pattern
        let level: 1 | 2 | 3 = 1;
        if (match[0].includes('.') && !match[0].match(/^第.+章/)) {
          // Subsection pattern like "1.1"
          const dots = match[0].match(/\./g);
          level = Math.min((dots?.length || 0) + 1, 3) as 1 | 2 | 3;
        }

        matches.push({
          title,
          index: match.index,
          level,
        });
      }
    }

    // Extract content between section headers
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];

      const start = current.index;
      const end = next ? next.index : text.length;

      const sectionText = text.substring(start, end);
      // Remove the header line and get content
      const contentMatch = sectionText.match(/^.+?\n([\s\S]*)/);
      const content = contentMatch?.[1]?.trim() || '';

      sections.push({
        title: current.title,
        content,
        level: current.level,
      });
    }

    return sections;
  }

  /**
   * Step 2 (New Flow): Generate only user-specified fields with AI
   * Selective generation instead of all-or-nothing approach
   */
  async generateFields(
    analysisId: string,
    generateFields: {
      metadata?: string[];
      abstract?: boolean;
      abstract_en?: boolean;
      keywords?: boolean;
      keywords_en?: boolean;
      sections?: {
        enhance: boolean;
        addMissing: string[];
      };
      references?: boolean;
      acknowledgements?: boolean;
    },
    userToken?: string,
    model?: string,
  ): Promise<{ enrichedData: ThesisData; generatedFields: string[] }> {
    this.logger.log(`Generating selective fields for analysis ${analysisId}`);

    // Retrieve stored analysis
    const analysis = this.getAnalysis(analysisId);

    // Generate only requested fields using LLM
    const generated = await this.llmService.generateSelectiveFields(
      analysis.originalText,
      analysis.extractedData,
      generateFields,
      userToken,
      model,
    );

    // Merge generated fields with original extracted data
    const enrichedData: ThesisData = {
      metadata: generated.metadata || analysis.extractedData.metadata,
      sections: generated.sections || analysis.extractedData.sections,
      abstract: generated.abstract ?? analysis.extractedData.abstract,
      abstract_en: generated.abstract_en ?? analysis.extractedData.abstract_en,
      keywords: generated.keywords ?? analysis.extractedData.keywords,
      keywords_en: generated.keywords_en ?? analysis.extractedData.keywords_en,
      references: generated.references ?? analysis.extractedData.references,
      acknowledgements: generated.acknowledgements ?? analysis.extractedData.acknowledgements,
      figures: analysis.extractedData.figures,
    };

    // Update stored analysis with enriched data
    analysis.extractedData = enrichedData;
    this.storeAnalysis(analysisId, analysis);

    // Track which fields were generated
    const generatedFields: string[] = [];
    if (generated.metadata) generatedFields.push('metadata');
    if (generated.abstract !== undefined) generatedFields.push('abstract');
    if (generated.abstract_en !== undefined) generatedFields.push('abstract_en');
    if (generated.keywords !== undefined) generatedFields.push('keywords');
    if (generated.keywords_en !== undefined) generatedFields.push('keywords_en');
    if (generated.sections) generatedFields.push('sections');
    if (generated.references !== undefined) generatedFields.push('references');
    if (generated.acknowledgements !== undefined) generatedFields.push('acknowledgements');

    this.logger.log(`Generated fields: ${generatedFields.join(', ')}`);

    return {
      enrichedData,
      generatedFields,
    };
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

    // Get template for template-aware extraction
    const template = this.templateService.findOne(templateId);

    // Parse content with LLM
    const document = await this.parseContent(text, format, images, userToken, undefined, template);

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

  /**
   * Store analysis in memory
   */
  storeAnalysis(id: string, data: StoredAnalysis): void {
    this.analyses.set(id, data);
    this.logger.log(`Stored analysis ${id}`);
  }

  /**
   * Get analysis by ID
   */
  getAnalysis(analysisId: string): StoredAnalysis {
    const analysis = this.analyses.get(analysisId);
    if (!analysis) {
      throw new NotFoundException(`Analysis '${analysisId}' not found`);
    }
    return analysis;
  }

  /**
   * Get image from analysis
   */
  getAnalysisImage(analysisId: string, imageId: string): ExtractedImage {
    const analysis = this.getAnalysis(analysisId);
    const image = analysis.images.get(imageId);
    if (!image) {
      throw new NotFoundException(`Image '${imageId}' not found in analysis`);
    }
    return image;
  }

  /**
   * Clean up analyses older than 1 hour
   */
  private cleanupOldAnalyses(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let cleaned = 0;

    this.analyses.forEach((analysis, id) => {
      if (analysis.createdAt < oneHourAgo) {
        this.analyses.delete(id);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} old analyses`);
    }
  }
}
