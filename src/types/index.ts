export interface ConversionSettings {
  basePixelSize: number;
  targetUnit: 'rem' | 'em' | '%' | 'vw' | 'vh';
  precision: number;
}

export interface ConversionResult {
  originalCode: string;
  convertedCode: string;
  errors: string[];
} 