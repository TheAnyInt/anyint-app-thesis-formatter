export interface Section {
  title: string;
  content: string;
  level: 1 | 2 | 3; // 1=section, 2=subsection, 3=subsubsection
}

export interface Figure {
  id: string;
  filename: string;
  index: number;
  label: string;
  caption?: string;
}

export interface ThesisMetadata {
  title: string;
  title_en?: string;
  author_name: string;
  student_id?: string;
  school?: string;
  major?: string;
  supervisor?: string;
  date?: string;
}

export interface ThesisData {
  // Metadata (common to all theses)
  metadata: ThesisMetadata;

  // Abstract
  abstract?: string;
  abstract_en?: string;
  keywords?: string;
  keywords_en?: string;

  // ALL body sections as dynamic array
  sections: Section[];

  // Special sections (optional)
  references?: string;
  acknowledgements?: string;

  // Figures extracted from document
  figures?: Figure[];
}

// For backward compatibility during transition
export interface Chapter {
  title: string;
  content: string;
}

// Analysis-related DTOs
export type CompletenessStatus = 'complete' | 'partial' | 'missing';

export interface MetadataCompleteness {
  title: CompletenessStatus;
  title_en: CompletenessStatus;
  author_name: CompletenessStatus;
  student_id: CompletenessStatus;
  school: CompletenessStatus;
  major: CompletenessStatus;
  supervisor: CompletenessStatus;
  date: CompletenessStatus;
}

export interface SectionCompleteness {
  hasContent: boolean;
  count: number;
  qualityScore: 'good' | 'sparse' | 'empty';
}

export interface DocumentCompleteness {
  metadata: MetadataCompleteness;
  abstract: CompletenessStatus;
  abstract_en: CompletenessStatus;
  keywords: CompletenessStatus;
  keywords_en: CompletenessStatus;
  sections: SectionCompleteness;
  references: CompletenessStatus;
  acknowledgements: CompletenessStatus;
}

export interface DocumentAnalysis {
  completeness: DocumentCompleteness;
  suggestions: string[];
}

export interface AnalysisResult {
  analysisId: string;
  extractedData: ThesisData;
  templateRequirements: {
    requiredFields: string[];
    requiredSections: string[];
  };
  analysis: DocumentAnalysis;
  images: Array<{
    id: string;
    filename: string;
    contentType: string;
    url: string;
  }>;
  createdAt: Date;
  expiresAt: Date;
}

export interface StoredAnalysis {
  originalText: string;
  extractedData: ThesisData;
  images: Map<string, any>; // ExtractedImage type from extraction service
  analysis: DocumentAnalysis;
  createdAt: Date;
}

export interface GenerateFieldsRequest {
  analysisId: string;
  generateFields: {
    metadata?: string[]; // e.g., ["title", "keywords"]
    abstract?: boolean;
    abstract_en?: boolean;
    keywords?: boolean;
    keywords_en?: boolean;
    sections?: {
      enhance: boolean; // Improve existing sections
      addMissing: string[]; // Generate new sections by name
    };
    references?: boolean;
    acknowledgements?: boolean;
  };
  model?: string;
}
