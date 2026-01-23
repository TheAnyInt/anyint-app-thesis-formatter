import { Logger } from '@nestjs/common';
import { ContentChunk } from './content-splitter';
import { ThesisData, Section, ThesisMetadata } from '../thesis/dto/thesis-data.dto';

const logger = new Logger('SectionProcessor');

/**
 * Result from processing a single chunk
 */
export interface ChunkProcessingResult {
  success: boolean;
  chunkIndex: number;
  data?: Partial<ThesisData>;
  error?: string;
  retryCount: number;
}

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

/**
 * Parse the LLM response for a chunk
 */
export function parseChunkResponse(responseText: string, chunkIndex: number): Partial<ThesisData> {
  const parsed = JSON.parse(responseText);

  const result: Partial<ThesisData> = {};

  // Parse metadata (only from first chunk typically)
  if (parsed.metadata && Object.keys(parsed.metadata).length > 0) {
    result.metadata = {
      title: parsed.metadata.title?.trim() || '',
      title_en: parsed.metadata.title_en?.trim() || undefined,
      author_name: parsed.metadata.author_name?.trim() || '',
      student_id: parsed.metadata.student_id?.trim() || undefined,
      school: parsed.metadata.school?.trim() || undefined,
      major: parsed.metadata.major?.trim() || undefined,
      supervisor: parsed.metadata.supervisor?.trim() || undefined,
      date: parsed.metadata.date?.trim() || undefined,
    };
  }

  // Parse sections
  if (Array.isArray(parsed.sections)) {
    result.sections = [];
    for (const sec of parsed.sections) {
      if (sec.title || sec.content) {
        // Post-process content to convert any remaining markdown tables
        const processedContent = postProcessSectionContent(sec.content?.trim() || '');
        result.sections.push({
          title: sec.title?.trim() || '',
          content: processedContent,
          level: [1, 2, 3].includes(sec.level) ? sec.level : 1,
        });
      }
    }
  }

  // Parse special sections
  if (parsed.abstract?.trim()) {
    result.abstract = parsed.abstract.trim();
  }
  if (parsed.abstract_en?.trim()) {
    result.abstract_en = parsed.abstract_en.trim();
  }
  if (parsed.keywords?.trim()) {
    result.keywords = parsed.keywords.trim();
  }
  if (parsed.keywords_en?.trim()) {
    result.keywords_en = parsed.keywords_en.trim();
  }
  if (parsed.references?.trim()) {
    result.references = parsed.references.trim();
  }
  if (parsed.acknowledgements?.trim()) {
    result.acknowledgements = parsed.acknowledgements.trim();
  }

  return result;
}

/**
 * Convert markdown tables to LaTeX tabular format
 * This is a fallback in case the LLM doesn't convert them
 */
export function convertMarkdownTablesToLatex(content: string): string {
  // Match markdown table pattern: | col1 | col2 | ... followed by |---|---| separator
  const tableRegex = /(\|[^\n]+\|\n)(\|[-:\s|]+\|\n)((?:\|[^\n]+\|\n?)+)/g;

  return content.replace(tableRegex, (match, headerRow, separatorRow, bodyRows) => {
    try {
      // Parse header
      const headers = headerRow.split('|').filter((h: string) => h.trim()).map((h: string) => h.trim());
      const numCols = headers.length;

      if (numCols === 0) return match;

      // Parse body rows
      const rows: string[][] = [];
      const bodyLines = bodyRows.trim().split('\n');
      for (const line of bodyLines) {
        const cells = line.split('|').filter((c: string) => c.trim() !== '' || c === '').slice(0, -1);
        // Skip empty lines
        if (cells.length > 0 && cells.some((c: string) => c.trim())) {
          // Pad or trim to match header columns
          const row = cells.slice(cells[0] === '' ? 1 : 0).map((c: string) => c.trim());
          if (row.length > 0) {
            rows.push(row);
          }
        }
      }

      // Build LaTeX table
      const colSpec = '|' + 'c|'.repeat(numCols);
      let latex = '\\begin{table}[H]\n\\centering\n';
      latex += `\\begin{tabular}{${colSpec}}\n\\hline\n`;
      latex += headers.join(' & ') + ' \\\\\\\\ \\hline\n';
      for (const row of rows) {
        // Ensure row has correct number of columns
        while (row.length < numCols) row.push('');
        latex += row.slice(0, numCols).join(' & ') + ' \\\\\\\\ \\hline\n';
      }
      latex += '\\end{tabular}\n\\end{table}';

      return latex;
    } catch (e) {
      logger.warn(`Failed to convert markdown table: ${e}`);
      return match;
    }
  });
}

/**
 * Convert [TABLE_CELL:] format from PDF extraction to LaTeX
 */
export function convertTableCellsToLatex(content: string): string {
  // Match [TABLE_START]...[TABLE_END] blocks
  const tableBlockRegex = /\[TABLE_START\]\n([\s\S]*?)\[TABLE_END\]/g;

  return content.replace(tableBlockRegex, (match, cellsContent) => {
    try {
      // Extract all cells
      const cellRegex = /\[TABLE_CELL:\s*([^\]]+)\]/g;
      const cells: string[] = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(cellsContent)) !== null) {
        cells.push(cellMatch[1].trim());
      }

      if (cells.length < 4) return match; // Not enough cells for a table

      // Try to determine number of columns by analyzing content
      // Heuristic: headers are usually short Chinese text, data rows start with alphanumeric identifiers
      let numCols = 4; // Default assumption

      // Count consecutive Chinese-only text cells at the start (likely headers)
      let headerCount = 0;
      for (const cell of cells) {
        // Check if cell is Chinese text (header candidate)
        if (/^[\u4e00-\u9fa5]+$/.test(cell)) {
          headerCount++;
          if (headerCount > 6) break;
        } else {
          // Found non-Chinese cell (data row starts)
          break;
        }
      }

      // If we found 2-6 Chinese headers, use that as column count
      if (headerCount >= 2 && headerCount <= 6) {
        numCols = headerCount;
      } else {
        // Fallback: try to detect repeating patterns
        // Look for the first numeric value and count cells before next occurrence of similar pattern
        const numericPattern = /^[\d,.\-+%]+$/;
        for (let i = 0; i < Math.min(10, cells.length); i++) {
          if (numericPattern.test(cells[i])) {
            // Found first number, look for next occurrence of number after non-numbers
            for (let j = i + 1; j < Math.min(i + 8, cells.length); j++) {
              if (numericPattern.test(cells[j]) && j - i >= 2 && j - i <= 6) {
                numCols = j - i + 1; // Include the number in the count
                break;
              }
            }
            break;
          }
        }
      }

      // Group cells into rows
      const rows: string[][] = [];
      for (let i = 0; i < cells.length; i += numCols) {
        const row = cells.slice(i, i + numCols);
        if (row.length === numCols) {
          rows.push(row);
        }
      }

      if (rows.length < 2) return match; // Need at least header + 1 data row

      // Build LaTeX table
      const colSpec = '|' + 'c|'.repeat(numCols);
      let latex = '\\begin{table}[H]\n\\centering\n';
      latex += `\\begin{tabular}{${colSpec}}\n\\hline\n`;

      // Header row
      latex += rows[0].join(' & ') + ' \\\\\\\\ \\hline\n';

      // Data rows
      for (let i = 1; i < rows.length; i++) {
        latex += rows[i].join(' & ') + ' \\\\\\\\ \\hline\n';
      }

      latex += '\\end{tabular}\n\\end{table}';
      return latex;
    } catch (e) {
      logger.warn(`Failed to convert TABLE_CELL format: ${e}`);
      return match;
    }
  });
}

/**
 * Unicode math character mappings to LaTeX
 */
const UNICODE_TO_LATEX: Record<string, string> = {
  // Greek letters (italic)
  '𝛼': '\\alpha', '𝛽': '\\beta', '𝛾': '\\gamma', '𝛿': '\\delta',
  '𝜀': '\\epsilon', '𝜁': '\\zeta', '𝜂': '\\eta', '𝜃': '\\theta',
  '𝜄': '\\iota', '𝜅': '\\kappa', '𝜆': '\\lambda', '𝜇': '\\mu',
  '𝜈': '\\nu', '𝜉': '\\xi', '𝜊': 'o', '𝜋': '\\pi',
  '𝜌': '\\rho', '𝜎': '\\sigma', '𝜏': '\\tau', '𝜐': '\\upsilon',
  '𝜑': '\\phi', '𝜒': '\\chi', '𝜓': '\\psi', '𝜔': '\\omega',
  // Greek letters (uppercase)
  '𝛢': 'A', '𝛣': 'B', '𝛤': '\\Gamma', '𝛥': '\\Delta',
  '𝛦': 'E', '𝛧': 'Z', '𝛨': 'H', '𝛩': '\\Theta',
  '𝛪': 'I', '𝛫': 'K', '𝛬': '\\Lambda', '𝛭': 'M',
  '𝛮': 'N', '𝛯': '\\Xi', '𝛰': 'O', '𝛱': '\\Pi',
  '𝛲': 'P', '𝛳': '\\Sigma', '𝛴': '\\Sigma', '𝛵': 'T',
  '𝛶': '\\Upsilon', '𝛷': '\\Phi', '𝛸': 'X', '𝛹': '\\Psi', '𝛺': '\\Omega',
  // Math italic letters
  '𝑎': 'a', '𝑏': 'b', '𝑐': 'c', '𝑑': 'd', '𝑒': 'e', '𝑓': 'f',
  '𝑔': 'g', 'ℎ': 'h', '𝑖': 'i', '𝑗': 'j', '𝑘': 'k', '𝑙': 'l',
  '𝑚': 'm', '𝑛': 'n', '𝑜': 'o', '𝑝': 'p', '𝑞': 'q', '𝑟': 'r',
  '𝑠': 's', '𝑡': 't', '𝑢': 'u', '𝑣': 'v', '𝑤': 'w', '𝑥': 'x',
  '𝑦': 'y', '𝑧': 'z',
  '𝐴': 'A', '𝐵': 'B', '𝐶': 'C', '𝐷': 'D', '𝐸': 'E', '𝐹': 'F',
  '𝐺': 'G', '𝐻': 'H', '𝐼': 'I', '𝐽': 'J', '𝐾': 'K', '𝐿': 'L',
  '𝑀': 'M', '𝑁': 'N', '𝑂': 'O', '𝑃': 'P', '𝑄': 'Q', '𝑅': 'R',
  '𝑆': 'S', '𝑇': 'T', '𝑈': 'U', '𝑉': 'V', '𝑊': 'W', '𝑋': 'X',
  '𝑌': 'Y', '𝑍': 'Z',
  // Math operators and symbols
  '∑': '\\sum', '∏': '\\prod', '∫': '\\int', '∬': '\\iint', '∭': '\\iiint',
  '∮': '\\oint', '∇': '\\nabla', '∂': '\\partial', '∆': '\\Delta',
  '∀': '\\forall', '∃': '\\exists', '∈': '\\in', '∉': '\\notin',
  '⊂': '\\subset', '⊃': '\\supset', '⊆': '\\subseteq', '⊇': '\\supseteq',
  '∪': '\\cup', '∩': '\\cap', '∧': '\\wedge', '∨': '\\vee', '¬': '\\neg',
  '⊕': '\\oplus', '⊗': '\\otimes', '⊙': '\\odot',
  '≤': '\\leq', '≥': '\\geq', '≠': '\\neq', '≈': '\\approx',
  '≡': '\\equiv', '≢': '\\not\\equiv', '∝': '\\propto', '∞': '\\infty',
  '±': '\\pm', '×': '\\times', '÷': '\\div', '√': '\\sqrt',
  '∛': '\\sqrt[3]', '∜': '\\sqrt[4]',
  '→': '\\rightarrow', '←': '\\leftarrow', '↔': '\\leftrightarrow',
  '⇒': '\\Rightarrow', '⇐': '\\Leftarrow', '⇔': '\\Leftrightarrow',
  // Superscripts
  '⁰': '^{0}', '¹': '^{1}', '²': '^{2}', '³': '^{3}', '⁴': '^{4}',
  '⁵': '^{5}', '⁶': '^{6}', '⁷': '^{7}', '⁸': '^{8}', '⁹': '^{9}',
  '⁺': '^{+}', '⁻': '^{-}', '⁼': '^{=}', '⁽': '^{(}', '⁾': '^{)}',
  'ⁿ': '^{n}', 'ⁱ': '^{i}',
  // Subscripts
  '₀': '_{0}', '₁': '_{1}', '₂': '_{2}', '₃': '_{3}', '₄': '_{4}',
  '₅': '_{5}', '₆': '_{6}', '₇': '_{7}', '₈': '_{8}', '₉': '_{9}',
  '₊': '_{+}', '₋': '_{-}', '₌': '_{=}', '₍': '_{(}', '₎': '_{)}',
  'ₐ': '_{a}', 'ₑ': '_{e}', 'ₒ': '_{o}', 'ₓ': '_{x}',
  'ₕ': '_{h}', 'ₖ': '_{k}', 'ₗ': '_{l}', 'ₘ': '_{m}',
  'ₙ': '_{n}', 'ₚ': '_{p}', 'ₛ': '_{s}', 'ₜ': '_{t}',
  'ᵢ': '_{i}', 'ⱼ': '_{j}',
};

/**
 * Check if a character is a Unicode math character
 */
function isUnicodeMathChar(char: string): boolean {
  return UNICODE_TO_LATEX.hasOwnProperty(char);
}

/**
 * Convert a formula block to LaTeX
 * Handles patterns like "N ∑ L= − i=1 yilog(pi)"
 */
function convertFormulaBlockToLatex(content: string): string {
  // First convert all Unicode chars
  let formula = content;
  for (const [unicode, latex] of Object.entries(UNICODE_TO_LATEX)) {
    formula = formula.split(unicode).join(latex);
  }

  // Try to detect and reconstruct common formula patterns

  // Pattern 1: Sum formula "N ∑ L= − i=1 body"
  // Matches: upper_limit sum_symbol lhs=- lower_limit body
  const sumPattern = /([NMKnmk])\s*\\sum\s*([A-Za-z])\s*=\s*[-−]?\s*([ijk])=(\d+)\s*(.+)/;
  const sumMatch = formula.match(sumPattern);
  if (sumMatch) {
    const [_, upper, lhs, idx, start, body] = sumMatch;
    return `$$${lhs} = -\\sum_{${idx}=${start}}^{${upper}} ${body}$$`;
  }

  // Pattern 2: Product formula
  const prodPattern = /([NMKnmk])\s*\\prod\s*([A-Za-z])\s*=\s*([ijk])=(\d+)\s*(.+)/;
  const prodMatch = formula.match(prodPattern);
  if (prodMatch) {
    const [_, upper, lhs, idx, start, body] = prodMatch;
    return `$$${lhs} = \\prod_{${idx}=${start}}^{${upper}} ${body}$$`;
  }

  // Pattern 3: Simple equation with operators
  if (/[A-Za-z]\s*=\s*[-+]?.*\\(?:sum|prod|int|frac)/.test(formula)) {
    return `$$${formula}$$`;
  }

  // If no pattern matched, wrap inline if it has LaTeX commands
  if (/\\(?:sum|prod|int|frac|alpha|beta|gamma)/.test(formula)) {
    return `$$${formula}$$`;
  }

  // Otherwise, make inline math
  if (formula.includes('=') || /[_^]/.test(formula)) {
    return `$${formula}$`;
  }

  return formula;
}

/**
 * Convert Unicode math characters to LaTeX
 */
export function convertUnicodeMathToLatex(content: string): string {
  let result = content;

  // Handle [FORMULA_BLOCK: ... :END_FORMULA_BLOCK] markers (multi-line formulas)
  result = result.replace(/\[FORMULA_BLOCK:\s*([\s\S]*?)\s*:END_FORMULA_BLOCK\]/g, (match, formulaContent) => {
    return convertFormulaBlockToLatex(formulaContent);
  });

  // Handle [FORMULA: ... :END_FORMULA] markers (single-line formulas)
  result = result.replace(/\[FORMULA:\s*([\s\S]*?)\s*:END_FORMULA\]/g, (match, formulaContent) => {
    // Convert Unicode characters first
    let converted = formulaContent;
    for (const [unicode, latex] of Object.entries(UNICODE_TO_LATEX)) {
      converted = converted.split(unicode).join(latex);
    }

    // Check if it looks like an equation
    if (converted.includes('=') || /\\(?:sum|prod|int|frac)/.test(converted)) {
      return `$${converted}$`;
    }
    return converted;
  });

  // Convert remaining Unicode math characters
  for (const [unicode, latex] of Object.entries(UNICODE_TO_LATEX)) {
    result = result.split(unicode).join(latex);
  }

  // Fix common patterns that result from PDF extraction
  // Pattern: "L = -\sum_{i=1}^{N}" should be wrapped in $$ if it's a standalone formula
  result = result.replace(/^(\s*)(\\?[A-Za-z]+\s*=\s*[-+]?\\(?:sum|prod|int|frac)[^$\n]+)(\s*)$/gm, (match, pre, formula, post) => {
    // Check if it looks like a display formula (has sum/prod/int)
    if (/\\(?:sum|prod|int|frac)/.test(formula)) {
      return `${pre}$$${formula.trim()}$$${post}`;
    }
    return match;
  });

  // Wrap inline math that has LaTeX commands but no delimiters
  result = result.replace(/(?<![$\\])\\(alpha|beta|gamma|delta|sum|prod|int|frac|sqrt)(?![a-zA-Z])/g, (match) => {
    return `$${match}$`;
  });

  // Fix subscripts/superscripts that are not in math mode
  result = result.replace(/(?<!\$)([a-zA-Z])_\{([^}]+)\}(?!\$)/g, '$$$1_{$2}$$');
  result = result.replace(/(?<!\$)([a-zA-Z])\^\{([^}]+)\}(?!\$)/g, '$$$1^{$2}$$');

  // Clean up adjacent inline math - merge $a$$b$ into $ab$
  result = result.replace(/\$\$\$/g, '$ $');
  result = result.replace(/\$\s*\$/g, '');

  // Fix mixed math delimiters - remove $ inside \[...\] or $$...$$
  result = result.replace(/\\\[\s*\$([^$]+)\$\s*\\\]/g, '\\[$1\\]');
  result = result.replace(/\$\$\s*\$([^$]+)\$\s*\$\$/g, '$$$1$$');

  // Fix \sum, \prod, etc. that have extra $ wrapping
  result = result.replace(/\$\\(sum|prod|int|frac|log)\$/g, '\\$1');

  return result;
}

/**
 * Reconstruct fragmented formulas from PDF extraction
 * PDF often splits formulas across multiple lines
 */
export function reconstructFormulas(content: string): string {
  let result = content;

  // Pattern 1: Sum formula split across lines
  // 𝑁 (or N)
  // ∑ (or ∏)
  // 𝐿= − (or L= -)
  // 𝑖=1 (or i=1)
  // 𝑦𝑖log(𝑝𝑖)
  // Using specific character matches instead of ranges

  // Match upper limit characters
  const upperChars = '[𝑁𝑀𝐾𝑛𝑚𝑘NMKnmk]';
  // Match LHS variable characters
  const lhsChars = '[𝐿𝑅𝐸𝐽𝑃𝑄LREJPQa-z]';
  // Match index characters
  const indexChars = '[𝑖𝑗𝑘ijk]';

  const sumFormulaPattern = new RegExp(
    `(${upperChars})\\s*\\n\\s*[∑∏]\\s*\\n\\s*(${lhsChars}=\\s*[-−]?)\\s*\\n\\s*(${indexChars}=\\d+)\\s*\\n\\s*([^\\n]+)`,
    'g'
  );

  result = result.replace(sumFormulaPattern, (match, upper, lhs, lower, body) => {
    // Convert to proper LaTeX using the mapping
    let upperClean = upper;
    let lhsClean = lhs;
    let lowerClean = lower;

    // Apply Unicode to LaTeX conversions
    for (const [unicode, latex] of Object.entries(UNICODE_TO_LATEX)) {
      upperClean = upperClean.split(unicode).join(latex);
      lhsClean = lhsClean.split(unicode).join(latex);
      lowerClean = lowerClean.split(unicode).join(latex);
    }

    return `$$${lhsClean}\\sum_{${lowerClean}}^{${upperClean}} ${body}$$`;
  });

  return result;
}

/**
 * Post-process section content to fix common issues
 */
export function postProcessSectionContent(content: string): string {
  // First, try to reconstruct fragmented formulas
  let result = reconstructFormulas(content);
  // Convert Unicode math to LaTeX
  result = convertUnicodeMathToLatex(result);
  // Convert [TABLE_CELL:] format from PDF extraction
  result = convertTableCellsToLatex(result);
  // Convert any remaining markdown tables to LaTeX
  result = convertMarkdownTablesToLatex(result);
  return result;
}

/**
 * Delay helper for retry logic
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 2000,
  maxDelayMs: 10000,
};

/**
 * Calculate delay with exponential backoff
 */
export function calculateRetryDelay(retryCount: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, retryCount);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}
