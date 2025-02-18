export type ConversionSettings = {
  basePixelSize: number;
  targetUnit: 'rem' | 'em' | '%' | 'vw' | 'vh';
  precision: number;
};

export type PropertyCategory = 'layout' | 'typography' | 'spacing' | 'other';

export type ConversionDiff = {
  original: string;
  converted: string;
  property?: string;
  line: number;
  category?: PropertyCategory;
  needsReview?: boolean;
  reviewReason?: string;
  impactsAccessibility?: boolean;
  impactsResponsiveness?: boolean;
};

export type ConversionStats = {
  totalConversions: number;
  diffs: ConversionDiff[];
  baseValues: {
    fontSize: number;
    viewportWidth: number;
    viewportHeight: number;
  };
  categoryBreakdown: Record<PropertyCategory, number>;
  accessibilityIssues: number;
  responsiveBreakpointImpact: number;
  needsReviewCount: number;
};

export type ConversionResult = {
  originalCode: string;
  convertedCode: string;
  errors: string[];
  stats?: ConversionStats;
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