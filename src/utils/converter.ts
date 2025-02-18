import { ConversionSettings, ConversionResult } from '../types';

const CSS_PX_REGEX = /(\d+)px/g;

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