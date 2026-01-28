import { Injectable, Logger } from '@nestjs/common';
import {
  ThesisData,
  DocumentAnalysis,
  DocumentCompleteness,
  CompletenessStatus,
  MetadataCompleteness,
  SectionCompleteness,
  StoredAnalysis,
} from './dto/thesis-data.dto';
import { LatexTemplate } from '../template/entities/template.entity';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly analyses = new Map<string, StoredAnalysis>();

  /**
   * Analyze document completeness against template requirements
   */
  analyzeDocument(
    extractedData: ThesisData,
    template: LatexTemplate,
  ): DocumentAnalysis {
    this.logger.log('Analyzing document completeness...');

    const completeness = this.assessCompleteness(extractedData);
    const suggestions = this.generateSuggestions(
      completeness,
      template.requiredFields,
      template.requiredSections,
    );

    return {
      completeness,
      suggestions,
    };
  }

  /**
   * Assess completeness of all document fields
   */
  private assessCompleteness(data: ThesisData): DocumentCompleteness {
    return {
      metadata: this.assessMetadataCompleteness(data.metadata),
      abstract: this.assessFieldCompleteness(data.abstract),
      abstract_en: this.assessFieldCompleteness(data.abstract_en),
      keywords: this.assessFieldCompleteness(data.keywords),
      keywords_en: this.assessFieldCompleteness(data.keywords_en),
      sections: this.assessSectionsCompleteness(data.sections),
      references: this.assessFieldCompleteness(data.references),
      acknowledgements: this.assessFieldCompleteness(data.acknowledgements),
    };
  }

  /**
   * Assess metadata completeness
   */
  private assessMetadataCompleteness(
    metadata: ThesisData['metadata'],
  ): MetadataCompleteness {
    return {
      title: this.assessFieldCompleteness(metadata.title),
      title_en: this.assessFieldCompleteness(metadata.title_en),
      author_name: this.assessFieldCompleteness(metadata.author_name),
      student_id: this.assessFieldCompleteness(metadata.student_id),
      school: this.assessFieldCompleteness(metadata.school),
      major: this.assessFieldCompleteness(metadata.major),
      supervisor: this.assessFieldCompleteness(metadata.supervisor),
      date: this.assessFieldCompleteness(metadata.date),
    };
  }

  /**
   * Assess field completeness based on content
   */
  private assessFieldCompleteness(
    value: string | undefined,
  ): CompletenessStatus {
    if (!value || value.trim().length === 0) {
      return 'missing';
    }

    // Consider very short fields as partial
    const trimmed = value.trim();
    const wordCount = trimmed.split(/\s+/).length;

    // For short fields (like keywords), 2+ words is complete
    if (wordCount >= 2) {
      return 'complete';
    }

    // Single word might be incomplete
    if (wordCount === 1) {
      return 'partial';
    }

    return 'missing';
  }

  /**
   * Assess sections completeness
   */
  private assessSectionsCompleteness(
    sections: ThesisData['sections'],
  ): SectionCompleteness {
    if (!sections || sections.length === 0) {
      return {
        hasContent: false,
        count: 0,
        qualityScore: 'empty',
      };
    }

    // Calculate average content quality
    let totalWords = 0;
    let sectionsWithContent = 0;

    for (const section of sections) {
      const content = section.content?.trim() || '';
      if (content.length > 0) {
        sectionsWithContent++;
        const words = content.split(/\s+/).length;
        totalWords += words;
      }
    }

    const avgWordsPerSection =
      sectionsWithContent > 0 ? totalWords / sectionsWithContent : 0;

    // Determine quality score based on average content
    let qualityScore: 'good' | 'sparse' | 'empty';
    if (avgWordsPerSection >= 200) {
      qualityScore = 'good';
    } else if (avgWordsPerSection >= 50) {
      qualityScore = 'sparse';
    } else {
      qualityScore = 'empty';
    }

    return {
      hasContent: sectionsWithContent > 0,
      count: sections.length,
      qualityScore,
    };
  }

  /**
   * Generate user-facing suggestions based on analysis
   */
  generateSuggestions(
    completeness: DocumentCompleteness,
    requiredFields: string[],
    requiredSections: string[],
  ): string[] {
    const suggestions: string[] = [];

    // Check metadata
    const metadataMissing: string[] = [];
    if (completeness.metadata.title !== 'complete') {
      metadataMissing.push('title');
    }
    if (completeness.metadata.author_name !== 'complete') {
      metadataMissing.push('author_name');
    }
    if (completeness.metadata.school !== 'complete' && requiredFields.includes('metadata.school')) {
      metadataMissing.push('school');
    }
    if (completeness.metadata.major !== 'complete' && requiredFields.includes('metadata.major')) {
      metadataMissing.push('major');
    }
    if (completeness.metadata.supervisor !== 'complete' && requiredFields.includes('metadata.supervisor')) {
      metadataMissing.push('supervisor');
    }
    if (completeness.metadata.date !== 'complete' && requiredFields.includes('metadata.date')) {
      metadataMissing.push('date');
    }
    if (completeness.metadata.student_id !== 'complete' && requiredFields.includes('metadata.student_id')) {
      metadataMissing.push('student_id');
    }

    if (metadataMissing.length > 0) {
      suggestions.push(
        `Missing or incomplete metadata fields: ${metadataMissing.join(', ')}. Consider generating these with AI.`,
      );
    }

    // Check abstract
    if (completeness.abstract !== 'complete' && requiredFields.includes('abstract')) {
      suggestions.push(
        'Abstract is missing or incomplete. AI can generate a comprehensive abstract based on your content.',
      );
    }

    if (completeness.abstract_en !== 'complete' && requiredFields.includes('abstract_en')) {
      suggestions.push(
        'English abstract is missing. AI can translate or generate an English abstract.',
      );
    }

    // Check keywords
    if (completeness.keywords !== 'complete' && requiredFields.includes('keywords')) {
      suggestions.push(
        'Keywords are missing or insufficient. AI can extract relevant keywords from your content.',
      );
    }

    if (completeness.keywords_en !== 'complete' && requiredFields.includes('keywords_en')) {
      suggestions.push(
        'English keywords are missing. AI can generate or translate keywords.',
      );
    }

    // Check sections
    if (!completeness.sections.hasContent) {
      suggestions.push(
        'No content sections found. AI can help structure your document into proper sections.',
      );
    } else if (completeness.sections.qualityScore === 'empty') {
      suggestions.push(
        'Sections exist but have minimal content. Consider using AI to enhance section content.',
      );
    } else if (completeness.sections.qualityScore === 'sparse') {
      suggestions.push(
        `Found ${completeness.sections.count} sections with sparse content. AI can expand and enhance existing sections.`,
      );
    }

    // Check references
    if (completeness.references !== 'complete' && requiredSections.includes('references')) {
      suggestions.push(
        'References section is missing. Add citations or let AI format existing references.',
      );
    }

    // Check acknowledgements
    if (completeness.acknowledgements !== 'complete' && requiredSections.includes('acknowledgements')) {
      suggestions.push(
        'Acknowledgements section is missing. You may want to add this section.',
      );
    }

    // If everything is complete, say so
    if (suggestions.length === 0) {
      suggestions.push(
        'Document appears complete with all required fields and sections.',
      );
    }

    return suggestions;
  }

  /**
   * Store analysis in memory
   */
  storeAnalysis(id: string, data: StoredAnalysis): void {
    this.analyses.set(id, data);
    this.logger.log(`Stored analysis ${id}`);
  }

  /**
   * Retrieve analysis from memory
   */
  getAnalysis(id: string): StoredAnalysis | undefined {
    return this.analyses.get(id);
  }

  /**
   * Clean up analyses older than 1 hour
   */
  cleanupOldAnalyses(): void {
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
