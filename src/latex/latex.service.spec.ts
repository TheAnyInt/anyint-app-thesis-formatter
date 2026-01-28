import { LatexService } from './latex.service';

describe('LatexService', () => {
  let service: LatexService;

  beforeEach(() => {
    service = new LatexService();
  });

  describe('parseReferencesToArray (via prepareDocumentData)', () => {
    // Helper function to extract references array from prepared data
    const parseRefs = (refsString: string) => {
      const result = service.prepareDocumentData({ references: refsString });
      return result.references as Array<{ key: string; citation: string }>;
    };

    describe('numbered formats', () => {
      it('should parse [n] format (square brackets)', () => {
        const input = `[1] Smith, J. (2020). Title of Paper. Journal, 10(2), 100-110.
[2] Zhang, L. (2021). Another Paper. Conference Proceedings.
[3] Wang, M. (2019). Third Paper. Book Publisher.`;

        const refs = parseRefs(input);

        expect(refs).toHaveLength(3);
        expect(refs[0].key).toBe('ref1');
        expect(refs[0].citation).toContain('Smith, J.');
        expect(refs[1].citation).toContain('Zhang, L.');
        expect(refs[2].citation).toContain('Wang, M.');
      });

      it('should parse n. format (number with dot)', () => {
        const input = `1. Smith, J. (2020). Title of Paper. Journal, 10(2), 100-110.
2. Zhang, L. (2021). Another Paper. Conference Proceedings.
3. Wang, M. (2019). Third Paper. Book Publisher.`;

        const refs = parseRefs(input);

        expect(refs).toHaveLength(3);
        expect(refs[0].citation).toContain('Smith, J.');
        expect(refs[1].citation).toContain('Zhang, L.');
        expect(refs[2].citation).toContain('Wang, M.');
      });

      it('should parse n) format (number with parenthesis)', () => {
        const input = `1) Smith, J. (2020). Title of Paper. Journal.
2) Zhang, L. (2021). Another Paper. Conference.
3) Wang, M. (2019). Third Paper. Book.`;

        const refs = parseRefs(input);

        expect(refs).toHaveLength(3);
        expect(refs[0].citation).toContain('Smith, J.');
      });

      it('should parse 【n】format (Chinese fullwidth brackets)', () => {
        const input = `【1】张三. 论文标题[J]. 期刊名称, 2020, 10(2): 100-110.
【2】李四. 另一篇论文[J]. 期刊名称, 2021, 11(3): 200-210.
【3】王五. 第三篇论文[M]. 北京: 出版社, 2019.`;

        const refs = parseRefs(input);

        expect(refs).toHaveLength(3);
        expect(refs[0].citation).toContain('张三');
        expect(refs[1].citation).toContain('李四');
        expect(refs[2].citation).toContain('王五');
      });

      it('should parse (n) format (parentheses)', () => {
        const input = `(1) Smith, J. (2020). Title of Paper. Journal.
(2) Zhang, L. (2021). Another Paper. Conference.
(3) Wang, M. (2019). Third Paper. Book.`;

        const refs = parseRefs(input);

        expect(refs).toHaveLength(3);
        expect(refs[0].citation).toContain('Smith, J.');
      });

      it('should parse circled numbers format (①②③)', () => {
        const input = `① Smith, J. (2020). First Paper. Journal.
② Zhang, L. (2021). Second Paper. Conference.
③ Wang, M. (2019). Third Paper. Book.`;

        const refs = parseRefs(input);

        expect(refs).toHaveLength(3);
        expect(refs[0].citation).toContain('Smith, J.');
        expect(refs[1].citation).toContain('Zhang, L.');
        expect(refs[2].citation).toContain('Wang, M.');
      });
    });

    describe('multi-line references', () => {
      it('should handle references spanning multiple lines', () => {
        const input = `[1] Smith, J., Johnson, M., Williams, K., Brown, P., Davis, R.,
Miller, S., Wilson, T., Moore, L. (2020). A Very Long Title That
Spans Multiple Lines in the Reference List. Journal of Very Long
Names, 10(2), 100-110.
[2] Zhang, L. (2021). Short Reference. Another Journal.`;

        const refs = parseRefs(input);

        expect(refs).toHaveLength(2);
        expect(refs[0].citation).toContain('Smith, J.');
        expect(refs[0].citation).toContain('Miller, S.');
        expect(refs[0].citation).toContain('Spans Multiple Lines');
      });
    });

    describe('fallback to paragraph splitting', () => {
      it('should split by double newlines when no numbered format detected', () => {
        const input = `Smith, J. (2020). Title of Paper. Journal, 10(2), 100-110.

Zhang, L. (2021). Another Paper. Conference Proceedings, 50-60.

Wang, M. (2019). Third Paper. Beijing: Publisher.`;

        const refs = parseRefs(input);

        expect(refs).toHaveLength(3);
        expect(refs[0].citation).toContain('Smith, J.');
        expect(refs[1].citation).toContain('Zhang, L.');
        expect(refs[2].citation).toContain('Wang, M.');
      });

      it('should split by single newline with substantial content when no double newlines', () => {
        const input = `Smith, J. (2020). Title of Paper. Journal, 10(2), 100-110.
Zhang, L. (2021). Another Paper. Conference Proceedings, 50-60.
Wang, M. (2019). Third Paper. Beijing: Publisher, 2019.`;

        const refs = parseRefs(input);

        expect(refs).toHaveLength(3);
      });
    });

    describe('edge cases', () => {
      it('should handle empty input', () => {
        const refs = parseRefs('');

        expect(refs).toHaveLength(0);
      });

      it('should handle input with only whitespace', () => {
        const result = service.prepareDocumentData({ references: '   \n\n   \n  ' });
        // Empty/whitespace-only input should not create hasReferences
        expect(result.hasReferences).toBeFalsy();
      });

      it('should handle single reference', () => {
        const input = '[1] Smith, J. (2020). Single Reference. Journal.';

        const refs = parseRefs(input);

        expect(refs).toHaveLength(1);
        expect(refs[0].citation).toContain('Smith, J.');
      });

      it('should handle mixed format (all numbered patterns are recognized)', () => {
        const input = `[1] First reference with bracket format.
[2] Second reference also with brackets.
Some continuation text that looks like it might be numbered:
1. This line starts with "1." so it becomes a new reference
[3] Third reference starts here.`;

        const refs = parseRefs(input);

        // All numbered patterns are recognized: [1], [2], "1.", [3] = 4 refs
        expect(refs).toHaveLength(4);
        expect(refs[0].citation).toContain('First reference');
        expect(refs[1].citation).toContain('Second reference');
        expect(refs[2].citation).toContain('This line starts with');
        expect(refs[3].citation).toContain('Third reference');
      });

      it('should preserve reference content without number prefix', () => {
        const input = '[1] Author Name. Title[J]. Journal, 2020.';

        const refs = parseRefs(input);

        expect(refs).toHaveLength(1);
        // Should NOT start with [1]
        expect(refs[0].citation).not.toMatch(/^\[1\]/);
        expect(refs[0].citation).toMatch(/^Author Name/);
      });

      it('should handle references with DOIs and URLs', () => {
        const input = `[1] Smith, J. (2020). Paper Title. Journal. DOI: 10.1234/example.
[2] Zhang, L. (2021). Online Resource[EB/OL]. https://example.com/resource.`;

        const refs = parseRefs(input);

        expect(refs).toHaveLength(2);
        expect(refs[0].citation).toContain('DOI: 10.1234/example');
        expect(refs[1].citation).toContain('https://example.com/resource');
      });
    });

    describe('hasReferences flag', () => {
      it('should set hasReferences to true when references exist', () => {
        const result = service.prepareDocumentData({
          references: '[1] Smith, J. (2020). Paper. Journal.',
        });

        expect(result.hasReferences).toBe(true);
      });

      it('should not set hasReferences for empty references', () => {
        const result = service.prepareDocumentData({
          references: '',
        });

        expect(result.hasReferences).toBeFalsy();
      });
    });
  });

  describe('escapeLatex', () => {
    it('should escape special LaTeX characters', () => {
      const input = 'Price: $100 & 50% off #1 deal_now {test}';
      const escaped = service.escapeLatex(input);

      expect(escaped).toContain('\\$');
      expect(escaped).toContain('\\&');
      expect(escaped).toContain('\\%');
      expect(escaped).toContain('\\#');
      expect(escaped).toContain('\\_');
      expect(escaped).toContain('\\{');
      expect(escaped).toContain('\\}');
    });

    it('should handle HTML entities', () => {
      const input = '&quot;quoted&quot; &amp; &lt;tag&gt;';
      const escaped = service.escapeLatex(input);

      expect(escaped).toContain('"quoted"');
      expect(escaped).toContain('\\&');
      expect(escaped).toContain('<tag>');
    });

    it('should handle empty input', () => {
      expect(service.escapeLatex('')).toBe('');
      expect(service.escapeLatex(null as any)).toBe('');
    });
  });
});
