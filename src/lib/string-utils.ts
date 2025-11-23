export function formatNumber(value: number | string): string {
  if (typeof value === 'string') {
    value = Number(value.replace(/,/g, ''));
  }
  if (isNaN(value)) {
    return '';
  }
  return new Intl.NumberFormat('en-US').format(value);
}

export function parseOptionalFormattedNumber(value: string): number | undefined {
  if (value === '') {
    return undefined;
  }

  let cleanedValue = value;
  // If no dots, and there's a comma, assume the comma is the decimal separator.
  if (!cleanedValue.includes('.') && cleanedValue.includes(',')) {
    cleanedValue = cleanedValue.replace(/,/g, '.');
  }
  // Remove any remaining commas (these would be thousand separators if dots were present)
  cleanedValue = cleanedValue.replace(/,/g, '');
  
  const num = Number(cleanedValue);
  return isNaN(num) ? undefined : num;
}

export function parseRequiredFormattedNumber(value: string): number {
  if (value === '') {
    return 0;
  }
  let cleanedValue = value;
  if (!cleanedValue.includes('.') && cleanedValue.includes(',')) {
    cleanedValue = cleanedValue.replace(/,/g, '.');
  }
  cleanedValue = cleanedValue.replace(/,/g, '');

  const num = Number(cleanedValue);
  return isNaN(num) ? 0 : num;
}
