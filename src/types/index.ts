export type ConversionSettings = {
  basePixelSize: number;
  targetUnit: 'rem' | 'em' | '%' | 'vw' | 'vh';
  precision: number;
};

export type ConversionResult = {
  originalCode: string;
  convertedCode: string;
  errors: string[];
};

/**
 * Represents the result of a code formatting operation.
 */
export interface FormattingResult {
  /** The formatted/processed code */
  formattedCode: string;
  /** Array of any errors encountered during formatting */
  errors: string[];
} 