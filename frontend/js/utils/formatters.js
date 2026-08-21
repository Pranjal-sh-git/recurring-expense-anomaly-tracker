/**
 * Utility functions for formatting currencies, dates, and numbers.
 * Phase 1 - Day 1 Foundation
 */

/**
 * Format a numeric amount as a currency string.
 * @param {number|string} amount - The amount to format.
 * @param {string} [currency='USD'] - The currency code (ISO 4217).
 * @param {string} [locale='en-US'] - The BCP 47 language tag.
 * @returns {string} Formatted currency string.
 */
export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  const numericAmount = Number(amount);
  const validAmount = isNaN(numericAmount) ? 0 : numericAmount;

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
 * Format a date string, timestamp, or Date object into a readable string.
 * @param {string|number|Date} dateInput - The date to format (e.g. '2026-08-21', ISO string, timestamp, or Date).
 * @param {string|Intl.DateTimeFormatOptions} [formatType='medium'] - Format style: 'short', 'medium', 'long', 'iso', or Intl options.
 * @param {string} [locale='en-US'] - The BCP 47 language tag.
 * @returns {string} Formatted date string or empty string if invalid.
 */
export function formatDate(dateInput, formatType = 'medium', locale = 'en-US') {
  if (!dateInput) {
    return '';
  }

  let date;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    // Treat YYYY-MM-DD as local date parts to prevent timezone shifts
    const [year, month, day] = dateInput.split('-').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateInput);
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
 * Format a number with thousand separators and optional decimal precision.
 * @param {number|string} value - The number to format.
 * @param {number} [decimals=2] - Number of decimal places.
 * @param {string} [locale='en-US'] - The BCP 47 language tag.
 * @returns {string} Formatted number string.
 */
export function formatNumber(value, decimals = 2, locale = 'en-US') {
  const numericValue = Number(value);
  const validValue = isNaN(numericValue) ? 0 : numericValue;

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
