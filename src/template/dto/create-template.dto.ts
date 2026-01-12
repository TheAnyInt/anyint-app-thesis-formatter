export class CreateTemplateDto {
  id?: string;  // Auto-generated if not provided
  schoolId: string;
  name: string;
  description?: string;
  texContent: string;
  requiredFields: string[];
  requiredSections: string[];
}

export class UpdateTemplateDto {
  name?: string;
  description?: string;
  texContent?: string;
  requiredFields?: string[];
  requiredSections?: string[];
}
