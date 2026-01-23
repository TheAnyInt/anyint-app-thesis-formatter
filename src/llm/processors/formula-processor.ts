/**
 * Unicode math character mappings to LaTeX
 */
const UNICODE_TO_LATEX: Record<string, string> = {
  // Greek letters (italic)
  '𝛼': '\\alpha', '𝛽': '\\beta', '𝛾': '\\gamma', '𝛿': '\\delta',
  '𝜀': '\\epsilon', '𝜁': '\\zeta', '𝜂': '\\eta', '𝜃': '\\theta',
  '𝜄': '\\iota', '𝜅': '\\kappa', '𝜆': '\\lambda', '𝜇': '\\mu',
  '𝜈': '\\nu', '𝜉': '\\xi', '𝜊': 'o', '𝜋': '\\pi',
  '𝜌': '\\rho', '𝜎': '\\sigma', '𝜏': '\\tau', '𝜐': '\\upsilon',
  '𝜑': '\\phi', '𝜒': '\\chi', '𝜓': '\\psi', '𝜔': '\\omega',
  // Greek letters (uppercase)
  '𝛢': 'A', '𝛣': 'B', '𝛤': '\\Gamma', '𝛥': '\\Delta',
  '𝛦': 'E', '𝛧': 'Z', '𝛨': 'H', '𝛩': '\\Theta',
  '𝛪': 'I', '𝛫': 'K', '𝛬': '\\Lambda', '𝛭': 'M',
  '𝛮': 'N', '𝛯': '\\Xi', '𝛰': 'O', '𝛱': '\\Pi',
  '𝛲': 'P', '𝛳': '\\Sigma', '𝛴': '\\Sigma', '𝛵': 'T',
  '𝛶': '\\Upsilon', '𝛷': '\\Phi', '𝛸': 'X', '𝛹': '\\Psi', '𝛺': '\\Omega',
  // Math italic letters
  '𝑎': 'a', '𝑏': 'b', '𝑐': 'c', '𝑑': 'd', '𝑒': 'e', '𝑓': 'f',
  '𝑔': 'g', 'ℎ': 'h', '𝑖': 'i', '𝑗': 'j', '𝑘': 'k', '𝑙': 'l',
  '𝑚': 'm', '𝑛': 'n', '𝑜': 'o', '𝑝': 'p', '𝑞': 'q', '𝑟': 'r',
  '𝑠': 's', '𝑡': 't', '𝑢': 'u', '𝑣': 'v', '𝑤': 'w', '𝑥': 'x',
  '𝑦': 'y', '𝑧': 'z',
  '𝐴': 'A', '𝐵': 'B', '𝐶': 'C', '𝐷': 'D', '𝐸': 'E', '𝐹': 'F',
  '𝐺': 'G', '𝐻': 'H', '𝐼': 'I', '𝐽': 'J', '𝐾': 'K', '𝐿': 'L',
  '𝑀': 'M', '𝑁': 'N', '𝑂': 'O', '𝑃': 'P', '𝑄': 'Q', '𝑅': 'R',
  '𝑆': 'S', '𝑇': 'T', '𝑈': 'U', '𝑉': 'V', '𝑊': 'W', '𝑋': 'X',
  '𝑌': 'Y', '𝑍': 'Z',
  // Math operators and symbols
  '∑': '\\sum', '∏': '\\prod', '∫': '\\int', '∬': '\\iint', '∭': '\\iiint',
  '∮': '\\oint', '∇': '\\nabla', '∂': '\\partial', '∆': '\\Delta',
  '∀': '\\forall', '∃': '\\exists', '∈': '\\in', '∉': '\\notin',
  '⊂': '\\subset', '⊃': '\\supset', '⊆': '\\subseteq', '⊇': '\\supseteq',
  '∪': '\\cup', '∩': '\\cap', '∧': '\\wedge', '∨': '\\vee', '¬': '\\neg',
  '⊕': '\\oplus', '⊗': '\\otimes', '⊙': '\\odot',
  '≤': '\\leq', '≥': '\\geq', '≠': '\\neq', '≈': '\\approx',
  '≡': '\\equiv', '≢': '\\not\\equiv', '∝': '\\propto', '∞': '\\infty',
  '±': '\\pm', '×': '\\times', '÷': '\\div', '√': '\\sqrt',
  '∛': '\\sqrt[3]', '∜': '\\sqrt[4]',
  '→': '\\rightarrow', '←': '\\leftarrow', '↔': '\\leftrightarrow',
  '⇒': '\\Rightarrow', '⇐': '\\Leftarrow', '⇔': '\\Leftrightarrow',
  // Superscripts
  '⁰': '^{0}', '¹': '^{1}', '²': '^{2}', '³': '^{3}', '⁴': '^{4}',
  '⁵': '^{5}', '⁶': '^{6}', '⁷': '^{7}', '⁸': '^{8}', '⁹': '^{9}',
  '⁺': '^{+}', '⁻': '^{-}', '⁼': '^{=}', '⁽': '^{(}', '⁾': '^{)}',
  'ⁿ': '^{n}', 'ⁱ': '^{i}',
  // Subscripts
  '₀': '_{0}', '₁': '_{1}', '₂': '_{2}', '₃': '_{3}', '₄': '_{4}',
  '₅': '_{5}', '₆': '_{6}', '₇': '_{7}', '₈': '_{8}', '₉': '_{9}',
  '₊': '_{+}', '₋': '_{-}', '₌': '_{=}', '₍': '_{(}', '₎': '_{)}',
  'ₐ': '_{a}', 'ₑ': '_{e}', 'ₒ': '_{o}', 'ₓ': '_{x}',
  'ₕ': '_{h}', 'ₖ': '_{k}', 'ₗ': '_{l}', 'ₘ': '_{m}',
  'ₙ': '_{n}', 'ₚ': '_{p}', 'ₛ': '_{s}', 'ₜ': '_{t}',
  'ᵢ': '_{i}', 'ⱼ': '_{j}',
};

/**
 * Formula processing utilities for converting Unicode math to LaTeX
 */
export class FormulaProcessor {
  /**
   * Check if a character is a Unicode math character
   */
  private static isUnicodeMathChar(char: string): boolean {
    return UNICODE_TO_LATEX.hasOwnProperty(char);
  }

  /**
   * Convert a formula block to LaTeX
   * Handles patterns like "N ∑ L= − i=1 yilog(pi)"
   */
  private static convertFormulaBlockToLatex(content: string): string {
    // First convert all Unicode chars
    let formula = content;
    for (const [unicode, latex] of Object.entries(UNICODE_TO_LATEX)) {
      formula = formula.split(unicode).join(latex);
    }

    // Try to detect and reconstruct common formula patterns

    // Pattern 1: Sum formula "N ∑ L= − i=1 body"
    // Matches: upper_limit sum_symbol lhs=- lower_limit body
    const sumPattern = /([NMKnmk])\s*\\sum\s*([A-Za-z])\s*=\s*[-−]?\s*([ijk])=(\d+)\s*(.+)/;
    const sumMatch = formula.match(sumPattern);
    if (sumMatch) {
      const [_, upper, lhs, idx, start, body] = sumMatch;
      return `$$${lhs} = -\\sum_{${idx}=${start}}^{${upper}} ${body}$$`;
    }

    // Pattern 2: Product formula
    const prodPattern = /([NMKnmk])\s*\\prod\s*([A-Za-z])\s*=\s*([ijk])=(\d+)\s*(.+)/;
    const prodMatch = formula.match(prodPattern);
    if (prodMatch) {
      const [_, upper, lhs, idx, start, body] = prodMatch;
      return `$$${lhs} = \\prod_{${idx}=${start}}^{${upper}} ${body}$$`;
    }

    // Pattern 3: Simple equation with operators
    if (/[A-Za-z]\s*=\s*[-+]?.*\\(?:sum|prod|int|frac)/.test(formula)) {
      return `$$${formula}$$`;
    }

    // If no pattern matched, wrap inline if it has LaTeX commands
    if (/\\(?:sum|prod|int|frac|alpha|beta|gamma)/.test(formula)) {
      return `$$${formula}$$`;
    }

    // Otherwise, make inline math
    if (formula.includes('=') || /[_^]/.test(formula)) {
      return `$${formula}$`;
    }

    return formula;
  }

  /**
   * Convert Unicode math characters to LaTeX
   */
  static convertUnicodeMathToLatex(content: string): string {
    let result = content;

    // Handle [FORMULA_BLOCK: ... :END_FORMULA_BLOCK] markers (multi-line formulas)
    result = result.replace(/\[FORMULA_BLOCK:\s*([\s\S]*?)\s*:END_FORMULA_BLOCK\]/g, (match, formulaContent) => {
      return this.convertFormulaBlockToLatex(formulaContent);
    });

    // Handle [FORMULA: ... :END_FORMULA] markers (single-line formulas)
    result = result.replace(/\[FORMULA:\s*([\s\S]*?)\s*:END_FORMULA\]/g, (match, formulaContent) => {
      // Convert Unicode characters first
      let converted = formulaContent;
      for (const [unicode, latex] of Object.entries(UNICODE_TO_LATEX)) {
        converted = converted.split(unicode).join(latex);
      }

      // Check if it looks like an equation
      if (converted.includes('=') || /\\(?:sum|prod|int|frac)/.test(converted)) {
        return `$${converted}$`;
      }
      return converted;
    });

    // Convert remaining Unicode math characters
    for (const [unicode, latex] of Object.entries(UNICODE_TO_LATEX)) {
      result = result.split(unicode).join(latex);
    }

    // Fix common patterns that result from PDF extraction
    // Pattern: "L = -\sum_{i=1}^{N}" should be wrapped in $$ if it's a standalone formula
    result = result.replace(/^(\s*)(\\?[A-Za-z]+\s*=\s*[-+]?\\(?:sum|prod|int|frac)[^$\n]+)(\s*)$/gm, (match, pre, formula, post) => {
      // Check if it looks like a display formula (has sum/prod/int)
      if (/\\(?:sum|prod|int|frac)/.test(formula)) {
        return `${pre}$$${formula.trim()}$$${post}`;
      }
      return match;
    });

    // Wrap inline math that has LaTeX commands but no delimiters
    result = result.replace(/(?<![$\\])\\(alpha|beta|gamma|delta|sum|prod|int|frac|sqrt)(?![a-zA-Z])/g, (match) => {
      return `$${match}$`;
    });

    // Fix subscripts/superscripts that are not in math mode
    result = result.replace(/(?<!\$)([a-zA-Z])_\{([^}]+)\}(?!\$)/g, '$$$1_{$2}$$');
    result = result.replace(/(?<!\$)([a-zA-Z])\^\{([^}]+)\}(?!\$)/g, '$$$1^{$2}$$');

    // Clean up adjacent inline math - merge $a$$b$ into $ab$
    result = result.replace(/\$\$\$/g, '$ $');
    result = result.replace(/\$\s*\$/g, '');

    // Fix mixed math delimiters - remove $ inside \[...\] or $$...$$
    result = result.replace(/\\\[\s*\$([^$]+)\$\s*\\\]/g, '\\[$1\\]');
    result = result.replace(/\$\$\s*\$([^$]+)\$\s*\$\$/g, '$$$1$$');

    // Fix \sum, \prod, etc. that have extra $ wrapping
    result = result.replace(/\$\\(sum|prod|int|frac|log)\$/g, '\\$1');

    return result;
  }

  /**
   * Reconstruct fragmented formulas from PDF extraction
   * PDF often splits formulas across multiple lines
   */
  static reconstructFormulas(content: string): string {
    let result = content;

    // Pattern 1: Sum formula split across lines
    // 𝑁 (or N)
    // ∑ (or ∏)
    // 𝐿= − (or L= -)
    // 𝑖=1 (or i=1)
    // 𝑦𝑖log(𝑝𝑖)
    // Using specific character matches instead of ranges

    // Match upper limit characters
    const upperChars = '[𝑁𝑀𝐾𝑛𝑚𝑘NMKnmk]';
    // Match LHS variable characters
    const lhsChars = '[𝐿𝑅𝐸𝐽𝑃𝑄LREJPQa-z]';
    // Match index characters
    const indexChars = '[𝑖𝑗𝑘ijk]';

    const sumFormulaPattern = new RegExp(
      `(${upperChars})\\s*\\n\\s*[∑∏]\\s*\\n\\s*(${lhsChars}=\\s*[-−]?)\\s*\\n\\s*(${indexChars}=\\d+)\\s*\\n\\s*([^\\n]+)`,
      'g'
    );

    result = result.replace(sumFormulaPattern, (match, upper, lhs, lower, body) => {
      // Convert to proper LaTeX using the mapping
      let upperClean = upper;
      let lhsClean = lhs;
      let lowerClean = lower;

      // Apply Unicode to LaTeX conversions
      for (const [unicode, latex] of Object.entries(UNICODE_TO_LATEX)) {
        upperClean = upperClean.split(unicode).join(latex);
        lhsClean = lhsClean.split(unicode).join(latex);
        lowerClean = lowerClean.split(unicode).join(latex);
      }

      return `$$${lhsClean}\\sum_{${lowerClean}}^{${upperClean}} ${body}$$`;
    });

    return result;
  }
}
