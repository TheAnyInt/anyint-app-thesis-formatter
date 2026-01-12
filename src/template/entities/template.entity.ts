export interface LatexTemplate {
  id: string;
  schoolId: string;
  name: string;
  description?: string;
  texContent: string; // LaTeX template with Mustache placeholders
  requiredFields: string[];
  requiredSections: string[];
  assets?: string[]; // 需要复制到编译目录的资源文件 (如 cover.pdf, 字体文件等)
  createdAt: Date;
  updatedAt: Date;
}
