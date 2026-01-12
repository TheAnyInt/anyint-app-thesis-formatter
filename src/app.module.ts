import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThesisModule } from './thesis/thesis.module';
import { TemplateModule } from './template/template.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThesisModule,
    TemplateModule,
  ],
})
export class AppModule {}
