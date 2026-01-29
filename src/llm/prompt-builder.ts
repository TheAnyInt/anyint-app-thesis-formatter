import { ContentChunk } from './content-splitter';
import { TemplateFieldMapper } from '../template/template-field-mapper.service';

/**
 * Build the prompt for processing a single content chunk
 */
export function buildChunkPrompt(
  chunk: ContentChunk,
  hasFigureMarkers: boolean,
  figureIdList: string,
  templateRequiredFields?: string[],
): string {
  const isFirstChunk = chunk.chunkIndex === 0;
  const hasOnlySections = chunk.sections.length > 0 && !chunk.includesAbstract && !chunk.includesReferences && !chunk.includesAcknowledgements;

  let contextInfo = '';
  if (chunk.totalChunks > 1) {
    contextInfo = `\n**注意：这是文档的第 ${chunk.chunkIndex + 1}/${chunk.totalChunks} 部分。**\n`;
    if (!isFirstChunk) {
      contextInfo += '- 不需要再次提取 metadata，返回空对象即可\n';
    }
  }

  const figureInstructions = hasFigureMarkers
    ? `
**图片处理说明：**
文本中可能包含图片标记: ${figureIdList}
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

  // Build content to process
  let contentToProcess = '';

  if (chunk.includesAbstract && chunk.abstractContent) {
    contentToProcess += `【摘要部分】\n${chunk.abstractContent}\n\n`;
  }

  for (const section of chunk.sections) {
    contentToProcess += `【${section.level === 1 ? '章节' : section.level === 2 ? '小节' : '子节'}：${section.title}】\n${section.content}\n\n`;
  }

  if (chunk.includesAcknowledgements && chunk.acknowledgementsContent) {
    contentToProcess += `【致谢部分】\n${chunk.acknowledgementsContent}\n\n`;
  }

  if (chunk.includesReferences && chunk.referencesContent) {
    contentToProcess += `【参考文献部分】\n${chunk.referencesContent}\n\n`;
  }

  // Determine which fields to request
  const metadataInstruction = isFirstChunk
    ? `${buildMetadataInstructionForTemplate(templateRequiredFields)}

  **元数据提取重要提示：**
  - 元数据通常位于文档开头的封面或扉页（前1-3页）
  - 标题：文档中最大/最醒目的文字，可能分中英文两行
  - 作者：通常标注"作者"、"姓名"、"学生"、"Author"等标签旁边
  - 导师：标注"导师"、"指导教师"、"Supervisor"、"Advisor"等
  - 不要将标签文字（如"作者："、"指导教师："）作为值，只提取实际内容
  - 如果某字段不存在，返回空字符串 ""
  ${templateRequiredFields && templateRequiredFields.length > 0 ? `- **【模板必需字段】**：${templateRequiredFields.join(', ')} - 这些字段是当前模板必需的，请特别注意提取` : ''}

  **摘要和关键词提取重要提示：**
  - 中文摘要：通常在封面/扉页之后，标题为"摘要"、"摘 要"
  - 英文摘要：标题为"Abstract"、"ABSTRACT"
  - 中文关键词：紧跟中文摘要，以"关键词"、"关键字"、"关 键 词"开头
  - 英文关键词：紧跟英文摘要，以"Keywords"、"Key words"开头
  - 摘要内容是正文前的独立部分，不要与正文混淆
  - 如果文档确实没有摘要或关键词，返回空字符串 ""`
    : `"metadata": {}`;

  // Always request abstract/keywords from the first chunk, even if abstractRange wasn't explicitly found
  // Most thesis documents have abstracts at the beginning
  const abstractInstruction = (isFirstChunk || chunk.includesAbstract)
    ? `"abstract": "中文摘要内容（通常在文档开头，标题为'摘要'）",
  "abstract_en": "英文摘要内容（如有，标题为'Abstract'）",
  "keywords": "关键词（通常紧跟摘要，以'关键词'或'关键字'开头）",
  "keywords_en": "英文关键词（如有，以'Keywords'开头）",`
    : '';

  const sectionsInstruction = hasOnlySections || chunk.sections.length > 0
    ? `"sections": [
    {"title": "章节标题", "content": "章节内容...", "level": 1},
    {"title": "子节标题", "content": "子节内容...", "level": 2}
  ],`
    : `"sections": [],`;

  const referencesInstruction = chunk.includesReferences ? `"references": "参考文献列表",` : '';
  const ackInstruction = chunk.includesAcknowledgements ? `"acknowledgements": "致谢内容",` : '';

  return `请从以下论文内容片段中提取结构化信息。**按原文实际结构提取，不要预设或强制套用固定的章节名称。**
${contextInfo}
输出 JSON 格式：

{
  ${metadataInstruction},
  ${abstractInstruction}
  ${sectionsInstruction}
  ${referencesInstruction}
  ${ackInstruction}
}

**重要说明：**
1. sections 数组包含论文的正文章节，按原文顺序排列
2. level: 1 表示一级标题（章），2 表示二级标题（节），3 表示三级标题
3. **章节标题只保留纯文字内容，去掉编号前缀**：
   - "第一章 绪论" → title: "绪论"
   - "1.1 研究背景" → title: "研究背景"
   - 编号会由 LaTeX 模板自动生成
4. 如果某个字段在内容中不存在，返回空字符串 "" 或空数组 []
5. 保持学术语言的严谨性

**公式处理（极重要）：**
- PDF提取的公式可能被分成多行或多个片段，包含Unicode数学符号
- [FORMULA: ... :END_FORMULA] 标记表示公式片段，可能需要**合并相邻片段**
- 常见模式（需要识别并转换）：
  - 分散的求和公式如 "𝑁\\n∑\\n𝐿= −\\n𝑖=1\\n𝑦𝑖log(𝑝𝑖)" → $$L = -\\sum_{i=1}^{N} y_i \\log(p_i)$$
  - 带说明的公式如 "其中，𝑦𝑖为真实标签" → 其中，$y_i$为真实标签
- **必须将所有公式转换为标准LaTeX格式**：
  - 独立公式用 $$...$$，行内公式用 $...$
- 常见转换：𝛼→\\alpha, 𝛽→\\beta, ∑→\\sum, ∏→\\prod, ∫→\\int, √→\\sqrt, ≤→\\leq, ≥→\\geq, 𝑥ᵢ→x_i, 𝑥²→x^2

**表格处理（极重要）：**
PDF提取的表格用 [TABLE_START]...[TABLE_END] 标记，每个单元格用 [TABLE_CELL: xxx] 表示。

你必须分析单元格内容，确定表格结构，然后输出带有明确结构的格式：

输入示例：
[TABLE_START]
[TABLE_CELL: Dataset]
[TABLE_CELL: Classes]
[TABLE_CELL: Samples]
[TABLE_CELL: CIFAR-10]
[TABLE_CELL: 10]
[TABLE_CELL: 60000]
[TABLE_END]

输出格式（在content中）：
[TABLE cols=3]
[HEADER]Dataset|Classes|Samples[/HEADER]
[ROW]CIFAR-10|10|60000[/ROW]
[/TABLE]

规则：
1. 分析单元格语义确定列数（cols=N）
2. 第一行通常是表头，用 [HEADER]...[/HEADER] 包裹
3. 数据行用 [ROW]...[/ROW] 包裹
4. 单元格用 | 分隔
5. 如果无法确定结构，保留原始 [TABLE_CELL:] 格式

- **Markdown表格必须转换**：如果看到 | col1 | col2 | 这样的管道符分隔格式，也请转换为上述结构化格式
- **禁止输出 Markdown 格式的表格**（如 |---|---| 分隔线）
${figureInstructions}
内容片段：
${contentToProcess}`;
}

/**
 * Build metadata instruction for template-aware extraction
 * @param templateRequiredFields - Template required fields (from template.requiredFields)
 * @returns Metadata instruction string for prompt
 */
function buildMetadataInstructionForTemplate(templateRequiredFields?: string[]): string {
  // Base fields (always extract these)
  const baseFields: Record<string, string> = {
    title: '论文完整标题（中文）- 通常是封面最醒目的文字',
    author_name: '作者真实姓名（不要包含\'作者\'、\'姓名\'等标签文字）',
  };

  // Optional fields with descriptions
  const optionalFields: Record<string, string> = {
    title_en: '英文标题（如有）',
    author_name_en: '作者英文名（如有）',    // Added for NJULife template
    student_id: '学号（纯数字）',
    school: '学院/院系全称（不要包含\'学院\'等标签）',
    major: '专业全称',
    major_en: '专业英文名称（如有）',        // Added for NJULife template
    supervisor: '导师姓名（可包含职称如\'张三 教授\'）',
    supervisor_en: '导师英文名（如有）',     // Added for NJULife template
    date: '日期（如\'2024年5月\'）',
  };

  // If no templateRequiredFields specified, return all fields (backward compatible)
  if (!templateRequiredFields || templateRequiredFields.length === 0) {
    const allFields = { ...baseFields, ...optionalFields };
    const fieldEntries = Object.entries(allFields)
      .map(([key, desc]) => `    "${key}": "${desc}"`)
      .join(',\n');
    return `"metadata": {\n${fieldEntries}\n  }`;
  }

  // Use TemplateFieldMapper to map template fields to ThesisData fields
  const mapper = new TemplateFieldMapper();
  const mappedFields = mapper.mapTemplateFieldsToThesisData(templateRequiredFields);

  // Build schema with required fields
  const schema: Record<string, string> = { ...baseFields };

  // Add mapped required fields
  mappedFields.forEach(field => {
    const fieldName = field.replace('metadata.', '');
    if (optionalFields[fieldName]) {
      schema[fieldName] = `【必需】${optionalFields[fieldName]}`;
    }
  });

  // Generate field entries
  const fieldEntries = Object.entries(schema)
    .map(([key, desc]) => `    "${key}": "${desc}"`)
    .join(',\n');

  return `"metadata": {\n${fieldEntries}\n  }`;
}
