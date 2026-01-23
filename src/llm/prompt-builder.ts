import { ContentChunk } from './content-splitter';

/**
 * Build the prompt for processing a single content chunk
 */
export function buildChunkPrompt(chunk: ContentChunk, hasFigureMarkers: boolean, figureIdList: string): string {
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
    \\\\includegraphics[width=0.8\\\\textwidth]{docximg1.png}
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
    ? `"metadata": {
    "title": "论文标题",
    "title_en": "英文标题（如有）",
    "author_name": "作者姓名",
    "student_id": "学号（如有）",
    "school": "学院/院系",
    "major": "专业",
    "supervisor": "指导教师",
    "date": "日期"
  }`
    : `"metadata": {}`;

  const abstractInstruction = chunk.includesAbstract
    ? `"abstract": "中文摘要内容",
  "abstract_en": "英文摘要内容（如有）",
  "keywords": "关键词1、关键词2、关键词3",
  "keywords_en": "keyword1, keyword2, keyword3",`
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
- PDF提取的表格可能用 [TABLE_START]...[TABLE_END] 标记，每个单元格用 [TABLE_CELL: xxx] 表示
- 例如：
  [TABLE_START]
  [TABLE_CELL: 数据集]
  [TABLE_CELL: 类别数]
  [TABLE_CELL: CIFAR-10]
  [TABLE_CELL: 10]
  [TABLE_END]
- 需要根据表头数量确定列数，然后将单元格重组为表格行
- **Markdown表格必须转换**：如果看到 | col1 | col2 | 这样的管道符分隔格式，必须转换为LaTeX
- **必须将所有表格转换为LaTeX tabular格式**：
\\begin{table}[H]
\\centering
\\caption{根据上下文推断的表格标题}
\\begin{tabular}{|c|c|c|c|}
\\hline
列1 & 列2 & 列3 & 列4 \\\\\\\\
\\hline
数据1 & 数据2 & 数据3 & 数据4 \\\\\\\\
\\hline
\\end{tabular}
\\end{table}
- **禁止输出 Markdown 格式的表格**（如 | A | B | 或 |---|---| 分隔线），必须用 LaTeX tabular
- 根据内容推断列数：如果表头是"数据集、类别数、训练集、测试集"则为4列
- **重要**：如果无法正确转换表格，请保留原始的 [TABLE_START]...[TABLE_END] 和 [TABLE_CELL:] 标记，不要删除它们
${figureInstructions}
内容片段：
${contentToProcess}`;
}
