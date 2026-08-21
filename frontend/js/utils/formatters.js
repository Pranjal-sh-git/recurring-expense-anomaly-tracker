/**
 * Utility functions for formatting currencies, dates, and numbers.
 * Phase 1 - Day 2 Foundation
 */

/**
 * Format a numeric amount as a currency string safely.
 * @param {number|string} amount - The amount to format.
 * @param {string} [currency='USD'] - The currency code (ISO 4217).
 * @param {string} [locale='en-US'] - The BCP 47 language tag.
 * @returns {string} Formatted currency string.
 */
export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  if (amount === null || amount === undefined || amount === '' || typeof amount === 'symbol') {
    amount = 0;
  }

  // Handle numeric strings with currency symbols or commas if passed
  let numericAmount;
  if (typeof amount === 'string') {
    const cleaned = amount.replace(/[^0-9.-]+/g, '');
    numericAmount = Number(cleaned);
  } else {
    numericAmount = Number(amount);
  }

  const validAmount = isNaN(numericAmount) || !isFinite(numericAmount) ? 0 : numericAmount;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(validAmount);
  } catch (error) {
    // Fallback in case of invalid locale or currency code
    return `$${validAmount.toFixed(2)}`;
  }
}

/**
 * Format an ISO-style date string, timestamp, or Date object into a readable string safely.
 * @param {string|number|Date} dateInput - The date to format (e.g. '2026-08-20', ISO string, timestamp, or Date).
 * @param {string|Intl.DateTimeFormatOptions} [formatType='medium'] - Format style: 'short', 'medium', 'long', 'iso', or Intl options.
 * @param {string} [locale='en-US'] - The BCP 47 language tag.
 * @returns {string} Formatted date string or empty string if invalid.
 */
export function formatDate(dateInput, formatType = 'medium', locale = 'en-US') {
  if (!dateInput) {
    return '';
  }

  let date;

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) {
      return '';
    }

    // Match YYYY-MM-DD date-only strings and construct locally to prevent timezone shifts
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(trimmed);
    }
  } else if (dateInput instanceof Date) {
    date = new Date(dateInput.getTime());
  } else if (typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else {
    return '';
  }

  if (isNaN(date.getTime())) {
    return '';
  }

  if (formatType === 'iso') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  let options;
  if (typeof formatType === 'object' && formatType !== null) {
    options = formatType;
  } else {
    switch (formatType) {
      case 'short':
        options = { month: 'numeric', day: 'numeric', year: 'numeric' };
        break;
      case 'long':
        options = { month: 'long', day: 'numeric', year: 'numeric' };
        break;
      case 'medium':
      default:
        options = { month: 'short', day: 'numeric', year: 'numeric' };
        break;
    }
  }

  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch (error) {
    return date.toLocaleDateString();
  }
}

/**
 * Format a number with thousand separators and optional decimal precision safely.
 * @param {number|string} value - The number to format.
 * @param {number} [decimals=2] - Number of decimal places.
 * @param {string} [locale='en-US'] - The BCP 47 language tag.
 * @returns {string} Formatted number string.
 */
export function formatNumber(value, decimals = 2, locale = 'en-US') {
  if (value === null || value === undefined || value === '' || typeof value === 'symbol') {
    value = 0;
  }

  const numericValue = Number(value);
  const validValue = isNaN(numericValue) || !isFinite(numericValue) ? 0 : numericValue;

  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(validValue);
  } catch (error) {
    return validValue.toFixed(decimals);
  }
}

export default {
  formatCurrency,
  formatDate,
  formatNumber
};
