import { ConversionSettings, ConversionResult } from '../types';

/**
 * Regular expression to match pixel values in CSS.
 * Matches numbers followed by 'px' unit.
 */
const CSS_PX_REGEX = /(\d+)px/g;

/**
 * Converts a single CSS pixel value to the specified target unit.
 * @param value - The pixel value as a string (without 'px' unit)
 * @param settings - Configuration object containing conversion parameters
 * @param settings.basePixelSize - The base pixel size to use for calculations
 * @param settings.targetUnit - The target CSS unit to convert to (rem, em, %, vw, vh)
 * @param settings.precision - Number of decimal places in the output
 * @returns The converted CSS value with the target unit
 */
export const convertCSSValue = (
  value: string,
  settings: ConversionSettings
): string => {
  const pixelValue = parseInt(value);
  const { basePixelSize, targetUnit, precision } = settings;

  let convertedValue: number;
  switch (targetUnit) {
    case 'rem':
    case 'em':
      convertedValue = pixelValue / basePixelSize;
      break;
    case '%':
      convertedValue = (pixelValue / basePixelSize) * 100;
      break;
    case 'vw':
    case 'vh':
      convertedValue = (pixelValue / basePixelSize) * 100;
      break;
    default:
      return value;
  }

  return `${convertedValue.toFixed(precision)}${targetUnit}`;
};

/**
 * Converts all pixel values in a CSS string to the specified target unit.
 * @param css - The input CSS string containing pixel values
 * @param settings - Configuration object containing conversion parameters
 * @returns ConversionResult object containing:
 *          - originalCode: The input CSS
 *          - convertedCode: The CSS with converted values
 *          - errors: Array of any errors encountered during conversion
 */
export const convertCSS = (
  css: string,
  settings: ConversionSettings
): ConversionResult => {
  const errors: string[] = [];
  let convertedCode = css;

  try {
    convertedCode = css.replace(CSS_PX_REGEX, (match, value) => {
      return convertCSSValue(value, settings);
    });
  } catch (error) {
    errors.push(`Error converting CSS: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    originalCode: css,
    convertedCode,
    errors,
  };
}; 