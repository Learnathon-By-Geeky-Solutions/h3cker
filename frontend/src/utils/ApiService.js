// --- START OF FILE ApiService.js ---

import TokenService from './TokenService';
import { auth } from '../firebase/firebase.config'; // Assuming firebase.config is in ../firebase/

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
          console.log('Token expired or missing, attempting to refresh...');
          try {
              token = await currentUser.getIdToken(true); // Force refresh
              TokenService.setToken(token, currentUser.uid);
              console.log('Token refreshed successfully.');
          } catch (refreshError) {
              console.error('Failed to refresh Firebase token:', refreshError);
              this.handleAuthError('Your session is invalid. Please log in again.');
              throw new Error('Authentication failed: Could not refresh token');
          }
        } else {
          // No current user, can't authenticate
          console.warn('No Firebase user found for authentication.');
          this.handleAuthError('User not authenticated'); // Optionally trigger logout
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
      } else {
         // If we still don't have a token after trying to refresh, fail
         console.error('Authentication token is missing after refresh attempt.');
         throw new Error('Authentication token is missing');
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
      console.log(`Making API request: ${config.method || 'GET'} ${url}`);
      if (config.body && typeof config.body === 'string') {
        console.log('Request body (first 100 chars):', config.body.substring(0, 100));
      }


      try {
        // Make the request
        const response = await fetch(url, config);

        // Debug response
        console.log(`API Response Status: ${response.status} ${response.statusText}`);
        // Log headers for debugging CORS issues if they arise
        // console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));


        // Handle authentication errors (401 Unauthorized)
        if (response.status === 401) {
            console.warn('Received 401 Unauthorized from API. Token might be invalid on backend.');
            // Attempt refresh ONE more time in case of race condition or backend invalidation
            const refreshed = await this.refreshToken();
            if (refreshed && config.retryCount !== 1) { // Add retryCount to prevent infinite loop
                console.log('Retrying request after token refresh...');
                config.retryCount = 1; // Mark as retried
                // Re-fetch token and update headers for retry
                token = TokenService.getToken();
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
        }

        // Handle permission errors (403 Forbidden)
        if (response.status === 403) {
          const errorData = await this.parseResponseData(response);
          const errorMessage = typeof errorData === 'string' ?
            errorData : (errorData.detail || 'Permission denied');
          console.error(`Permission denied (403): ${errorMessage}`);
          throw new Error(`Permission denied: ${errorMessage}`);
        }

        // Handle other errors (e.g., 400 Bad Request, 500 Internal Server Error)
        if (!response.ok) {
          const errorData = await this.parseResponseData(response);
           // Attempt to extract a meaningful error message
           let detailMessage = 'Unknown API error';
           if (typeof errorData === 'string') {
               detailMessage = errorData;
           } else if (typeof errorData === 'object' && errorData !== null) {
               // Common DRF error structures
               if (errorData.detail) {
                   detailMessage = errorData.detail;
               } else if (errorData.error) {
                   detailMessage = errorData.error;
               } else if (errorData.message) { // Check for custom message field
                   detailMessage = errorData.message;
               } else {
                   // Try to serialize specific field errors
                   const fieldErrors = Object.entries(errorData)
                       .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
                       .join('; ');
                   if (fieldErrors) {
                       detailMessage = fieldErrors;
                   } else {
                        try {
                            detailMessage = JSON.stringify(errorData);
                        } catch { /* ignore serialization error */ }
                   }
               }
           }

          console.error(`API error ${response.status}: ${detailMessage}`, errorData);
          throw new Error(`API error (${response.status}): ${detailMessage}`);
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
    } catch (error) {
      // Catch errors from token fetching or initial setup
      console.error('API request failed:', error.message);
      // Avoid throwing the same error twice if it was already thrown inside
      if (!(error instanceof Error && error.message.startsWith('API error'))) {
           throw error;
      }
       // If it was an API error already processed, just let it propagate
       else {
           throw error;
       }

    }
  },

  /**
   * Parse response data based on content type
   * @param {Response} response - Fetch Response object
   * @returns {Promise<Object|string>} - Parsed response data
   */
  async parseResponseData(response) {
    const contentType = response.headers.get('content-type');
    // Handle cases where there might be no content (e.g., 204 No Content)
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
        // Force refresh the Firebase token
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
       // Handle specific Firebase errors if needed
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
    // Clear the authentication state
    TokenService.clearAuth();

    // Dispatch an event that can be caught by the app (e.g., by AuthProvider)
    // This is better than direct redirection as the app can handle it centrally
    window.dispatchEvent(new CustomEvent('auth_error', {
      detail: { message }
    }));

    // Optional: Redirect after a short delay if the event listener doesn't handle it
    // setTimeout(() => {
    //   // Check if user is still on a protected page before redirecting
    //   if (window.location.pathname !== '/login') {
    //      window.location.href = '/login?sessionExpired=true';
    //   }
    // }, 500);
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
      body: JSON.stringify(data), // Ensure data is stringified
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
    return new Promise(async (resolve, reject) => {
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
        xhr.open('POST', url); // Usually POST for FormData uploads

        // Set Authorization header
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        // DO NOT set Content-Type for FormData, the browser does it correctly with boundary
        // xhr.setRequestHeader('Content-Type', 'multipart/form-data'); // WRONG!

        // Add admin credentials if provided
        if (adminCredentials) {
          xhr.setRequestHeader('X-Admin-Username', adminCredentials.username);
          xhr.setRequestHeader('X-Admin-Password', adminCredentials.password);
        }

        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              // Try to parse as JSON, fall back to text
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              resolve(xhr.responseText); // Resolve with text if JSON parsing fails
            }
          } else if (xhr.status === 401) {
              console.error('Authentication failed during upload (401)');
              reject(new Error('Authentication failed during upload'));
              ApiService.handleAuthError('Authentication failed during upload'); // Trigger auth error handling
          } else if (xhr.status === 403) {
              console.error('Permission denied during upload (403)');
              reject(new Error('Permission denied during upload'));
          } else {
              console.error(`Upload failed with status: ${xhr.status} ${xhr.statusText}`);
              reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText || 'Server error'}`));
          }
        };

        xhr.onerror = function() {
          console.error('Network error during upload');
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
        console.error('Error setting up file upload:', error);
        reject(error);
      }
    });
  },

  /**
   * Test the authentication with the backend
   * Useful for verifying the connection and token validity
   * @returns {Promise<Object>} Authentication test result
   */
  async testAuth() {
    try {
      // Use a simple authenticated endpoint
      return await this.get('auth-test/'); // Make sure 'auth-test/' exists and requires auth
    } catch (error) {
      console.error('Auth test failed:', error);
      // Don't throw here, let the caller handle the failure indication
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
       // This POST request doesn't need the Authorization header itself,
       // as it's purpose is to establish a session *based* on the token.
      return await fetch(`${API_BASE_URL}/set-token/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
      }).then(res => res.json()); // Assuming backend sends JSON response

    } catch (error) {
      console.error('Failed to set session token for DRF Browsable API:', error);
      throw error; // Re-throw the error for the caller to handle
    }
  },

  // --- Removed verifyAdmin and checkUploadPermission ---
  // These seem application-specific and were not fully defined in the backend code provided.
  // If needed, they should have corresponding backend endpoints.
  // Add them back if you have the backend views/urls implemented for them.
};

export default ApiService;
// --- END OF FILE ApiService.js ---