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
    // Tests for new structured format from LLM
    it('should convert structured table format from LLM', () => {
      const input = `[TABLE cols=3]
[HEADER]Dataset|Classes|Samples[/HEADER]
[ROW]CIFAR-10|10|60000[/ROW]
[ROW]ImageNet|1000|1.2M[/ROW]
[/TABLE]`;
      const result = TableProcessor.convertTableCellsToLatex(input);
      expect(result).toContain('{|c|c|c|}');
      expect(result).toContain('Dataset & Classes & Samples');
      expect(result).toContain('CIFAR-10 & 10 & 60000');
      expect(result).toContain('ImageNet & 1000 & 1.2M');
    });

    it('should handle mixed content in structured format', () => {
      const input = `[TABLE cols=4]
[HEADER]模型|Accuracy|F1|参数量[/HEADER]
[ROW]ResNet|95.2%|94.8|25M[/ROW]
[/TABLE]`;
      const result = TableProcessor.convertTableCellsToLatex(input);
      expect(result).toContain('模型 & Accuracy & F1 & 参数量');
      expect(result).toContain('ResNet & 95.2% & 94.8 & 25M');
      expect(result).toContain('{|c|c|c|c|}');
    });

    it('should handle structured format with multiple rows', () => {
      const input = `[TABLE cols=2]
[HEADER]Name|Value[/HEADER]
[ROW]A|1[/ROW]
[ROW]B|2[/ROW]
[ROW]C|3[/ROW]
[/TABLE]`;
      const result = TableProcessor.convertTableCellsToLatex(input);
      expect(result).toContain('\\begin{table}');
      expect(result).toContain('Name & Value');
      expect(result).toContain('A & 1');
      expect(result).toContain('B & 2');
      expect(result).toContain('C & 3');
    });

    it('should preserve structured format if too few rows', () => {
      const input = `[TABLE cols=3]
[HEADER]A|B|C[/HEADER]
[/TABLE]`;
      const result = TableProcessor.convertTableCellsToLatex(input);
      expect(result).toContain('[TABLE cols=3]');
    });

    it('should handle content surrounding structured table', () => {
      const input = `前面的文字

[TABLE cols=2]
[HEADER]X|Y[/HEADER]
[ROW]1|2[/ROW]
[/TABLE]

后面的文字`;
      const result = TableProcessor.convertTableCellsToLatex(input);
      expect(result).toContain('前面的文字');
      expect(result).toContain('后面的文字');
      expect(result).toContain('\\begin{table}');
    });

    // Original tests for TABLE_CELL format fallback
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

    it('should handle English headers', () => {
      const input = `[TABLE_START]
[TABLE_CELL: Dataset]
[TABLE_CELL: Classes]
[TABLE_CELL: Samples]
[TABLE_CELL: CIFAR-10]
[TABLE_CELL: 10]
[TABLE_CELL: 60000]
[TABLE_END]`;
      const result = TableProcessor.convertTableCellsToLatex(input);
      expect(result).toContain('Dataset & Classes & Samples');
      expect(result).toContain('CIFAR-10 & 10 & 60000');
    });

    it('should handle mixed Chinese/English headers', () => {
      const input = `[TABLE_START]
[TABLE_CELL: 模型]
[TABLE_CELL: Accuracy]
[TABLE_CELL: F1]
[TABLE_CELL: ResNet]
[TABLE_CELL: 95.2]
[TABLE_CELL: 94.8]
[TABLE_END]`;
      const result = TableProcessor.convertTableCellsToLatex(input);
      expect(result).toContain('模型 & Accuracy & F1');
    });

    it('should preserve original when detection fails', () => {
      const input = `[TABLE_START]
[TABLE_CELL: 1]
[TABLE_CELL: 2]
[TABLE_CELL: 3]
[TABLE_CELL: 4]
[TABLE_CELL: 5]
[TABLE_END]`;
      const result = TableProcessor.convertTableCellsToLatex(input);
      // All numeric, ambiguous structure - should preserve
      expect(result).toContain('[TABLE_START]');
    });

    it('should handle 4-column tables correctly', () => {
      const input = `[TABLE_START]
[TABLE_CELL: Name]
[TABLE_CELL: Type]
[TABLE_CELL: Size]
[TABLE_CELL: Score]
[TABLE_CELL: ModelA]
[TABLE_CELL: CNN]
[TABLE_CELL: 10M]
[TABLE_CELL: 92.5]
[TABLE_CELL: ModelB]
[TABLE_CELL: RNN]
[TABLE_CELL: 5M]
[TABLE_CELL: 89.3]
[TABLE_END]`;
      const result = TableProcessor.convertTableCellsToLatex(input);
      expect(result).toContain('{|c|c|c|c|}');
      expect(result).toContain('Name & Type & Size & Score');
    });

    // Tests for new row marker format from PyMuPDF native detection
    it('should convert table with row markers', () => {
      const input = `[TABLE_START]
[TABLE_ROW:0]
[TABLE_CELL: Dataset]
[TABLE_CELL: Accuracy]
[TABLE_ROW:1]
[TABLE_CELL: CIFAR-10]
[TABLE_CELL: 95.2%]
[TABLE_END]`;
      const result = TableProcessor.convertTableCellsToLatex(input);
      expect(result).toContain('Dataset & Accuracy');
      expect(result).toContain('CIFAR-10 & 95.2%');
    });

    it('should handle row markers with multiple rows', () => {
      const input = `[TABLE_START]
[TABLE_ROW:0]
[TABLE_CELL: Model]
[TABLE_CELL: Params]
[TABLE_CELL: F1]
[TABLE_ROW:1]
[TABLE_CELL: ResNet]
[TABLE_CELL: 25M]
[TABLE_CELL: 94.8]
[TABLE_ROW:2]
[TABLE_CELL: VGG]
[TABLE_CELL: 138M]
[TABLE_CELL: 93.2]
[TABLE_END]`;
      const result = TableProcessor.convertTableCellsToLatex(input);
      expect(result).toContain('{|c|c|c|}');
      expect(result).toContain('Model & Params & F1');
      expect(result).toContain('ResNet & 25M & 94.8');
      expect(result).toContain('VGG & 138M & 93.2');
    });

    it('should handle row markers with empty cells', () => {
      const input = `[TABLE_START]
[TABLE_ROW:0]
[TABLE_CELL: A]
[TABLE_CELL: B]
[TABLE_ROW:1]
[TABLE_CELL: 1]
[TABLE_CELL: ]
[TABLE_END]`;
      const result = TableProcessor.convertTableCellsToLatex(input);
      expect(result).toContain('A & B');
      expect(result).toContain('1 &');
    });

    it('should preserve row marker table if too few rows', () => {
      const input = `[TABLE_START]
[TABLE_ROW:0]
[TABLE_CELL: Only]
[TABLE_CELL: Header]
[TABLE_END]`;
      const result = TableProcessor.convertTableCellsToLatex(input);
      expect(result).toContain('[TABLE_START]');
    });
  });
});
