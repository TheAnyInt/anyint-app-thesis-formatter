import { ThesisData } from '../thesis/dto/thesis-data.dto';
import { ContentPostProcessor } from './processors';

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
 * Retry configuration
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 2000,
  maxDelayMs: 10000,
};

/**
 * Delay helper for retry logic
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
export function calculateRetryDelay(retryCount: number): number {
  const delayMs = RETRY_CONFIG.baseDelayMs * Math.pow(2, retryCount);
  return Math.min(delayMs, RETRY_CONFIG.maxDelayMs);
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
        const processedContent = ContentPostProcessor.process(sec.content?.trim() || '');
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
