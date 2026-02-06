import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { ThumbnailService } from './thumbnail.service';

@Controller()
export class ThumbnailController {
  constructor(private readonly thumbnailService: ThumbnailService) {}

  @Get('templates/:id/thumbnail')
  @ApiTags('templates')
  @ApiOperation({ summary: 'Get template thumbnail preview' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Thumbnail image (PNG)',
    content: { 'image/png': {} },
  })
  @ApiResponse({ status: 404, description: 'Thumbnail not found' })
  async getTemplateThumbnail(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const thumbnailBuffer = await this.thumbnailService.getThumbnailBuffer(id);

      res.set({
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      });

      res.status(HttpStatus.OK).send(thumbnailBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        res.status(HttpStatus.NOT_FOUND).json({
          statusCode: 404,
          message: `Thumbnail not found for template: ${id}`,
        });
      } else {
        throw error;
      }
    }
  }

  @Get('templates/thumbnails')
  @ApiTags('templates')
  @ApiOperation({ summary: 'Get all template thumbnail URLs' })
  @ApiResponse({
    status: 200,
    description: 'Map of template IDs to thumbnail URLs',
    schema: {
      properties: {
        thumbnails: {
          type: 'object',
          additionalProperties: { type: 'string' },
          example: {
            thu: '/templates/thu/thumbnail',
            njulife: '/templates/njulife/thumbnail',
          },
        },
      },
    },
  })
  getAllThumbnails() {
    const thumbnailUrls = this.thumbnailService.getAllThumbnailUrls();
    return {
      thumbnails: Object.fromEntries(thumbnailUrls),
    };
  }

  @Post('admin/templates/:id/thumbnail/regenerate')
  @ApiTags('admin')
  @ApiOperation({ summary: 'Regenerate template thumbnail (admin)' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Thumbnail regenerated successfully',
    schema: {
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        thumbnailUrl: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async regenerateThumbnail(@Param('id') id: string) {
    // Note: This endpoint requires a sample document to be provided
    // For now, it just returns info about whether thumbnail exists
    const exists = this.thumbnailService.thumbnailExists(id);

    return {
      success: true,
      message: exists
        ? `Thumbnail already exists for template ${id}`
        : `Thumbnail does not exist for template ${id}. Use CLI script to generate.`,
      thumbnailUrl: exists ? `/templates/${id}/thumbnail` : null,
    };
  }
}
