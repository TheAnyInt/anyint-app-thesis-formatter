import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
    credentials: false,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Thesis Formatter Microservice running on port ${port}`);
  logger.log(`Upload endpoint: POST http://localhost:${port}/thesis/upload`);
}

bootstrap();
