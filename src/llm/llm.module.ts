import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmService } from './llm.service';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [ConfigModule, GatewayModule],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
