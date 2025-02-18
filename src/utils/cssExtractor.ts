import { ConversionResult } from '../types';

export const extractCSSFromURL = async (url: string): Promise<ConversionResult> => {
  try {
    // Make request to backend endpoint
    const response = await fetch('/api/extract-css', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSS: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      originalCode: data.css,
      convertedCode: '',
      errors: [],
    };
  } catch (error) {
    return {
      originalCode: '',
      convertedCode: '',
      errors: [`Error extracting CSS: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}; 