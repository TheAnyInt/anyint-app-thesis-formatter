import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ThesisData, Section, ThesisMetadata } from '../thesis/dto/thesis-data.dto';
import { GatewayProxyService } from '../gateway/gateway-proxy.service';
import { ModelConfigService } from './model-config.service';
import {
  DocumentStructure,
  buildStructureExtractionPrompt,
  parseStructureResponse,
  extractStructureWithRegex,
} from './structure-extractor';
import { ContentChunk, splitContentByStructure } from './content-splitter';
import {
  ChunkProcessingResult,
  buildChunkPrompt,
  parseChunkResponse,
  postProcessSectionContent,
  delay,
  RETRY_CONFIG,
  calculateRetryDelay,
} from './section-processor';
import { ThesisDataWithWarnings, mergeThesisResults } from './thesis-merger';
import {
  buildMetadataPrompt,
  buildAbstractPrompt,
  buildKeywordsPrompt,
  buildSectionEnhancementPrompt,
  buildMissingSectionsPrompt,
  buildReferencesPrompt,
  buildAcknowledgementsPrompt,
} from './prompts';

// Threshold for switching to multi-phase processing
const LONG_CONTENT_THRESHOLD = 45000;

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly openai: OpenAI | null = null;
  private readonly useGateway: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly modelConfigService: ModelConfigService,
    @Optional() private readonly gatewayProxy?: GatewayProxyService,
  ) {
    const defaultModel = this.modelConfigService.getDefaultModel();

    // Check if Gateway is configured
    if (this.gatewayProxy?.isConfigured()) {
      this.useGateway = true;
      this.logger.log(`LLM Service initialized with Gateway proxy, default model: ${defaultModel}`);
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

      this.logger.log(`LLM Service initialized with OpenAI SDK, default model: ${defaultModel}`);
      if (baseURL) {
        this.logger.log(`Using custom baseURL: ${baseURL}`);
      }
    }
  }

  /**
   * 解析论文内容
   * @param content 论文文本内容
   * @param userToken 用户 JWT token（Gateway 模式需要）
   * @param model 指定的 LLM 模型（可选，默认使用配置的模型）
   * @param templateRequiredFields 模板必需字段列表（用于模板感知提取）
   */
  async parseThesisContent(
    content: string,
    userToken?: string,
    model?: string,
    templateRequiredFields?: string[],
  ): Promise<ThesisData> {
    const resolvedModel = model || this.modelConfigService.getDefaultModel();
    this.logger.log(`Parsing thesis content with LLM (model: ${resolvedModel})... (${content.length} characters)`);

    if (templateRequiredFields && templateRequiredFields.length > 0) {
      this.logger.log(`Template-aware extraction for fields: ${templateRequiredFields.join(', ')}`);
    }

    // Route to appropriate processing method based on content length
    if (content.length < LONG_CONTENT_THRESHOLD) {
      return this.parseThesisContentSingleCall(content, userToken, resolvedModel, templateRequiredFields);
    } else {
      this.logger.log(`Content exceeds ${LONG_CONTENT_THRESHOLD} chars, using two-phase processing`);
      return this.parseThesisContentMultiPhase(content, userToken, resolvedModel, templateRequiredFields);
    }
  }

  /**
   * Single-call processing for short documents (original implementation)
   */
  private async parseThesisContentSingleCall(
    content: string,
    userToken?: string,
    model?: string,
    templateRequiredFields?: string[],
  ): Promise<ThesisData> {
    const prompt = this.buildPrompt(content, templateRequiredFields);

    try {
      const resultText = await this.makeLlmCall(prompt, userToken, 16000, model);

      if (!resultText) {
        throw new Error('Empty response from LLM');
      }

      this.logger.log('LLM response received, parsing JSON...');
      const parsedData = JSON.parse(resultText);

      const thesisData = this.validateAndNormalize(parsedData, templateRequiredFields);
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

  /**
   * Two-phase processing for long documents
   * Phase 1: Extract document structure
   * Phase 2: Process sections in parallel
   */
  private async parseThesisContentMultiPhase(
    content: string,
    userToken?: string,
    model?: string,
    templateRequiredFields?: string[],
  ): Promise<ThesisDataWithWarnings> {
    try {
      // Phase 1: Extract document structure
      this.logger.log('Phase 1: Extracting document structure...');
      let structure: DocumentStructure;

      try {
        const structurePrompt = buildStructureExtractionPrompt(content);
        const structureResponse = await this.makeLlmCall(structurePrompt, userToken, 4000, model);
        structure = parseStructureResponse(structureResponse);
        this.logger.log(`Structure extraction successful: ${structure.sections.length} sections identified`);
      } catch (error) {
        this.logger.warn('LLM structure extraction failed, falling back to regex', error);
        structure = extractStructureWithRegex(content);
      }

      // Split content into chunks based on structure
      const chunks = splitContentByStructure(content, structure);
      this.logger.log(`Content split into ${chunks.length} chunks for processing`);

      // Phase 2: Process chunks in parallel
      this.logger.log('Phase 2: Processing chunks in parallel...');
      const results = await this.processChunksInParallel(chunks, content, userToken, model, templateRequiredFields);

      // Merge results
      this.logger.log('Merging chunk results...');
      const mergedResult = mergeThesisResults(results);

      this.logger.log(
        `Multi-phase parsing complete: ${mergedResult.sections.length} sections extracted`,
      );

      if (mergedResult.warnings && mergedResult.warnings.length > 0) {
        this.logger.warn(`Processing completed with ${mergedResult.warnings.length} warnings`);
      }

      return mergedResult;
    } catch (error) {
      this.logger.error('Failed to parse thesis content with multi-phase processing', error);
      throw new Error(
        `Multi-phase LLM parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate only user-specified fields using targeted LLM calls
   * This enables selective AI generation instead of all-or-nothing
   */
  async generateSelectiveFields(
    originalContent: string,
    extractedData: ThesisData,
    generateFields: {
      metadata?: string[];
      abstract?: boolean;
      abstract_en?: boolean;
      keywords?: boolean;
      keywords_en?: boolean;
      sections?: {
        enhance: boolean;
        addMissing: string[];
      };
      references?: boolean;
      acknowledgements?: boolean;
    },
    userToken?: string,
    model?: string,
  ): Promise<Partial<ThesisData>> {
    const resolvedModel = model || this.modelConfigService.getDefaultModel();
    this.logger.log(`Generating selective fields with model: ${resolvedModel}`);

    const generated: Partial<ThesisData> = {};

    // Generate metadata fields if requested
    if (generateFields.metadata && generateFields.metadata.length > 0) {
      this.logger.log(`Generating metadata fields: ${generateFields.metadata.join(', ')}`);
      try {
        const prompt = buildMetadataPrompt(
          originalContent,
          generateFields.metadata,
          extractedData.metadata,
        );
        const response = await this.makeLlmCall(prompt, userToken, 2000, resolvedModel);
        const metadataResult = JSON.parse(response);

        // Merge with existing metadata
        generated.metadata = {
          ...extractedData.metadata,
          ...metadataResult,
        };
      } catch (error) {
        this.logger.error('Failed to generate metadata', error);
      }
    }

    // Generate abstract if requested
    if (generateFields.abstract) {
      this.logger.log('Generating Chinese abstract');
      try {
        const prompt = buildAbstractPrompt(
          originalContent,
          extractedData.abstract,
          'zh',
        );
        const response = await this.makeLlmCall(prompt, userToken, 4000, resolvedModel);
        const result = JSON.parse(response);
        generated.abstract = result.abstract;
      } catch (error) {
        this.logger.error('Failed to generate abstract', error);
      }
    }

    // Generate English abstract if requested
    if (generateFields.abstract_en) {
      this.logger.log('Generating English abstract');
      try {
        const prompt = buildAbstractPrompt(
          originalContent,
          extractedData.abstract_en,
          'en',
        );
        const response = await this.makeLlmCall(prompt, userToken, 4000, resolvedModel);
        const result = JSON.parse(response);
        generated.abstract_en = result.abstract;
      } catch (error) {
        this.logger.error('Failed to generate English abstract', error);
      }
    }

    // Generate Chinese keywords if requested
    if (generateFields.keywords) {
      this.logger.log('Generating Chinese keywords');
      try {
        const prompt = buildKeywordsPrompt(
          originalContent,
          extractedData.keywords,
          'zh',
        );
        const response = await this.makeLlmCall(prompt, userToken, 1000, resolvedModel);
        const result = JSON.parse(response);
        generated.keywords = result.keywords;
      } catch (error) {
        this.logger.error('Failed to generate keywords', error);
      }
    }

    // Generate English keywords if requested
    if (generateFields.keywords_en) {
      this.logger.log('Generating English keywords');
      try {
        const prompt = buildKeywordsPrompt(
          originalContent,
          extractedData.keywords_en,
          'en',
        );
        const response = await this.makeLlmCall(prompt, userToken, 1000, resolvedModel);
        const result = JSON.parse(response);
        generated.keywords_en = result.keywords;
      } catch (error) {
        this.logger.error('Failed to generate English keywords', error);
      }
    }

    // Enhance or generate sections if requested
    if (generateFields.sections) {
      const newSections: Section[] = [...extractedData.sections];

      // Enhance existing sections
      if (generateFields.sections.enhance && extractedData.sections.length > 0) {
        this.logger.log(`Enhancing ${extractedData.sections.length} existing sections`);
        try {
          const prompt = buildSectionEnhancementPrompt(
            extractedData.sections,
            originalContent,
          );
          const response = await this.makeLlmCall(prompt, userToken, 16000, resolvedModel);
          const result = JSON.parse(response);
          if (result.sections && Array.isArray(result.sections)) {
            // Replace with enhanced sections
            newSections.splice(0, newSections.length, ...result.sections);
          }
        } catch (error) {
          this.logger.error('Failed to enhance sections', error);
        }
      }

      // Generate missing sections
      if (generateFields.sections.addMissing && generateFields.sections.addMissing.length > 0) {
        this.logger.log(`Generating ${generateFields.sections.addMissing.length} missing sections`);
        try {
          const prompt = buildMissingSectionsPrompt(
            generateFields.sections.addMissing,
            extractedData.sections,
            originalContent,
          );
          const response = await this.makeLlmCall(prompt, userToken, 16000, resolvedModel);
          const result = JSON.parse(response);
          if (result.sections && Array.isArray(result.sections)) {
            // Append missing sections
            newSections.push(...result.sections);
          }
        } catch (error) {
          this.logger.error('Failed to generate missing sections', error);
        }
      }

      generated.sections = newSections;
    }

    // Generate references if requested
    if (generateFields.references) {
      this.logger.log('Generating references');
      try {
        const prompt = buildReferencesPrompt(
          originalContent,
          extractedData.references,
        );
        const response = await this.makeLlmCall(prompt, userToken, 4000, resolvedModel);
        const result = JSON.parse(response);
        generated.references = result.references;
      } catch (error) {
        this.logger.error('Failed to generate references', error);
      }
    }

    // Generate acknowledgements if requested
    if (generateFields.acknowledgements) {
      this.logger.log('Generating acknowledgements');
      try {
        const prompt = buildAcknowledgementsPrompt(
          originalContent,
          extractedData.metadata,
        );
        const response = await this.makeLlmCall(prompt, userToken, 2000, resolvedModel);
        const result = JSON.parse(response);
        generated.acknowledgements = result.acknowledgements;
      } catch (error) {
        this.logger.error('Failed to generate acknowledgements', error);
      }
    }

    this.logger.log('Selective field generation complete');
    return generated;
  }

  /**
   * Process chunks in parallel with retry logic
   */
  private async processChunksInParallel(
    chunks: ContentChunk[],
    originalContent: string,
    userToken?: string,
    model?: string,
    templateRequiredFields?: string[],
  ): Promise<ChunkProcessingResult[]> {
    // Check for figure markers in original content
    const hasFigureMarkers = /\[FIGURE:(docximg|pdfimg)\d+\]/.test(originalContent);
    const figureIds = hasFigureMarkers
      ? [...originalContent.matchAll(/\[FIGURE:((docximg|pdfimg)\d+)\]/g)].map((m) => m[1])
      : [];
    const figureIdList = [...new Set(figureIds)].join(', ');

    // Process all chunks in parallel
    const promises = chunks.map((chunk) =>
      this.processChunkWithRetry(chunk, hasFigureMarkers, figureIdList, userToken, model, templateRequiredFields),
    );

    return Promise.all(promises);
  }

  /**
   * Process a single chunk with retry logic
   */
  private async processChunkWithRetry(
    chunk: ContentChunk,
    hasFigureMarkers: boolean,
    figureIdList: string,
    userToken?: string,
    model?: string,
    templateRequiredFields?: string[],
  ): Promise<ChunkProcessingResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delayMs = calculateRetryDelay(attempt - 1);
          this.logger.log(`Chunk ${chunk.chunkIndex + 1}: Retry ${attempt}/${RETRY_CONFIG.maxRetries} after ${delayMs}ms`);
          await delay(delayMs);
        }

        const prompt = buildChunkPrompt(chunk, hasFigureMarkers, figureIdList, templateRequiredFields);
        const response = await this.makeLlmCall(prompt, userToken, 16000, model);

        if (!response) {
          throw new Error('Empty response from LLM');
        }

        const data = parseChunkResponse(response, chunk.chunkIndex);

        this.logger.log(`Chunk ${chunk.chunkIndex + 1}/${chunk.totalChunks} processed successfully`);

        return {
          success: true,
          chunkIndex: chunk.chunkIndex,
          data,
          retryCount: attempt,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        this.logger.warn(
          `Chunk ${chunk.chunkIndex + 1} failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}): ${lastError.message}`,
        );
      }
    }

    // All retries exhausted - skip this chunk
    this.logger.error(`Chunk ${chunk.chunkIndex + 1} failed after all retries, skipping`);
    return {
      success: false,
      chunkIndex: chunk.chunkIndex,
      error: lastError?.message || 'Unknown error',
      retryCount: RETRY_CONFIG.maxRetries,
    };
  }

  /**
   * Make a single LLM API call
   */
  private async makeLlmCall(prompt: string, userToken?: string, maxTokens: number = 16000, model?: string): Promise<string> {
    const systemMessage = '你是一个专业的文档解析助手，专门从学术论文中提取结构化信息。请始终返回有效的 JSON 格式，保留完整内容，按原文实际结构提取，不要预设章节名称。';
    const modelToUse = model || this.modelConfigService.getDefaultModel();

    if (this.useGateway && this.gatewayProxy) {
      if (!userToken) {
        throw new Error('User token is required when using Gateway proxy');
      }
      const response = await this.gatewayProxy.chatCompletions(userToken, {
        model: modelToUse,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      });

      return response.choices?.[0]?.message?.content || '';
    } else {
      const response = await this.openai!.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      });

      return response.choices[0]?.message?.content || '';
    }
  }

  private buildPrompt(content: string, templateRequiredFields?: string[]): string {
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
每个 [FIGURE:xxxX] 标记（如 [FIGURE:docximg1]）表示该位置有一张图片。
**重要：只处理上述列出的图片ID，不要创建其他图片引用！必须使用原始的图片ID！**

请在对应章节的 content 中将这些标记转换为 LaTeX 格式（保留原始图片ID）：

例如 [FIGURE:docximg1] 应转换为：
\\\\begin{figure}[H]
    \\\\centering
    \\\\includegraphics[width=0.8\\\\textwidth]{docximg1}
    \\\\caption{根据上下文推断的图片描述}
    \\\\label{fig:docximg1}
\\\\end{figure}

注意：
- 只能使用以下图片ID: ${figureIdList}
- 必须保留原始的图片ID（如 docximg1, pdfimg2 等），不要修改为其他名称
- 不要创建任何不在上述列表中的图片引用
- 根据图片前后的文本内容，为每张图片生成合适的中文标题作为 caption
- 保持图片在原文中的相对位置
`
      : '';

    const templateFieldsNote = templateRequiredFields && templateRequiredFields.length > 0
      ? `\n**【模板必需字段】**\n当前模板特别需要以下字段，请务必仔细提取：${templateRequiredFields.join(', ')}\n如果文档中没有这些信息，返回空字符串，但必须包含这些字段。\n`
      : '';

    return `请从以下论文内容中提取结构化信息。**按原文实际结构提取，不要预设或强制套用固定的章节名称。**
${templateFieldsNote}
**【重要】元数据提取**
论文封面/扉页（通常在文档开头）包含关键元数据，请仔细查找：

| 字段 | 常见标签 | 示例值 |
|------|----------|--------|
| title | 论文题目、题目 | "基于深度学习的图像识别研究" |
| title_en | 英文标题、Title | "Research on Image Recognition" |
| author_name | 作者、姓名、学生 | "张三" (不是 "作者：张三") |
| author_name_en | 作者英文名、Author | "Zhang San" |
| supervisor | 导师、指导教师、Supervisor | "李四 教授" |
| supervisor_en | 导师英文名、Supervisor | "Prof. Li" |
| school | 学院、院系、Department | "计算机科学与技术学院" |
| major | 专业、Major | "计算机科学与技术" |
| major_en | 专业英文名、Major | "Computer Science" |
| student_id | 学号、Student ID | "2020123456" |
| date | 日期、Date | "2024年5月" |

**注意：只提取实际值，不要包含标签文字本身（如"作者："、"指导教师："）。**

输出 JSON 格式：

{
  "metadata": {
    "title": "论文完整标题（中文）",
    "title_en": "英文标题（如有）",
    "author_name": "作者真实姓名",
    "student_id": "学号（纯数字）",
    "school": "学院/院系全称",
    "major": "专业全称",
    "supervisor": "导师姓名（可包含职称）",
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

**表格处理（极重要）：**
- 如果内容中有 [TABLE_START]...[TABLE_END] 标记，其中每个单元格用 [TABLE_CELL: xxx] 表示
- 请将这些转换为 LaTeX tabular 格式：
\\begin{table}[H]
\\centering
\\begin{tabular}{|c|c|c|c|}
\\hline
表头1 & 表头2 & 表头3 & 表头4 \\\\
\\hline
数据1 & 数据2 & 数据3 & 数据4 \\\\
\\hline
\\end{tabular}
\\end{table}
- 根据内容推断列数（通常中文文字是表头，数字是数据）
- **重要**：如果无法正确转换，请保留原始的 [TABLE_START]...[TABLE_END] 和 [TABLE_CELL:] 标记不要删除
${figureInstructions}
论文内容：
${truncatedContent}`;
  }

  private validateAndNormalize(data: any, templateRequiredFields?: string[]): ThesisData {
    // Initialize with base required fields (always present)
    const metadata: ThesisMetadata = {
      title: data.metadata?.title?.trim() || '',
      author_name: data.metadata?.author_name?.trim() || '',
    };

    // If template specifies required fields, ensure they're included (even if null)
    if (templateRequiredFields && templateRequiredFields.length > 0) {
      const { TemplateFieldMapper } = require('../template/template-field-mapper.service');
      const mapper = new TemplateFieldMapper();
      const mappedFields = mapper.mapTemplateFieldsToThesisData(templateRequiredFields);

      mappedFields.forEach((field: string) => {
        const [section, fieldName] = field.split('.');
        if (section === 'metadata' && fieldName !== 'title' && fieldName !== 'author_name') {
          (metadata as any)[fieldName] = data.metadata?.[fieldName]?.trim() || null;
        }
      });
    } else {
      // Backward compatibility mode: return all standard fields
      metadata.title_en = data.metadata?.title_en?.trim() || null;
      metadata.student_id = data.metadata?.student_id?.trim() || null;
      metadata.school = data.metadata?.school?.trim() || null;
      metadata.major = data.metadata?.major?.trim() || null;
      metadata.supervisor = data.metadata?.supervisor?.trim() || null;
      metadata.date = data.metadata?.date?.trim() || null;
    }

    // Parse sections array
    const sections: Section[] = [];
    if (Array.isArray(data.sections)) {
      for (const sec of data.sections) {
        if (sec.title || sec.content) {
          // Post-process content to convert any remaining markdown tables
          const processedContent = postProcessSectionContent(sec.content?.trim() || '');
          sections.push({
            title: sec.title?.trim() || '',
            content: processedContent,
            level: [1, 2, 3].includes(sec.level) ? sec.level : 1,
          });
        }
      }
    }

    const normalized: ThesisData = {
      metadata,
      sections,
      abstract: data.abstract?.trim() || null,
      abstract_en: data.abstract_en?.trim() || null,
      keywords: data.keywords?.trim() || null,
      keywords_en: data.keywords_en?.trim() || null,
      references: data.references?.trim() || null,
      acknowledgements: data.acknowledgements?.trim() || null,
    };

    return normalized;
  }
}
