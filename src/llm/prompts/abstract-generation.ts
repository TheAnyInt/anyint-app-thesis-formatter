/**
 * Build prompt for generating or enhancing abstract
 */
export function buildAbstractPrompt(
  originalContent: string,
  existingAbstract?: string,
  language: 'zh' | 'en' = 'zh',
): string {
  const isEnglish = language === 'en';
  const languageLabel = isEnglish ? '英文摘要 (Abstract)' : '中文摘要';
  const instructions = isEnglish
    ? `Generate a comprehensive English abstract (200-300 words) that:
1. States the research background and motivation
2. Clearly defines the research problem
3. Describes the methodology used
4. Summarizes key findings and contributions
5. Uses academic English with proper terminology`
    : `生成一份完整的中文摘要（200-300字），包含：
1. 研究背景和动机
2. 研究问题和目标
3. 采用的方法
4. 主要发现和贡献
5. 使用学术化的语言`;

  const existingContext = existingAbstract
    ? `\n\n**现有${languageLabel}：**\n${existingAbstract}\n\n请基于现有摘要进行改进和完善。`
    : `\n\n**当前没有${languageLabel}，请根据论文内容生成。**`;

  return `请为以下论文生成${languageLabel}。

${instructions}${existingContext}

**论文内容：**
${originalContent.substring(0, 5000)}

请以JSON格式返回：
{
  "abstract": "生成的摘要内容"
}`;
}

/**
 * Build prompt for generating keywords
 */
export function buildKeywordsPrompt(
  originalContent: string,
  existingKeywords?: string,
  language: 'zh' | 'en' = 'zh',
): string {
  const isEnglish = language === 'en';
  const languageLabel = isEnglish ? '英文关键词 (Keywords)' : '中文关键词';
  const separator = isEnglish ? ', ' : '、';
  const instructions = isEnglish
    ? 'Extract 3-5 keywords in English that represent the main topics and concepts.'
    : '提取3-5个中文关键词，代表论文的主要主题和概念。';

  const existingContext = existingKeywords
    ? `\n\n现有关键词：${existingKeywords}\n请基于现有关键词进行改进。`
    : '';

  const example = isEnglish
    ? 'machine learning, deep learning, image recognition'
    : '机器学习、深度学习、图像识别';

  return `请为以下论文生成${languageLabel}。

${instructions}${existingContext}

关键词应该：
- 准确反映论文核心内容
- 使用专业术语
- 用"${separator}"分隔
- 示例格式：${example}

**论文内容：**
${originalContent.substring(0, 5000)}

请以JSON格式返回：
{
  "keywords": "关键词1${separator}关键词2${separator}关键词3"
}`;
}
