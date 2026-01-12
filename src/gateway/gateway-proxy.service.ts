import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GatewayProxyService {
  private readonly logger = new Logger(GatewayProxyService.name);
  private readonly gatewayUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const configUrl = this.configService.get<string>('GATEWAY_URL') || '';
    // Remove trailing slash if present
    this.gatewayUrl = configUrl.replace(/\/+$/, '');

    if (this.gatewayUrl) {
      this.logger.log(`Gateway proxy configured: ${this.gatewayUrl}`);
    }
  }

  /**
   * 检查 Gateway 是否已配置
   */
  isConfigured(): boolean {
    return !!this.gatewayUrl;
  }

  /**
   * 代理 Chat Completions 请求到 Gateway
   * @param userToken 用户的 JWT token（从请求头获取）
   * @param body 请求体
   */
  async chatCompletions(
    userToken: string,
    body: {
      model: string;
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
      max_tokens?: number;
      response_format?: { type: string };
    },
  ): Promise<any> {
    if (!userToken) {
      throw new Error('User token is required for Gateway proxy');
    }

    const url = `${this.gatewayUrl}/openai/v1/chat/completions`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    };

    this.logger.log(`Proxying chat completion to Gateway: ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, body, {
          headers,
          timeout: 120000, // 2 minutes timeout for LLM requests
        }),
      );
      return response.data;
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        this.logger.error(
          `Gateway request failed: ${status} - ${JSON.stringify(data)}`,
        );
        throw new Error(
          `Gateway request failed: ${data?.error?.message || data?.message || 'Unknown error'}`,
        );
      }
      this.logger.error(`Gateway request error: ${error.message}`);
      throw error;
    }
  }
}
