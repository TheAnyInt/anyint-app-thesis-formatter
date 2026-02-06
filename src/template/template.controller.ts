import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TemplateService } from './template.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/create-template.dto';

@Controller()
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  // ========== Public Endpoints ==========

  @Get('templates')
  @ApiTags('templates')
  @ApiOperation({ summary: 'List available templates', description: 'Get all templates or filter by school' })
  @ApiQuery({ name: 'school', required: false, description: 'Filter by school ID' })
  @ApiResponse({
    status: 200,
    description: 'List of templates',
    schema: {
      properties: {
        templates: {
          type: 'array',
          items: {
            properties: {
              id: { type: 'string', example: 'njulife-2' },
              name: { type: 'string', example: '南京大学生命科学学院硕士学位论文 v2' },
              description: { type: 'string' },
              requiredFields: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  })
  findTemplates(@Query('school') schoolId?: string) {
    if (schoolId) {
      return {
        templates: this.templateService.findBySchool(schoolId).map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          requiredFields: t.requiredFields,
          requiredSections: t.requiredSections,
          thumbnailUrl: t.thumbnailUrl,
          hasThumbnail: t.hasThumbnail,
        })),
      };
    }
    return {
      templates: this.templateService.findAll().map((t) => ({
        id: t.id,
        schoolId: t.schoolId,
        name: t.name,
        description: t.description,
        requiredFields: t.requiredFields,
        requiredSections: t.requiredSections,
        thumbnailUrl: t.thumbnailUrl,
        hasThumbnail: t.hasThumbnail,
      })),
    };
  }

  @Post('validate')
  validateDocument(
    @Body() body: { templateId: string; document: Record<string, any> },
  ) {
    return this.templateService.validate(body.templateId, body.document);
  }

  // ========== Admin Endpoints ==========

  @Get('admin/templates')
  @ApiTags('admin')
  @ApiOperation({ summary: 'List all templates (admin)', description: 'Get full template details including LaTeX source' })
  findAllAdmin() {
    return { templates: this.templateService.findAll() };
  }

  @Get('admin/templates/:id')
  findOneAdmin(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Post('admin/templates')
  create(@Body() dto: CreateTemplateDto) {
    return this.templateService.create(dto);
  }

  @Put('admin/templates/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templateService.update(id, dto);
  }

  @Delete('admin/templates/:id')
  remove(@Param('id') id: string) {
    this.templateService.remove(id);
    return { success: true };
  }
}
