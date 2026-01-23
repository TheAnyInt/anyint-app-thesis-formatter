import { Logger } from '@nestjs/common';

const logger = new Logger('TableProcessor');

/**
 * Table processing utilities for converting various table formats to LaTeX
 */
export class TableProcessor {
  // Counter for generating unique table labels
  private static tableCounter = 0;

  /**
   * Reset table counter (useful for testing or new documents)
   */
  static resetTableCounter(): void {
    this.tableCounter = 0;
  }

  /**
   * Generate a caption from header row content
   * Creates a meaningful caption for List of Tables
   */
  private static generateCaption(headers: string[]): string {
    if (!headers || headers.length === 0) return '表格数据';

    // Filter out purely numeric or empty headers
    const meaningfulHeaders = headers.filter(h =>
      h && !/^[\d,.\-+%]+$/.test(h.trim())
    );

    if (meaningfulHeaders.length === 0) return '表格数据';

    // Use first 2-3 meaningful headers to create caption
    const captionParts = meaningfulHeaders.slice(0, 3);
    return captionParts.join('、');
  }

  /**
   * Build a complete LaTeX table with caption and label
   */
  private static buildLatexTable(rows: string[][], numCols: number): string {
    this.tableCounter++;
    const colSpec = '|' + 'c|'.repeat(numCols);
    const caption = this.generateCaption(rows[0]);
    const label = `tab:auto_${this.tableCounter}`;

    let latex = '\\begin{table}[H]\n\\centering\n';
    latex += `\\caption{${caption}}\n`;
    latex += `\\label{${label}}\n`;
    latex += `\\begin{tabular}{${colSpec}}\n\\hline\n`;

    // Header row
    latex += rows[0].join(' & ') + ' \\\\\\\\ \\hline\n';

    // Data rows
    for (let i = 1; i < rows.length; i++) {
      const row = [...rows[i]];
      // Ensure row has correct number of columns
      while (row.length < numCols) row.push('');
      latex += row.slice(0, numCols).join(' & ') + ' \\\\\\\\ \\hline\n';
    }

    latex += '\\end{tabular}\n\\end{table}';
    return latex;
  }

  // Classify cell into a type based on content
  private static getCellType(cell: string): string {
    if (/^[\d,.\-+%]+$/.test(cell)) return 'num';
    if (/^[\u4e00-\u9fa5]+$/.test(cell)) return 'chn';
    if (/^[a-zA-Z]+$/.test(cell)) return 'eng';
    if (/^[a-zA-Z][\w\-]*$/.test(cell)) return 'id';
    return 'mix';
  }

  // Data-driven column detection: find the column count that maximizes row consistency
  private static detectColumns(cells: string[]): { numCols: number; confidence: number } {
    const types = cells.map(c => this.getCellType(c));

    // All same type = ambiguous structure
    const uniqueTypes = new Set(types);
    if (uniqueTypes.size === 1) return { numCols: 0, confidence: 0 };

    let bestScore = 0;
    let bestCols = 0;

    // Try each candidate column count
    for (let numCols = 2; numCols <= Math.min(8, Math.floor(cells.length / 2)); numCols++) {
      // Must divide evenly or nearly evenly
      if (cells.length % numCols > 1) continue;

      const numRows = Math.floor(cells.length / numCols);
      if (numRows < 2) continue;

      // Split types into rows
      const typeRows: string[][] = [];
      for (let i = 0; i < numRows * numCols; i += numCols) {
        typeRows.push(types.slice(i, i + numCols));
      }

      // Score 1: Column type consistency in data rows (rows 1+)
      // For each column, count how many data cells have the same type
      let columnConsistency = 0;
      for (let col = 0; col < numCols; col++) {
        const colTypes = typeRows.slice(1).map(row => row[col]);
        const typeCounts = new Map<string, number>();
        for (const t of colTypes) {
          typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
        }
        const maxCount = Math.max(...typeCounts.values());
        columnConsistency += maxCount / colTypes.length;
      }
      columnConsistency /= numCols;

      // Score 2: Header distinctiveness (first row differs from data rows)
      let headerDistinct = 0;
      const dataTypePattern = typeRows.slice(1).map(row => row.join(',')).join('|');
      const headerPattern = typeRows[0].join(',');
      // Check if header row type pattern differs from typical data row
      if (!dataTypePattern.includes(headerPattern)) {
        headerDistinct = 0.3;
      }
      // Bonus if first row has more text types than data rows
      const headerTextCount = typeRows[0].filter(t => t !== 'num').length;
      const avgDataTextCount = typeRows.slice(1).reduce((sum, row) =>
        sum + row.filter(t => t !== 'num').length, 0) / (numRows - 1);
      if (headerTextCount > avgDataTextCount) {
        headerDistinct += 0.2;
      }

      // Score 3: Penalty for leftover cells
      const usedCells = numRows * numCols;
      const cellPenalty = (cells.length - usedCells) / cells.length;

      // Combined score
      const score = columnConsistency * 0.6 + headerDistinct * 0.3 - cellPenalty * 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestCols = numCols;
      }
    }

    // Require minimum confidence threshold
    if (bestScore < 0.4) return { numCols: 0, confidence: 0 };

    return { numCols: bestCols, confidence: bestScore };
  }
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

        // Build LaTeX table with caption
        const allRows = [headers, ...rows];
        return this.buildLatexTable(allRows, numCols);
      } catch (e) {
        logger.warn(`Failed to convert markdown table: ${e}`);
        return match;
      }
    });
  }

  /**
   * Convert [TABLE_CELL:] format from PDF extraction to LaTeX
   * Supports two patterns:
   * 1. New structured format from LLM: [TABLE cols=N]...[/TABLE]
   * 2. Fallback: old [TABLE_START]...[TABLE_END] with [TABLE_CELL:] markers
   */
  static convertTableCellsToLatex(content: string): string {
    // Pattern 1: New structured format from LLM
    // [TABLE cols=3]
    // [HEADER]A|B|C[/HEADER]
    // [ROW]1|2|3[/ROW]
    // [/TABLE]
    const structuredTableRegex = /\[TABLE cols=(\d+)\]\n([\s\S]*?)\[\/TABLE\]/g;

    content = content.replace(structuredTableRegex, (match, colsStr, tableContent) => {
      try {
        const numCols = parseInt(colsStr, 10);
        const rows: string[][] = [];

        // Extract header
        const headerMatch = tableContent.match(/\[HEADER\](.*?)\[\/HEADER\]/);
        if (headerMatch) {
          rows.push(headerMatch[1].split('|').map((c: string) => c.trim()));
        }

        // Extract data rows
        const rowRegex = /\[ROW\](.*?)\[\/ROW\]/g;
        let rowMatch;
        while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
          rows.push(rowMatch[1].split('|').map((c: string) => c.trim()));
        }

        if (rows.length < 2) return match;

        // Build LaTeX with caption
        return this.buildLatexTable(rows, numCols);
      } catch (e) {
        logger.warn(`Failed to convert structured table format: ${e}`);
        return match;
      }
    });

    // Pattern 2: Format with row markers from PyMuPDF
    const rowMarkerTableRegex = /\[TABLE_START\]\n([\s\S]*?)\[TABLE_END\]/g;

    content = content.replace(rowMarkerTableRegex, (match, tableContent) => {
      try {
        // Check if it has row markers (from PyMuPDF native detection)
        if (tableContent.includes('[TABLE_ROW:')) {
          const rows: string[][] = [];
          // Split content by row markers
          const rowSections = tableContent.split(/\[TABLE_ROW:\d+\]\s*/);
          for (const section of rowSections) {
            if (!section.trim()) continue;
            const cellRegex = /\[TABLE_CELL:\s*([^\]]*)\]/g;
            const cells: string[] = [];
            let cellMatch;
            while ((cellMatch = cellRegex.exec(section)) !== null) {
              cells.push(cellMatch[1].trim());
            }
            if (cells.length > 0) rows.push(cells);
          }

          // Validate we have enough rows
          if (rows.length < 2) {
            logger.warn('Table with row markers too small');
            return match;
          }

          // Determine column count from the first row
          const numCols = rows[0].length;
          if (numCols === 0) return match;

          // Build LaTeX table with caption
          return this.buildLatexTable(rows, numCols);
        }

        // Fallback: old [TABLE_START]...[TABLE_END] format without row markers
        // Extract all cells
        const cellRegex = /\[TABLE_CELL:\s*([^\]]+)\]/g;
        const cells: string[] = [];
        let cellMatch;
        while ((cellMatch = cellRegex.exec(tableContent)) !== null) {
          cells.push(cellMatch[1].trim());
        }

        if (cells.length < 4) return match; // Not enough cells for a table

        // Data-driven column detection
        const detection = this.detectColumns(cells);

        if (detection.numCols === 0) {
          logger.warn('Column detection failed, preserving original markers');
          return match;  // Keep original instead of guessing
        }

        const numCols = detection.numCols;

        // Validate reconstructed table
        const rows: string[][] = [];
        for (let i = 0; i < cells.length; i += numCols) {
          const row = cells.slice(i, i + numCols);
          if (row.length === numCols) {
            rows.push(row);
          }
        }

        // Validation: need header + at least 1 data row
        if (rows.length < 2) {
          logger.warn('Table too small after reconstruction');
          return match;
        }

        // Validation: check we didn't lose too many cells
        const usedCells = rows.length * numCols;
        if (usedCells < cells.length * 0.8) {
          logger.warn(`Lost ${cells.length - usedCells} cells, preserving original`);
          return match;
        }

        // Validation: header row should have at least one non-numeric cell
        const isNumeric = (cell: string) => /^[\d,.\-+%]+$/.test(cell);
        const hasTextHeader = rows[0].some(cell => !isNumeric(cell));
        if (!hasTextHeader) {
          logger.warn('No text headers found, preserving original');
          return match;
        }

        // Build LaTeX table with caption
        return this.buildLatexTable(rows, numCols);
      } catch (e) {
        logger.warn(`Failed to convert TABLE_CELL format: ${e}`);
        return match;
      }
    });

    return content;
  }
}
