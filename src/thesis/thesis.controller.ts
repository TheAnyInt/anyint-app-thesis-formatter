import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  Body,
  Param,
  Query,
  Res,
  Req,
  HttpStatus,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ThesisService } from './thesis.service';
import { JobService } from '../job/job.service';
import { JobStatus } from '../job/entities/job.entity';
import { CasdoorGuard } from '../auth/casdoor.guard';
import { ModelConfigService } from '../llm/model-config.service';

@ApiTags('thesis')
@ApiBearerAuth()
@Controller('thesis')
@UseGuards(CasdoorGuard)
export class ThesisController {
  private readonly logger = new Logger(ThesisController.name);

  constructor(
    private readonly thesisService: ThesisService,
    private readonly jobService: JobService,
    private readonly modelConfigService: ModelConfigService,
  ) {}

  /**
   * Extract user token from Authorization header
   */
  private extractUserToken(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return undefined;
  }

  /**
   * Extract user ID from authenticated request
   */
  private extractUserId(req: Request): string {
    const user = (req as any).user;
    if (!user?.sub) {
      throw new BadRequestException('User ID not found in request');
    }
    return user.sub;
  }

  /**
   * Get available LLM models
   */
  @Get('models')
  @ApiOperation({
    summary: 'Get available LLM models',
    description: 'Returns list of allowed LLM models and the default model.',
  })
  @ApiResponse({
    status: 200,
    description: 'Available models',
    schema: {
      properties: {
        models: { type: 'array', items: { type: 'string' } },
        defaultModel: { type: 'string' },
      },
    },
  })
  getAvailableModels() {
    return {
      models: this.modelConfigService.getAllowedModels(),
      defaultModel: this.modelConfigService.getDefaultModel(),
    };
  }

  /**
   * Upload file and start async processing
   * Accepts: .docx, .txt, .md files
   */
  @Post('upload')
  @ApiOperation({
    summary: 'Upload and process thesis document',
    description: 'Upload a document file and start async thesis formatting. Returns a jobId for tracking progress.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (.docx, .pdf, .txt, .md)',
        },
        templateId: {
          type: 'string',
          description: 'Template ID (e.g., njulife-2, njulife, thu)',
          example: 'njulife-2',
        },
        model: {
          type: 'string',
          description: 'LLM model to use (optional, e.g., gpt-4o, DeepSeek-V3.2-Exp)',
          example: 'gpt-4o',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Job created successfully', schema: { properties: { jobId: { type: 'string' }, status: { type: 'string' }, model: { type: 'string' } } } })
  @ApiResponse({ status: 400, description: 'Invalid file type or model' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
      fileFilter: (req, file, callback) => {
        const allowedExtensions = ['.docx', '.txt', '.md', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException('Only .docx, .txt, .md, .pdf files are allowed'),
            false,
          );
        }
      },
    }),
  )
  async uploadThesis(
    @UploadedFile() file: Express.Multer.File,
    @Body('templateId') templateId: string,
    @Body('model') model: string | undefined,
    @Req() req: Request,
  ) {
    this.logger.log(`Received file upload: ${file?.originalname || 'unknown'}${model ? `, model: ${model}` : ''}`);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!templateId) {
      throw new BadRequestException('templateId is required');
    }

    // Validate and resolve model
    const resolvedModel = this.modelConfigService.resolveModel(model);

    // Determine file format
    const ext = path.extname(file.originalname).toLowerCase();
    const format = ext === '.docx' ? 'docx' : ext === '.pdf' ? 'pdf' : ext === '.md' ? 'markdown' : 'txt';

    // Extract user ID and token
    const userId = this.extractUserId(req);
    const userToken = this.extractUserToken(req);

    // Start async processing
    const job = await this.thesisService.startProcessing(
      file.buffer,
      format,
      templateId,
      userId,
      userToken,
      resolvedModel,
    );

    return {
      jobId: job.id,
      status: job.status,
      model: resolvedModel,
      pollUrl: `/thesis/jobs/${job.id}`,
    };
  }

  /**
   * Step 1 (New Flow): Analyze document with AI
   * Extract content with AI and compare against template requirements
   */
  @Post('analyze')
  @ApiOperation({
    summary: 'Analyze document against template with AI',
    description:
      'Extract content from document using AI and analyze completeness against template requirements. Returns analysis with suggestions for what to generate. Different templates produce different analysis results based on their specific requirements.\n\n**Template-Aware Field Mapping**: The API automatically maps template-specific field names to standardized fields. For example:\n- HUNNU: `advisor` → `supervisor`, `college` → `school`\n- NJULife: `authorEn` → `author_name_en`, `majorEn` → `major_en`, `supervisorEn` → `supervisor_en`\n- SCUT: `department` → `school`',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (.docx, .pdf, .txt, .md)',
        },
        templateId: {
          type: 'string',
          description: 'Template ID to analyze against',
          example: 'njulife-2',
          enum: ['hunnu', 'thu', 'njulife', 'njulife-2', 'njuthesis', 'scut'],
        },
        model: {
          type: 'string',
          description: 'LLM model to use (optional, e.g., gpt-4o, DeepSeek-V3.2-Exp)',
          example: 'gpt-4o',
        },
      },
      required: ['file', 'templateId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Analysis complete with template-aware field extraction',
    schema: {
      type: 'object',
      properties: {
        analysisId: { type: 'string', description: 'Unique analysis ID (expires in 1 hour)' },
        extractedData: {
          type: 'object',
          description: 'Extracted thesis data with standardized field names',
          properties: {
            metadata: {
              type: 'object',
              description: 'Thesis metadata (field names vary by template)',
              properties: {
                title: { type: 'string', description: 'Thesis title (Chinese)' },
                title_en: { type: 'string', description: 'English title (if available)' },
                author_name: { type: 'string', description: 'Author name (Chinese)' },
                author_name_en: { type: 'string', description: 'Author English name (for NJULife template)' },
                student_id: { type: 'string', description: 'Student ID (if available)' },
                school: { type: 'string', description: 'School/Department (mapped from college/department/institute)' },
                major: { type: 'string', description: 'Major (Chinese)' },
                major_en: { type: 'string', description: 'Major English name (for NJULife template)' },
                supervisor: { type: 'string', description: 'Supervisor name (mapped from advisor for HUNNU)' },
                supervisor_en: { type: 'string', description: 'Supervisor English name (for NJULife template)' },
                date: { type: 'string', description: 'Thesis date (if available)' },
              },
            },
            abstract: { type: 'string', description: 'Chinese abstract' },
            abstract_en: { type: 'string', description: 'English abstract' },
            keywords: { type: 'string', description: 'Chinese keywords' },
            keywords_en: { type: 'string', description: 'English keywords' },
            sections: {
              type: 'array',
              description: 'Thesis body sections',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  content: { type: 'string' },
                  level: { type: 'number', enum: [1, 2, 3] },
                },
              },
            },
            references: { type: 'string', description: 'References section' },
            acknowledgements: { type: 'string', description: 'Acknowledgements section' },
          },
        },
        templateRequirements: {
          type: 'object',
          properties: {
            requiredFields: { type: 'array', items: { type: 'string' } },
            requiredSections: { type: 'array', items: { type: 'string' } },
          },
        },
        analysis: {
          type: 'object',
          description: 'Completeness analysis and suggestions',
          properties: {
            completeness: { type: 'object' },
            suggestions: { type: 'array', items: { type: 'string' } },
          },
        },
        model: { type: 'string', description: 'LLM model used for analysis' },
        images: {
          type: 'array',
          description: 'Extracted images from document',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              filename: { type: 'string' },
              contentType: { type: 'string' },
              url: { type: 'string' },
            },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        expiresAt: { type: 'string', format: 'date-time', description: 'Analysis expires after 1 hour' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file type, model, or missing templateId' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
      fileFilter: (req, file, callback) => {
        const allowedExtensions = ['.docx', '.txt', '.md', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException('Only .docx, .txt, .md, .pdf files are allowed'),
            false,
          );
        }
      },
    }),
  )
  async analyzeDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('templateId') templateId: string,
    @Body('model') model: string | undefined,
    @Req() req: Request,
  ) {
    this.logger.log(`Analyzing document: ${file?.originalname || 'unknown'} with template: ${templateId}${model ? `, model: ${model}` : ''}`);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!templateId) {
      throw new BadRequestException('templateId is required');
    }

    // Validate and resolve model
    const resolvedModel = this.modelConfigService.resolveModel(model);

    const ext = path.extname(file.originalname).toLowerCase();
    const format = ext === '.docx' ? 'docx' : ext === '.pdf' ? 'pdf' : ext === '.md' ? 'markdown' : 'txt';

    const userToken = this.extractUserToken(req);
    const result = await this.thesisService.analyzeDocument(
      file.buffer,
      format,
      templateId,
      userToken,
      resolvedModel,
    );

    return result;
  }

  /**
   * Step 2 (New Flow): Generate only user-specified fields with AI
   * Selective generation instead of all-or-nothing approach
   */
  @Post('generate')
  @ApiOperation({
    summary: 'Generate selected fields with AI',
    description:
      'Selectively generate only user-requested fields using LLM. User controls what gets AI-generated.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        analysisId: {
          type: 'string',
          description: 'Analysis ID from /analyze endpoint',
        },
        generateFields: {
          type: 'object',
          description: 'Specification of which fields to generate',
          properties: {
            metadata: {
              type: 'array',
              items: { type: 'string' },
              description: 'Metadata fields to generate (e.g., ["title", "keywords"])',
            },
            abstract: { type: 'boolean', description: 'Generate Chinese abstract' },
            abstract_en: { type: 'boolean', description: 'Generate English abstract' },
            keywords: { type: 'boolean', description: 'Generate Chinese keywords' },
            keywords_en: { type: 'boolean', description: 'Generate English keywords' },
            sections: {
              type: 'object',
              properties: {
                enhance: { type: 'boolean', description: 'Enhance existing sections' },
                addMissing: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Generate missing sections by name',
                },
              },
            },
            references: { type: 'boolean', description: 'Generate references' },
            acknowledgements: { type: 'boolean', description: 'Generate acknowledgements' },
          },
        },
        model: {
          type: 'string',
          description: 'LLM model to use (optional)',
          example: 'gpt-4o',
        },
      },
      required: ['analysisId', 'generateFields'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Fields generated successfully',
    schema: {
      properties: {
        enrichedData: { type: 'object', description: 'Merged original + generated data' },
        generatedFields: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of fields that were generated',
        },
        model: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request or model' })
  @ApiResponse({ status: 404, description: 'Analysis not found or expired' })
  async generateFields(
    @Body()
    body: {
      analysisId: string;
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
      };
      model?: string;
    },
    @Req() req: Request,
  ) {
    this.logger.log(`Generating fields for analysis: ${body.analysisId}${body.model ? `, model: ${body.model}` : ''}`);

    if (!body.analysisId) {
      throw new BadRequestException('analysisId is required');
    }

    if (!body.generateFields) {
      throw new BadRequestException('generateFields is required');
    }

    // Validate and resolve model
    const resolvedModel = this.modelConfigService.resolveModel(body.model);

    const userToken = this.extractUserToken(req);
    const result = await this.thesisService.generateFields(
      body.analysisId,
      body.generateFields,
      userToken,
      resolvedModel,
    );

    return {
      ...result,
      model: resolvedModel,
    };
  }

  /**
   * Step 1: Extract content and images from file
   * Returns structured data for frontend preview/editing
   */
  @Post('extract')
  @ApiOperation({
    summary: 'Extract content from thesis document',
    description: 'Extract and parse content from a document file for preview/editing.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (.docx, .pdf, .txt, .md)',
        },
        model: {
          type: 'string',
          description: 'LLM model to use (optional, e.g., gpt-4o, DeepSeek-V3.2-Exp)',
          example: 'gpt-4o',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, description: 'Extraction successful' })
  @ApiResponse({ status: 400, description: 'Invalid file type or model' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
      fileFilter: (req, file, callback) => {
        const allowedExtensions = ['.docx', '.txt', '.md', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException('Only .docx, .txt, .md, .pdf files are allowed'),
            false,
          );
        }
      },
    }),
  )
  async extractFromFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('model') model: string | undefined,
    @Req() req: Request,
  ) {
    this.logger.log(`Extracting from file: ${file?.originalname || 'unknown'}${model ? `, model: ${model}` : ''}`);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate and resolve model
    const resolvedModel = this.modelConfigService.resolveModel(model);

    const ext = path.extname(file.originalname).toLowerCase();
    const format = ext === '.docx' ? 'docx' : ext === '.pdf' ? 'pdf' : ext === '.md' ? 'markdown' : 'txt';

    const userToken = this.extractUserToken(req);
    const result = await this.thesisService.extractFromFile(file.buffer, format, userToken, resolvedModel);

    return {
      ...result,
      model: resolvedModel,
    };
  }

  /**
   * Get image from extraction (for frontend preview)
   */
  @Get('extractions/:extractionId/images/:imageId')
  async getExtractionImage(
    @Param('extractionId') extractionId: string,
    @Param('imageId') imageId: string,
    @Res() res: Response,
  ) {
    const image = this.thesisService.getExtractionImage(extractionId, imageId);

    res.set({
      'Content-Type': image.contentType,
      'Content-Length': image.buffer.length,
      'Cache-Control': 'public, max-age=3600',
    });

    res.send(image.buffer);
  }

  /**
   * Get image from analysis (for frontend preview)
   */
  @Get('analyses/:analysisId/images/:imageId')
  async getAnalysisImage(
    @Param('analysisId') analysisId: string,
    @Param('imageId') imageId: string,
    @Res() res: Response,
  ) {
    const image = this.thesisService.getAnalysisImage(analysisId, imageId);

    res.set({
      'Content-Type': image.contentType,
      'Content-Length': image.buffer.length,
      'Cache-Control': 'public, max-age=3600',
    });

    res.send(image.buffer);
  }

  /**
   * Step 2/3: Render PDF from extraction or analysis
   * Supports both old flow (extractionId) and new flow (analysisId)
   * Optionally accepts modified document data
   */
  @Post('render')
  @ApiOperation({
    summary: 'Render PDF from extraction or analysis',
    description:
      'Create PDF from extracted/analyzed data. Supports both old flow (extractionId) and new flow (analysisId).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        extractionId: {
          type: 'string',
          description: 'Extraction ID from /extract endpoint (old flow)',
        },
        analysisId: {
          type: 'string',
          description: 'Analysis ID from /analyze endpoint (new flow)',
        },
        templateId: {
          type: 'string',
          description: 'Template ID to use',
          example: 'njulife-2',
        },
        document: {
          type: 'object',
          description: 'Optional document override (for manual edits)',
        },
      },
      required: ['templateId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Rendering job created',
    schema: {
      properties: {
        jobId: { type: 'string' },
        status: { type: 'string' },
        pollUrl: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Extraction/Analysis not found' })
  async renderFromExtraction(
    @Body()
    body: {
      extractionId?: string;
      analysisId?: string;
      templateId: string;
      document?: Record<string, any>;
    },
    @Req() req: Request,
  ) {
    // Require either extractionId or analysisId
    if (!body.extractionId && !body.analysisId) {
      throw new BadRequestException('Either extractionId or analysisId is required');
    }

    if (!body.templateId) {
      throw new BadRequestException('templateId is required');
    }

    // Extract user ID
    const userId = this.extractUserId(req);

    // Determine which ID to use (prefer analysisId for new flow)
    const id = body.analysisId || body.extractionId!;
    const isAnalysis = !!body.analysisId;

    this.logger.log(`Rendering from ${isAnalysis ? 'analysis' : 'extraction'}: ${id}`);

    const job = await this.thesisService.renderFromExtraction(
      id,
      body.templateId,
      userId,
      body.document,
      isAnalysis,
    );

    return {
      jobId: job.id,
      status: job.status,
      pollUrl: `/thesis/jobs/${job.id}`,
    };
  }

  /**
   * List all jobs for the authenticated user
   */
  @Get('jobs')
  @ApiOperation({
    summary: 'List user jobs',
    description: 'Get all thesis processing jobs for the authenticated user with pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-indexed)',
    example: 1,
  })
  @ApiQuery({
    name: 'count',
    required: false,
    type: Number,
    description: 'Number of items per page (max 100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'List of jobs',
    schema: {
      properties: {
        jobs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              jobId: { type: 'string' },
              status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
              progress: { type: 'number' },
              templateId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number', description: 'Total number of jobs' },
        page: { type: 'number', description: 'Current page number' },
        count: { type: 'number', description: 'Items per page' },
        totalPages: { type: 'number', description: 'Total number of pages' },
      },
    },
  })
  async listUserJobs(
    @Req() req: Request,
    @Query('page') page: string = '1',
    @Query('count') count: string = '10',
  ) {
    const userId = this.extractUserId(req);
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(count) || 10));

    const { jobs, total } = await this.jobService.getJobsByUser(userId, pageNum, limit);

    return {
      jobs: jobs.map((job) => ({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        templateId: job.templateId,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        ...(job.status === JobStatus.COMPLETED && job.result
          ? {
              downloadUrl: `/thesis/jobs/${job.id}/download`,
              texUrl: `/thesis/jobs/${job.id}/tex`,
            }
          : {}),
        ...(job.status === JobStatus.FAILED ? { error: job.error } : {}),
      })),
      total,
      page: pageNum,
      count: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Poll job status
   */
  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get job status', description: 'Poll the status of a thesis processing job' })
  @ApiParam({ name: 'jobId', description: 'Job ID returned from upload' })
  @ApiResponse({
    status: 200,
    description: 'Job status',
    schema: {
      properties: {
        jobId: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
        progress: { type: 'number' },
        result: { type: 'object' },
        error: { type: 'string' },
      },
    },
  })
  async getJobStatus(@Param('jobId') jobId: string, @Req() req: Request) {
    const userId = this.extractUserId(req);
    const job = await this.jobService.getJob(jobId, userId);

    if (!job) {
      throw new NotFoundException(`Job '${jobId}' not found`);
    }

    const response: any = {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };

    if (job.status === JobStatus.COMPLETED && job.result) {
      response.downloadUrl = `/thesis/jobs/${job.id}/download`;
      response.texUrl = `/thesis/jobs/${job.id}/tex`;
    }

    if (job.status === JobStatus.FAILED) {
      response.error = job.error;
    }

    return response;
  }

  /**
   * Download generated PDF
   */
  @Get('jobs/:jobId/download')
  @ApiOperation({ summary: 'Download generated PDF', description: 'Download the formatted thesis PDF after job completes' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'PDF file download' })
  @ApiResponse({ status: 404, description: 'Job not found or PDF not ready' })
  async downloadPdf(@Param('jobId') jobId: string, @Req() req: Request, @Res() res: Response) {
    const userId = this.extractUserId(req);
    const job = await this.jobService.getJob(jobId, userId);

    if (!job) {
      throw new NotFoundException(`Job '${jobId}' not found`);
    }

    if (job.status !== JobStatus.COMPLETED) {
      throw new BadRequestException(`Job is not completed. Status: ${job.status}`);
    }

    if (!job.result?.pdfPath || !fs.existsSync(job.result.pdfPath)) {
      throw new NotFoundException('PDF file not found');
    }

    const filename = `thesis_${jobId}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    const fileStream = fs.createReadStream(job.result.pdfPath);
    fileStream.pipe(res);
  }

  /**
   * Download generated DOCX (converted from LaTeX via Pandoc)
   * TEMPORARILY DISABLED - Pandoc conversion may corrupt formulas
   */
  @Get('jobs/:jobId/docx')
  async downloadDocx(@Param('jobId') jobId: string, @Req() req: Request, @Res() res: Response) {
    throw new BadRequestException(
      'DOCX download is temporarily disabled. Please use PDF or TeX download instead.'
    );

    // Original Pandoc conversion code - kept for reference when proper DOCX generation is implemented
    // const userId = this.extractUserId(req);
    // const job = await this.jobService.getJob(jobId, userId);
    //
    // if (!job) {
    //   throw new NotFoundException(`Job '${jobId}' not found`);
    // }
    //
    // if (job.status !== JobStatus.COMPLETED) {
    //   throw new BadRequestException(`Job is not completed. Status: ${job.status}`);
    // }
    //
    // if (!job.result?.texPath || !fs.existsSync(job.result.texPath)) {
    //   throw new NotFoundException('TeX file not found');
    // }
    //
    // // Convert LaTeX to DOCX using Pandoc
    // const docxPath = job.result.texPath.replace('.tex', '.docx');
    // const { execSync } = require('child_process');
    //
    // try {
    //   execSync(`pandoc "${job.result.texPath}" -o "${docxPath}"`, {
    //     timeout: 30000,
    //   });
    // } catch (error) {
    //   throw new BadRequestException('Failed to convert to DOCX');
    // }
    //
    // const filename = `thesis_${jobId}.docx`;
    // res.set({
    //   'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    //   'Content-Disposition': `attachment; filename="${filename}"`,
    // });
    //
    // const fileStream = fs.createReadStream(docxPath);
    // fileStream.pipe(res);
  }

  /**
   * Download generated TeX source
   */
  @Get('jobs/:jobId/tex')
  async downloadTex(@Param('jobId') jobId: string, @Req() req: Request, @Res() res: Response) {
    const userId = this.extractUserId(req);
    const job = await this.jobService.getJob(jobId, userId);

    if (!job) {
      throw new NotFoundException(`Job '${jobId}' not found`);
    }

    if (job.status !== JobStatus.COMPLETED) {
      throw new BadRequestException(`Job is not completed. Status: ${job.status}`);
    }

    if (!job.result?.texPath || !fs.existsSync(job.result.texPath)) {
      throw new NotFoundException('TeX file not found');
    }

    const filename = `thesis_${jobId}.tex`;
    res.set({
      'Content-Type': 'application/x-tex',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    const fileStream = fs.createReadStream(job.result.texPath);
    fileStream.pipe(res);
  }
}
