import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  Body,
  Param,
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

    // Extract user token for Gateway proxy
    const userToken = this.extractUserToken(req);

    // Start async processing
    const job = await this.thesisService.startProcessing(
      file.buffer,
      format,
      templateId,
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
   * Step 2: Render PDF from extraction
   * Optionally accepts modified document data
   */
  @Post('render')
  async renderFromExtraction(
    @Body() body: { extractionId: string; templateId: string; document?: Record<string, any> },
  ) {
    if (!body.extractionId) {
      throw new BadRequestException('extractionId is required');
    }
    if (!body.templateId) {
      throw new BadRequestException('templateId is required');
    }

    const job = await this.thesisService.renderFromExtraction(
      body.extractionId,
      body.templateId,
      body.document,
    );

    return {
      jobId: job.id,
      status: job.status,
      pollUrl: `/thesis/jobs/${job.id}`,
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
  getJobStatus(@Param('jobId') jobId: string) {
    const job = this.jobService.getJob(jobId);

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
  async downloadPdf(@Param('jobId') jobId: string, @Res() res: Response) {
    const job = this.jobService.getJob(jobId);

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
   */
  @Get('jobs/:jobId/docx')
  async downloadDocx(@Param('jobId') jobId: string, @Res() res: Response) {
    const job = this.jobService.getJob(jobId);

    if (!job) {
      throw new NotFoundException(`Job '${jobId}' not found`);
    }

    if (job.status !== JobStatus.COMPLETED) {
      throw new BadRequestException(`Job is not completed. Status: ${job.status}`);
    }

    if (!job.result?.texPath || !fs.existsSync(job.result.texPath)) {
      throw new NotFoundException('TeX file not found');
    }

    // Convert LaTeX to DOCX using Pandoc
    const docxPath = job.result.texPath.replace('.tex', '.docx');
    const { execSync } = require('child_process');

    try {
      execSync(`pandoc "${job.result.texPath}" -o "${docxPath}"`, {
        timeout: 30000,
      });
    } catch (error) {
      throw new BadRequestException('Failed to convert to DOCX');
    }

    const filename = `thesis_${jobId}.docx`;
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    const fileStream = fs.createReadStream(docxPath);
    fileStream.pipe(res);
  }

  /**
   * Download generated TeX source
   */
  @Get('jobs/:jobId/tex')
  async downloadTex(@Param('jobId') jobId: string, @Res() res: Response) {
    const job = this.jobService.getJob(jobId);

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
