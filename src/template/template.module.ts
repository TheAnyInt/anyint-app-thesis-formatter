import { Module } from '@nestjs/common';
import { TemplateService } from './template.service';
import { TemplateController } from './template.controller';
import { TemplateFieldMapper } from './template-field-mapper.service';

@Module({
  controllers: [TemplateController],
  providers: [TemplateService, TemplateFieldMapper],
  exports: [TemplateService, TemplateFieldMapper],
})
export class TemplateModule {}
