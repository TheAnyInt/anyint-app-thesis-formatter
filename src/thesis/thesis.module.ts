import { Module } from '@nestjs/common';
import { ThesisController } from './thesis.controller';
import { ThesisService } from './thesis.service';
import { DocumentModule } from '../document/document.module';
import { LlmModule } from '../llm/llm.module';
import { ReferenceModule } from '../reference/reference.module';
import { JobModule } from '../job/job.module';
import { TemplateModule } from '../template/template.module';
import { LatexModule } from '../latex/latex.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    DocumentModule,
    LlmModule,
    ReferenceModule,
    JobModule,
    TemplateModule,
    LatexModule,
    AuthModule,
  ],
  controllers: [ThesisController],
  providers: [ThesisService],
})
export class ThesisModule {}
