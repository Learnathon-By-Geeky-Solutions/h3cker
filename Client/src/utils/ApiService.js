import TokenService from './TokenService';
import { auth } from '../firebase/firebase.config';

// Configure base URL based on environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Service for making authenticated API requests
 */
const ApiService = {
  /**
   * Make an authenticated request to the API
   * @param {string} endpoint - API endpoint to call
   * @param {Object} options - Fetch options
   * @returns {Promise} - Response from the API
   */
  async request(endpoint, options = {}) {
    // Get the auth token
    const token = TokenService.getToken();
    
    // Set up headers with authorization
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Configure the request
    const config = {
      ...options,
      headers,
    };
    
    try {
      // Make the request
      const response = await fetch(`${API_BASE_URL}/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`, config);
      
      // Handle token expiration
      if (response.status === 401) {
        // Token might be expired, try to refresh it
        const refreshed = await this.refreshToken();
        
        if (refreshed) {
          // Retry the request with the new token
          return this.request(endpoint, options);
        } else {
          // If refresh failed, trigger logout
          this.handleAuthError();
          throw new Error('Authentication failed');
        }
      }
      
      // Handle response
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // Parse JSON response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },
  
  /**
   * Attempt to refresh the authentication token
   * @returns {boolean} - Whether the refresh was successful
   */
  async refreshToken() {
    try {
      if (auth?.currentUser) {
        // Force refresh the token
        const newToken = await auth.currentUser.getIdToken(true);
        if (newToken) {
          TokenService.setToken(newToken, auth.currentUser.uid);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return false;
    }
  },
  
  /**
   * Handle authentication errors
   */
  handleAuthError() {
    // Clear the authentication
    TokenService.clearAuth();
    
    // Dispatch an event that can be caught by the app
    window.dispatchEvent(new CustomEvent('auth_error', {
      detail: { message: 'Your session has expired. Please log in again.' }
    }));
    
    // Redirect to login
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  },
  
  // Convenience methods for common API operations
  
  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @returns {Promise} - Response data
   */
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },
  
  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Data to send
   * @returns {Promise} - Response data
   */
  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Data to send
   * @returns {Promise} - Response data
   */
  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  /**
   * PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Data to send
   * @returns {Promise} - Response data
   */
  patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  
  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise} - Response data
   */
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },
  
  /**
   * Upload a file
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with files
   * @param {Function} progressCallback - Optional callback for upload progress
   * @returns {Promise} - Response data
   */
  uploadFile(endpoint, formData, progressCallback = null) {
    const token = TokenService.getToken();
    
    // Create request with progress tracking
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.open('POST', `${API_BASE_URL}/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`);
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error during upload'));
      };
      
      if (progressCallback && typeof progressCallback === 'function') {
        xhr.upload.onprogress = function(event) {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            progressCallback(percentComplete);
          }
        };
      }
      
      xhr.send(formData);
    });
  }
};

export default ApiService;