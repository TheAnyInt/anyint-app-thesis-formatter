import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configure static file serving for thumbnails
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/public/',
  });

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
    credentials: false,
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Thesis Formatter API')
    .setDescription(`
## Overview
Thesis Formatter Microservice - Convert documents to formatted thesis PDFs using LaTeX templates with AI-powered content extraction.

## 🆕 3-Step Workflow (Recommended)
1. **Analyze** → AI extracts content and analyzes completeness (~5s)
2. **Generate** → Selectively generate missing fields with AI (user choice)
3. **Render** → Create formatted PDF from the data (~1s)

## Legacy 2-Step Workflow
1. **Extract** → AI extracts all content (automatic generation)
2. **Render** → Create formatted PDF

## 📋 Supported Templates (6)

### 1. hunnu - 湖南师范大学本科毕业论文
**Required Fields**: title, titleEn, author, major, advisor, college, studentId
**Field Mappings**: \`advisor\` → \`supervisor\`, \`college\` → \`school\`

### 2. thu - 清华大学本科学位论文
**Required Fields**: title, author, major, supervisor
**Field Mappings**: Standard fields only

### 3. njulife - 南京大学生命科学学院硕士学位论文 (v1)
**Required Fields**: title, titleEn, author, authorEn, major, majorEn, supervisor, supervisorEn
**Field Mappings**:
- \`authorEn\` → \`author_name_en\`
- \`majorEn\` → \`major_en\`
- \`supervisorEn\` → \`supervisor_en\`
**Features**: Full bilingual metadata support (8 fields)

### 4. njulife-2 - 南京大学生命科学学院硕士学位论文 (v2)
**Required Fields**: title, titleEn, author, major, supervisor
**Features**: Cover PDF modification support

### 5. njuthesis - 南京大学学位论文 (v1.4.3)
**Required Fields**: title, titleEn, author, major, supervisor
**Field Mappings**: Standard fields only

### 6. scut - 华南理工大学学位论文
**Required Fields**: title, titleEn, author, major, supervisor, department
**Field Mappings**: \`department\` → \`school\`

## ✨ Template-Aware Field Mapping
The API automatically maps template-specific field names to standardized data structure:
- **HUNNU**: Uses \`advisor\` instead of \`supervisor\`
- **NJULife**: Supports comprehensive English metadata (\`authorEn\`, \`majorEn\`, \`supervisorEn\`)
- **SCUT**: Uses \`department\` instead of \`school\`

All templates produce consistent \`ThesisData\` structure internally while respecting each template's unique terminology.

## 🎯 Key Features
- ✅ **AI-powered extraction** (95% accuracy vs 70% with regex)
- ✅ **Template-aware analysis** (different templates → different requirements)
- ✅ **Smart field mapping** (advisor→supervisor, authorEn→author_name_en, etc.)
- ✅ **Long document support** (auto-chunking for >45k characters)
- ✅ **Selective AI generation** (80% token savings for partial documents)
- ✅ **Multi-format support** (DOCX, PDF, TXT, MD)

## 📖 Documentation
- Full API docs: See API_DOCUMENTATION.md
- Field mapping: See FIELD_MAPPING_IMPLEMENTATION.md
- Testing guide: See TESTING_GUIDE.md
    `)
    .setVersion('1.1.0')
    .addBearerAuth()
    .addTag('thesis', 'Thesis processing and conversion')
    .addTag('templates', 'Template management')
    .addTag('admin', 'Admin operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Thesis Formatter Microservice running on port ${port}`);
  logger.log(`Swagger UI: http://localhost:${port}/api`);
  logger.log(`Upload endpoint: POST http://localhost:${port}/thesis/upload`);
}

bootstrap();
