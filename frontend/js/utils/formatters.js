/**
 * Utility functions for formatting currencies, dates, numbers, and percentages.
 * Member 4 - Analytics and Formatters Sprint
 */

/**
 * Format a numeric amount as a currency string safely.
 * Handles numeric values, strings with currency symbols or commas, null/undefined, and edge cases.
 *
 * @param {number|string} amount - The amount to format.
 * @param {string} [currency='USD'] - The ISO 4217 currency code (e.g., 'USD', 'INR', 'EUR').
 * @param {string} [locale='en-US'] - The BCP 47 language tag (e.g., 'en-US', 'en-IN').
 * @returns {string} Formatted currency string (e.g., "$120.00", "₹120.00").
 */
export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  if (amount === null || amount === undefined || amount === '' || typeof amount === 'symbol') {
    amount = 0;
  }

  let numericAmount;
  if (typeof amount === 'string') {
    const cleaned = amount.replace(/[^0-9.-]+/g, '');
    numericAmount = Number(cleaned);
  } else if (typeof amount === 'object') {
    numericAmount = Number(amount.valueOf ? amount.valueOf() : NaN);
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
    // Robust fallback for unsupported locales or currency codes
    if (currency === 'INR') {
      return `₹${validAmount.toFixed(2)}`;
    }
    if (currency === 'EUR') {
      return `€${validAmount.toFixed(2)}`;
    }
    if (currency === 'GBP') {
      return `£${validAmount.toFixed(2)}`;
    }
    return `$${validAmount.toFixed(2)}`;
  }
}

/**
 * Convenience helper to format currency in Indian Rupees (INR).
 * @param {number|string} amount - The amount to format.
 * @returns {string} Formatted INR currency string (e.g., "₹1,200.00").
 */
export function formatCurrencyINR(amount) {
  return formatCurrency(amount, 'INR', 'en-IN');
}

/**
 * Convenience helper to format currency in US Dollars (USD).
 * @param {number|string} amount - The amount to format.
 * @returns {string} Formatted USD currency string (e.g., "$1,200.00").
 */
export function formatCurrencyUSD(amount) {
  return formatCurrency(amount, 'USD', 'en-US');
}

/**
 * Format an ISO-style date string, timestamp, or Date object into a readable string safely.
 *
 * @param {string|number|Date} dateInput - The date to format (e.g., '2026-08-20', ISO string, timestamp, or Date).
 * @param {string|Intl.DateTimeFormatOptions} [formatType='medium'] - Format style: 'short', 'medium', 'long', 'iso', or Intl options object.
 * @param {string} [locale='en-US'] - The BCP 47 language tag.
 * @returns {string} Formatted date string or empty string if input is invalid or missing.
 */
export function formatDate(dateInput, formatType = 'medium', locale = 'en-US') {
  if (!dateInput && dateInput !== 0) {
    return '';
  }

  let date;

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) {
      return '';
    }

    // Match YYYY-MM-DD date-only strings and construct locally to prevent timezone offset shifts
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
      case 'full':
        options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
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
 *
 * @param {number|string} value - The number to format.
 * @param {number} [decimals=2] - Number of decimal places.
 * @param {string} [locale='en-US'] - The BCP 47 language tag.
 * @returns {string} Formatted number string.
 */
export function formatNumber(value, decimals = 2, locale = 'en-US') {
  if (value === null || value === undefined || value === '' || typeof value === 'symbol') {
    value = 0;
  }

  let numericValue;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]+/g, '');
    numericValue = Number(cleaned);
  } else {
    numericValue = Number(value);
  }

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

/**
 * Format a decimal or fractional value as a percentage string safely.
 *
 * @param {number|string} value - Number to format (e.g. 0.25 -> 25.0% or 25 -> 25.0% depending on isRatio flag).
 * @param {number} [decimals=1] - Decimal precision.
 * @param {boolean} [isRatio=false] - If true, multiplies value by 100 before formatting.
 * @param {string} [locale='en-US'] - The BCP 47 language tag.
 * @returns {string} Formatted percentage string (e.g. "25.0%").
 */
export function formatPercentage(value, decimals = 1, isRatio = false, locale = 'en-US') {
  if (value === null || value === undefined || value === '' || typeof value === 'symbol') {
    value = 0;
  }

  const numericValue = Number(value);
  let validValue = isNaN(numericValue) || !isFinite(numericValue) ? 0 : numericValue;

  if (isRatio) {
    validValue *= 100;
  }

  return `${formatNumber(validValue, decimals, locale)}%`;
}

// Aliases
export const formatPercent = formatPercentage;

export default {
  formatCurrency,
  formatCurrencyINR,
  formatCurrencyUSD,
  formatDate,
  formatNumber,
  formatPercentage,
  formatPercent
};
