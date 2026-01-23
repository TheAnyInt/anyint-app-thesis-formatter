import { Logger } from '@nestjs/common';

const logger = new Logger('TableProcessor');

/**
 * Table processing utilities for converting various table formats to LaTeX
 */
export class TableProcessor {
  /**
   * Convert markdown tables to LaTeX tabular format
   * This is a fallback in case the LLM doesn't convert them
   */
  static convertMarkdownTablesToLatex(content: string): string {
    // Match markdown table pattern: | col1 | col2 | ... followed by |---|---| separator
    const tableRegex = /(\|[^\n]+\|\n)(\|[-:\s|]+\|\n)((?:\|[^\n]+\|\n?)+)/g;

    return content.replace(tableRegex, (match, headerRow, separatorRow, bodyRows) => {
      try {
        // Parse header
        const headers = headerRow.split('|').filter((h: string) => h.trim()).map((h: string) => h.trim());
        const numCols = headers.length;

        if (numCols === 0) return match;

        // Parse body rows
        const rows: string[][] = [];
        const bodyLines = bodyRows.trim().split('\n');
        for (const line of bodyLines) {
          const cells = line.split('|').filter((c: string) => c.trim() !== '' || c === '').slice(0, -1);
          // Skip empty lines
          if (cells.length > 0 && cells.some((c: string) => c.trim())) {
            // Pad or trim to match header columns
            const row = cells.slice(cells[0] === '' ? 1 : 0).map((c: string) => c.trim());
            if (row.length > 0) {
              rows.push(row);
            }
          }
        }

        // Build LaTeX table
        const colSpec = '|' + 'c|'.repeat(numCols);
        let latex = '\\begin{table}[H]\n\\centering\n';
        latex += `\\begin{tabular}{${colSpec}}\n\\hline\n`;
        latex += headers.join(' & ') + ' \\\\\\\\ \\hline\n';
        for (const row of rows) {
          // Ensure row has correct number of columns
          while (row.length < numCols) row.push('');
          latex += row.slice(0, numCols).join(' & ') + ' \\\\\\\\ \\hline\n';
        }
        latex += '\\end{tabular}\n\\end{table}';

        return latex;
      } catch (e) {
        logger.warn(`Failed to convert markdown table: ${e}`);
        return match;
      }
    });
  }

  /**
   * Convert [TABLE_CELL:] format from PDF extraction to LaTeX
   */
  static convertTableCellsToLatex(content: string): string {
    // Match [TABLE_START]...[TABLE_END] blocks
    const tableBlockRegex = /\[TABLE_START\]\n([\s\S]*?)\[TABLE_END\]/g;

    return content.replace(tableBlockRegex, (match, cellsContent) => {
      try {
        // Extract all cells
        const cellRegex = /\[TABLE_CELL:\s*([^\]]+)\]/g;
        const cells: string[] = [];
        let cellMatch;
        while ((cellMatch = cellRegex.exec(cellsContent)) !== null) {
          cells.push(cellMatch[1].trim());
        }

        if (cells.length < 4) return match; // Not enough cells for a table

        // Try to determine number of columns by analyzing content
        // Heuristic: headers are usually short Chinese text, data rows start with alphanumeric identifiers
        let numCols = 4; // Default assumption

        // Count consecutive Chinese-only text cells at the start (likely headers)
        let headerCount = 0;
        for (const cell of cells) {
          // Check if cell is Chinese text (header candidate)
          if (/^[\u4e00-\u9fa5]+$/.test(cell)) {
            headerCount++;
            if (headerCount > 6) break;
          } else {
            // Found non-Chinese cell (data row starts)
            break;
          }
        }

        // If we found 2-6 Chinese headers, use that as column count
        if (headerCount >= 2 && headerCount <= 6) {
          numCols = headerCount;
        } else {
          // Fallback: try to detect repeating patterns
          // Look for the first numeric value and count cells before next occurrence of similar pattern
          const numericPattern = /^[\d,.\-+%]+$/;
          for (let i = 0; i < Math.min(10, cells.length); i++) {
            if (numericPattern.test(cells[i])) {
              // Found first number, look for next occurrence of number after non-numbers
              for (let j = i + 1; j < Math.min(i + 8, cells.length); j++) {
                if (numericPattern.test(cells[j]) && j - i >= 2 && j - i <= 6) {
                  numCols = j - i + 1; // Include the number in the count
                  break;
                }
              }
              break;
            }
          }
        }

        // Group cells into rows
        const rows: string[][] = [];
        for (let i = 0; i < cells.length; i += numCols) {
          const row = cells.slice(i, i + numCols);
          if (row.length === numCols) {
            rows.push(row);
          }
        }

        if (rows.length < 2) return match; // Need at least header + 1 data row

        // Build LaTeX table
        const colSpec = '|' + 'c|'.repeat(numCols);
        let latex = '\\begin{table}[H]\n\\centering\n';
        latex += `\\begin{tabular}{${colSpec}}\n\\hline\n`;

        // Header row
        latex += rows[0].join(' & ') + ' \\\\\\\\ \\hline\n';

        // Data rows
        for (let i = 1; i < rows.length; i++) {
          latex += rows[i].join(' & ') + ' \\\\\\\\ \\hline\n';
        }

        latex += '\\end{tabular}\n\\end{table}';
        return latex;
      } catch (e) {
        logger.warn(`Failed to convert TABLE_CELL format: ${e}`);
        return match;
      }
    });
  }
}
