import { FigureProcessor } from './figure-processor';

describe('FigureProcessor', () => {
  // Reset counter before each test
  beforeEach(() => {
    FigureProcessor.resetFigureCounter();
  });

  describe('convertFigureMarkers', () => {
    it('should convert [FIGURE:xxx] marker to LaTeX figure environment', () => {
      const input = '这是一段文字 [FIGURE:docximg1] 这是后续文字';
      const result = FigureProcessor.convertFigureMarkers(input);

      expect(result).toContain('\\begin{figure}[H]');
      expect(result).toContain('\\includegraphics[width=0.8\\textwidth]{docximg1.png}');
      expect(result).toContain('\\caption{');
      expect(result).toContain('\\label{fig:docximg1}');
      expect(result).toContain('\\end{figure}');
    });

    it('should handle pdfimg markers', () => {
      const input = '[FIGURE:pdfimg2]';
      const result = FigureProcessor.convertFigureMarkers(input);

      expect(result).toContain('\\includegraphics[width=0.8\\textwidth]{pdfimg2.png}');
      expect(result).toContain('\\label{fig:pdfimg2}');
    });

    it('should handle markers with extraction status', () => {
      const input = '[FIGURE:pdfimg3:extraction_failed]';
      const result = FigureProcessor.convertFigureMarkers(input);

      expect(result).toContain('\\includegraphics[width=0.8\\textwidth]{pdfimg3.png}');
      expect(result).toContain('\\label{fig:pdfimg3}');
    });

    it('should convert multiple figure markers', () => {
      const input = '[FIGURE:docximg1] 文字 [FIGURE:docximg2]';
      const result = FigureProcessor.convertFigureMarkers(input);

      expect(result).toContain('\\label{fig:docximg1}');
      expect(result).toContain('\\label{fig:docximg2}');
    });

    it('should not modify content without figure markers', () => {
      const input = '这是普通文本，没有图片标记。';
      const result = FigureProcessor.convertFigureMarkers(input);

      expect(result).toBe(input);
    });

    it('should not modify already converted LaTeX figures', () => {
      const input = `\\begin{figure}[H]
    \\centering
    \\includegraphics[width=0.8\\textwidth]{docximg1.png}
    \\caption{测试图片}
    \\label{fig:docximg1}
\\end{figure}`;
      const result = FigureProcessor.convertFigureMarkers(input);

      expect(result).toBe(input);
    });

    it('should try to extract caption from context', () => {
      const input = '图1展示了实验结果 [FIGURE:docximg1] 可以看到性能提升';
      const result = FigureProcessor.convertFigureMarkers(input);

      // Should extract some context for caption
      expect(result).toContain('\\caption{');
    });
  });

  describe('ensureFigureCaptions', () => {
    it('should add missing caption to figure environment', () => {
      const input = `\\begin{figure}[H]
    \\centering
    \\includegraphics[width=0.8\\textwidth]{docximg1.png}
\\end{figure}`;
      const result = FigureProcessor.ensureFigureCaptions(input);

      expect(result).toContain('\\caption{');
      expect(result).toContain('\\label{fig:docximg1}');
    });

    it('should add missing label to figure with caption', () => {
      const input = `\\begin{figure}[H]
    \\centering
    \\includegraphics[width=0.8\\textwidth]{docximg2.png}
    \\caption{已有标题}
\\end{figure}`;
      const result = FigureProcessor.ensureFigureCaptions(input);

      expect(result).toContain('\\label{fig:docximg2}');
    });

    it('should not modify complete figure environment', () => {
      const input = `\\begin{figure}[H]
    \\centering
    \\includegraphics[width=0.8\\textwidth]{docximg1.png}
    \\caption{完整标题}
    \\label{fig:docximg1}
\\end{figure}`;
      const result = FigureProcessor.ensureFigureCaptions(input);

      // Count occurrences - should not add duplicate
      const captionCount = (result.match(/\\caption/g) || []).length;
      const labelCount = (result.match(/\\label/g) || []).length;

      expect(captionCount).toBe(1);
      expect(labelCount).toBe(1);
    });

    it('should handle figure environment without placement option', () => {
      const input = `\\begin{figure}
    \\centering
    \\includegraphics{test.png}
\\end{figure}`;
      const result = FigureProcessor.ensureFigureCaptions(input);

      expect(result).toContain('\\caption{');
      expect(result).toContain('\\label{fig:test}');
    });
  });

  describe('process', () => {
    it('should process both markers and ensure captions', () => {
      const input = `[FIGURE:docximg1]

\\begin{figure}[H]
    \\centering
    \\includegraphics{docximg2.png}
\\end{figure}`;

      const result = FigureProcessor.process(input);

      // First figure (from marker) should have caption/label
      expect(result).toContain('\\label{fig:docximg1}');
      // Second figure (missing caption/label) should have them added
      expect(result).toContain('\\label{fig:docximg2}');
    });

    it('should handle content with no figures', () => {
      const input = '普通文本内容，没有图片。';
      const result = FigureProcessor.process(input);

      expect(result).toBe(input);
    });
  });
});
