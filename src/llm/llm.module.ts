import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmService } from './llm.service';
import { ModelConfigService } from './model-config.service';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [ConfigModule, GatewayModule],
  providers: [LlmService, ModelConfigService],
  exports: [LlmService, ModelConfigService],
})
export class LlmModule {}
