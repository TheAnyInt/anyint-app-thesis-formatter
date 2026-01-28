import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisService } from './analysis.service';
import { ThesisData, DocumentCompleteness, CompletenessStatus } from './dto/thesis-data.dto';
import { LatexTemplate } from '../template/entities/template.entity';

describe('AnalysisService', () => {
  let service: AnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalysisService],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeDocument', () => {
    const mockTemplate: LatexTemplate = {
      id: 'test-template',
      schoolId: 'test-school',
      name: 'Test Template',
      texContent: '',
      requiredFields: ['metadata.title', 'metadata.author_name', 'abstract'],
      requiredSections: ['sections'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should analyze a complete document correctly', () => {
      const completeData: ThesisData = {
        metadata: {
          title: 'Complete Thesis Title',
          author_name: 'John Doe',
          supervisor: 'Dr. Jane Smith',
          school: 'Computer Science',
          major: 'Software Engineering',
          student_id: '2020123456',
          date: '2024年5月',
        },
        abstract: 'This is a comprehensive abstract with multiple sentences describing the research.',
        keywords: '关键词1、关键词2、关键词3',
        sections: [
          { title: '引言', content: 'Introduction content with at least 200 words. '.repeat(30), level: 1 },
          { title: '相关工作', content: 'Related work content with at least 200 words. '.repeat(30), level: 1 },
        ],
        references: 'Reference list here',
      };

      const analysis = service.analyzeDocument(completeData, mockTemplate);

      expect(analysis.completeness.metadata.title).toBe('complete');
      expect(analysis.completeness.metadata.author_name).toBe('complete');
      expect(analysis.completeness.abstract).toBe('complete');
      expect(analysis.completeness.sections.qualityScore).toBe('good');
      expect(analysis.suggestions).toContain('Document appears complete with all required fields and sections.');
    });

    it('should detect missing metadata fields', () => {
      const incompleteData: ThesisData = {
        metadata: {
          title: '',
          author_name: '',
        },
        sections: [],
      };

      const analysis = service.analyzeDocument(incompleteData, mockTemplate);

      expect(analysis.completeness.metadata.title).toBe('missing');
      expect(analysis.completeness.metadata.author_name).toBe('missing');
      expect(analysis.suggestions.length).toBeGreaterThan(0);
      expect(analysis.suggestions.some(s => s.includes('metadata'))).toBe(true);
    });

    it('should detect partial content', () => {
      const partialData: ThesisData = {
        metadata: {
          title: 'T', // Too short
          author_name: 'A',
        },
        sections: [],
      };

      const analysis = service.analyzeDocument(partialData, mockTemplate);

      expect(analysis.completeness.metadata.title).toBe('partial');
      expect(analysis.completeness.metadata.author_name).toBe('partial');
    });

    it('should assess section quality as sparse', () => {
      const sparseData: ThesisData = {
        metadata: {
          title: 'Test Title',
          author_name: 'Test Author',
        },
        sections: [
          {
            title: 'Section 1',
            content: 'This is a section with some content but not enough to be considered good quality. '.repeat(10),
            level: 1
          },
          {
            title: 'Section 2',
            content: 'Another section with moderate content that is not comprehensive. '.repeat(10),
            level: 1
          },
        ],
      };

      const analysis = service.analyzeDocument(sparseData, mockTemplate);

      expect(analysis.completeness.sections.qualityScore).toBe('sparse');
      expect(analysis.suggestions.some(s => s.includes('sparse'))).toBe(true);
    });

    it('should assess section quality as empty', () => {
      const emptyData: ThesisData = {
        metadata: {
          title: 'Test Title',
          author_name: 'Test Author',
        },
        sections: [
          { title: 'Section 1', content: '', level: 1 },
          { title: 'Section 2', content: '', level: 1 },
        ],
      };

      const analysis = service.analyzeDocument(emptyData, mockTemplate);

      expect(analysis.completeness.sections.qualityScore).toBe('empty');
    });

    it('should generate suggestions for missing abstract', () => {
      const noAbstractData: ThesisData = {
        metadata: {
          title: 'Test Title',
          author_name: 'Test Author',
        },
        sections: [],
      };

      const analysis = service.analyzeDocument(noAbstractData, mockTemplate);

      expect(analysis.suggestions.some(s => s.includes('Abstract'))).toBe(true);
    });

    it('should handle empty sections array', () => {
      const noSectionsData: ThesisData = {
        metadata: {
          title: 'Test Title',
          author_name: 'Test Author',
        },
        sections: [],
      };

      const analysis = service.analyzeDocument(noSectionsData, mockTemplate);

      expect(analysis.completeness.sections.hasContent).toBe(false);
      expect(analysis.completeness.sections.count).toBe(0);
      expect(analysis.suggestions.some(s => s.includes('No content sections'))).toBe(true);
    });
  });

  describe('generateSuggestions', () => {
    it('should suggest metadata generation when fields are missing', () => {
      const completeness: DocumentCompleteness = {
        metadata: {
          title: 'missing' as CompletenessStatus,
          title_en: 'missing' as CompletenessStatus,
          author_name: 'missing' as CompletenessStatus,
          student_id: 'missing' as CompletenessStatus,
          school: 'missing' as CompletenessStatus,
          major: 'missing' as CompletenessStatus,
          supervisor: 'missing' as CompletenessStatus,
          date: 'missing' as CompletenessStatus,
        },
        abstract: 'missing' as CompletenessStatus,
        abstract_en: 'missing' as CompletenessStatus,
        keywords: 'missing' as CompletenessStatus,
        keywords_en: 'missing' as CompletenessStatus,
        sections: { hasContent: false, count: 0, qualityScore: 'empty' },
        references: 'missing' as CompletenessStatus,
        acknowledgements: 'missing' as CompletenessStatus,
      };

      const suggestions = service.generateSuggestions(
        completeness,
        ['metadata.title', 'metadata.author_name', 'abstract'],
        ['sections'],
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('metadata'))).toBe(true);
    });

    it('should return completion message when all fields are complete', () => {
      const completeness: DocumentCompleteness = {
        metadata: {
          title: 'complete' as CompletenessStatus,
          title_en: 'complete' as CompletenessStatus,
          author_name: 'complete' as CompletenessStatus,
          student_id: 'complete' as CompletenessStatus,
          school: 'complete' as CompletenessStatus,
          major: 'complete' as CompletenessStatus,
          supervisor: 'complete' as CompletenessStatus,
          date: 'complete' as CompletenessStatus,
        },
        abstract: 'complete' as CompletenessStatus,
        abstract_en: 'complete' as CompletenessStatus,
        keywords: 'complete' as CompletenessStatus,
        keywords_en: 'complete' as CompletenessStatus,
        sections: { hasContent: true, count: 5, qualityScore: 'good' },
        references: 'complete' as CompletenessStatus,
        acknowledgements: 'complete' as CompletenessStatus,
      };

      const suggestions = service.generateSuggestions(completeness, [], []);

      expect(suggestions).toContain('Document appears complete with all required fields and sections.');
    });
  });

  describe('state management', () => {
    it('should store and retrieve analysis', () => {
      const analysisId = 'test-analysis-id';
      const storedData = {
        originalText: 'Original document text',
        extractedData: {
          metadata: { title: 'Test', author_name: 'Author' },
          sections: [],
        } as ThesisData,
        images: new Map(),
        analysis: {
          completeness: {} as DocumentCompleteness,
          suggestions: [],
        },
        createdAt: new Date(),
      };

      service.storeAnalysis(analysisId, storedData);
      const retrieved = service.getAnalysis(analysisId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.originalText).toBe('Original document text');
      expect(retrieved?.extractedData.metadata.title).toBe('Test');
    });

    it('should return undefined for non-existent analysis', () => {
      const retrieved = service.getAnalysis('non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    it('should cleanup old analyses', () => {
      const analysisId = 'old-analysis';
      const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

      const storedData = {
        originalText: 'Old text',
        extractedData: {
          metadata: { title: 'Old', author_name: 'Old Author' },
          sections: [],
        } as ThesisData,
        images: new Map(),
        analysis: {
          completeness: {} as DocumentCompleteness,
          suggestions: [],
        },
        createdAt: oldDate,
      };

      service.storeAnalysis(analysisId, storedData);

      // Manually set the created date to old
      const analysis = service.getAnalysis(analysisId);
      if (analysis) {
        analysis.createdAt = oldDate;
      }

      service.cleanupOldAnalyses();

      const retrieved = service.getAnalysis(analysisId);
      expect(retrieved).toBeUndefined();
    });
  });
});
