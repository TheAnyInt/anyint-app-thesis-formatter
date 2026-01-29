import { Injectable } from '@nestjs/common';

/**
 * Service for mapping template field names to ThesisData field paths
 * Handles the conversion between template-specific field names (e.g., 'advisor', 'college')
 * and standardized ThesisData field names (e.g., 'supervisor', 'school')
 */
@Injectable()
export class TemplateFieldMapper {
  // Template field name → ThesisData field path mapping
  private static readonly FIELD_MAPPING: Record<string, string> = {
    // Title fields
    'title': 'metadata.title',
    'titleEn': 'metadata.title_en',
    'title_en': 'metadata.title_en',

    // Author fields
    'author': 'metadata.author_name',
    'authorEn': 'metadata.author_name_en',
    'author_name': 'metadata.author_name',
    'author_name_en': 'metadata.author_name_en',

    // Supervisor fields (multiple aliases)
    'supervisor': 'metadata.supervisor',
    'advisor': 'metadata.supervisor',      // HUNNU template uses 'advisor'
    'adviser': 'metadata.supervisor',      // Alternative spelling

    // School/Department fields (multiple aliases)
    'school': 'metadata.school',
    'college': 'metadata.school',          // HUNNU template uses 'college'
    'department': 'metadata.school',       // NJU/SCUT templates use 'department'
    'institute': 'metadata.school',        // Some templates use 'institute'

    // Other metadata fields
    'major': 'metadata.major',
    'majorEn': 'metadata.major_en',           // NJULife template
    'major_en': 'metadata.major_en',
    'supervisorEn': 'metadata.supervisor_en', // NJULife template
    'supervisor_en': 'metadata.supervisor_en',
    'studentId': 'metadata.student_id',
    'student_id': 'metadata.student_id',
    'date': 'metadata.date',
    'degree': 'metadata.degree',
    'class': 'metadata.class',
    'className': 'metadata.class',
  };

  // Human-readable descriptions for fields (used in LLM prompts)
  private static readonly FIELD_DESCRIPTIONS: Record<string, string> = {
    'title': '论文完整标题（中文）',
    'titleEn': '英文标题（如有）',
    'title_en': '英文标题（如有）',
    'author': '作者真实姓名',
    'authorEn': '作者英文名（如有）',
    'author_name': '作者真实姓名',
    'author_name_en': '作者英文名（如有）',
    'advisor': '指导教师姓名（导师）',
    'supervisor': '导师姓名',
    'adviser': '导师姓名',
    'college': '学院/院系全称',
    'school': '学院/院系',
    'department': '院系/部门',
    'institute': '研究所/院系',
    'major': '专业全称',
    'majorEn': '专业英文名称',
    'major_en': '专业英文名称',
    'supervisorEn': '导师英文名',
    'supervisor_en': '导师英文名',
    'studentId': '学号（纯数字）',
    'student_id': '学号（纯数字）',
    'date': '日期（YYYY-MM-DD格式）',
    'degree': '学位类型（如学士、硕士、博士）',
    'class': '班级',
    'className': '班级名称',
  };

  /**
   * Map template field names to ThesisData field paths
   * Example: ['title', 'advisor', 'college']
   *       → ['metadata.title', 'metadata.supervisor', 'metadata.school']
   *
   * @param templateFields - Array of field names from template.requiredFields
   * @returns Array of ThesisData field paths
   */
  mapTemplateFieldsToThesisData(templateFields: string[]): string[] {
    return templateFields.map(field => {
      const mapped = TemplateFieldMapper.FIELD_MAPPING[field];
      if (!mapped) {
        // If no mapping found, assume it's already in correct format
        // or use as-is with metadata prefix if not already prefixed
        return field.includes('.') ? field : `metadata.${field}`;
      }
      return mapped;
    });
  }

  /**
   * Get human-readable description for a field (used in LLM prompts)
   *
   * @param templateField - Field name from template
   * @returns Description string for use in prompts
   */
  getFieldDescription(templateField: string): string {
    return TemplateFieldMapper.FIELD_DESCRIPTIONS[templateField] || templateField;
  }

  /**
   * Extract the field name from a ThesisData field path
   * Example: 'metadata.supervisor' → 'supervisor'
   *
   * @param fieldPath - Full field path (e.g., 'metadata.supervisor')
   * @returns Field name only
   */
  extractFieldName(fieldPath: string): string {
    const parts = fieldPath.split('.');
    return parts[parts.length - 1];
  }

  /**
   * Check if a template field maps to a specific ThesisData field
   * Example: isFieldMapping('advisor', 'supervisor') → true
   *
   * @param templateField - Field name from template
   * @param thesisDataField - Field name in ThesisData (without 'metadata.' prefix)
   * @returns True if they map to the same field
   */
  isFieldMapping(templateField: string, thesisDataField: string): boolean {
    const mapped = TemplateFieldMapper.FIELD_MAPPING[templateField];
    if (!mapped) return false;
    return this.extractFieldName(mapped) === thesisDataField;
  }
}
