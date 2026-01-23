// Re-export all public APIs for backward compatibility
export { buildChunkPrompt } from './prompt-builder';
export {
  parseChunkResponse,
  ChunkProcessingResult,
  RETRY_CONFIG,
  delay,
  calculateRetryDelay,
} from './response-parser';

export {
  FormulaProcessor,
  TableProcessor,
  ContentPostProcessor,
} from './processors';

// Backward compatible aliases - keep old function names working
import { ContentPostProcessor } from './processors';
import { TableProcessor } from './processors';
import { FormulaProcessor } from './processors';

export const postProcessSectionContent = ContentPostProcessor.process.bind(ContentPostProcessor);
export const convertMarkdownTablesToLatex = TableProcessor.convertMarkdownTablesToLatex.bind(TableProcessor);
export const convertTableCellsToLatex = TableProcessor.convertTableCellsToLatex.bind(TableProcessor);
export const convertUnicodeMathToLatex = FormulaProcessor.convertUnicodeMathToLatex.bind(FormulaProcessor);
export const reconstructFormulas = FormulaProcessor.reconstructFormulas.bind(FormulaProcessor);
