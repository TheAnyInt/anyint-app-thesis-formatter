import { FormulaProcessor } from './formula-processor';
import { TableProcessor } from './table-processor';
import { FigureProcessor } from './figure-processor';

/**
 * Orchestrates post-processing steps for section content
 */
export class ContentPostProcessor {
  /**
   * Post-process section content to fix common issues
   * Executes in order: formula reconstruction → Unicode conversion → table conversion → figure conversion
   */
  static process(content: string): string {
    // First, try to reconstruct fragmented formulas
    let result = FormulaProcessor.reconstructFormulas(content);
    // Convert Unicode math to LaTeX
    result = FormulaProcessor.convertUnicodeMathToLatex(result);
    // Convert [TABLE_CELL:] format from PDF extraction
    result = TableProcessor.convertTableCellsToLatex(result);
    // Convert any remaining markdown tables to LaTeX
    result = TableProcessor.convertMarkdownTablesToLatex(result);
    // Convert [FIGURE:xxx] markers and ensure captions/labels for List of Figures
    result = FigureProcessor.process(result);
    return result;
  }
}
