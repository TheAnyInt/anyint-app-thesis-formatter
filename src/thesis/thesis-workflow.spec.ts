import { Test, TestingModule } from '@nestjs/testing';
import { ThesisService } from './thesis.service';
import { AnalysisService } from './analysis.service';
import { ExtractionService } from '../document/extraction.service';
import { LlmService } from '../llm/llm.service';
import { ReferenceFormatterService } from '../reference/reference-formatter.service';
import { JobService } from '../job/job.service';
import { TemplateService } from '../template/template.service';
import { LatexService } from '../latex/latex.service';
import { ThesisData } from './dto/thesis-data.dto';

describe('Thesis 3-Step Workflow Integration', () => {
  let thesisService: ThesisService;
  let analysisService: AnalysisService;
  let llmService: LlmService;
  let templateService: TemplateService;

  // Mock services
  const mockExtractionService = {
    extractContent: jest.fn(),
    extractPdfWithLayout: jest.fn(),
  };

  const mockLlmService = {
    generateSelectiveFields: jest.fn(),
    parseThesisContent: jest.fn(),
  };

  const mockReferenceFormatterService = {
    parseAndFormatReferences: jest.fn(),
  };

  const mockJobService = {
    createJob: jest.fn(),
    updateJobStatus: jest.fn(),
    updateJobProgress: jest.fn(),
    completeJob: jest.fn(),
    failJob: jest.fn(),
  };

  const mockTemplateService = {
    findOne: jest.fn(),
  };

  const mockLatexService = {
    render: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThesisService,
        AnalysisService,
        { provide: ExtractionService, useValue: mockExtractionService },
        { provide: LlmService, useValue: mockLlmService },
        { provide: ReferenceFormatterService, useValue: mockReferenceFormatterService },
        { provide: JobService, useValue: mockJobService },
        { provide: TemplateService, useValue: mockTemplateService },
        { provide: LatexService, useValue: mockLatexService },
      ],
    }).compile();

    thesisService = module.get<ThesisService>(ThesisService);
    analysisService = module.get<AnalysisService>(AnalysisService);
    llmService = module.get<LlmService>(LlmService);
    templateService = module.get<TemplateService>(TemplateService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Step 1: Analyze Document', () => {
    it('should extract content and analyze without LLM', async () => {
      const fileBuffer = Buffer.from('Test thesis content');
      const templateId = 'njulife-2';

      // Mock extraction
      mockExtractionService.extractContent.mockResolvedValue({
        text: 'Thesis content with sections',
        images: new Map(),
        tables: [],
      });

      // Mock template
      mockTemplateService.findOne.mockReturnValue({
        id: templateId,
        name: 'NJU Life Sciences',
        requiredFields: ['metadata.title', 'abstract'],
        requiredSections: ['sections'],
        texContent: '',
        schoolId: 'nju',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await thesisService.analyzeDocument(
        fileBuffer,
        'docx',
        templateId,
      );

      expect(result.analysisId).toBeDefined();
      expect(result.extractedData).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.analysis.completeness).toBeDefined();
      expect(result.analysis.suggestions).toBeDefined();
      expect(result.templateRequirements).toBeDefined();
      expect(result.images).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.expiresAt).toBeDefined();

      // Should not call LLM during analysis
      expect(mockLlmService.parseThesisContent).not.toHaveBeenCalled();
    });

    it('should store analysis for 1 hour', async () => {
      const fileBuffer = Buffer.from('Test content');
      const templateId = 'njulife-2';

      mockExtractionService.extractContent.mockResolvedValue({
        text: 'Content',
        images: new Map(),
        tables: [],
      });

      mockTemplateService.findOne.mockReturnValue({
        id: templateId,
        requiredFields: [],
        requiredSections: [],
        texContent: '',
        name: 'Test',
        schoolId: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await thesisService.analyzeDocument(
        fileBuffer,
        'txt',
        templateId,
      );

      // Check TTL is 1 hour
      const timeDiff = result.expiresAt.getTime() - result.createdAt.getTime();
      expect(timeDiff).toBe(60 * 60 * 1000); // 1 hour in milliseconds

      // Should be able to retrieve
      const analysis = thesisService.getAnalysis(result.analysisId);
      expect(analysis).toBeDefined();
    });
  });

  describe('Step 2: Generate Selected Fields', () => {
    it('should generate only specified metadata fields', async () => {
      const fileBuffer = Buffer.from('Test content');
      const templateId = 'njulife-2';

      // Setup analysis
      mockExtractionService.extractContent.mockResolvedValue({
        text: 'Content with title and sections',
        images: new Map(),
        tables: [],
      });

      mockTemplateService.findOne.mockReturnValue({
        id: templateId,
        requiredFields: [],
        requiredSections: [],
        texContent: '',
        name: 'Test',
        schoolId: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const analysisResult = await thesisService.analyzeDocument(
        fileBuffer,
        'txt',
        templateId,
      );

      // Mock LLM generation
      mockLlmService.generateSelectiveFields.mockResolvedValue({
        metadata: {
          title: 'AI Generated Title',
          supervisor: 'Dr. Smith',
          author_name: '',
        },
      });

      // Generate only metadata fields
      const generateResult = await thesisService.generateFields(
        analysisResult.analysisId,
        {
          metadata: ['title', 'supervisor'],
        },
      );

      expect(generateResult.enrichedData).toBeDefined();
      expect(generateResult.generatedFields).toContain('metadata');
      expect(mockLlmService.generateSelectiveFields).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        { metadata: ['title', 'supervisor'] },
        undefined,
        undefined,
      );
    });

    it('should be idempotent - regenerate same fields on repeat calls', async () => {
      const fileBuffer = Buffer.from('Test content');
      const templateId = 'test';

      mockExtractionService.extractContent.mockResolvedValue({
        text: 'Content',
        images: new Map(),
        tables: [],
      });

      mockTemplateService.findOne.mockReturnValue({
        id: templateId,
        requiredFields: [],
        requiredSections: [],
        texContent: '',
        name: 'Test',
        schoolId: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const analysisResult = await thesisService.analyzeDocument(
        fileBuffer,
        'txt',
        templateId,
      );

      mockLlmService.generateSelectiveFields.mockResolvedValue({
        abstract: 'First generation',
      });

      // First generation
      const result1 = await thesisService.generateFields(
        analysisResult.analysisId,
        { abstract: true },
      );

      mockLlmService.generateSelectiveFields.mockResolvedValue({
        abstract: 'Second generation',
      });

      // Second generation (should work and update)
      const result2 = await thesisService.generateFields(
        analysisResult.analysisId,
        { abstract: true },
      );

      expect(result2.enrichedData.abstract).toBe('Second generation');
      expect(mockLlmService.generateSelectiveFields).toHaveBeenCalledTimes(2);
    });

    it('should merge AI-generated content with original data', async () => {
      const fileBuffer = Buffer.from('Test content');
      const templateId = 'test';

      mockExtractionService.extractContent.mockResolvedValue({
        text: 'Content',
        images: new Map(),
        tables: [],
      });

      mockTemplateService.findOne.mockReturnValue({
        id: templateId,
        requiredFields: [],
        requiredSections: [],
        texContent: '',
        name: 'Test',
        schoolId: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const analysisResult = await thesisService.analyzeDocument(
        fileBuffer,
        'txt',
        templateId,
      );

      // Original has some fields
      const originalMetadata = analysisResult.extractedData.metadata;

      // AI generates additional fields
      mockLlmService.generateSelectiveFields.mockResolvedValue({
        metadata: {
          ...originalMetadata,
          supervisor: 'AI Generated Supervisor',
        },
        abstract: 'AI Generated Abstract',
      });

      const generateResult = await thesisService.generateFields(
        analysisResult.analysisId,
        {
          metadata: ['supervisor'],
          abstract: true,
        },
      );

      // Should have original + generated
      expect(generateResult.enrichedData.metadata.title).toBe(originalMetadata.title);
      expect(generateResult.enrichedData.metadata.supervisor).toBe('AI Generated Supervisor');
      expect(generateResult.enrichedData.abstract).toBe('AI Generated Abstract');
    });
  });

  describe('Step 3: Render', () => {
    it('should render from analysis ID (new flow)', async () => {
      const fileBuffer = Buffer.from('Test content');
      const templateId = 'test';

      mockExtractionService.extractContent.mockResolvedValue({
        text: 'Content',
        images: new Map(),
        tables: [],
      });

      mockTemplateService.findOne.mockReturnValue({
        id: templateId,
        requiredFields: [],
        requiredSections: [],
        texContent: '',
        name: 'Test',
        schoolId: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const analysisResult = await thesisService.analyzeDocument(
        fileBuffer,
        'txt',
        templateId,
      );

      mockJobService.createJob.mockResolvedValue({
        id: 'job-123',
        status: 'pending',
        templateId,
        userId: 'user-123',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const job = await thesisService.renderFromExtraction(
        analysisResult.analysisId,
        templateId,
        'user-123',
        undefined,
        true, // isAnalysis = true
      );

      expect(job.id).toBe('job-123');
      expect(mockJobService.createJob).toHaveBeenCalledWith(
        templateId,
        expect.any(Object),
        'user-123',
      );
    });

    it('should support both extractionId and analysisId', async () => {
      const fileBuffer = Buffer.from('Test content');
      const templateId = 'test';

      // Test with analysis ID (new flow)
      mockExtractionService.extractContent.mockResolvedValue({
        text: 'Content',
        images: new Map(),
        tables: [],
      });

      mockTemplateService.findOne.mockReturnValue({
        id: templateId,
        requiredFields: [],
        requiredSections: [],
        texContent: '',
        name: 'Test',
        schoolId: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const analysisResult = await thesisService.analyzeDocument(
        fileBuffer,
        'txt',
        templateId,
      );

      mockJobService.createJob.mockResolvedValue({
        id: 'job-456',
        status: 'pending',
        templateId,
        userId: 'user-123',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Should work with isAnalysis = true
      const job1 = await thesisService.renderFromExtraction(
        analysisResult.analysisId,
        templateId,
        'user-123',
        undefined,
        true,
      );

      expect(job1.id).toBeDefined();
      expect(mockJobService.createJob).toHaveBeenCalled();
    });
  });

  describe('Full 3-Step Workflow', () => {
    it('should complete full workflow: analyze → generate → render', async () => {
      const fileBuffer = Buffer.from('Complete thesis content');
      const templateId = 'njulife-2';
      const userId = 'user-789';

      // Step 1: Analyze
      mockExtractionService.extractContent.mockResolvedValue({
        text: 'Thesis content',
        images: new Map(),
        tables: [],
      });

      mockTemplateService.findOne.mockReturnValue({
        id: templateId,
        requiredFields: ['metadata.title', 'abstract'],
        requiredSections: ['sections'],
        texContent: '',
        name: 'NJU Life Sciences',
        schoolId: 'nju',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const analysisResult = await thesisService.analyzeDocument(
        fileBuffer,
        'docx',
        templateId,
      );

      expect(analysisResult.analysisId).toBeDefined();
      expect(analysisResult.analysis.suggestions).toBeDefined();

      // Step 2: Generate selected fields
      mockLlmService.generateSelectiveFields.mockResolvedValue({
        metadata: {
          title: 'Generated Title',
          author_name: '',
        },
        abstract: 'Generated abstract content',
        sections: [
          { title: 'Introduction', content: 'Generated intro', level: 1 },
        ],
      });

      const generateResult = await thesisService.generateFields(
        analysisResult.analysisId,
        {
          metadata: ['title'],
          abstract: true,
          sections: { enhance: true, addMissing: [] },
        },
      );

      expect(generateResult.enrichedData).toBeDefined();
      expect(generateResult.generatedFields).toContain('metadata');
      expect(generateResult.generatedFields).toContain('abstract');

      // Step 3: Render
      mockJobService.createJob.mockResolvedValue({
        id: 'final-job-123',
        status: 'pending',
        templateId,
        userId,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const job = await thesisService.renderFromExtraction(
        analysisResult.analysisId,
        templateId,
        userId,
        undefined,
        true,
      );

      expect(job.id).toBe('final-job-123');

      // Verify LLM was only called in step 2
      expect(mockLlmService.generateSelectiveFields).toHaveBeenCalledTimes(1);
    });
  });

  describe('Backward Compatibility', () => {
    it('should still support old extractFromFile flow', async () => {
      const fileBuffer = Buffer.from('Old flow content');

      mockExtractionService.extractContent.mockResolvedValue({
        text: 'Content',
        images: new Map(),
        tables: [],
      });

      mockLlmService.parseThesisContent.mockResolvedValue({
        metadata: {
          title: 'Title',
          author_name: 'Author',
        },
        sections: [],
      } as ThesisData);

      const result = await thesisService.extractFromFile(fileBuffer, 'docx');

      expect(result.extractionId).toBeDefined();
      expect(result.document).toBeDefined();
      expect(mockLlmService.parseThesisContent).toHaveBeenCalled();
    });
  });
});
