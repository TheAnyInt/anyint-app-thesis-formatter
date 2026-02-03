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
   * Remove numbering prefixes from section titles
   * Handles patterns: 第X章、第X节、Chapter X、Section X、X.Y.Z、etc.
   * This serves as a safety net when LLM fails to remove these prefixes
   */
  cleanSectionTitle(title: string): string {
    if (!title) return '';

    return title
      // Chinese chapter/section: 第一章、第1章、第一节、第1节 等
      .replace(/^第[一二三四五六七八九十百千万\d]+[章节]\s*/g, '')
      // English chapter/section: Chapter 1、Section 1.2、Part 1 等
      .replace(/^(Chapter|Section|Part)\s+[\d.]+\s*/gi, '')
      // Numeric prefixes: 1.、1.1、1.1.1 等
      .replace(/^[\d.]+\s+/g, '')
      .trim();
  }

  /**
   * Remove section header from content start (safety net for duplicate prevention)
   * If content starts with a section header that matches the title, remove it
   */
  cleanSectionContent(content: string, title: string): string {
    if (!content) return '';

    const escapedTitle = this.escapeRegExpChars(title);

    // Patterns to match section headers at content start
    const patterns = [
      // 第一章 XXX、第1章 XXX
      new RegExp(`^第[一二三四五六七八九十百千万\\d]+[章节]\\s*${escapedTitle}\\s*\\n?`),
      // 1.1 XXX、1.1.1 XXX
      new RegExp(`^[\\d.]+\\s+${escapedTitle}\\s*\\n?`),
      // Chapter X XXX
      new RegExp(`^(Chapter|Section|Part)\\s+[\\d.]+\\s*${escapedTitle}\\s*\\n?`, 'i'),
    ];

    let result = content;
    for (const pattern of patterns) {
      result = result.replace(pattern, '');
    }

    return result.trim();
  }

  /**
   * Escape special regex characters in a string
   */
  private escapeRegExpChars(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Prepare document data for Mustache rendering
   * Escapes LaTeX special characters in text fields
   * Adds level flags (isLevel1, isLevel2, isLevel3) for sections
   * Flattens metadata and converts references to array format
   */
  prepareDocumentData(document: Record<string, any>): Record<string, any> {
    const prepared: Record<string, any> = {};

    // Add currentDate as a fallback for templates that need a date
    // njuthesis expects YYYY-MM-DD format (e.g., 2026-01-19)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    prepared.currentDate = `${year}-${month}-${day}`;
    prepared.currentDateCn = `${year}年${now.getMonth() + 1}月`;
    prepared.currentDateEn = `${now.toLocaleString('en-US', { month: 'long' })} ${year}`;

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
            // Add level flags for sections and clean title prefixes
            if ('level' in item) {
              preparedItem.isLevel1 = item.level === 1;
              preparedItem.isLevel2 = item.level === 2;
              preparedItem.isLevel3 = item.level === 3;
              preparedItem.isLevel4 = item.level === 4;
              // Clean section title to remove numbering prefixes (safety net for LLM output)
              if ('title' in item && typeof item.title === 'string') {
                preparedItem.title = this.cleanSectionTitle(this.escapeLatex(item.title));
              }
              // Clean section content to remove leading section headers (safety net for duplicate prevention)
              if ('content' in item && typeof item.content === 'string' && 'title' in item) {
                preparedItem.content = this.cleanSectionContent(item.content, item.title as string);
              }
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

    // Flatten metadata to top-level with template-friendly field names
    // Also preserve original metadata object with escaped values for templates that use {{#metadata}}{{field}}{{/metadata}}
    if (document.metadata) {
      const meta = document.metadata;

      // Preserve the original metadata object with escaped values for nested access
      prepared.metadata = {};
      for (const [key, value] of Object.entries(meta)) {
        if (typeof value === 'string') {
          prepared.metadata[key] = this.escapeLatex(value);
        } else {
          prepared.metadata[key] = value;
        }
      }

      // Title variants
      if (meta.title) {
        prepared.title = this.escapeLatex(meta.title);
      }
      if (meta.title_en) {
        prepared.titleEn = this.escapeLatex(meta.title_en);
        prepared.title_en = this.escapeLatex(meta.title_en);
      }

      // Author variants
      if (meta.author_name) {
        prepared.author = this.escapeLatex(meta.author_name);
        prepared.author_name = this.escapeLatex(meta.author_name);
        prepared.authorCn = this.escapeLatex(meta.author_name);
      }

      // Supervisor variants (supervisor + advisor)
      if (meta.supervisor) {
        prepared.supervisor = this.escapeLatex(meta.supervisor);
        prepared.advisor = this.escapeLatex(meta.supervisor);  // hunnu template uses advisor
      }

      // Department/School/College variants
      if (meta.school) {
        prepared.school = this.escapeLatex(meta.school);
        prepared.college = this.escapeLatex(meta.school);      // hunnu template uses college
        prepared.department = this.escapeLatex(meta.school);   // njuthesis/scut use department
      }

      // Student ID variants
      if (meta.student_id) {
        prepared.studentId = this.escapeLatex(meta.student_id);
        prepared.student_id = this.escapeLatex(meta.student_id);
      }

      // Major
      if (meta.major) {
        prepared.major = this.escapeLatex(meta.major);
      }

      // Date variants
      if (meta.date) {
        prepared.date = this.escapeLatex(meta.date);
        prepared.submitDate = this.escapeLatex(meta.date);
      }
    }

    // Add Chinese/English abstract aliases
    if (document.abstract) {
      prepared.abstractCn = document.abstract;
    }
    if (document.abstract_en) {
      prepared.abstractEn = document.abstract_en;
    }
    if (document.keywords) {
      prepared.keywordsCn = this.escapeLatex(document.keywords);
    }
    if (document.keywords_en) {
      prepared.keywordsEn = this.escapeLatex(document.keywords_en);
    }

    // Provide references in both formats for template compatibility
    // - references: string (for templates like THU that output raw text)
    // - referencesArray: array (for templates like HUNNU that iterate with {{key}}/{{citation}})
    if (document.references && typeof document.references === 'string') {
      // Keep the original string format
      // (already LaTeX-escaped by prepareDocumentData's string handling)

      // Also provide array format for templates that need structured iteration
      const refsArray = this.parseReferencesToArray(document.references);
      if (refsArray.length > 0) {
        prepared.referencesArray = refsArray;
      }
    }

    // Add has* boolean flags for conditional rendering
    prepared.hasConclusion = !!document.conclusion;
    prepared.hasReferences = !!document.references;
    prepared.hasAcknowledgements = !!document.acknowledgements;
    prepared.hasAppendix = !!document.appendix;

    // Copy chapters as alias for sections (some templates use chapters)
    if (document.sections && !document.chapters) {
      prepared.chapters = prepared.sections;
    }

    return prepared;
  }

  /**
   * Parse references string into array format for LaTeX thebibliography
   * Handles formats like "[1] Author...", "1. Author...", "【1】Author...", "(1) Author..."
   * Falls back to paragraph-based splitting if no numbered format is detected
   */
  private parseReferencesToArray(refsString: string): Array<{ key: string; citation: string }> {
    const refs: Array<{ key: string; citation: string }> = [];

    // Split by common reference patterns
    const lines = refsString.split(/\n/);
    let currentRef = '';
    let refIndex = 0;
    let numberedFormatDetected = false;

    // Extended regex to match more reference number formats:
    // [1], 【1】, (1), 1., 1), ①②③... (circled numbers)
    const refNumberPattern = /^\[(\d+)\]|^【(\d+)】|^\((\d+)\)|^(\d+)[\.\)]\s*|^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/;
    // Pattern to remove the number prefix from the start of a reference
    const prefixRemovalPattern = /^(?:\[\d+\]|【\d+】|\(\d+\)|\d+[\.\)]\s*|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])\s*/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check if line starts a new reference
      const newRefMatch = trimmed.match(refNumberPattern);
      if (newRefMatch) {
        numberedFormatDetected = true;
        // Save previous reference
        if (currentRef) {
          refIndex++;
          refs.push({
            key: `ref${refIndex}`,
            citation: currentRef.trim(),
          });
        }
        // Start new reference (remove the number prefix)
        currentRef = trimmed.replace(prefixRemovalPattern, '');
      } else {
        // Continue previous reference
        currentRef += ' ' + trimmed;
      }
    }

    // Save last reference (only if we detected numbered format)
    if (currentRef && numberedFormatDetected) {
      refIndex++;
      refs.push({
        key: `ref${refIndex}`,
        citation: currentRef.trim(),
      });
    }

    // Fallback: if no numbered format was detected, try paragraph-based splitting
    if (!numberedFormatDetected) {
      this.logger.debug('No numbered reference format detected, falling back to paragraph splitting');
      const paragraphs = refsString.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

      // If no double-newline paragraphs, try single newline with substantial content
      const candidates = paragraphs.length > 1 ? paragraphs : lines.filter((l) => l.trim().length > 10);

      for (const para of candidates) {
        const trimmed = para.trim();
        if (trimmed.length > 0) {
          refIndex++;
          refs.push({
            key: `ref${refIndex}`,
            citation: trimmed.replace(/\s+/g, ' '), // Normalize whitespace
          });
        }
      }
    }

    this.logger.debug(`Parsed ${refs.length} references from input (numbered format: ${numberedFormatDetected})`);
    return refs;
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

      const cmd = `tectonic -Z continue-on-errors --keep-logs --keep-intermediates "${texFile}"`;
      this.logger.log(`Compiling ${texFile} with command: ${cmd}`);

      const { stdout, stderr } = await execAsync(cmd, {
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
      this.logger.warn(`Tectonic reported errors: ${errorMessage}`);

      // Check if PDF was generated despite errors (with -Z continue-on-errors)
      const pdfPath = texPath.replace(/\.tex$/, '.pdf');
      if (fs.existsSync(pdfPath)) {
        this.logger.log(`PDF generated despite errors: ${pdfPath}`);
        return { success: true, pdfPath };
      }

      this.logger.error(`Tectonic compilation failed and no PDF generated`);
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
   * Assets are searched in: 1) templates/<templateId>/ 2) templates/shared/
   */
  copyTemplateAssets(jobDir: string, templateId: string, assets?: string[]): void {
    if (!assets || assets.length === 0) return;

    // Template assets are stored in templates/<templateId>/ directory
    const templateAssetsDir = path.join(process.cwd(), 'templates', templateId);
    // Shared assets directory for common files (fonts, etc.)
    const sharedAssetsDir = path.join(process.cwd(), 'templates', 'shared');

    for (const asset of assets) {
      // Skip cover.pdf - it will be handled by modifyCoverPdf()
      if (asset === 'cover.pdf') {
        continue;
      }

      // Try template-specific directory first, then shared directory
      let srcPath = path.join(templateAssetsDir, asset);
      if (!fs.existsSync(srcPath)) {
        srcPath = path.join(sharedAssetsDir, asset);
      }

      const destPath = path.join(jobDir, asset);

      if (fs.existsSync(srcPath)) {
        // Create parent directories if asset path includes subdirectories
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(srcPath, destPath);
        this.logger.log(`Copied template asset: ${asset}`);
      } else {
        this.logger.warn(`Template asset not found: ${asset}`);
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
