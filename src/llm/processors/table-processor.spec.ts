import { TableProcessor } from './table-processor';

describe('TableProcessor', () => {
  describe('convertMarkdownTablesToLatex', () => {
    it('should convert simple markdown table', () => {
      const input = `| 列1 | 列2 | 列3 |
|---|---|---|
| 数据1 | 数据2 | 数据3 |
| 数据4 | 数据5 | 数据6 |
`;
      const result = TableProcessor.convertMarkdownTablesToLatex(input);

      expect(result).toContain('\\begin{table}');
      expect(result).toContain('\\begin{tabular}');
      expect(result).toContain('\\end{tabular}');
      expect(result).toContain('\\end{table}');
      expect(result).toContain('列1 & 列2 & 列3');
      expect(result).toContain('数据1 & 数据2 & 数据3');
    });

    it('should handle table with alignment markers', () => {
      const input = `| Left | Center | Right |
|:---|:---:|---:|
| A | B | C |
`;
      const result = TableProcessor.convertMarkdownTablesToLatex(input);

      expect(result).toContain('\\begin{tabular}');
      expect(result).toContain('Left & Center & Right');
    });

    it('should preserve non-table content', () => {
      const input = `这是表格前的文字。

| 列1 | 列2 |
|---|---|
| A | B |

这是表格后的文字。`;
      const result = TableProcessor.convertMarkdownTablesToLatex(input);

      expect(result).toContain('这是表格前的文字');
      expect(result).toContain('这是表格后的文字');
      expect(result).toContain('\\begin{table}');
    });

    it('should handle empty cells', () => {
      const input = `| A | B |
|---|---|
| 1 |  |
`;
      const result = TableProcessor.convertMarkdownTablesToLatex(input);

      expect(result).toContain('\\begin{tabular}');
    });

    it('should not modify content without tables', () => {
      const input = '这是普通文本，没有表格。';
      const result = TableProcessor.convertMarkdownTablesToLatex(input);

      expect(result).toBe(input);
    });
  });

  describe('convertTableCellsToLatex', () => {
    it('should convert TABLE_CELL format to LaTeX', () => {
      const input = `[TABLE_START]
[TABLE_CELL: 数据集]
[TABLE_CELL: 类别数]
[TABLE_CELL: CIFAR-10]
[TABLE_CELL: 10]
[TABLE_END]`;
      const result = TableProcessor.convertTableCellsToLatex(input);

      expect(result).toContain('\\begin{table}');
      expect(result).toContain('\\begin{tabular}');
      expect(result).toContain('数据集 & 类别数');
      expect(result).toContain('CIFAR-10 & 10');
    });

    it('should handle table with Chinese headers', () => {
      const input = `[TABLE_START]
[TABLE_CELL: 名称]
[TABLE_CELL: 数量]
[TABLE_CELL: 价格]
[TABLE_CELL: 苹果]
[TABLE_CELL: 5]
[TABLE_CELL: 10]
[TABLE_CELL: 香蕉]
[TABLE_CELL: 3]
[TABLE_CELL: 6]
[TABLE_END]`;
      const result = TableProcessor.convertTableCellsToLatex(input);

      expect(result).toContain('\\begin{tabular}');
      expect(result).toContain('名称 & 数量 & 价格');
    });

    it('should preserve content outside table blocks', () => {
      const input = `表格说明：
[TABLE_START]
[TABLE_CELL: A]
[TABLE_CELL: B]
[TABLE_CELL: 1]
[TABLE_CELL: 2]
[TABLE_END]
表格结束。`;
      const result = TableProcessor.convertTableCellsToLatex(input);

      expect(result).toContain('表格说明');
      expect(result).toContain('表格结束');
    });

    it('should return original if not enough cells', () => {
      const input = `[TABLE_START]
[TABLE_CELL: A]
[TABLE_CELL: B]
[TABLE_END]`;
      const result = TableProcessor.convertTableCellsToLatex(input);

      // Should return original because less than 4 cells (minimum for header + 1 row)
      expect(result).toContain('[TABLE_START]');
    });

    it('should not modify content without table markers', () => {
      const input = '普通文本，没有表格标记。';
      const result = TableProcessor.convertTableCellsToLatex(input);

      expect(result).toBe(input);
    });

    it('should handle multiple tables with Chinese headers', () => {
      const input = `[TABLE_START]
[TABLE_CELL: 名称]
[TABLE_CELL: 数值]
[TABLE_CELL: 项目A]
[TABLE_CELL: 100]
[TABLE_END]

中间文字

[TABLE_START]
[TABLE_CELL: 类别]
[TABLE_CELL: 数量]
[TABLE_CELL: 类型X]
[TABLE_CELL: 50]
[TABLE_END]`;
      const result = TableProcessor.convertTableCellsToLatex(input);

      expect(result).toContain('中间文字');
      const tableCount = (result.match(/\\begin\{table\}/g) || []).length;
      expect(tableCount).toBe(2);
    });
  });
});
