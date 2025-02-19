import { FormattingResult } from '../types';

/**
 * Type definition for the Prettier standalone formatter.
 * This interface represents the minimal Prettier API we use.
 */
interface PrettierStandalone {
  format: (code: string, options: {
    parser: string;
    plugins: unknown[];
    printWidth: number;
    tabWidth: number;
    useTabs: boolean;
  }) => string;
}

declare global {
  interface Window {
    /** Global Prettier standalone instance */
    prettier?: PrettierStandalone;
    /** Prettier plugins required for CSS formatting */
    prettierPlugins?: {
      postcss: unknown;
    };
  }
}

/**
 * Formats CSS code using Prettier.
 * @param css - The CSS code to format
 * @returns FormattingResult object containing the formatted code and any errors
 */
export async function formatCSS(css: string): Promise<FormattingResult> {
  const errors: string[] = [];

  try {
    // @ts-expect-error Prettier is loaded dynamically
    if (typeof prettier === 'undefined') {
      throw new Error('Prettier is not loaded');
    }

    // First, preserve numeric precision by replacing numbers with placeholders
    const numberRegex = /(\d+\.\d+)([a-z%]*)/g;
    const numbers: string[] = [];
    const preservedCss = css.replace(numberRegex, (_match: string, number: string, unit: string) => {
      numbers.push(number);
      return `__NUM${numbers.length - 1}__${unit}`;
    });

    // Format the CSS
    // @ts-expect-error Prettier is loaded dynamically
    const formattedCss = prettier.format(preservedCss, {
      parser: 'css',
      // @ts-expect-error Prettier is loaded dynamically
      plugins: [prettierPlugins.postcss],
      printWidth: 80,
      tabWidth: 2,
    });

    // Restore the original numbers with their precision
    const restoredCss = formattedCss.replace(/__NUM(\d+)__/g, (_match: string, index: string) => {
      return numbers[parseInt(index)];
    });

    return {
      formattedCode: restoredCss,
      errors: [],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`Error formatting CSS: ${errorMessage}`);
    return {
      formattedCode: css,
      errors,
    };
  }
} 