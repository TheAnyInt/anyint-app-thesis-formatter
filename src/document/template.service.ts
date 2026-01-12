import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { ThesisData } from '../thesis/dto/thesis-data.dto';
import { ExtractedImage } from './extraction.service';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templatePath: string;

  constructor() {
    this.templatePath = path.join(
      process.cwd(),
      'templates',
      'tsinghua_thesis_template_placeholders.docx',
    );
  }

  async fillTemplate(
    data: ThesisData,
    images?: Map<string, ExtractedImage>,
  ): Promise<Buffer> {
    this.logger.log('Loading thesis template...');

    try {
      const templateContent = fs.readFileSync(this.templatePath, 'binary');
      const zip = new PizZip(templateContent);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
      });

      // Clean image placeholders from text content before rendering
      const cleanedData = this.cleanImagePlaceholders(data);

      this.logger.log('Filling template with thesis data...');
      doc.render(cleanedData);

      // Get the output zip
      const outputZip = doc.getZip();

      // Copy images from original document to output
      if (images && images.size > 0) {
        this.copyImagesToOutput(outputZip, images);
      }

      const outputBuffer = outputZip.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      this.logger.log('Template filled successfully');
      return outputBuffer;
    } catch (error) {
      this.logger.error('Failed to fill template', error);

      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error(`Template file not found at: ${this.templatePath}`);
      }

      throw new Error(
        `Template processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private cleanImagePlaceholders(data: ThesisData): ThesisData {
    const cleaned = { ...data };

    // Remove image placeholders like {%img_1%} from text fields
    const imagePlaceholderRegex = /\{%[^%]+%\}/g;

    // Clean string fields
    const textKeys: (keyof ThesisData)[] = [
      'abstract',
      'abstract_en',
      'keywords',
      'keywords_en',
      'references',
      'acknowledgements',
    ];

    for (const key of textKeys) {
      const value = cleaned[key];
      if (typeof value === 'string') {
        (cleaned as Record<string, unknown>)[key] = value
          .replace(imagePlaceholderRegex, '[图片]')
          .trim();
      }
    }

    // Clean sections
    if (cleaned.sections) {
      cleaned.sections = cleaned.sections.map((sec) => ({
        ...sec,
        content: sec.content.replace(imagePlaceholderRegex, '[图片]').trim(),
      }));
    }

    return cleaned;
  }

  private copyImagesToOutput(
    outputZip: PizZip,
    images: Map<string, ExtractedImage>,
  ): void {
    this.logger.log(`Copying ${images.size} images to output document...`);

    let imageIndex = 1;
    images.forEach((image) => {
      const fileName = `word/media/image${imageIndex}.${image.extension}`;
      outputZip.file(fileName, image.buffer);
      imageIndex++;
    });

    this.logger.log(`Copied ${images.size} images to output document`);
  }
}
