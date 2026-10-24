/**
 * apiClient.js — Centralized Fetch API Client for KharchaSense
 *
 * Responsibilities:
 *   - Centralize all HTTP requests to backend REST API endpoints.
 *   - Manage JWT authentication token in localStorage (`kharchaSenseToken`).
 *   - Automatically inject `Authorization: Bearer <token>` on authenticated calls.
 *   - Standardize JSON encoding/decoding and error handling across all frontend modules.
 *   - Dynamically resolve API Base URL (configurable via window.KHARCHASENSE_API_URL).
 */

const TOKEN_KEY = 'kharchaSenseToken';
const LEGACY_TOKEN_KEY = 'token';

/**
 * Determine the API base URL.
 * Defaults to 'http://localhost:5000' unless running on port 5000 or custom config provided.
 * @returns {string}
 */
export function getApiBaseUrl() {
    if (typeof window !== 'undefined') {
        if (window.KHARCHASENSE_API_URL) {
            return window.KHARCHASENSE_API_URL.replace(/\/+$/, '');
        }
        if (window.location && (window.location.port === '5000' || window.location.origin.includes(':5000'))) {
            return '';
        }
    }
    return 'http://localhost:5000';
}

/**
 * Retrieve the active JWT token from persistent storage.
 * @returns {string|null}
 */
export function getToken() {
    try {
        return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || null;
    } catch (e) {
        console.warn('[apiClient] Could not access localStorage for token:', e);
        return null;
    }
}

/**
 * Store the JWT token in persistent storage.
 * @param {string} token
 */
export function setToken(token) {
    try {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            removeToken();
        }
    } catch (e) {
        console.warn('[apiClient] Could not persist token to localStorage:', e);
    }
}

/**
 * Remove the JWT token from persistent storage.
 */
export function removeToken() {
    try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
    } catch (e) {
        console.warn('[apiClient] Could not remove token from localStorage:', e);
    }
}

/**
 * Core HTTP request handler using standard Fetch API.
 *
 * @param {string} endpoint - API path (e.g. '/api/transactions') or full URL
 * @param {object} [options] - Fetch options (method, headers, body, params, etc.)
 * @returns {Promise<any>} Parsed response data
 * @throws {Error} Detailed error with status code and server message
 */
export async function request(endpoint, options = {}) {
    const baseUrl = getApiBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
        ? endpoint
        : `${baseUrl}${cleanEndpoint}`;

    const headers = {
        'Accept': 'application/json',
        ...(options.headers || {})
    };

    // Inject JWT Bearer token if present and not explicitly overridden
    const token = getToken();
    if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let body = options.body;
    if (body !== undefined && body !== null && typeof body === 'object' && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }

    const fetchConfig = {
        ...options,
        headers,
        body
    };

    let response;
    try {
        response = await fetch(url, fetchConfig);
    } catch (networkError) {
        console.error(`[apiClient] Network failure: ${fetchConfig.method || 'GET'} ${url}`, networkError);
        throw new Error(
            `Unable to connect to KharchaSense backend server at ${baseUrl}. Please ensure the server is active on port 5000.`
        );
    }

    let responseData = null;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        try {
            responseData = await response.json();
        } catch (jsonParseErr) {
            responseData = null;
        }
    } else {
        try {
            responseData = await response.text();
        } catch (textParseErr) {
            responseData = null;
        }
    }

    if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        if (responseData && typeof responseData === 'object') {
            errorMessage = responseData.message || responseData.error || errorMessage;
        } else if (typeof responseData === 'string' && responseData.trim()) {
            errorMessage = responseData;
        }

        const apiError = new Error(errorMessage);
        apiError.status = response.status;
        apiError.data = responseData;
        throw apiError;
    }

    return responseData;
}

/**
 * Convenience helper for GET requests.
 * @param {string} endpoint
 * @param {object} [options]
 * @returns {Promise<any>}
 */
export function get(endpoint, options = {}) {
    return request(endpoint, { ...options, method: 'GET' });
}

/**
 * Convenience helper for POST requests.
 * @param {string} endpoint
 * @param {any} body
 * @param {object} [options]
 * @returns {Promise<any>}
 */
export function post(endpoint, body, options = {}) {
    return request(endpoint, { ...options, method: 'POST', body });
}

/**
 * Convenience helper for PUT requests.
 * @param {string} endpoint
 * @param {any} body
 * @param {object} [options]
 * @returns {Promise<any>}
 */
export function put(endpoint, body, options = {}) {
    return request(endpoint, { ...options, method: 'PUT', body });
}

/**
 * Convenience helper for DELETE requests.
 * @param {string} endpoint
 * @param {object} [options]
 * @returns {Promise<any>}
 */
export function del(endpoint, options = {}) {
    return request(endpoint, { ...options, method: 'DELETE' });
}

export default {
    getApiBaseUrl,
    getToken,
    setToken,
    removeToken,
    request,
    get,
    post,
    put,
    delete: del,
    del
};
