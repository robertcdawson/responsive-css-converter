import { minify } from 'csso';

export interface FormattingResult {
  formattedCode: string;
  errors: string[];
}

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
    prettier?: PrettierStandalone;
    prettierPlugins?: {
      postcss: unknown;
    };
  }
}

// Add Prettier standalone script to the document
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