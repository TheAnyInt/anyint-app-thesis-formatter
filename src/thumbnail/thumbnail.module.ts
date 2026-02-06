import { Module } from '@nestjs/common';
import { ThumbnailService } from './thumbnail.service';
import { ThumbnailController } from './thumbnail.controller';
import { TemplateModule } from '../template/template.module';
import { LatexModule } from '../latex/latex.module';

@Module({
  imports: [TemplateModule, LatexModule],
  controllers: [ThumbnailController],
  providers: [ThumbnailService],
  exports: [ThumbnailService],
})
export class ThumbnailModule {}
