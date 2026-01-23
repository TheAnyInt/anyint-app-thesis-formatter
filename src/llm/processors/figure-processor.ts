import { Logger } from '@nestjs/common';

const logger = new Logger('FigureProcessor');

/**
 * Figure processing utilities for converting figure markers to LaTeX
 * Ensures figures have proper captions and labels for List of Figures
 */
export class FigureProcessor {
  // Counter for generating unique figure labels
  private static figureCounter = 0;

  /**
   * Reset figure counter (useful for testing or new documents)
   */
  static resetFigureCounter(): void {
    this.figureCounter = 0;
  }

  /**
   * Generate a caption for a figure based on context
   * If no context is available, generates a default caption
   */
  private static generateCaption(figureId: string, context?: string): string {
    // Try to extract a meaningful caption from surrounding context
    if (context) {
      // Look for patterns like "图X shows..." or "Figure X demonstrates..."
      const zhMatch = context.match(/图\s*\d*[：:.]?\s*([^。\n]{3,30})/);
      if (zhMatch) return zhMatch[1].trim();

      const enMatch = context.match(/[Ff]igure\s*\d*[：:.]?\s*([^.\n]{3,50})/);
      if (enMatch) return enMatch[1].trim();
    }

    // Default caption based on figure ID
    const figNum = figureId.match(/\d+/)?.[0] || '1';
    return `图 ${figNum}`;
  }

  /**
   * Convert [FIGURE:xxx] markers to proper LaTeX figure environments
   * This is a fallback for cases where the LLM didn't convert figures
   */
  static convertFigureMarkers(content: string): string {
    // Match [FIGURE:xxx] patterns that weren't converted to LaTeX
    const figureMarkerRegex = /\[FIGURE:((?:docximg|pdfimg)\d+)(?::[\w_]+)?\]/g;

    // First, check if any unconverted markers exist
    if (!figureMarkerRegex.test(content)) {
      return content;
    }

    // Reset regex after test
    figureMarkerRegex.lastIndex = 0;

    return content.replace(figureMarkerRegex, (match, figureId) => {
      this.figureCounter++;

      // Try to get context from surrounding text (50 chars before/after)
      const matchIndex = content.indexOf(match);
      const contextBefore = content.slice(Math.max(0, matchIndex - 100), matchIndex);
      const contextAfter = content.slice(matchIndex + match.length, matchIndex + match.length + 100);
      const context = contextBefore + contextAfter;

      const caption = this.generateCaption(figureId, context);
      const label = `fig:${figureId}`;

      logger.log(`Converting figure marker: ${figureId} with caption: ${caption}`);

      // Generate LaTeX figure environment
      return `\\begin{figure}[H]
    \\centering
    \\includegraphics[width=0.8\\textwidth]{${figureId}.png}
    \\caption{${caption}}
    \\label{${label}}
\\end{figure}`;
    });
  }

  /**
   * Ensure existing LaTeX figures have captions and labels
   * Fixes cases where \begin{figure} exists but caption/label is missing
   */
  static ensureFigureCaptions(content: string): string {
    // Match figure environments that might be missing caption or label
    const figureEnvRegex = /\\begin\{figure\}(\[[\w!]*\])?\s*([\s\S]*?)\\end\{figure\}/g;

    return content.replace(figureEnvRegex, (match, placement, body) => {
      // Check if caption exists
      const hasCaption = /\\caption\{/.test(body);
      // Check if label exists
      const hasLabel = /\\label\{/.test(body);

      if (hasCaption && hasLabel) {
        return match; // Already complete
      }

      // Extract figure ID from includegraphics
      const imgMatch = body.match(/\\includegraphics[^{]*\{([^}]+)\}/);
      if (!imgMatch) {
        return match; // Can't determine figure ID
      }

      const figureId = imgMatch[1].replace(/\.(png|jpg|jpeg|pdf)$/i, '');
      this.figureCounter++;

      let newBody = body.trim();

      // Add caption if missing
      if (!hasCaption) {
        const caption = this.generateCaption(figureId);
        // Insert caption before \end{figure}
        newBody = newBody + `\n    \\caption{${caption}}`;
        logger.log(`Added missing caption to figure: ${figureId}`);
      }

      // Add label if missing
      if (!hasLabel) {
        const label = `fig:${figureId}`;
        newBody = newBody + `\n    \\label{${label}}`;
        logger.log(`Added missing label to figure: ${figureId}`);
      }

      const placementStr = placement || '[H]';
      return `\\begin{figure}${placementStr}\n${newBody}\n\\end{figure}`;
    });
  }

  /**
   * Process all figures in content
   * 1. Convert remaining [FIGURE:xxx] markers to LaTeX
   * 2. Ensure all figure environments have captions and labels
   */
  static process(content: string): string {
    let result = this.convertFigureMarkers(content);
    result = this.ensureFigureCaptions(result);
    return result;
  }
}
