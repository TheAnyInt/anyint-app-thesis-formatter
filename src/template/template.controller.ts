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
import { TemplateService } from './template.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/create-template.dto';

@Controller()
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  // ========== Public Endpoints ==========

  @Get('templates')
  findTemplates(@Query('school') schoolId?: string) {
    if (schoolId) {
      return {
        templates: this.templateService.findBySchool(schoolId).map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          requiredFields: t.requiredFields,
          requiredSections: t.requiredSections,
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
