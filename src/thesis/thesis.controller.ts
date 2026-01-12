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
import { Response, Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ThesisService } from './thesis.service';
import { JobService } from '../job/job.service';
import { JobStatus } from '../job/entities/job.entity';
import { CasdoorGuard } from '../auth/casdoor.guard';

@Controller('thesis')
@UseGuards(CasdoorGuard)
export class ThesisController {
  private readonly logger = new Logger(ThesisController.name);

  constructor(
    private readonly thesisService: ThesisService,
    private readonly jobService: JobService,
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
   * Upload file and start async processing
   * Accepts: .docx, .txt, .md files
   */
  @Post('upload')
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
    @Req() req: Request,
  ) {
    this.logger.log(`Received file upload: ${file?.originalname || 'unknown'}`);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!templateId) {
      throw new BadRequestException('templateId is required');
    }

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
    );

    return {
      jobId: job.id,
      status: job.status,
      pollUrl: `/thesis/jobs/${job.id}`,
    };
  }

  /**
   * Parse content directly (without file upload)
   */
  @Post('parse')
  async parseContent(
    @Body() body: { content: string; format: 'txt' | 'markdown'; templateId?: string },
    @Req() req: Request,
  ) {
    if (!body.content) {
      throw new BadRequestException('content is required');
    }

    const userToken = this.extractUserToken(req);

    const document = await this.thesisService.parseContent(
      body.content,
      body.format || 'txt',
      undefined,
      userToken,
    );

    return { document };
  }

  /**
   * Step 1: Extract content and images from file
   * Returns structured data for frontend preview/editing
   */
  @Post('extract')
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
    @Req() req: Request,
  ) {
    this.logger.log(`Extracting from file: ${file?.originalname || 'unknown'}`);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const format = ext === '.docx' ? 'docx' : ext === '.pdf' ? 'pdf' : ext === '.md' ? 'markdown' : 'txt';

    const userToken = this.extractUserToken(req);
    const result = await this.thesisService.extractFromFile(file.buffer, format, userToken);

    return result;
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
   * Direct synchronous conversion: upload file → get PDF
   * No job polling required
   */
  @Post('convert')
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
  async convertDirect(
    @UploadedFile() file: Express.Multer.File,
    @Body('templateId') templateId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.log(`Direct conversion: ${file?.originalname || 'unknown'}`);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!templateId) {
      throw new BadRequestException('templateId is required');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const format = ext === '.docx' ? 'docx' : ext === '.pdf' ? 'pdf' : ext === '.md' ? 'markdown' : 'txt';

    // Extract user token for Gateway proxy
    const userToken = this.extractUserToken(req);

    // Extract and render synchronously
    const result = await this.thesisService.convertDirect(file.buffer, format, templateId, userToken);

    const filename = `thesis_${Date.now()}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    const fileStream = fs.createReadStream(result.pdfPath);
    fileStream.pipe(res);
  }

  /**
   * Native DOCX generation with table/image support
   */
  @Post('convert-docx-native')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024,
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
  async convertToDocxNative(
    @UploadedFile() file: Express.Multer.File,
    @Body('templateId') templateId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.log(`Native DOCX conversion: ${file?.originalname || 'unknown'}`);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const format = ext === '.docx' ? 'docx' : ext === '.pdf' ? 'pdf' : ext === '.md' ? 'markdown' : 'txt';

    // Extract user token for Gateway proxy
    const userToken = this.extractUserToken(req);

    // Use the native DOCX generation
    const result = await this.thesisService.convertToDocxNative(file.buffer, format, userToken);

    const filename = `thesis_${Date.now()}.docx`;
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    const fileStream = fs.createReadStream(result.docxPath);
    fileStream.pipe(res);
  }

  /**
   * Direct synchronous conversion to DOCX: upload file → get DOCX
   */
  @Post('convert-docx')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024,
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
  async convertToDocx(
    @UploadedFile() file: Express.Multer.File,
    @Body('templateId') templateId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.log(`Direct DOCX conversion: ${file?.originalname || 'unknown'}`);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!templateId) {
      throw new BadRequestException('templateId is required');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const format = ext === '.docx' ? 'docx' : ext === '.pdf' ? 'pdf' : ext === '.md' ? 'markdown' : 'txt';

    // Extract user token for Gateway proxy
    const userToken = this.extractUserToken(req);

    // Extract and render to LaTeX
    const result = await this.thesisService.convertDirect(file.buffer, format, templateId, userToken);

    // Convert LaTeX to DOCX using Pandoc
    const docxPath = result.texPath.replace('.tex', '.docx');
    const { execSync } = require('child_process');

    try {
      execSync(`pandoc "${result.texPath}" -o "${docxPath}"`, {
        timeout: 30000,
      });
    } catch (error) {
      throw new BadRequestException('Failed to convert to DOCX');
    }

    const filename = `thesis_${Date.now()}.docx`;
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    const fileStream = fs.createReadStream(docxPath);
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
