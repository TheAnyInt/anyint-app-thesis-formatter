import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ThesisData, Section, ThesisMetadata } from '../thesis/dto/thesis-data.dto';
import { GatewayProxyService } from '../gateway/gateway-proxy.service';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly openai: OpenAI | null = null;
  private readonly model: string;
  private readonly useGateway: boolean;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly gatewayProxy?: GatewayProxyService,
  ) {
    this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o';

    // Check if Gateway is configured
    if (this.gatewayProxy?.isConfigured()) {
      this.useGateway = true;
      this.logger.log(`LLM Service initialized with Gateway proxy, model: ${this.model}`);
    } else {
      // Fallback to direct OpenAI
      this.useGateway = false;
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (!apiKey) {
        throw new Error('Neither GATEWAY_URL nor OPENAI_API_KEY is configured');
      }

      const baseURL = this.configService.get<string>('OPENAI_BASE_URL');
      this.openai = new OpenAI({
        apiKey,
        baseURL: baseURL || undefined,
      });

      this.logger.log(`LLM Service initialized with OpenAI SDK, model: ${this.model}`);
      if (baseURL) {
        this.logger.log(`Using custom baseURL: ${baseURL}`);
      }
    }
  }

  /**
   * 解析论文内容
   * @param content 论文文本内容
   * @param userToken 用户 JWT token（Gateway 模式需要）
   */
  async parseThesisContent(content: string, userToken?: string): Promise<ThesisData> {
    this.logger.log('Parsing thesis content with LLM...');

    const prompt = this.buildPrompt(content);

    try {
      let resultText: string;

      if (this.useGateway && this.gatewayProxy) {
        if (!userToken) {
          throw new Error('User token is required when using Gateway proxy');
        }
        // Use Gateway proxy
        const response = await this.gatewayProxy.chatCompletions(userToken, {
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                '你是一个专业的文档解析助手，专门从学术论文中提取结构化信息。请始终返回有效的 JSON 格式，保留完整内容，按原文实际结构提取，不要预设章节名称。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 16000,
          response_format: { type: 'json_object' },
        });

        resultText = response.choices?.[0]?.message?.content;
      } else {
        // Use OpenAI SDK directly
        const response = await this.openai!.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                '你是一个专业的文档解析助手，专门从学术论文中提取结构化信息。请始终返回有效的 JSON 格式，保留完整内容，按原文实际结构提取，不要预设章节名称。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 16000,
          response_format: { type: 'json_object' },
        });

        resultText = response.choices[0]?.message?.content || '';
      }

      if (!resultText) {
        throw new Error('Empty response from LLM');
      }

      this.logger.log('LLM response received, parsing JSON...');
      const parsedData = JSON.parse(resultText);

      const thesisData = this.validateAndNormalize(parsedData);
      this.logger.log(
        `Thesis parsed: ${thesisData.sections.length} sections extracted`,
      );

      return thesisData;
    } catch (error) {
      this.logger.error('Failed to parse thesis content with LLM', error);
      throw new Error(
        `LLM parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private buildPrompt(content: string): string {
    // Truncate content if too long to avoid context issues
    const maxContentLength = 50000;
    let truncatedContent = content;
    if (content.length > maxContentLength) {
      truncatedContent =
        content.substring(0, maxContentLength) + '\n\n[内容已截断...]';
      this.logger.warn(
        `Content truncated from ${content.length} to ${maxContentLength} characters`,
      );
    }

    // Check if content contains figure markers (supports both docximg and pdfimg)
    const hasFigureMarkers = /\[FIGURE:(docximg|pdfimg)\d+\]/.test(content);

    // Extract actual figure IDs from content
    const figureIds = hasFigureMarkers
      ? [...content.matchAll(/\[FIGURE:((docximg|pdfimg)\d+)\]/g)].map((m) => m[1])
      : [];
    const figureIdList = [...new Set(figureIds)].join(', ');

    const figureInstructions = hasFigureMarkers
      ? `
**图片处理说明：**
文本中包含以下图片标记: ${figureIdList}
每个 [FIGURE:pdfimgX] 标记表示该位置有一张图片。
**重要：只处理上述列出的图片ID，不要创建其他图片引用！**

请在对应章节的 content 中将这些标记转换为 LaTeX 格式：

\\\\begin{figure}[H]
    \\\\centering
    \\\\includegraphics[width=0.8\\\\textwidth]{pdfimgX.png}
    \\\\caption{根据上下文推断的图片描述}
    \\\\label{fig:pdfimgX}
\\\\end{figure}

注意：
- 只能使用以下图片ID: ${figureIdList}
- 不要创建任何不在上述列表中的图片引用
- 根据图片前后的文本内容，为每张图片生成合适的中文标题作为 caption
- 保持图片在原文中的相对位置
`
      : '';

    return `请从以下论文内容中提取结构化信息。**按原文实际结构提取，不要预设或强制套用固定的章节名称。**

输出 JSON 格式：

{
  "metadata": {
    "title": "论文标题",
    "title_en": "英文标题（如有）",
    "author_name": "作者姓名",
    "student_id": "学号（如有）",
    "school": "学院/院系",
    "major": "专业",
    "supervisor": "指导教师",
    "date": "日期"
  },
  "abstract": "中文摘要内容",
  "abstract_en": "英文摘要内容（如有）",
  "keywords": "关键词1、关键词2、关键词3",
  "keywords_en": "keyword1, keyword2, keyword3",
  "sections": [
    {"title": "绪论", "content": "章节内容...", "level": 1},
    {"title": "研究背景", "content": "子节内容...", "level": 2},
    {"title": "相关工作", "content": "章节内容...", "level": 1}
  ],
  "references": "参考文献列表（如有）",
  "acknowledgements": "致谢内容（如有）"
}

**重要说明：**
1. sections 数组包含论文的所有正文章节，按原文顺序排列
2. level: 1 表示一级标题（章），2 表示二级标题（节），3 表示三级标题
3. **章节标题只保留纯文字内容，去掉编号前缀**：
   - "第一章 绪论" → title: "绪论"
   - "1.1 研究背景" → title: "研究背景"
   - "Chapter 1 Introduction" → title: "Introduction"
   - 编号会由 LaTeX 模板自动生成
4. 不要将内容强制映射到预定义的字段名
5. 如果某个字段在原文中不存在，返回空字符串 ""
6. 保持学术语言的严谨性
${figureInstructions}
论文内容：
${truncatedContent}`;
  }

  private validateAndNormalize(data: any): ThesisData {
    // Initialize with defaults
    const metadata: ThesisMetadata = {
      title: data.metadata?.title?.trim() || '',
      title_en: data.metadata?.title_en?.trim() || undefined,
      author_name: data.metadata?.author_name?.trim() || '',
      student_id: data.metadata?.student_id?.trim() || undefined,
      school: data.metadata?.school?.trim() || undefined,
      major: data.metadata?.major?.trim() || undefined,
      supervisor: data.metadata?.supervisor?.trim() || undefined,
      date: data.metadata?.date?.trim() || undefined,
    };

    // Parse sections array
    const sections: Section[] = [];
    if (Array.isArray(data.sections)) {
      for (const sec of data.sections) {
        if (sec.title || sec.content) {
          sections.push({
            title: sec.title?.trim() || '',
            content: sec.content?.trim() || '',
            level: [1, 2, 3].includes(sec.level) ? sec.level : 1,
          });
        }
      }
    }

    const normalized: ThesisData = {
      metadata,
      sections,
      abstract: data.abstract?.trim() || undefined,
      abstract_en: data.abstract_en?.trim() || undefined,
      keywords: data.keywords?.trim() || undefined,
      keywords_en: data.keywords_en?.trim() || undefined,
      references: data.references?.trim() || undefined,
      acknowledgements: data.acknowledgements?.trim() || undefined,
    };

    return normalized;
  }
}
