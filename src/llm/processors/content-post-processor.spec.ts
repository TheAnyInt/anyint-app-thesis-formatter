import { ContentPostProcessor } from './content-post-processor';

describe('ContentPostProcessor', () => {
  describe('process', () => {
    it('should process formulas and tables in correct order', () => {
      const input = `这是一段包含公式 𝛼 + 𝛽 = 𝛾 的文字。

| 列1 | 列2 |
|---|---|
| A | B |
`;
      const result = ContentPostProcessor.process(input);

      expect(result).toContain('\\alpha');
      expect(result).toContain('\\begin{table}');
    });

    it('should handle content with only formulas', () => {
      const input = '公式：∑ 𝑖 = ∞';
      const result = ContentPostProcessor.process(input);

      expect(result).toContain('\\sum');
      expect(result).toContain('\\infty');
    });

    it('should handle content with only tables', () => {
      const input = `[TABLE_START]
[TABLE_CELL: 数据集]
[TABLE_CELL: 大小]
[TABLE_CELL: MNIST]
[TABLE_CELL: 60000]
[TABLE_END]`;
      const result = ContentPostProcessor.process(input);

      expect(result).toContain('\\begin{tabular}');
      expect(result).toContain('数据集 & 大小');
    });

    it('should handle plain text without modification', () => {
      const input = '这是普通文本，没有任何特殊格式。';
      const result = ContentPostProcessor.process(input);

      expect(result).toBe(input);
    });

    it('should handle complex mixed content', () => {
      const input = `损失函数定义为 𝐿 = ∑ 𝑦ᵢ log(𝑝ᵢ)，其中 𝑦ᵢ 是真实标签。

实验结果如下：

| 模型 | 准确率 |
|---|---|
| CNN | 95% |
| RNN | 92% |

可以看出 𝛼 = 0.01 时效果最佳。`;
      const result = ContentPostProcessor.process(input);

      expect(result).toContain('\\sum');
      expect(result).toContain('\\begin{table}');
      expect(result).toContain('\\alpha');
      expect(result).toContain('损失函数定义为');
      expect(result).toContain('可以看出');
    });

    it('should process TABLE_CELL format correctly', () => {
      const input = `[TABLE_START]
[TABLE_CELL: 方法]
[TABLE_CELL: 精度]
[TABLE_CELL: 召回]
[TABLE_CELL: Method A]
[TABLE_CELL: 0.95]
[TABLE_CELL: 0.93]
[TABLE_CELL: Method B]
[TABLE_CELL: 0.92]
[TABLE_CELL: 0.91]
[TABLE_END]`;
      const result = ContentPostProcessor.process(input);

      expect(result).toContain('\\begin{tabular}');
      expect(result).toContain('方法 & 精度 & 召回');
      expect(result).toContain('Method A & 0.95 & 0.93');
    });
  });
});
