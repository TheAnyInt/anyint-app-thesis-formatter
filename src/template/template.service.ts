import { Injectable, NotFoundException, ConflictException, OnModuleInit, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { LatexTemplate } from './entities/template.entity';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/create-template.dto';
import { njulifeTemplate } from './templates/njulife.template';
import { njulife2Template } from './templates/njulife-2.template';
import { thuTemplate } from './templates/thu.template';

@Injectable()
export class TemplateService implements OnModuleInit {
  private readonly logger = new Logger(TemplateService.name);
  private templates: Map<string, LatexTemplate> = new Map();

  onModuleInit() {
    this.loadBuiltInTemplates();
  }

  private loadBuiltInTemplates() {
    // Load NJU Life Sciences template
    const njulife: LatexTemplate = {
      ...njulifeTemplate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.templates.set(njulife.id, njulife);
    this.logger.log(`Loaded built-in template: ${njulife.name} (${njulife.id})`);

    // Load NJU Life Sciences template v2
    const njulife2: LatexTemplate = {
      ...njulife2Template,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.templates.set(njulife2.id, njulife2);
    this.logger.log(`Loaded built-in template: ${njulife2.name} (${njulife2.id})`);

    // Load Tsinghua University template
    const thu: LatexTemplate = {
      ...thuTemplate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.templates.set(thu.id, thu);
    this.logger.log(`Loaded built-in template: ${thu.name} (${thu.id})`);
  }

  create(dto: CreateTemplateDto): LatexTemplate {
    // Auto-generate ID if not provided
    const id = dto.id || uuidv4();

    if (this.templates.has(id)) {
      throw new ConflictException(`Template with id '${id}' already exists`);
    }

    const template: LatexTemplate = {
      ...dto,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.templates.set(template.id, template);
    return template;
  }

  findAll(): LatexTemplate[] {
    return Array.from(this.templates.values());
  }

  findBySchool(schoolId: string): LatexTemplate[] {
    return Array.from(this.templates.values()).filter(
      (t) => t.schoolId === schoolId,
    );
  }

  findOneBySchool(schoolId: string): LatexTemplate {
    const templates = this.findBySchool(schoolId);
    if (templates.length === 0) {
      throw new NotFoundException(`No template found for school '${schoolId}'`);
    }
    // Return the most recently updated template for this school
    return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  }

  findOne(id: string): LatexTemplate {
    const template = this.templates.get(id);
    if (!template) {
      throw new NotFoundException(`Template '${id}' not found`);
    }
    return template;
  }

  update(id: string, dto: UpdateTemplateDto): LatexTemplate {
    const template = this.findOne(id);

    if (dto.name !== undefined) template.name = dto.name;
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.texContent !== undefined) template.texContent = dto.texContent;
    if (dto.requiredFields !== undefined) template.requiredFields = dto.requiredFields;
    if (dto.requiredSections !== undefined) template.requiredSections = dto.requiredSections;

    template.updatedAt = new Date();
    return template;
  }

  remove(id: string): void {
    if (!this.templates.has(id)) {
      throw new NotFoundException(`Template '${id}' not found`);
    }
    this.templates.delete(id);
  }

  // Validate document against template requirements
  validate(
    templateId: string,
    document: Record<string, any>,
  ): { valid: boolean; missingFields: string[]; missingSections: string[]; warnings: string[] } {
    const template = this.findOne(templateId);
    const missingFields: string[] = [];
    const missingSections: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    for (const field of template.requiredFields) {
      const value = document[field];
      if (value === undefined || value === null || value === '') {
        missingFields.push(field);
      }
    }

    // Check required sections
    for (const section of template.requiredSections) {
      const value = document[section];
      if (value === undefined || value === null) {
        missingSections.push(section);
      } else if (section === 'chapters' && Array.isArray(value)) {
        // Check chapters have content
        value.forEach((chapter: any, idx: number) => {
          if (!chapter.content || chapter.content.trim() === '') {
            warnings.push(`Chapter ${idx + 1} (${chapter.title || 'untitled'}) has no content`);
          }
        });
      }
    }

    return {
      valid: missingFields.length === 0 && missingSections.length === 0,
      missingFields,
      missingSections,
      warnings,
    };
  }
}
