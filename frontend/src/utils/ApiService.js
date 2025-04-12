import TokenService from './TokenService';
import { auth } from '../firebase/firebase.config';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Service for making authenticated API requests to the Django backend
 */
const ApiService = {
  /**
   * Basic HTTP request methods that share common implementation
   */
  get(endpoint, adminCredentials = null) {
    return this.request(endpoint, { method: 'GET' }, adminCredentials);
  },

  post(endpoint, data, adminCredentials = null) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }, adminCredentials);
  },

  put(endpoint, data, adminCredentials = null) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, adminCredentials);
  },

  patch(endpoint, data, adminCredentials = null) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, adminCredentials);
  },

  delete(endpoint, adminCredentials = null) {
    return this.request(endpoint, { method: 'DELETE' }, adminCredentials);
  },

  /**
   * Core request method that handles authentication and response processing
   */
  async request(endpoint, options = {}, adminCredentials = null) {
    try {
 
      const token = await this.getValidToken();
      if (!token) {
        throw new Error('Authentication token is missing');
      }

      const url = `${API_BASE_URL}/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`;
      const headers = this.prepareHeaders(token, adminCredentials, options.headers);
      const config = { ...options, headers, retryCount: options.retryCount || 0 };

      this.logRequest(config.method || 'GET', url, config.body);
 
      const response = await fetch(url, config);
      return await this.handleResponse(response, endpoint, config, adminCredentials);
    } catch (error) {
      if (this.isNetworkError(error)) {
        throw new Error('Failed to connect to the API server. Please check your connection and try again.');
      }
      throw error;
    }
  },

  /**
   * Prepare request headers including authentication
   */
  prepareHeaders(token, adminCredentials = null, existingHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...existingHeaders,
    };

    if (adminCredentials) {
      headers['X-Admin-Username'] = adminCredentials.username;
      headers['X-Admin-Password'] = adminCredentials.password;
    }

    return headers;
  },

  /**
   * Log API request details (for development)
   */
  logRequest(method, url, body) {
    console.log(`API Request: ${method} ${url}`);
    if (body && typeof body === 'string' && body.length > 0) {
      const preview = body.length > 100 ? `${body.substring(0, 100)}...` : body;
      console.log('Request body:', preview);
    }
  },

  /**
   * Check if error is a network connectivity error
   */
  isNetworkError(error) {
    return error instanceof TypeError && error.message === 'Failed to fetch';
  },

  /**
   * Process API response based on status code
   */
  async handleResponse(response, endpoint, config, adminCredentials) {
    console.log(`API Response: ${response.status} ${response.statusText}`);
  
    if (response.status === 401) {
      return await this.handleUnauthorized(response, endpoint, config, adminCredentials);
    }
    
    if (response.status === 403) {
      throw await this.createErrorFromResponse(response, 'Permission denied');
    }
    
    if (!response.ok) {
      throw await this.createErrorFromResponse(response);
    }
    
    return await this.parseResponseData(response);
  },

  /**
   * Create an error object from response data
   */
  async createErrorFromResponse(response, defaultPrefix = 'API error') {
    const data = await this.parseResponseData(response);
    const message = this.extractErrorMessage(data);
    const errorMessage = `${defaultPrefix} (${response.status}): ${message}`;
    
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    return error;
  },

  /**
   * Extract a meaningful error message from various API response formats
   */
  extractErrorMessage(data) {
    if (typeof data === 'string') {
      return data;
    }

    if (!data) {
      return 'Unknown error';
    }

    if (data.detail) return data.detail;
    if (data.error) return data.error;
    if (data.message) return data.message;

    if (typeof data === 'object') {
      const fieldErrors = Object.entries(data)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([field, errors]) => {
          const errorMsg = Array.isArray(errors) ? errors.join(', ') : errors;
          return `${field}: ${errorMsg}`;
        })
        .join('; ');
      
      if (fieldErrors) {
        return fieldErrors;
      }
    }
    return JSON.stringify(data);
  },

  /**
   * Parse response data based on content type
   */
  async parseResponseData(response) {

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null;
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        const text = await response.text();
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
      }
    }

    return await response.text();
  },

  /**
   * Handle 401 Unauthorized responses with token refresh
   */
  async handleUnauthorized(response, endpoint, config, adminCredentials) {
    console.warn('Received 401 Unauthorized. Attempting token refresh...');
   
    if (config.retryCount > 0) {
      this.handleAuthError('Session expired. Please log in again.');
      throw new Error('Authentication failed after retry');
    }

    const refreshed = await this.refreshToken();
    if (!refreshed) {
      this.handleAuthError('Unable to refresh your session. Please log in again.');
      throw new Error('Token refresh failed');
    }

    const token = TokenService.getToken();
    if (!token) {
      throw new Error('Token unavailable after refresh');
    }

    const newConfig = {
      ...config,
      retryCount: config.retryCount + 1,
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      }
    };
    
    console.log('Retrying request with new token...');
    return this.request(endpoint, newConfig, adminCredentials);
  },

  /**
   * Getting a valid authentication token, refreshing if necessary
   */
  async getValidToken() {
    const token = TokenService.getToken();

    if (token && !TokenService.isTokenExpired()) {
      return token;
    }
 
    return await this.refreshTokenAndGet();
  },

  /**
   * Refresh the token and return the new one
   */
  async refreshTokenAndGet() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('No authenticated user found');
      return null;
    }
    
    try {
      console.log('Refreshing Firebase token...');
      const newToken = await currentUser.getIdToken(true);
      TokenService.setToken(newToken, currentUser.uid);
      return newToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  },

  /**
   * Force refresh the token
   */
  async refreshToken() {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;
    
    try {
      const newToken = await currentUser.getIdToken(true);
      if (!newToken) return false;
      
      TokenService.setToken(newToken, currentUser.uid);
      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      if (['auth/user-token-expired', 'auth/invalid-user-token'].includes(error.code)) {
        this.handleAuthError('Your session has expired');
      }
      
      return false;
    }
  },

  /**
   * Handling authentication errors by clearing state and notifying UI
   */
  handleAuthError(message = 'Authentication error') {
    console.error(`Auth error: ${message}`);
    TokenService.clearAuth();
    window.dispatchEvent(new CustomEvent('auth_error', { 
      detail: { message } 
    }));
  },

  /**
   * Uploading a file using FormData
   */
  uploadFileWithFormData(endpoint, formData, progressCallback = null, adminCredentials = null) {
    return new Promise((resolve, reject) => {
      this.executeFileUpload(endpoint, formData, progressCallback, adminCredentials, resolve, reject);
    });
  },

  /**
   * Setting up and execute file upload via XMLHttpRequest
   */
  async executeFileUpload(endpoint, formData, progressCallback, adminCredentials, resolve, reject) {
    try {
  
      const token = await this.getValidToken();
      if (!token) {
        reject(new Error('Authentication failed for file upload'));
        return;
      }

      const xhr = new XMLHttpRequest();
      const url = `${API_BASE_URL}/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`;
      
      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
  
      if (adminCredentials) {
        xhr.setRequestHeader('X-Admin-Username', adminCredentials.username);
        xhr.setRequestHeader('X-Admin-Password', adminCredentials.password);
      }
      

      xhr.onload = () => this.handleUploadResponse(xhr, resolve, reject);
      xhr.onerror = () => reject(new Error('Network error during upload'));
      
      if (progressCallback && typeof progressCallback === 'function') {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            progressCallback((event.loaded / event.total) * 100);
          }
        };
      }
      
      xhr.send(formData);
    } catch (error) {
      reject(error);
    }
  },

  /**
   * Handling the XHR upload response
   */
  handleUploadResponse(xhr, resolve, reject) {
    if (xhr.status >= 200 && xhr.status < 300) {
      if (xhr.getResponseHeader('Content-Type')?.includes('application/json')) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        resolve(xhr.responseText);
      }
    } else if (xhr.status === 401) {
      this.handleAuthError('Authentication failed during upload');
      reject(new Error('Authentication failed during upload'));
    } else {
      reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText || 'Server error'}`));
    }
  },

  /**
   * Testing authentication with the backend
   */
  async testAuth() {
    try {
      return await this.get('auth-test/');
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Setting session token for Django REST Framework browsable API
   */
  async setSessionTokenForDRFBrowsableAPI(token) {
    if (!token) {
      throw new Error('Token is required');
    }
    
    const response = await fetch(`${API_BASE_URL}/set-token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    
    return await response.json();
  }
};

export default ApiService;