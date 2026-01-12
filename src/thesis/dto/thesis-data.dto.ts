export interface Section {
  title: string;
  content: string;
  level: 1 | 2 | 3; // 1=section, 2=subsection, 3=subsubsection
}

export interface Figure {
  id: string;
  filename: string;
  index: number;
  label: string;
  caption?: string;
}

export interface ThesisMetadata {
  title: string;
  title_en?: string;
  author_name: string;
  student_id?: string;
  school?: string;
  major?: string;
  supervisor?: string;
  date?: string;
}

export interface ThesisData {
  // Metadata (common to all theses)
  metadata: ThesisMetadata;

  // Abstract
  abstract?: string;
  abstract_en?: string;
  keywords?: string;
  keywords_en?: string;

  // ALL body sections as dynamic array
  sections: Section[];

  // Special sections (optional)
  references?: string;
  acknowledgements?: string;

  // Figures extracted from document
  figures?: Figure[];
}

// For backward compatibility during transition
export interface Chapter {
  title: string;
  content: string;
}
