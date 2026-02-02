import { LatexService } from './latex.service';
import * as Mustache from 'mustache';

describe('LatexService', () => {
  let service: LatexService;

  beforeEach(() => {
    service = new LatexService();
  });

  describe('parseReferencesToArray (via prepareDocumentData)', () => {
    // Helper function to extract references array from prepared data
    const parseRefs = (refsString: string) => {
      const result = service.prepareDocumentData({ references: refsString });
      return result.referencesArray as Array<{ key: string; citation: string }>;
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
        const result = service.prepareDocumentData({ references: '' });

        // Empty input returns undefined referencesArray
        expect(result.referencesArray).toBeUndefined();
      });

      it('should handle input with only whitespace', () => {
        const result = service.prepareDocumentData({ references: '   \n\n   \n  ' });
        // Whitespace-only input has hasReferences=true (truthy string) but no referencesArray
        expect(result.hasReferences).toBe(true); // !! checks for truthy string
        expect(result.referencesArray).toBeUndefined(); // No parsed references
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

  describe('Template Rendering with References (Dual-Format Bug Fix)', () => {
    describe('Dual-Format Output Verification', () => {
      it('should provide both references (string) and referencesArray from prepareDocumentData', () => {
        const input = `[1] Smith, J. (2020). Paper Title. Journal.
[2] Zhang, L. (2021). Another Paper. Conference.`;

        const result = service.prepareDocumentData({ references: input });

        // Verify STRING format preserved
        expect(result.references).toBe(input);
        expect(typeof result.references).toBe('string');

        // Verify ARRAY format created
        expect(result.referencesArray).toBeDefined();
        expect(Array.isArray(result.referencesArray)).toBe(true);
        expect(result.referencesArray).toHaveLength(2);

        // Verify array structure
        expect(result.referencesArray[0]).toHaveProperty('key');
        expect(result.referencesArray[0]).toHaveProperty('citation');
        expect(result.referencesArray[0].key).toBe('ref1');
        expect(result.referencesArray[0].citation).toContain('Smith, J.');
      });

      it('should handle empty references without creating array', () => {
        const result = service.prepareDocumentData({ references: '' });

        expect(result.references).toBe('');
        expect(result.referencesArray).toBeUndefined();
        expect(result.hasReferences).toBeFalsy();
      });

      it('should handle null/undefined references gracefully', () => {
        const result1 = service.prepareDocumentData({ references: null as any });
        const result2 = service.prepareDocumentData({});

        expect(result1.references).toBeFalsy();
        expect(result2.references).toBeUndefined();
        expect(result1.referencesArray).toBeUndefined();
        expect(result2.referencesArray).toBeUndefined();
      });
    });

    describe('String Format Rendering (THU Template Pattern)', () => {
      it('should render THU template pattern with string references (no [Object object])', () => {
        const referencesString = `[1] Smith, J. (2020). Paper Title. Journal.
[2] Zhang, L. (2021). Another Paper. Conference.`;

        const thuTemplatePattern = `{{#references}}{{{references}}}{{/references}}`;

        const preparedData = service.prepareDocumentData({ references: referencesString });
        const rendered = Mustache.render(thuTemplatePattern, preparedData);

        // Should output the original string
        expect(rendered).toBe(referencesString);
        expect(rendered).toContain('Smith, J.');
        expect(rendered).toContain('Zhang, L.');

        // CRITICAL: Should NOT render [Object object]
        expect(rendered).not.toContain('[Object object]');
        expect(rendered).not.toContain('[object Object]');
      });

      it('should render complete THU-style template without [Object object]', () => {
        const fullTemplate = `\\section*{参考文献}
\\addcontentsline{toc}{section}{参考文献}

{{#references}}{{{references}}}{{/references}}`;

        const document = {
          references: `[1] Smith, J. (2020). First Paper. Journal.
[2] Zhang, L. (2021). Second Paper. Conference.`
        };

        const rendered = service.renderTemplate(fullTemplate, document);

        expect(rendered).toContain('\\section*{参考文献}');
        expect(rendered).toContain('Smith, J. (2020). First Paper. Journal.');
        expect(rendered).toContain('Zhang, L. (2021). Second Paper. Conference.');
        expect(rendered).not.toContain('[Object object]');
      });

      it('should handle Chinese references in string format', () => {
        const chineseRefs = `【1】张三. 论文标题[J]. 期刊名称, 2020, 10(2): 100-110.
【2】李四. 另一篇论文[J]. 期刊名称, 2021.`;

        const template = `{{#references}}{{{references}}}{{/references}}`;
        const preparedData = service.prepareDocumentData({ references: chineseRefs });
        const rendered = Mustache.render(template, preparedData);

        expect(rendered).toBe(chineseRefs);
        expect(rendered).toContain('张三');
        expect(rendered).toContain('李四');
        expect(rendered).not.toContain('[Object object]');
      });
    });

    describe('Array Format Rendering (HUNNU/Other Template Pattern)', () => {
      it('should render HUNNU template pattern with array references', () => {
        const referencesString = `[1] Smith, J. (2020). Paper Title. Journal.
[2] Zhang, L. (2021). Another Paper. Conference.`;

        const hunnuTemplatePattern = `\\begin{thebibliography}{99}
{{#referencesArray}}
\\bibitem{ {{key}} }
{{{citation}}}
{{/referencesArray}}
\\end{thebibliography}`;

        const preparedData = service.prepareDocumentData({ references: referencesString });
        const rendered = Mustache.render(hunnuTemplatePattern, preparedData);

        // Should render LaTeX bibitem entries
        expect(rendered).toContain('\\bibitem{ ref1 }');
        expect(rendered).toContain('\\bibitem{ ref2 }');
        expect(rendered).toContain('Smith, J. (2020). Paper Title. Journal.');
        expect(rendered).toContain('Zhang, L. (2021). Another Paper. Conference.');
        expect(rendered).not.toContain('[Object object]');
      });

      it('should render individual array object properties correctly', () => {
        const referencesString = `[1] Test Reference One
[2] Test Reference Two`;

        const template = `{{#referencesArray}}Key: {{key}}, Citation: {{{citation}}}
{{/referencesArray}}`;

        const preparedData = service.prepareDocumentData({ references: referencesString });
        const rendered = Mustache.render(template, preparedData);

        expect(rendered).toContain('Key: ref1, Citation: Test Reference One');
        expect(rendered).toContain('Key: ref2, Citation: Test Reference Two');
        expect(rendered).not.toContain('[Object object]');
        expect(rendered).not.toContain('undefined');
      });

      it('should render complete HUNNU-style template with bibitem entries', () => {
        const fullTemplate = `\\addcontentsline{toc}{chapter}{参考文献}
\\begin{thebibliography}{99}
{{#referencesArray}}
\\bibitem{ {{key}} }
{{{citation}}}
{{/referencesArray}}
\\end{thebibliography}`;

        const document = {
          references: `[1] Smith, J. (2020). First Paper. Journal.
[2] Zhang, L. (2021). Second Paper. Conference.`
        };

        const rendered = service.renderTemplate(fullTemplate, document);

        expect(rendered).toContain('\\begin{thebibliography}{99}');
        expect(rendered).toContain('\\bibitem{ ref1 }');
        expect(rendered).toContain('\\bibitem{ ref2 }');
        expect(rendered).toContain('Smith, J. (2020). First Paper. Journal.');
        expect(rendered).toContain('\\end{thebibliography}');
        expect(rendered).not.toContain('[Object object]');
      });

      it('should handle multi-line references in array format', () => {
        const multilineRefs = `[1] Smith, J., Johnson, M., Williams, K. (2020).
A Very Long Title That Spans Multiple Lines.
Journal of Very Long Names, 10(2), 100-110.
[2] Zhang, L. (2021). Short Reference.`;

        const template = `{{#referencesArray}}[{{key}}] {{{citation}}}
{{/referencesArray}}`;

        const preparedData = service.prepareDocumentData({ references: multilineRefs });
        const rendered = Mustache.render(template, preparedData);

        expect(rendered).toContain('[ref1]');
        expect(rendered).toContain('Smith, J.');
        expect(rendered).toContain('Spans Multiple Lines');
        expect(rendered).not.toContain('[Object object]');
      });
    });

    describe('Bug Regression Tests', () => {
      it('should NEVER render [Object object] when string format is used', () => {
        const referencesString = `[1] First Reference
[2] Second Reference
[3] Third Reference`;

        // THU template pattern (string format)
        const template = `{{#references}}{{{references}}}{{/references}}`;

        const preparedData = service.prepareDocumentData({ references: referencesString });
        const rendered = Mustache.render(template, preparedData);

        // Critical assertions
        expect(rendered).not.toContain('[Object object]');
        expect(rendered).not.toContain('[object Object]');
        expect(rendered).not.toContain('object Object');
        expect(rendered).toBe(referencesString);
      });

      it('should handle incorrect template pattern gracefully', () => {
        const referencesString = `[1] Test Reference`;

        // This is WRONG usage (iterating over string) but shouldn't crash
        const wrongPattern = `{{#references}}{{.}}{{/references}}`;

        const preparedData = service.prepareDocumentData({ references: referencesString });
        const rendered = Mustache.render(wrongPattern, preparedData);

        // Mustache iterates over string characters, but shouldn't crash
        expect(rendered).toBeDefined();
        expect(typeof rendered).toBe('string');
      });

      it('should maintain type safety across both formats', () => {
        const input = `[1] Reference One
[2] Reference Two`;

        const result = service.prepareDocumentData({ references: input });

        // Type checks
        expect(typeof result.references).toBe('string');
        expect(Array.isArray(result.referencesArray)).toBe(true);

        // String format is unchanged
        expect(result.references).toBe(input);

        // Array format has correct structure
        result.referencesArray.forEach((ref: any, index: number) => {
          expect(typeof ref.key).toBe('string');
          expect(typeof ref.citation).toBe('string');
          expect(ref.key).toBe(`ref${index + 1}`);
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle single reference in both formats', () => {
        const singleRef = '[1] Single Author. (2020). Single Paper. Journal.';

        const preparedData = service.prepareDocumentData({ references: singleRef });

        // String format
        expect(preparedData.references).toBe(singleRef);

        // Array format
        expect(preparedData.referencesArray).toHaveLength(1);
        expect(preparedData.referencesArray[0].key).toBe('ref1');
        expect(preparedData.referencesArray[0].citation).toContain('Single Author');

        // Render both patterns
        const stringTemplate = `{{#references}}{{{references}}}{{/references}}`;
        const arrayTemplate = `{{#referencesArray}}{{key}}: {{{citation}}}{{/referencesArray}}`;

        const stringRendered = Mustache.render(stringTemplate, preparedData);
        const arrayRendered = Mustache.render(arrayTemplate, preparedData);

        expect(stringRendered).toBe(singleRef);
        expect(arrayRendered).toContain('ref1:');
        expect(arrayRendered).toContain('Single Author');
      });

      it('should produce empty array when references are empty', () => {
        const result1 = service.prepareDocumentData({ references: '' });
        const result2 = service.prepareDocumentData({ references: '   ' });

        expect(result1.referencesArray).toBeUndefined();
        expect(result2.referencesArray).toBeUndefined();

        // Templates should handle empty arrays gracefully
        const template = `{{#referencesArray}}{{key}}{{/referencesArray}}`;
        const rendered1 = Mustache.render(template, result1);
        const rendered2 = Mustache.render(template, result2);

        expect(rendered1).toBe('');
        expect(rendered2).toBe('');
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
