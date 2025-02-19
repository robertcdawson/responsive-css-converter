import { convertCSS, convertCSSValue } from '../converter';
import { ConversionSettings } from '../../types';

describe('convertCSSValue', () => {
  const settings: ConversionSettings = {
    basePixelSize: 16,
    targetUnit: 'rem',
    precision: 2,
  };

  test('converts pixel values to rem', () => {
    expect(convertCSSValue('16', settings)).toBe('1.00rem');
    expect(convertCSSValue('32', settings)).toBe('2.00rem');
    expect(convertCSSValue('8', settings)).toBe('0.50rem');
  });

  test('handles different target units', () => {
    const emSettings: ConversionSettings = { ...settings, targetUnit: 'em' };
    const percentSettings: ConversionSettings = { ...settings, targetUnit: '%' };
    const vwSettings: ConversionSettings = { ...settings, targetUnit: 'vw' };

    expect(convertCSSValue('16', emSettings)).toBe('1.00em');
    expect(convertCSSValue('16', percentSettings)).toBe('100.00%');
    expect(convertCSSValue('16', vwSettings)).toBe('100.00vw');
  });

  test('respects precision setting', () => {
    const highPrecisionSettings = { ...settings, precision: 4 };
    expect(convertCSSValue('15', highPrecisionSettings)).toBe('0.9375rem');
  });
});

describe('convertCSS', () => {
  const settings: ConversionSettings = {
    basePixelSize: 16,
    targetUnit: 'rem',
    precision: 2,
  };

  test('converts all pixel values in CSS string', () => {
    const input = `.header { width: 32px; padding: 16px; }`;
    const expected = `.header { width: 2.00rem; padding: 1.00rem; }`;
    const result = convertCSS(input, settings);
    expect(result.convertedCode.replace(/\s+/g, ' ')).toBe(expected.replace(/\s+/g, ' '));
    expect(result.errors).toHaveLength(0);
  });

  test('handles multiple values on same line', () => {
    const input = `padding: 16px 32px 8px 24px;`;
    const expected = `padding: 1.00rem 2.00rem 0.50rem 1.50rem;`;
    const result = convertCSS(input, settings);
    expect(result.convertedCode.replace(/\s+/g, ' ')).toBe(expected.replace(/\s+/g, ' '));
  });

  test('preserves non-pixel values', () => {
    const input = `.element { width: 100%; height: 32px; }`;
    const expected = `.element { width: 100%; height: 2.00rem; }`;
    const result = convertCSS(input, settings);
    expect(result.convertedCode.replace(/\s+/g, ' ')).toBe(expected.replace(/\s+/g, ' '));
  });

  test('handles invalid CSS gracefully', () => {
    const input = `.broken { width: px; height: invalid; }`;
    const result = convertCSS(input, settings);
    expect(result.errors).toHaveLength(0); // Should not error, just preserve invalid values
    expect(result.convertedCode).toBe(input);
  });
}); 