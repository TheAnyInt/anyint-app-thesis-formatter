import { Section } from '../../thesis/dto/thesis-data.dto';

/**
 * Build prompt for enhancing existing sections
 */
export function buildSectionEnhancementPrompt(
  sections: Section[],
  fullContext: string,
): string {
  const sectionsList = sections
    .map((sec, idx) => {
      const contentPreview =
        sec.content.length > 200
          ? sec.content.substring(0, 200) + '...'
          : sec.content;
      return `${idx + 1}. ${sec.title} (level ${sec.level})\n   当前内容: ${contentPreview}`;
    })
    .join('\n');

  return `请增强和扩展以下论文章节的内容。保留原有内容的核心思想，但添加更多细节、解释和学术深度。

**原则：**
1. 保持原有章节结构和标题
2. 扩展内容，使每个章节更加充实（至少200字）
3. 保持学术语言风格
4. 添加必要的解释和论证
5. 确保内容连贯性

**待增强的章节：**
${sectionsList}

**完整论文上下文（供参考）：**
${fullContext.substring(0, 3000)}

请以JSON格式返回增强后的章节：
{
  "sections": [
    {
      "title": "章节标题",
      "content": "增强后的内容（保留并扩展原内容）",
      "level": 1
    }
  ]
}`;
}

/**
 * Build prompt for generating missing sections
 */
export function buildMissingSectionsPrompt(
  sectionNames: string[],
  existingSections: Section[],
  fullContext: string,
): string {
  const existingSectionsList = existingSections
    .map((sec) => `- ${sec.title}`)
    .join('\n');

  const missingSectionsList = sectionNames
    .map((name, idx) => `${idx + 1}. ${name}`)
    .join('\n');

  return `请根据论文内容生成以下缺失的章节。

**需要生成的章节：**
${missingSectionsList}

**已有章节（供参考）：**
${existingSectionsList}

**完整论文内容（供参考）：**
${fullContext.substring(0, 5000)}

**要求：**
1. 每个章节应有实质性内容（200-500字）
2. 内容应与论文主题相关
3. 使用学术化的语言
4. 确保逻辑连贯

请以JSON格式返回生成的章节：
{
  "sections": [
    {
      "title": "章节名称",
      "content": "章节内容",
      "level": 1
    }
  ]
}`;
}

/**
 * Build prompt for generating references section
 */
export function buildReferencesPrompt(
  fullContext: string,
  existingReferences?: string,
): string {
  const existingContext = existingReferences
    ? `\n\n**现有参考文献：**\n${existingReferences}\n\n请整理和格式化现有参考文献，使其符合 GB/T 7714-2015 标准。`
    : `\n\n**当前没有参考文献，请根据论文内容生成常见的参考文献示例。**`;

  return `请为论文生成或整理参考文献部分。

**要求：**
1. 使用 GB/T 7714-2015 格式
2. 按引用顺序或作者姓氏排序
3. 包含完整的书目信息（作者、标题、出版信息等）${existingContext}

**论文内容（供参考）：**
${fullContext.substring(0, 3000)}

请以JSON格式返回：
{
  "references": "参考文献内容（每条引用一行）"
}`;
}

/**
 * Build prompt for generating acknowledgements
 */
export function buildAcknowledgementsPrompt(
  fullContext: string,
  metadata?: any,
): string {
  const authorInfo = metadata?.author_name
    ? `作者：${metadata.author_name}`
    : '';
  const supervisorInfo = metadata?.supervisor
    ? `导师：${metadata.supervisor}`
    : '';

  const metadataContext =
    authorInfo || supervisorInfo
      ? `\n\n**论文信息：**\n${authorInfo}\n${supervisorInfo}`
      : '';

  return `请生成一份简洁、真诚的致谢部分。

**要求：**
1. 感谢导师的指导
2. 感谢同学、朋友的帮助
3. 感谢家人的支持
4. 语言真诚、简洁（100-200字）
5. 使用第一人称${metadataContext}

**论文主题（供参考）：**
${fullContext.substring(0, 500)}

请以JSON格式返回：
{
  "acknowledgements": "致谢内容"
}`;
}
