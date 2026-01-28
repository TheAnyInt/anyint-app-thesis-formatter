/**
 * Build prompt for generating metadata fields
 */
export function buildMetadataPrompt(
  originalContent: string,
  fieldsToGenerate: string[],
  existingMetadata?: Record<string, any>,
): string {
  const fieldDescriptions: Record<string, string> = {
    title: '论文完整标题（中文）',
    title_en: '论文英文标题',
    author_name: '作者真实姓名',
    student_id: '学号（纯数字）',
    school: '学院/院系全称',
    major: '专业全称',
    supervisor: '导师姓名（可包含职称）',
    date: '日期（如：2024年5月）',
  };

  const fieldsToGenerateDesc = fieldsToGenerate
    .map((field) => `- ${field}: ${fieldDescriptions[field] || field}`)
    .join('\n');

  const existingFieldsInfo = existingMetadata
    ? `\n\n已有元数据：\n${JSON.stringify(existingMetadata, null, 2)}`
    : '';

  return `请从以下论文内容中提取或生成指定的元数据字段。

**需要生成的字段：**
${fieldsToGenerateDesc}

**提取规则：**
1. 论文封面/扉页（通常在文档开头）包含关键元数据
2. 仔细查找常见标签：
   - title: 论文题目、题目
   - author_name: 作者、姓名、学生（不包含"作者："等标签文字）
   - supervisor: 导师、指导教师、Supervisor
   - school: 学院、院系、Department
   - major: 专业、Major
   - student_id: 学号、Student ID
   - date: 日期、Date
3. 只提取实际值，不要包含标签文字本身
4. 如果找不到某个字段，根据上下文合理推断或返回空字符串${existingFieldsInfo}

**论文内容（前3000字）：**
${originalContent.substring(0, 3000)}

请以JSON格式返回：
{
  ${fieldsToGenerate.map((field) => `"${field}": "提取或生成的值"`).join(',\n  ')}
}`;
}
