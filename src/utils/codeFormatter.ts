import { minify } from 'csso';

/**
 * Represents the result of a code formatting operation.
 */
export interface FormattingResult {
  /** The formatted/processed code */
  formattedCode: string;
  /** Array of any errors encountered during formatting */
  errors: string[];
}

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
 * Dynamically loads the Prettier standalone formatter and its CSS parser plugin.
 * This function ensures Prettier is available for code formatting operations.
 * @returns Promise that resolves when Prettier is loaded
 */
const loadPrettier = async (): Promise<void> => {
  if (!window.prettier) {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/prettier@2.8.8/standalone.js';
    document.head.appendChild(script);

    const parserScript = document.createElement('script');
    parserScript.src = 'https://unpkg.com/prettier@2.8.8/parser-postcss.js';
    document.head.appendChild(parserScript);

    await new Promise<void>((resolve) => {
      parserScript.onload = () => resolve();
    });
  }
};

/**
 * Formats CSS code using Prettier for consistent styling.
 * @param code - The CSS code to format
 * @returns Promise resolving to a FormattingResult containing the formatted code
 */
export const formatCSS = async (code: string): Promise<FormattingResult> => {
  const errors: string[] = [];
  let formattedCode = code;

  try {
    await loadPrettier();
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

export const minifyCSS = (code: string): FormattingResult => {
  const errors: string[] = [];
  let formattedCode = code;

  try {
    const result = minify(code, {
      restructure: true,
      comments: false,
    });
    formattedCode = result.css;
  } catch (error) {
    errors.push(`Error minifying CSS: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    formattedCode,
    errors,
  };
}; 