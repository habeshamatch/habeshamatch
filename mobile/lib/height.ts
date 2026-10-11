import { getLocales } from 'expo-localization';

export type HeightUnit = 'cm' | 'ftin';

// Height is always stored in cm. People in these regions usually think of height in feet and inches.
const FEET_INCHES_REGIONS = ['US', 'GB', 'CA', 'LR', 'MM'];

export function defaultHeightUnit(): HeightUnit {
  const locale = getLocales()[0];
  if (locale?.measurementSystem === 'us' || locale?.measurementSystem === 'uk') return 'ftin';
  return locale?.regionCode && FEET_INCHES_REGIONS.includes(locale.regionCode) ? 'ftin' : 'cm';
}

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * 2.54);
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / 2.54);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function formatHeight(cm: number, unit: HeightUnit): string {
  if (unit === 'cm') return `${cm} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}'${inches}"`;
}
