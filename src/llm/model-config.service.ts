import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ModelConfigService {
  private readonly allowedModels: string[];
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    this.defaultModel = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o';

    const allowedModelsConfig = this.configService.get<string>('ALLOWED_MODELS');
    if (allowedModelsConfig) {
      this.allowedModels = allowedModelsConfig.split(',').map(m => m.trim()).filter(m => m);
    } else {
      // Default to just the configured model if ALLOWED_MODELS is not set
      this.allowedModels = [this.defaultModel];
    }
  }

  /**
   * Validates and resolves the model to use
   * @param requestedModel Optional model from the request
   * @returns The model to use (either requested or default)
   * @throws BadRequestException if requested model is not allowed
   */
  resolveModel(requestedModel?: string): string {
    if (!requestedModel) {
      return this.defaultModel;
    }

    if (!this.allowedModels.includes(requestedModel)) {
      throw new BadRequestException(
        `Model '${requestedModel}' is not allowed. Available models: ${this.allowedModels.join(', ')}`
      );
    }

    return requestedModel;
  }

  /**
   * Get all allowed models
   */
  getAllowedModels(): string[] {
    return [...this.allowedModels];
  }

  /**
   * Get the default model
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }
}
