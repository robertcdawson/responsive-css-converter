import { ConversionSettings, ConversionResult, ConversionDiff, ConversionStats, PropertyCategory } from '../types';

/**
 * Detects the root font size from CSS content.
 * Looks for font-size declarations in :root, html, or body selectors.
 * @param css - The CSS content to analyze
 * @returns The detected base pixel size or null if not found
 */
function detectRootFontSize(css: string): number | null {
  // Match font-size declarations in :root, html, or body selectors
  const rootFontSizeRegex = /(?:(?:html|:root|body)\s*{[^}]*font-size\s*:\s*)(\d+(?:\.\d+)?)(px|rem|em)[^}]*}/i;
  const match = css.match(rootFontSizeRegex);

  if (!match) return null;

  const [, value, unit] = match;
  const numValue = parseFloat(value);

  // Convert rem/em values to pixels (assuming browser default of 16px)
  if (unit === 'rem' || unit === 'em') {
    return numValue * 16;
  }

  return numValue;
}

/**
 * Regular expression to match pixel values in CSS with property capture.
 * Matches CSS property and numbers (including decimals) followed by 'px' unit.
 */
const CSS_PX_REGEX = /([a-zA-Z-]+\s*:\s*[^;]*?)(\d*\.?\d+)px/g;

/**
 * Converts a single CSS pixel value to the specified target unit.
 * @param value - The pixel value as a string (without 'px' unit)
 * @param settings - Configuration object containing conversion parameters
 * @returns The converted CSS value with the target unit
 */
export const convertCSSValue = (
  value: string,
  settings: ConversionSettings
): string => {
  const pixelValue = parseFloat(value);
  const { basePixelSize, targetUnit, precision } = settings;

  if (isNaN(pixelValue)) {
    return value;
  }

  let convertedValue: number;
  switch (targetUnit) {
    case 'rem':
    case 'em':
      convertedValue = pixelValue / basePixelSize;
      break;
    case '%':
    case 'vw':
    case 'vh':
      convertedValue = (pixelValue / basePixelSize) * 100;
      break;
    default:
      return value;
  }

  // Format with specified precision, handling 0 precision correctly
  const formattedValue = Number(convertedValue.toFixed(precision));
  return `${formattedValue}${targetUnit}`;
};

// Property category mappings
const PROPERTY_CATEGORIES: Record<string, PropertyCategory> = {
  // Layout properties
  width: 'layout',
  height: 'layout',
  'max-width': 'layout',
  'min-width': 'layout',
  'max-height': 'layout',
  'min-height': 'layout',
  margin: 'spacing',
  padding: 'spacing',
  top: 'layout',
  right: 'layout',
  bottom: 'layout',
  left: 'layout',

  // Typography properties
  'font-size': 'typography',
  'line-height': 'typography',
  'letter-spacing': 'typography',
  'word-spacing': 'typography',

  // Spacing properties
  gap: 'spacing',
  'column-gap': 'spacing',
  'row-gap': 'spacing',
  'margin-top': 'spacing',
  'margin-right': 'spacing',
  'margin-bottom': 'spacing',
  'margin-left': 'spacing',
  'padding-top': 'spacing',
  'padding-right': 'spacing',
  'padding-bottom': 'spacing',
  'padding-left': 'spacing',
};

// Properties that affect responsiveness
const RESPONSIVE_PROPERTIES = [
  'width',
  'max-width',
  'min-width',
  'height',
  'max-height',
  'min-height',
  'left',
  'right',
  'top',
  'bottom',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'gap',
  'row-gap',
  'column-gap',
  'font-size'
];

// Minimum sizes for accessibility (in pixels)
const MIN_ACCESSIBLE_SIZES = {
  'font-size': 12,      // Minimum readable font size
  'line-height': 18,    // Minimum readable line height
  'height': 44,         // Minimum touch target size
  'width': 44,         // Minimum touch target size
  'padding': 8,         // Minimum padding for touch targets
  'padding-top': 8,
  'padding-right': 8,
  'padding-bottom': 8,
  'padding-left': 8,
  'margin': 8,          // Minimum spacing between interactive elements
  'margin-top': 8,
  'margin-right': 8,
  'margin-bottom': 8,
  'margin-left': 8,
  'gap': 8              // Minimum spacing between grid/flex items
} as const;

// Maximum sizes for accessibility concerns
const MAX_ACCESSIBLE_SIZES = {
  'line-height': 2.5,   // Maximum line-height ratio (relative to font-size)
  'letter-spacing': 0.5 // Maximum letter-spacing in pixels
} as const;

// Interactive element selectors to check for touch target sizes
const INTERACTIVE_SELECTORS = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]'
];

type AccessibilityProperty = keyof typeof MIN_ACCESSIBLE_SIZES;
type MaxAccessibilityProperty = keyof typeof MAX_ACCESSIBLE_SIZES;

interface AccessibilityIssue {
  property: string;
  value: number;
  reason: string;
  severity: 'error' | 'warning';
}

/**
 * Converts all pixel values in a CSS string to the specified target unit.
 * @param css - The input CSS string containing pixel values
 * @param settings - Configuration object containing conversion parameters
 * @returns ConversionResult object containing:
 *          - originalCode: The input CSS
 *          - convertedCode: The CSS with converted values
 *          - errors: Array of any errors encountered during conversion
 *          - stats: Statistics about the conversion
 */
export const convertCSS = (
  css: string,
  settings: ConversionSettings
): ConversionResult => {
  const errors: string[] = [];
  let convertedCode = css;
  const diffs: ConversionDiff[] = [];
  let totalConversions = 0;
  const responsiveBreakpointImpact = 0;
  let accessibilityIssues = 0;
  let needsReviewCount = 0;

  // Detect root font size from input CSS
  const detectedBaseSize = detectRootFontSize(css);
  const effectiveBaseSize = detectedBaseSize || settings.basePixelSize;

  // If we detected a different base size, add a note
  if (detectedBaseSize && detectedBaseSize !== settings.basePixelSize) {
    errors.push(`Note: Detected root font-size of ${detectedBaseSize}px in CSS. Using this instead of ${settings.basePixelSize}px.`);
  }

  const categoryBreakdown: Record<PropertyCategory, number> = {
    layout: 0,
    typography: 0,
    spacing: 0,
    other: 0
  };

  try {
    // Split the CSS into lines to track line numbers
    const lines = css.split('\n');
    let currentLine = 0;

    convertedCode = lines.map((line) => {
      currentLine++;
      return line.replace(CSS_PX_REGEX, (_match, property, value) => {
        const cleanProperty = property.trim().toLowerCase().replace(/\s*:\s*$/, '');
        const pixelValue = parseFloat(value);
        const convertedValue = convertCSSValue(value, { ...settings, basePixelSize: effectiveBaseSize });

        if (convertedValue !== value) {
          totalConversions++;

          // Determine property category
          const category = PROPERTY_CATEGORIES[cleanProperty] || 'other';
          categoryBreakdown[category]++;

          // Initialize review variables
          let needsReview = false;
          let reviewReason = '';

          // Check for very large or very small values
          if (pixelValue > 1000) {
            needsReview = true;
            reviewReason = 'Large value may need manual review';
            needsReviewCount++;
          } else if (pixelValue < 2 && !cleanProperty.includes('border')) {
            needsReview = true;
            reviewReason = 'Very small value may need manual review';
            needsReviewCount++;
          }

          // Check for potentially problematic conversions
          if (cleanProperty.includes('border') && settings.targetUnit !== 'rem') {
            needsReview = true;
            reviewReason = 'Border widths are typically better kept in px or rem units';
            needsReviewCount++;
          }

          // Check for values that might break layouts when viewport changes
          if (settings.targetUnit === 'vw' || settings.targetUnit === 'vh') {
            if (cleanProperty.includes('font-size') ||
              cleanProperty.includes('line-height') ||
              cleanProperty.includes('border')) {
              needsReview = true;
              reviewReason = `Using ${settings.targetUnit} units for ${cleanProperty} might cause issues at different viewport sizes`;
              needsReviewCount++;
            }
          }

          // Check for accessibility issues
          const isAccessibilityProperty = (prop: string): prop is AccessibilityProperty =>
            prop in MIN_ACCESSIBLE_SIZES;

          const isMaxAccessibilityProperty = (prop: string): prop is MaxAccessibilityProperty =>
            prop in MAX_ACCESSIBLE_SIZES;

          let accessibilityIssue: AccessibilityIssue | null = null;

          // Check minimum size requirements
          if (isAccessibilityProperty(cleanProperty)) {
            if (pixelValue < MIN_ACCESSIBLE_SIZES[cleanProperty]) {
              accessibilityIssue = {
                property: cleanProperty,
                value: pixelValue,
                reason: `Value is below minimum accessible size of ${MIN_ACCESSIBLE_SIZES[cleanProperty]}px`,
                severity: 'error'
              };
            }
          }

          // Check maximum size limits
          if (isMaxAccessibilityProperty(cleanProperty)) {
            if (cleanProperty === 'line-height' && pixelValue > MAX_ACCESSIBLE_SIZES[cleanProperty] * effectiveBaseSize) {
              accessibilityIssue = {
                property: cleanProperty,
                value: pixelValue,
                reason: `Line height is too large and may impact readability`,
                severity: 'warning'
              };
            } else if (cleanProperty === 'letter-spacing' && Math.abs(pixelValue) > MAX_ACCESSIBLE_SIZES[cleanProperty]) {
              accessibilityIssue = {
                property: cleanProperty,
                value: pixelValue,
                reason: `Letter spacing is too extreme and may impact readability`,
                severity: 'warning'
              };
            }
          }

          // Check for touch target sizes in interactive elements
          const isInteractiveElement = INTERACTIVE_SELECTORS.some(selector =>
            line.toLowerCase().includes(selector)
          );

          if (isInteractiveElement) {
            if ((cleanProperty === 'height' || cleanProperty === 'width') && pixelValue < 44) {
              accessibilityIssue = {
                property: cleanProperty,
                value: pixelValue,
                reason: `Interactive elements should be at least 44px for touch targets`,
                severity: 'error'
              };
            }
          }

          if (accessibilityIssue) {
            accessibilityIssues++;
            if (!reviewReason) {
              needsReview = true;
              reviewReason = accessibilityIssue.reason;
              needsReviewCount++;
            }
          }

          const impactsAccessibility = accessibilityIssue !== null;

          diffs.push({
            original: `${value}px`,
            converted: convertedValue,
            property: cleanProperty,
            line: currentLine,
            category,
            impactsResponsiveness: RESPONSIVE_PROPERTIES.includes(cleanProperty),
            impactsAccessibility,
            needsReview,
            reviewReason: accessibilityIssue ? accessibilityIssue.reason : reviewReason
          });
        }
        return `${property}${convertedValue}`;
      });
    }).join('\n');
  } catch (error) {
    errors.push(`Error converting CSS: ${error instanceof Error ? error.message : String(error)}`);
  }

  const stats: ConversionStats = {
    totalConversions,
    diffs,
    baseValues: {
      fontSize: settings.basePixelSize,
      viewportWidth: 1920, // Default viewport size
      viewportHeight: 1080 // Default viewport size
    },
    categoryBreakdown,
    accessibilityIssues,
    responsiveBreakpointImpact,
    needsReviewCount
  };

  return {
    originalCode: css,
    convertedCode,
    errors,
    stats
  };
};