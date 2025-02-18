import { ConversionResult } from '../types';

/**
 * Extracts CSS from a given URL by making a request to the backend API.
 * @param url - The URL of the webpage to extract CSS from
 * @returns Promise resolving to a ConversionResult object containing:
 *          - originalCode: The extracted CSS code
 *          - convertedCode: Empty string (to be filled by converter)
 *          - errors: Array of any errors encountered during extraction
 * @throws Will return a ConversionResult with error details if extraction fails
 */
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