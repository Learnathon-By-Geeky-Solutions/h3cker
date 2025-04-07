import TokenService from './TokenService';
import { auth } from '../firebase/firebase.config';

// Configure base URL based on environment
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
      // Get the auth token - this should be the Firebase ID token
      let token = TokenService.getToken();
      
      // If no token exists or it's expired, try to get a fresh one
      if (!token || TokenService.isTokenExpired()) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          token = await currentUser.getIdToken(true);
          TokenService.setToken(token, currentUser.uid);
        } else {
          // No current user, can't authenticate
          throw new Error('User not authenticated');
        }
      }
      
      // Set up headers with authorization
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      if (token) {
        // Format exactly as expected by the Django FirebaseAuthentication class
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Add admin credentials in headers if provided
      if (adminCredentials) {
        headers['X-Admin-Username'] = adminCredentials.username;
        headers['X-Admin-Password'] = adminCredentials.password;
      }
      
      // Configure the request
      const config = {
        ...options,
        headers,
      };
      
      // Format the URL properly - make sure to use the correct base URL
      console.log('Using API base URL:', API_BASE_URL);
      
      if (!API_BASE_URL) {
        console.error('API base URL is not defined in environment variables!');
      }
      
      const url = `${API_BASE_URL}/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`;
      console.log('Making API request to:', url);
      
      try {
        // Make the request
        const response = await fetch(url, config);
        
        // Debug response
        console.log(`API Response: ${response.status} ${response.statusText}`);
        
        // Handle authentication errors
        if (response.status === 401) {
          // Token might be expired or invalid, try to refresh it
          const refreshed = await this.refreshToken();
          
          if (refreshed) {
            // Retry the request with the new token
            return this.request(endpoint, options, adminCredentials);
          } else {
            // If refresh failed, trigger logout
            this.handleAuthError('Your session has expired. Please log in again.');
            throw new Error('Authentication failed');
          }
        }
        
        // Handle permission errors
        if (response.status === 403) {
          // This could mean admin credentials are required
          const errorData = await this.parseResponseData(response);
          const errorMessage = typeof errorData === 'string' ? 
            errorData : (errorData.detail || 'Permission denied');
          
          throw new Error(`Permission denied: ${errorMessage}`);
        }
        
        // Handle other errors
        if (!response.ok) {
          const errorData = await this.parseResponseData(response);
          throw new Error(typeof errorData === 'string' ? 
            errorData : 
            (errorData.detail || `API error: ${response.status} ${response.statusText}`));
        }
        
        // Parse and return successful response
        return await this.parseResponseData(response);
      } catch (error) {
        if (error.message === 'Failed to fetch') {
          console.error('Network connectivity issue. Check your API server connection.');
          throw new Error('Failed to connect to the API server. Please ensure the backend is running.');
        }
        throw error;
      }
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },
  
  /**
   * Parse response data based on content type
   * @param {Response} response - Fetch Response object
   * @returns {Promise<Object|string>} - Parsed response data
   */
  async parseResponseData(response) {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  },
  
  /**
   * Attempt to refresh the Firebase authentication token
   * @returns {boolean} - Whether the refresh was successful
   */
  async refreshToken() {
    try {
      if (auth?.currentUser) {
        // Force refresh the Firebase token
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
   * @param {string} message - Optional custom error message
   */
  handleAuthError(message = 'Authentication error') {
    // Clear the authentication
    TokenService.clearAuth();
    
    // Dispatch an event that can be caught by the app
    window.dispatchEvent(new CustomEvent('auth_error', {
      detail: { message }
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
   * @param {Object} adminCredentials - Optional admin credentials
   * @returns {Promise} - Response data
   */
  get(endpoint, adminCredentials = null) {
    return this.request(endpoint, { method: 'GET' }, adminCredentials);
  },
  
  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Data to send
   * @param {Object} adminCredentials - Optional admin credentials
   * @returns {Promise} - Response data
   */
  post(endpoint, data, adminCredentials = null) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }, adminCredentials);
  },
  
  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Data to send
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
   * @param {Object} data - Data to send
   * @param {Object} adminCredentials - Optional admin credentials
   * @returns {Promise} - Response data
   */
  patch(endpoint, data, adminCredentials = null) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
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
   * Upload a file
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with files
   * @param {Function} progressCallback - Optional callback for upload progress
   * @param {Object} adminCredentials - Optional admin credentials
   * @returns {Promise} - Response data
   */
  uploadFile(endpoint, formData, progressCallback = null, adminCredentials = null) {
    return new Promise(async (resolve, reject) => {
      try {
        // Get a fresh token
        await this.refreshToken();
        const token = TokenService.getToken();
        
        // Create request with progress tracking
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`);
        
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        
        // Add admin credentials if provided
        if (adminCredentials) {
          xhr.setRequestHeader('X-Admin-Username', adminCredentials.username);
          xhr.setRequestHeader('X-Admin-Password', adminCredentials.password);
        }
        
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              resolve(xhr.responseText);
            }
          } else if (xhr.status === 401) {
            // Token expired during upload
            reject(new Error('Authentication failed during upload'));
          } else if (xhr.status === 403) {
            // Permission denied, might need admin credentials
            reject(new Error('Permission denied: Admin credentials may be required'));
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
      } catch (error) {
        reject(error);
      }
    });
  },
  
  /**
   * Test the authentication with the backend
   * Useful for verifying the connection is working
   * @returns {Promise<Object>} Authentication test result
   */
  async testAuth() {
    try {
      return await this.get('auth-test/');
    } catch (error) {
      console.error('Auth test failed:', error);
      throw error;
    }
  },
  
  /**
   * Set Firebase token in browser session for API browser testing
   * This is only needed for testing in the Django REST framework browser interface
   * @param {string} token - Firebase ID token
   * @returns {Promise<Object>} Authentication result
   */
  async setSessionToken(token) {
    try {
      return await this.post('set-token/', { token });
    } catch (error) {
      console.error('Failed to set session token:', error);
      throw error;
    }
  },
  
  /**
   * Verify admin credentials
   * @param {string} username - Admin username
   * @param {string} password - Admin password
   * @param {string} userEmail - Current user's email (for matching)
   * @returns {Promise<Object>} Verification result
   */
  async verifyAdmin(username, password, userEmail) {
    try {
      return await this.post('verify-admin/', {
        username,
        password,
        user_email: userEmail
      });
    } catch (error) {
      console.error('Admin verification failed:', error);
      throw error;
    }
  },
  
  /**
   * Check if the current user has permission to upload
   * @returns {Promise<Object>} Permission check result
   */
  async checkUploadPermission() {
    try {
      return await this.get('check-upload-permission/');
    } catch (error) {
      console.error('Upload permission check failed:', error);
      throw error;
    }
  }
};

export default ApiService;