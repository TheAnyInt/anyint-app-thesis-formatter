import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  ThesisData,
  Chapter,
  StringKeys,
  METADATA_KEYS,
  BODY_CONTENT_KEYS,
} from '../thesis/dto/thesis-data.dto';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const baseURL = this.configService.get<string>('OPENAI_BASE_URL');

    this.openai = new OpenAI({
      apiKey,
      baseURL: baseURL || undefined,
    });

    this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o';
    this.logger.log(`LLM Service initialized with model: ${this.model}`);
    if (baseURL) {
      this.logger.log(`Using custom baseURL: ${baseURL}`);
    }
  }

  async parseThesisContent(content: string): Promise<ThesisData> {
    this.logger.log('Parsing thesis content with LLM...');

    const prompt = this.buildPrompt(content);

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              '你是一个专业的文档解析助手，专门从学术论文中提取结构化信息。请始终返回有效的 JSON 格式，保留完整内容。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 128000,
        response_format: { type: 'json_object' },
      });

      const resultText = response.choices[0]?.message?.content;
      if (!resultText) {
        throw new Error('Empty response from LLM');
      }

      this.logger.log('LLM response received, parsing JSON...');
      const parsedData = JSON.parse(resultText) as Partial<ThesisData>;

      const thesisData = this.validateAndNormalize(parsedData);
      this.logger.log('Thesis content parsed successfully');

      return thesisData;
    } catch (error) {
      this.logger.error('Failed to parse thesis content with LLM', error);
      throw new Error(
        `LLM parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private buildPrompt(content: string): string {
    return `作为文档解析助手，请从以下论文初稿中提取信息。输出必须为 JSON 格式。

请提取以下信息：

1. **元数据字段**（如果找不到则返回空字符串）：
   - title: 论文标题
   - school: 学院/院系名称
   - major: 专业名称
   - author_name: 作者姓名
   - student_id: 学号
   - supervisor: 指导教师姓名
   - date: 论文日期
   - author_signature: 作者签名
   - signature_date: 签名日期

2. **章节内容**（按文档实际结构提取）：
   - chapters: 数组，包含论文的所有主要章节，每个章节有 title（章节标题）和 content（章节内容）
   - 请按照原文的章节结构提取，保留原始的章节标题（如"第一章 绪论"、"1. 研究背景"等）
   - 不要强制套用固定的章节名称，按原文实际结构提取

3. **特殊部分**（如果能识别则单独提取）：
   - introduction: 绪论/引言部分（通常是第一章或开头部分）
   - conclusion: 结论部分（通常是最后一章）
   - references: 参考文献列表
   - acknowledgements: 致谢部分

返回 JSON 格式示例：
{
  "title": "论文标题",
  "school": "学院名称",
  "major": "专业",
  "author_name": "作者",
  "student_id": "",
  "supervisor": "",
  "date": "",
  "author_signature": "",
  "signature_date": "",
  "chapters": [
    {"title": "第一章 绪论", "content": "完整章节内容..."},
    {"title": "第二章 文献综述", "content": "完整章节内容..."},
    {"title": "第三章 研究方法", "content": "完整章节内容..."}
  ],
  "introduction": "完整绪论内容...",
  "conclusion": "完整结论内容...",
  "references": "参考文献列表...",
  "acknowledgements": ""
}

请保持学术语言的严谨性，保留完整内容，确保返回有效的 JSON 格式。

论文内容：
${content}`;
  }

  private validateAndNormalize(data: Partial<ThesisData>): ThesisData {
    const normalized: ThesisData = {
      title: '',
      school: '',
      major: '',
      author_name: '',
      student_id: '',
      supervisor: '',
      date: '',
      author_signature: '',
      signature_date: '',
      chapters: [],
      introduction: '',
      conclusion: '',
      references: '',
      acknowledgements: '',
      technical_comparison: '',
      industry_comparison: '',
      key_variables: '',
      development_trends: '',
    };

    // Copy metadata fields
    for (const key of METADATA_KEYS) {
      const value = data[key];
      if (typeof value === 'string') {
        normalized[key] = value.trim();
      }
    }

    // Copy chapters array
    if (Array.isArray(data.chapters)) {
      normalized.chapters = data.chapters.map((ch: Chapter) => ({
        title: ch.title?.trim() || '',
        content: ch.content?.trim() || '',
      }));
    }

    // Copy fixed sections
    if (typeof data.introduction === 'string') {
      normalized.introduction = data.introduction.trim();
    }
    if (typeof data.conclusion === 'string') {
      normalized.conclusion = data.conclusion.trim();
    }
    if (typeof data.references === 'string') {
      normalized.references = data.references.trim();
    }
    if (typeof data.acknowledgements === 'string') {
      normalized.acknowledgements = data.acknowledgements.trim();
    }

    // Map remaining chapters to body content fields
    this.mapChaptersToBodyFields(normalized);

    return normalized;
  }

  private mapChaptersToBodyFields(data: ThesisData): void {
    // Filter out chapters that are already mapped to introduction/conclusion
    const bodyChapters = data.chapters.filter((ch) => {
      const lowerTitle = ch.title.toLowerCase();
      const isIntro =
        lowerTitle.includes('绪论') ||
        lowerTitle.includes('引言') ||
        lowerTitle.includes('introduction');
      const isConclusion =
        lowerTitle.includes('结论') ||
        lowerTitle.includes('总结') ||
        lowerTitle.includes('conclusion');
      const isRef =
        lowerTitle.includes('参考文献') || lowerTitle.includes('reference');
      const isAck =
        lowerTitle.includes('致谢') ||
        lowerTitle.includes('acknowledgement');
      return !isIntro && !isConclusion && !isRef && !isAck;
    });

    // Map body chapters to the 4 body content fields
    const bodyKeys = BODY_CONTENT_KEYS;
    bodyChapters.forEach((chapter, index) => {
      if (index < bodyKeys.length) {
        const key = bodyKeys[index];
        // Include chapter title as header
        data[key] = `${chapter.title}\n\n${chapter.content}`;
      }
    });

    // If more than 4 chapters, append remaining to the last field
    if (bodyChapters.length > bodyKeys.length) {
      const lastKey = bodyKeys[bodyKeys.length - 1];
      const remaining = bodyChapters
        .slice(bodyKeys.length)
        .map((ch) => `${ch.title}\n\n${ch.content}`)
        .join('\n\n');
      data[lastKey] += '\n\n' + remaining;
    }
  }
}
