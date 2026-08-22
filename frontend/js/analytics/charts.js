/**
 * Charts Module for Expense Analytics
 * Manages category spending and daily spending trend charts.
 * Member 4 - Analytics and Formatters Sprint
 */

import { getCategorySpendingData, getDailySpendingData } from './analyticsService.js';
import { formatCurrency } from '../utils/formatters.js';

// Curated modern color palette for categories and trend charts
const CHART_PALETTE = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#f43f5e', // Rose
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#84cc16', // Lime
  '#eab308', // Yellow
  '#64748b'  // Slate
];

// Internal registry to track active chart instances and prevent duplicate charts
const chartRegistry = new Map();

/**
 * Safely resolve a DOM element or canvas from an element or string selector/ID.
 *
 * @param {HTMLElement|string} target - Container element or element ID.
 * @returns {HTMLElement|null} Resolved DOM element or null if not found.
 */
function resolveElement(target) {
  if (!target) {
    return null;
  }

  if (typeof target === 'string') {
    if (typeof document === 'undefined') {
      return null;
    }
    return document.getElementById(target) || document.querySelector(target);
  }

  if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) {
    return target;
  }

  return null;
}

/**
 * Normalize category spending data from various inputs (raw transactions, pre-processed data, or totals object).
 *
 * @param {Array|Object} input - Transactions array, chart data structure, or category totals map.
 * @returns {{ labels: string[], data: number[], datasets: Array<{ label: string, data: number[] }> }}
 */
function normalizeCategoryData(input) {
  if (!input) {
    return { labels: [], data: [], datasets: [{ label: 'Spending by Category', data: [] }] };
  }

  if (Array.isArray(input)) {
    return getCategorySpendingData(input);
  }

  if (input && typeof input === 'object') {
    if (Array.isArray(input.labels) && Array.isArray(input.data)) {
      return {
        labels: input.labels,
        data: input.data.map(v => (typeof v === 'number' && !isNaN(v) && isFinite(v) ? v : 0)),
        datasets: input.datasets || [{ label: 'Spending by Category', data: input.data }]
      };
    }

    // Handle plain category totals map: { Groceries: 50, Utilities: 100 }
    const labels = Object.keys(input);
    const data = labels.map(k => {
      const v = Number(input[k]);
      return !isNaN(v) && isFinite(v) ? v : 0;
    });

    return {
      labels,
      data,
      datasets: [{ label: 'Spending by Category', data }]
    };
  }

  return { labels: [], data: [], datasets: [{ label: 'Spending by Category', data: [] }] };
}

/**
 * Normalize daily spending trend data from various inputs.
 *
 * @param {Array|Object} input - Transactions array, chart data structure, or daily totals map.
 * @returns {{ labels: string[], data: number[], datasets: Array<{ label: string, data: number[] }> }}
 */
function normalizeDailyData(input) {
  if (!input) {
    return { labels: [], data: [], datasets: [{ label: 'Daily Spending', data: [] }] };
  }

  if (Array.isArray(input)) {
    return getDailySpendingData(input);
  }

  if (input && typeof input === 'object') {
    if (Array.isArray(input.labels) && Array.isArray(input.data)) {
      return {
        labels: input.labels,
        data: input.data.map(v => (typeof v === 'number' && !isNaN(v) && isFinite(v) ? v : 0)),
        datasets: input.datasets || [{ label: 'Daily Spending', data: input.data }]
      };
    }

    // Handle plain daily totals map: { '2026-08-20': 50, '2026-08-21': 100 }
    const labels = Object.keys(input).sort();
    const data = labels.map(k => {
      const v = Number(input[k]);
      return !isNaN(v) && isFinite(v) ? v : 0;
    });

    return {
      labels,
      data,
      datasets: [{ label: 'Daily Spending', data }]
    };
  }

  return { labels: [], data: [], datasets: [{ label: 'Daily Spending', data: [] }] };
}

/**
 * Destroy an active chart instance by element or key.
 *
 * @param {HTMLElement|string} target - Container element, canvas, or registry key.
 * @returns {boolean} True if a chart instance was found and destroyed.
 */
export function destroyChart(target) {
  if (!target) return false;

  const key = typeof target === 'string' ? target : (target.id || target);

  // Check Chart.js instance directly on canvas if globally available
  const el = resolveElement(target);
  if (el && typeof Chart !== 'undefined' && typeof Chart.getChart === 'function') {
    const chartJsInstance = Chart.getChart(el);
    if (chartJsInstance && typeof chartJsInstance.destroy === 'function') {
      chartJsInstance.destroy();
    }
  }

  const registered = chartRegistry.get(key) || (el ? chartRegistry.get(el) : null);
  if (registered) {
    if (registered.instance && typeof registered.instance.destroy === 'function') {
      registered.instance.destroy();
    }
    chartRegistry.delete(key);
    if (el) chartRegistry.delete(el);
    return true;
  }

  return false;
}

/**
 * Destroy all registered chart instances.
 */
export function destroyAllCharts() {
  for (const [key, item] of chartRegistry.entries()) {
    if (item && item.instance && typeof item.instance.destroy === 'function') {
      try {
        item.instance.destroy();
      } catch (err) {
        // Suppress destroy errors during batch cleanup
      }
    }
  }
  chartRegistry.clear();
}

/**
 * Get an active chart instance by target element or key.
 *
 * @param {HTMLElement|string} target - Container element, canvas, or registry key.
 * @returns {Object|null} Chart instance or null if not found.
 */
export function getChartInstance(target) {
  if (!target) return null;
  const key = typeof target === 'string' ? target : (target.id || target);
  const el = resolveElement(target);
  return chartRegistry.get(key) || (el ? chartRegistry.get(el) : null) || null;
}

/**
 * Get all registered chart instances.
 *
 * @returns {Map<string|HTMLElement, Object>}
 */
export function getAllChartInstances() {
  return new Map(chartRegistry);
}

/**
 * Render fallback HTML/SVG category breakdown when Chart.js is not loaded.
 *
 * @param {HTMLElement} container - Container element.
 * @param {{ labels: string[], data: number[] }} chartData - Normalized chart data.
 */
function renderCategoryFallback(container, chartData) {
  if (!container || typeof document === 'undefined') return;

  const total = chartData.data.reduce((sum, val) => sum + val, 0);

  if (chartData.labels.length === 0 || total === 0) {
    container.innerHTML = `
      <div class="chart-empty-state" style="text-align:center; padding:2rem 1rem; color:var(--text-muted, #94a3b8); font-style:italic;">
        No category spending data available
      </div>
    `;
    return;
  }

  const itemsHtml = chartData.labels.map((label, idx) => {
    const value = chartData.data[idx] || 0;
    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
    const color = CHART_PALETTE[idx % CHART_PALETTE.length];
    const formattedAmt = formatCurrency(value);

    return `
      <div class="chart-category-bar-item" style="margin-bottom:0.75rem;">
        <div style="display:flex; justify-content:space-between; font-size:0.875rem; margin-bottom:0.25rem;">
          <span style="font-weight:500; display:flex; align-items:center; gap:0.5rem;">
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:${color};"></span>
            ${label}
          </span>
          <span style="color:var(--text-muted, #94a3b8);">${formattedAmt} (${percentage}%)</span>
        </div>
        <div style="background-color:rgba(148,163,184,0.15); height:8px; border-radius:4px; overflow:hidden;">
          <div style="background-color:${color}; width:${percentage}%; height:100%; border-radius:4px; transition:width 0.3s ease;"></div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="chart-category-fallback" style="padding:1rem;">
      ${itemsHtml}
    </div>
  `;
}

/**
 * Render fallback HTML/SVG daily spending trend when Chart.js is not loaded.
 *
 * @param {HTMLElement} container - Container element.
 * @param {{ labels: string[], data: number[] }} chartData - Normalized chart data.
 */
function renderDailyTrendFallback(container, chartData) {
  if (!container || typeof document === 'undefined') return;

  const maxVal = Math.max(...chartData.data, 0);

  if (chartData.labels.length === 0 || maxVal === 0) {
    container.innerHTML = `
      <div class="chart-empty-state" style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted, #94a3b8); font-style:italic;">
        No daily spending trend data available
      </div>
    `;
    return;
  }

  const n = chartData.labels.length;
  const svgWidth = Math.max(480, n * 85);
  const svgHeight = 200;
  const padX = 45;
  const padTop = 35;
  const padBottom = 40;
  const chartH = svgHeight - padTop - padBottom;
  const chartW = svgWidth - padX * 2;

  // Calculate coordinates for each data point
  const points = chartData.labels.map((label, idx) => {
    const val = chartData.data[idx] || 0;
    const x = n > 1 ? padX + (idx / (n - 1)) * chartW : svgWidth / 2;
    const ratio = maxVal > 0 ? val / maxVal : 0;
    const y = padTop + (1 - ratio) * chartH;

    let displayDate = label;
    if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
      const [y, m, d] = label.split('-');
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const mIdx = parseInt(m, 10) - 1;
      displayDate = `${parseInt(d, 10)} ${monthNames[mIdx] || m}`;
    } else if (/^\d{2}-\d{2}$/.test(label)) {
      const [m, d] = label.split('-');
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const mIdx = parseInt(m, 10) - 1;
      displayDate = `${parseInt(d, 10)} ${monthNames[mIdx] || m}`;
    }

    return { x, y, val, label, displayDate, formatted: formatCurrency(val) };
  });

  // Build SVG path commands
  let lineD = '';
  let areaD = '';

  if (n === 1) {
    const p = points[0];
    lineD = `M ${p.x - 30} ${p.y} L ${p.x + 30} ${p.y}`;
    areaD = `M ${p.x - 30} ${svgHeight - padBottom} L ${p.x - 30} ${p.y} L ${p.x + 30} ${p.y} L ${p.x + 30} ${svgHeight - padBottom} Z`;
  } else {
    // Smooth Bezier curve
    lineD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      lineD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const groundY = svgHeight - padBottom;
    areaD = `${lineD} L ${lastX} ${groundY} L ${firstX} ${groundY} Z`;
  }

  // Data node circles & text labels
  const nodesSvg = points.map((p) => `
    <g class="chart-node">
      <circle cx="${p.x}" cy="${p.y}" r="5" fill="#ffffff" stroke="#6366f1" stroke-width="3"/>
      <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" fill="#0f172a" font-size="11" font-weight="700" font-family="Inter, system-ui, sans-serif">${p.formatted}</text>
      <text x="${p.x}" y="${svgHeight - 12}" text-anchor="middle" fill="#475569" font-size="11" font-weight="600" font-family="Inter, system-ui, sans-serif">${p.displayDate}</text>
    </g>
  `).join('');

  const gradientId = `trendGrad_${Math.random().toString(36).substring(2, 7)}`;

  container.innerHTML = `
    <div class="chart-daily-svg-wrap" style="width:100%; overflow-x:auto; padding:0.5rem 0;">
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width:100%; height:200px; min-width:${svgWidth}px; display:block;">
        <defs>
          <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#6366f1" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#6366f1" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        <!-- Horizontal grid lines -->
        <line x1="${padX}" y1="${padTop}" x2="${svgWidth - padX}" y2="${padTop}" stroke="#e2e8f0" stroke-dasharray="3,3"/>
        <line x1="${padX}" y1="${padTop + chartH / 2}" x2="${svgWidth - padX}" y2="${padTop + chartH / 2}" stroke="#f1f5f9" stroke-dasharray="3,3"/>
        <line x1="${padX}" y1="${svgHeight - padBottom}" x2="${svgWidth - padX}" y2="${svgHeight - padBottom}" stroke="#e2e8f0"/>

        <!-- Area fill & Line path -->
        <path d="${areaD}" fill="url(#${gradientId})" />
        <path d="${lineD}" fill="none" stroke="#6366f1" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- Data nodes -->
        ${nodesSvg}
      </svg>
    </div>
  `;
}

/**
 * Render or update a Category Spending Chart.
 * Cleanly handles Chart.js integration when available, or provides a lightweight fallback.
 * Safely handles missing containers and empty datasets.
 *
 * @param {HTMLElement|string} target - Container element, canvas, or selector/ID.
 * @param {Array|Object} data - Transactions array or category chart data.
 * @param {Object} [options={}] - Optional chart configuration.
 * @returns {Object|null} Chart descriptor object or null if target is not available.
 */
export function renderCategorySpendingChart(target, data, options = {}) {
  const container = resolveElement(target);
  if (!container) {
    // Graceful no-op when container is not present in DOM
    return null;
  }

  const normalized = normalizeCategoryData(data);
  const key = typeof target === 'string' ? target : (container.id || 'category-chart');

  // Check if Chart.js global library is available
  if (typeof Chart !== 'undefined') {
    let canvas = container;
    if (container.tagName.toLowerCase() !== 'canvas') {
      let existingCanvas = container.querySelector('canvas');
      if (!existingCanvas) {
        container.innerHTML = '';
        existingCanvas = document.createElement('canvas');
        existingCanvas.id = `${key}-canvas`;
        container.appendChild(existingCanvas);
      }
      canvas = existingCanvas;
    }

    // Destroy existing instance to avoid duplicates
    destroyChart(key);
    if (canvas !== container) {
      destroyChart(canvas);
    }

    const backgroundColors = normalized.labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]);

    try {
      const chartInstance = new Chart(canvas, {
        type: options.type || 'doughnut',
        data: {
          labels: normalized.labels,
          datasets: [
            {
              label: 'Spending by Category',
              data: normalized.data,
              backgroundColor: backgroundColors,
              borderColor: options.borderColor || '#ffffff',
              borderWidth: options.borderWidth !== undefined ? options.borderWidth : 2,
              hoverOffset: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: options.maintainAspectRatio !== undefined ? options.maintainAspectRatio : false,
          plugins: {
            legend: {
              position: options.legendPosition || 'bottom',
              labels: {
                boxWidth: 12,
                font: { size: 12 }
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.raw || 0;
                  return ` ${ctx.label}: ${formatCurrency(val)}`;
                }
              }
            }
          },
          ...options.chartOptions
        }
      });

      const entry = {
        type: 'category',
        instance: chartInstance,
        element: container,
        canvas,
        data: normalized,
        destroy: () => destroyChart(key)
      };

      chartRegistry.set(key, entry);
      chartRegistry.set(container, entry);
      return entry;
    } catch (error) {
      console.warn('Chart.js category chart render failed, using fallback:', error);
      renderCategoryFallback(container, normalized);
    }
  } else {
    // Chart.js not loaded: use clean fallback rendering
    renderCategoryFallback(container, normalized);
  }

  const fallbackEntry = {
    type: 'category',
    instance: null,
    element: container,
    data: normalized,
    destroy: () => destroyChart(key)
  };

  chartRegistry.set(key, fallbackEntry);
  chartRegistry.set(container, fallbackEntry);
  return fallbackEntry;
}

/**
 * Render or update a Daily Spending Trend Chart.
 * Cleanly handles Chart.js integration when available, or provides a lightweight fallback.
 * Safely handles missing containers and empty datasets.
 *
 * @param {HTMLElement|string} target - Container element, canvas, or selector/ID.
 * @param {Array|Object} data - Transactions array or daily chart data.
 * @param {Object} [options={}] - Optional chart configuration.
 * @returns {Object|null} Chart descriptor object or null if target is not available.
 */
export function renderDailySpendingChart(target, data, options = {}) {
  const container = resolveElement(target);
  if (!container) {
    // Graceful no-op when container is not present in DOM
    return null;
  }

  const normalized = normalizeDailyData(data);
  const key = typeof target === 'string' ? target : (container.id || 'daily-spending-chart');

  // Check if Chart.js global library is available
  if (typeof Chart !== 'undefined') {
    let canvas = container;
    if (container.tagName.toLowerCase() !== 'canvas') {
      let existingCanvas = container.querySelector('canvas');
      if (!existingCanvas) {
        container.innerHTML = '';
        existingCanvas = document.createElement('canvas');
        existingCanvas.id = `${key}-canvas`;
        container.appendChild(existingCanvas);
      }
      canvas = existingCanvas;
    }

    // Destroy existing instance to avoid duplicates
    destroyChart(key);
    if (canvas !== container) {
      destroyChart(canvas);
    }

    try {
      const chartInstance = new Chart(canvas, {
        type: options.type || 'line',
        data: {
          labels: normalized.labels,
          datasets: [
            {
              label: 'Daily Spending',
              data: normalized.data,
              borderColor: options.borderColor || '#6366f1',
              backgroundColor: options.backgroundColor || 'rgba(99, 102, 241, 0.1)',
              borderWidth: 2,
              tension: 0.3,
              fill: true,
              pointBackgroundColor: '#6366f1',
              pointRadius: 4,
              pointHoverRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: options.maintainAspectRatio !== undefined ? options.maintainAspectRatio : false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (val) => formatCurrency(val)
              }
            }
          },
          plugins: {
            legend: {
              display: options.displayLegend !== undefined ? options.displayLegend : false
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.raw || 0;
                  return ` Spending: ${formatCurrency(val)}`;
                }
              }
            }
          },
          ...options.chartOptions
        }
      });

      const entry = {
        type: 'daily',
        instance: chartInstance,
        element: container,
        canvas,
        data: normalized,
        destroy: () => destroyChart(key)
      };

      chartRegistry.set(key, entry);
      chartRegistry.set(container, entry);
      return entry;
    } catch (error) {
      console.warn('Chart.js daily trend chart render failed, using fallback:', error);
      renderDailyTrendFallback(container, normalized);
    }
  } else {
    // Chart.js not loaded: use clean fallback rendering
    renderDailyTrendFallback(container, normalized);
  }

  const fallbackEntry = {
    type: 'daily',
    instance: null,
    element: container,
    data: normalized,
    destroy: () => destroyChart(key)
  };

  chartRegistry.set(key, fallbackEntry);
  chartRegistry.set(container, fallbackEntry);
  return fallbackEntry;
}

/**
 * Initialize or update charts with transaction or analytics data.
 *
 * @param {Array|Object} transactions - List of transactions or analytics data object.
 * @param {Object} [config={}] - Target container selectors/IDs.
 * @param {string|HTMLElement} [config.categoryContainer='category-chart-container']
 * @param {string|HTMLElement} [config.dailyContainer='daily-chart-container']
 * @returns {{ categoryChart: Object|null, dailyChart: Object|null }}
 */
export function updateAllCharts(transactions, config = {}) {
  const categoryTarget = config.categoryContainer || 'category-chart-container';
  const dailyTarget = config.dailyContainer || 'daily-chart-container';

  const categoryChart = renderCategorySpendingChart(categoryTarget, transactions, config.categoryOptions);
  const dailyChart = renderDailySpendingChart(dailyTarget, transactions, config.dailyOptions);

  return {
    categoryChart,
    dailyChart
  };
}

// Aliases for convenience and flexible API naming conventions
export const updateCategorySpendingChart = renderCategorySpendingChart;
export const updateDailySpendingChart = renderDailySpendingChart;
export const renderCategoryChart = renderCategorySpendingChart;
export const updateCategoryChart = renderCategorySpendingChart;
export const renderDailyTrendChart = renderDailySpendingChart;
export const updateDailyTrendChart = renderDailySpendingChart;
export const createCategoryChart = renderCategorySpendingChart;
export const createDailyTrendChart = renderDailySpendingChart;
export const initCharts = updateAllCharts;

export default {
  renderCategorySpendingChart,
  renderDailySpendingChart,
  updateCategorySpendingChart,
  updateDailySpendingChart,
  renderCategoryChart,
  updateCategoryChart,
  renderDailyTrendChart,
  updateDailyTrendChart,
  createCategoryChart,
  createDailyTrendChart,
  destroyChart,
  destroyAllCharts,
  getChartInstance,
  getAllChartInstances,
  updateAllCharts,
  initCharts
};
