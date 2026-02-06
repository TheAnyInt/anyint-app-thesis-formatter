import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThesisModule } from './thesis/thesis.module';
import { TemplateModule } from './template/template.module';
import { ThumbnailModule } from './thumbnail/thumbnail.module';
import { databaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(databaseConfig()),
    ThesisModule,
    TemplateModule,
    ThumbnailModule,
  ],
})
export class AppModule {}
