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
 * Formats CSS code using Prettier for consistent styling.
 * @param code - The CSS code to format
 * @returns Promise resolving to a FormattingResult containing the formatted code
 */
export const formatCSS = async (code: string): Promise<FormattingResult> => {
  const errors: string[] = [];
  let formattedCode = code;

  try {
    const prettier = window.prettier;
    const plugins = [window.prettierPlugins?.postcss];

    if (prettier) {
      formattedCode = prettier.format(code, {
        parser: 'css',
        plugins,
        printWidth: 80,
        tabWidth: 2,
        useTabs: false,
      });
    } else {
      errors.push('Prettier failed to load');
    }
  } catch (error) {
    errors.push(`Error formatting CSS: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    formattedCode,
    errors,
  };
}; 