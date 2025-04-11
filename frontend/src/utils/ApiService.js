import TokenService from './TokenService';
import { auth } from '../firebase/firebase.config';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Service for making authenticated API requests to the Django backend
 */
const ApiService = {
  /**
   * Make an authenticated request to the API
   * @param {string} endpoint - API endpoint to call
   * @param {Object} options - Fetch options
   * @param {Object} adminCredentials - Optional admin credentials for elevated permissions
   * @returns {Promise} - Response from the API
   */
  async request(endpoint, options = {}, adminCredentials = null) {
    try {
      const token = await this.getValidToken();
      
      if (!token) {
        throw new Error('Authentication token is missing');
      }

      const headers = this.prepareHeaders(token, adminCredentials, options.headers);
      const config = { ...options, headers };

      const url = this.formatApiUrl(endpoint);
      
      this.logRequestDetails(config.method || 'GET', url, config.body);

      return await this.executeRequest(url, config, endpoint, adminCredentials);
      
    } catch (error) {
    
      console.error('API request failed:', error.message);

      if (!(error instanceof Error && error.message.startsWith('API error'))) {
        throw error;
      }
      throw error;
    }
  },

  /**
   * Get a valid token, refreshing if necessary
   * @returns {Promise<string|null>} The valid token or null
   */
  async getValidToken() {
    let token = TokenService.getToken();
    if (!token || TokenService.isTokenExpired()) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log('Token expired or missing, attempting to refresh...');
        try {
          token = await currentUser.getIdToken(true); 
          TokenService.setToken(token, currentUser.uid);
          console.log('Token refreshed successfully.');
        } catch (refreshError) {
          console.error('Failed to refresh Firebase token:', refreshError);
          this.handleAuthError('Your session is invalid. Please log in again.');
          throw new Error('Authentication failed: Could not refresh token');
        }
      } else {

        console.warn('No Firebase user found for authentication.');
        this.handleAuthError('User not authenticated');
        throw new Error('User not authenticated');
      }
    }

    return token;
  },

  /**
   * Prepare request headers
   * @param {Object} existingHeaders - Existing headers from options
   * @param {string} token - Authentication token
   * @param {string} token - Authentication token
   * @param {Object} adminCredentials - Optional admin credentials
   * @param {Object} existingHeaders - Existing headers from options
   * @returns {Object} - Prepared headers
   */
  prepareHeaders(token, adminCredentials, existingHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...existingHeaders,
    };

    if (token) {
    
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (adminCredentials) {
      headers['X-Admin-Username'] = adminCredentials.username;
      headers['X-Admin-Password'] = adminCredentials.password;
    }

    return headers;
  },

  /**
   * Format the API URL
   * @param {string} endpoint - API endpoint
   * @returns {string} - Formatted URL
   */
  formatApiUrl(endpoint) {
    console.log('Using API base URL:', API_BASE_URL);

    if (!API_BASE_URL) {
      console.error('API base URL is not defined in environment variables!');
    }

    return `${API_BASE_URL}/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`;
  },

  /**
   * Log request details
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {string|Object} body - Request body
   */
  logRequestDetails(method, url, body) {
    console.log(`Making API request: ${method} ${url}`);
    if (body && typeof body === 'string') {
      console.log('Request body (first 100 chars):', body.substring(0, 100));
    }
  },

  /**
   * Execute the API request
   * @param {string} url - Request URL
   * @param {Object} config - Request configuration
   * @param {string} endpoint - Original endpoint (for retry)
   * @param {Object} adminCredentials - Admin credentials (for retry)
   * @returns {Promise} - Response from the API
   */
  async executeRequest(url, config, endpoint, adminCredentials) {
    try {
      // Make the request
      const response = await fetch(url, config);

      // Debug response
      console.log(`API Response Status: ${response.status} ${response.statusText}`);

      if (response.status === 401) {
        return await this.handleUnauthorized(endpoint, config, adminCredentials);
      }

      if (response.status === 403) {
        return await this.handleForbidden(response);
      }

      if (!response.ok) {
        return await this.handleErrorResponse(response);
      }

      // Parse and return successful response
      return await this.parseResponseData(response);

    } catch (error) {
      // Catch network errors specifically
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Network error: Failed to fetch. Check API server connection and CORS configuration on the backend.');
        throw new Error('Failed to connect to the API server. Please ensure the backend is running and accessible.');
      }
      // Re-throw other errors (including parsed API errors)
      throw error;
    }
  },

  /**
   * Handle 401 Unauthorized response
   * @param {string} endpoint - Original endpoint
   * @param {Object} config - Request configuration
   * @param {Object} adminCredentials - Admin credentials
   * @returns {Promise} - Response from retry or throws error
   */
  async handleUnauthorized(endpoint, config, adminCredentials) {
    console.warn('Received 401 Unauthorized from API. Token might be invalid on backend.');
    const refreshed = await this.refreshToken();
    if (refreshed && config.retryCount !== 1) { 
      console.log('Retrying request after token refresh...');
      config.retryCount = 1; 
      const token = TokenService.getToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      } else {
        throw new Error('Authentication failed: Token unavailable after retry');
      }
      return this.request(endpoint, config, adminCredentials); // Retry the request
    } else {
      // If refresh failed or already retried, trigger logout
      console.error('Authentication failed after 401, triggering logout.');
      this.handleAuthError('Your session has expired or is invalid. Please log in again.');
      throw new Error('Authentication failed');
    }
  },

  /**
   * Handle 403 Forbidden response
   * @param {Response} response - Fetch Response object
   * @returns {Promise} - Always throws an error
   */
  async handleForbidden(response) {
    const errorData = await this.parseResponseData(response);
    const errorMessage = typeof errorData === 'string' ?
      errorData : (errorData.detail || 'Permission denied');
    console.error(`Permission denied (403): ${errorMessage}`);
    throw new Error(`Permission denied: ${errorMessage}`);
  },

  /**
   * Handle error responses (non-200 status codes)
   * @param {Response} response - Fetch Response object
   * @returns {Promise} - Always throws an error
   */
  async handleErrorResponse(response) {
    const errorData = await this.parseResponseData(response);
    const detailMessage = this.extractErrorMessage(errorData);
    
    console.error(`API error ${response.status}: ${detailMessage}`, errorData);
    throw new Error(`API error (${response.status}): ${detailMessage}`);
  },

  /**
   * Extract error message from API response
   * @param {Object|string} errorData - Error data from API
   * @returns {string} - Error message
   */
  extractErrorMessage(errorData) {
    if (typeof errorData === 'string') {
      return errorData;
    } 
    
    if (typeof errorData === 'object' && errorData !== null) {
      // Common DRF error structures
      if (errorData.detail) {
        return errorData.detail;
      } 
      if (errorData.error) {
        return errorData.error;
      } 
      if (errorData.message) {
        return errorData.message;
      }
      
      // Try to serialize specific field errors
      const fieldErrors = Object.entries(errorData)
        .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
        .join('; ');
      
      if (fieldErrors) {
        return fieldErrors;
      }
      
      try {
        return JSON.stringify(errorData);
      } catch {
        /* ignore serialization error */
      }
    }
    
    return 'Unknown API error';
  },

  /**
   * Parse response data based on content type
   * @param {Response} response - Fetch Response object
   * @returns {Promise<Object|string>} - Parsed response data
   */
  async parseResponseData(response) {
    const contentType = response.headers.get('content-type');
    if (response.status === 204 || !contentType) {
      return null; // Or return {}, depending on expected behavior
    }
    if (contentType?.includes('application/json')) {
      try {
        return await response.json();
      } catch (e) {
        console.error("Failed to parse JSON response:", e);
        // Try reading as text as a fallback
        const text = await response.text();
        console.error("Response text:", text);
        throw new Error("Received invalid JSON response from server.");
      }
    }
    return await response.text();
  },

  /**
   * Attempt to refresh the Firebase authentication token
   * @returns {Promise<boolean>} - Whether the refresh was successful
   */
  async refreshToken() {
    try {
      if (auth?.currentUser) {
        console.log('Attempting to force refresh Firebase token...');
        const newToken = await auth.currentUser.getIdToken(true);
        if (newToken) {
          TokenService.setToken(newToken, auth.currentUser.uid);
          console.log('Firebase token refreshed and saved.');
          return true;
        }
      }
      console.warn('Could not refresh token: No current user found.');
      return false;
    } catch (error) {
      console.error('Failed to refresh Firebase token:', error);
      if (error.code === 'auth/user-token-expired' || error.code === 'auth/invalid-user-token') {
        this.handleAuthError('Your session has expired. Please log in again.');
      }
      return false;
    }
  },

  /**
   * Handle authentication errors (e.g., trigger logout)
   * @param {string} message - Optional custom error message
   */
  handleAuthError(message = 'Authentication error') {
    console.error(`Authentication Error: ${message}`);

    TokenService.clearAuth();

    window.dispatchEvent(new CustomEvent('auth_error', {
      detail: { message }
    }));
  },


  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} adminCredentials - Optional admin credentials
   * @returns {Promise} - Response data
   */
  get(endpoint, adminCredentials = null) {
    return this.request(endpoint, { method: 'GET' }, adminCredentials);
  },

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Data to send (will be JSON.stringify'd)
   * @param {Object} adminCredentials - Optional admin credentials
   * @returns {Promise} - Response data
   */
  post(endpoint, data, adminCredentials = null) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data), // Ensure data is stringified
    }, adminCredentials);
  },

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Data to send (will be JSON.stringify'd)
   * @param {Object} adminCredentials - Optional admin credentials
   * @returns {Promise} - Response data
   */
  put(endpoint, data, adminCredentials = null) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, adminCredentials);
  },

  /**
   * PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Data to send (will be JSON.stringify'd)
   * @param {Object} adminCredentials - Optional admin credentials
   * @returns {Promise} - Response data
   */
  patch(endpoint, data, adminCredentials = null) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data), // Ensure data is stringified
    }, adminCredentials);
  },

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} adminCredentials - Optional admin credentials
   * @returns {Promise} - Response data
   */
  delete(endpoint, adminCredentials = null) {
    return this.request(endpoint, { method: 'DELETE' }, adminCredentials);
  },

  /**
   * Upload a file using FormData (typically to your own backend endpoint if it handles files)
   * NOTE: This is NOT suitable for direct Azure SAS URL upload. Use VideoService.uploadFileToBlob for that.
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with files
   * @param {Function} progressCallback - Optional callback for upload progress
   * @param {Object} adminCredentials - Optional admin credentials
   * @returns {Promise} - Response data
   */
  uploadFileWithFormData(endpoint, formData, progressCallback = null, adminCredentials = null) {
    return new Promise((resolve, reject) => {
      // Setup the XHR request in a separate method
      this.setupXhrUpload(endpoint, formData, progressCallback, adminCredentials, resolve, reject);
    });
  },

  /**
   * Set up the XHR upload request
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with files
   * @param {Function} progressCallback - Optional callback for upload progress
   * @param {Object} adminCredentials - Optional admin credentials
   * @param {Function} resolve - Promise resolve function
   * @param {Function} reject - Promise reject function
   */
  async setupXhrUpload(endpoint, formData, progressCallback, adminCredentials, resolve, reject) {
    try {
      // Get a fresh token
      await this.refreshToken(); // Ensure token is fresh before starting upload
      const token = TokenService.getToken();
      if (!token) {
        reject(new Error('Authentication token is missing for file upload'));
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

      this.configureXhrCallbacks(xhr, progressCallback, resolve, reject);
      xhr.send(formData);
    } catch (error) {
      console.error('Error setting up file upload:', error);
      reject(error);
    }
  },

  /**
   * Configure XHR callbacks
   * @param {XMLHttpRequest} xhr - The XHR object
   * @param {Function} progressCallback - Progress callback function
   * @param {Function} resolve - Promise resolve function
   * @param {Function} reject - Promise reject function
   */
  configureXhrCallbacks(xhr, progressCallback, resolve, reject) {
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          resolve(xhr.responseText); 
        }
      } else if (xhr.status === 401) {
        console.error('Authentication failed during upload (401)');
        reject(new Error('Authentication failed during upload'));
        this.handleAuthError('Authentication failed during upload');
      } else if (xhr.status === 403) {
        console.error('Permission denied during upload (403)');
        reject(new Error('Permission denied during upload'));
      } else {
        console.error(`Upload failed with status: ${xhr.status} ${xhr.statusText}`);
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText || 'Server error'}`));
      }
    };

    xhr.onerror = () => {
      console.error('Network error during upload');
      reject(new Error('Network error during upload'));
    };

    if (progressCallback && typeof progressCallback === 'function') {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          progressCallback(percentComplete);
        }
      };
    }
  },

  /**
   * Test the authentication with the backend
   * Useful for verifying the connection and token validity
   * @returns {Promise<Object>} Authentication test result
   */
  async testAuth() {
    try {
      return await this.get('auth-test/');
    } catch (error) {
      console.error('Auth test failed:', error);
      return { success: false, error: error.message || 'Auth test failed' };
    }
  },

  /**
   * Set Firebase token in browser session for API browser testing (Django REST Framework)
   * This hits a specific endpoint on the backend designed for this purpose.
   * @param {string} token - Firebase ID token
   * @returns {Promise<Object>} Authentication result from the backend
   */
  async setSessionTokenForDRFBrowsableAPI(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/set-token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      
      return await response.json(); 
    } catch (error) {
      console.error('Failed to set session token for DRF Browsable API:', error);
      throw error; 
    }
  }
};

export default ApiService;