import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ThumbnailService } from '../src/thumbnail/thumbnail.service';
import { TemplateService } from '../src/template/template.service';
import * as fs from 'fs';
import * as path from 'path';

async function generateThumbnails() {
  const logger = new Logger('ThumbnailGenerator');

  try {
    logger.log('Initializing NestJS application...');
    const app = await NestFactory.createApplicationContext(AppModule);

    const thumbnailService = app.get(ThumbnailService);
    const templateService = app.get(TemplateService);

    const templates = templateService.findAll();
    logger.log(`Found ${templates.length} templates to process`);

    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    // Generate thumbnails in parallel for better performance
    const promises = templates.map(async (template) => {
      try {
        logger.log(`Processing template: ${template.name} (${template.id})`);

        // Load sample document
        const samplePath = path.join(
          __dirname,
          'sample-documents',
          `${template.id}-sample.json`,
        );

        if (!fs.existsSync(samplePath)) {
          throw new Error(`Sample document not found: ${samplePath}`);
        }

        const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));
        logger.log(`Loaded sample document for ${template.id}`);

        // Generate thumbnail
        const thumbnailPath = await thumbnailService.generateFromTemplate(
          template.id,
          sampleData,
        );

        logger.log(`✅ Generated thumbnail for ${template.id}: ${thumbnailPath}`);
        return { id: template.id, success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`❌ Failed to generate thumbnail for ${template.id}: ${errorMessage}`);
        return { id: template.id, success: false, error: errorMessage };
      }
    });

    // Wait for all thumbnails to be generated
    const settled = await Promise.allSettled(promises);
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        const template = templates[index];
        results.push({
          id: template.id,
          success: false,
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    // Print summary
    logger.log('\n' + '='.repeat(60));
    logger.log('Thumbnail Generation Summary');
    logger.log('='.repeat(60));

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    logger.log(`Total templates: ${results.length}`);
    logger.log(`Successful: ${successful.length}`);
    logger.log(`Failed: ${failed.length}`);

    if (successful.length > 0) {
      logger.log('\n✅ Successfully generated:');
      successful.forEach((r) => logger.log(`  - ${r.id}`));
    }

    if (failed.length > 0) {
      logger.log('\n❌ Failed:');
      failed.forEach((r) => logger.log(`  - ${r.id}: ${r.error}`));
    }

    logger.log('\nThumbnails saved to: public/thumbnails/templates/');
    logger.log('='.repeat(60) + '\n');

    await app.close();

    // Exit with error code if any failed
    process.exit(failed.length > 0 ? 1 : 0);
  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  }
}

generateThumbnails();
