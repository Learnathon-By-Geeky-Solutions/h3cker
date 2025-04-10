// --- START OF FILE VideoService.js ---

import ApiService from './ApiService';

/**
 * Service for video-related API operations
 */
const VideoService = {
  /**
   * Get a list of all videos for the feed (public endpoint)
   * @returns {Promise<Array>} Array of video objects
   */
  async getVideoFeed() { // Removed adminCredentials as backend allows AllowAny
    try {
      // This uses GET which doesn't need auth based on backend view permissions
      console.log('Fetching public video feed...');
      const response = await ApiService.get('video-feed/');
      console.log(`Fetched ${response?.length || 0} videos for feed.`);
      return response || []; // Ensure array return
    } catch (error) {
      console.error('Error fetching video feed:', error);
      // Don't throw here, let caller decide how to handle UI for feed failure
      return []; // Return empty array on error to prevent crashing feed UI
    }
  },

  /**
   * Simple test to check backend connectivity to a public endpoint
   */
  async testBackendConnection() {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      const testUrl = `${apiBaseUrl}/video-feed/`; // Use a known public endpoint
      console.log(`Testing connection to ${testUrl}`);

      const response = await fetch(testUrl, { method: 'GET', mode: 'cors' }); // Ensure CORS mode
      const status = response.status;
      const headers = Object.fromEntries([...response.headers.entries()]);

      console.log(`Connection test results:`);
      console.log(`- Status: ${status}`);
      console.log(`- OK: ${response.ok}`);
      // console.log(`- Headers:`, headers); // Can be verbose

      return {
        success: response.ok,
        status,
        headers
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        status: null, // Indicate network or CORS issue
        error: error.message // Provide error message
      };
    }
  },

  /**
   * Get detailed information about a specific video (public endpoint)
   * @param {number|string} videoId - The ID of the video to fetch
   * @returns {Promise<Object>} Video details
   */
  async getVideoDetails(videoId) { // Removed adminCredentials
    if (!videoId) {
        console.error("getVideoDetails requires a videoId.");
        throw new Error("Video ID is required.");
    }
    try {
      console.log(`Fetching details for video ID: ${videoId}`);
      // This uses GET which doesn't need auth based on backend view permissions
      const response = await ApiService.get(`video/${videoId}/`);
      console.log(`Fetched details for video ID: ${videoId}`, response);
      return response;
    } catch (error) {
      console.error(`Error fetching details for video ID ${videoId}:`, error);
      throw error; // Re-throw to be handled by the caller
    }
  },

  /**
   * Initiate a video upload with the backend (authenticated)
   * This contacts the Django backend to get SAS tokens for Azure blob storage.
   * @param {Object} videoMetadata - Video metadata (title, description, category, visibility, filename)
   * @returns {Promise<Object>} Response from the backend containing upload URLs { video_upload_url, thumbnail_upload_url, message }
   */
  async initiateVideoUpload(videoMetadata) { // Removed adminCredentials, uses ApiService auth
    try {
      // Validate required fields based on backend serializer and view logic
      const requiredFields = ['title', 'filename'];
      for (const field of requiredFields) {
        if (!videoMetadata[field]) {
          throw new Error(`${field.charAt(0).toUpperCase() + field.slice(1)} is required to initiate upload.`);
        }
      }

      // Prepare data payload matching backend expectations (VideoSerializer fields + filename)
      const payload = {
        title: videoMetadata.title,
        description: videoMetadata.description || '',
        category: videoMetadata.category || '',
        visibility: videoMetadata.visibility || 'private',
        filename: videoMetadata.filename // Crucial: Backend needs this to generate SAS
      };

      console.log('Initiating video upload with backend, sending metadata:', payload);

      // Use ApiService.post for authenticated request
      const response = await ApiService.post('upload-video/', payload); // Endpoint needs auth

      console.log('Backend response received:', response);

      // Validate the response structure from the backend
      if (!response || !response.video_upload_url || !response.thumbnail_upload_url) {
        console.error('Backend response missing required upload URLs:', response);
        throw new Error('Failed to get upload URLs from the server. Response was invalid.');
      }

      return response; // Should contain { video_upload_url, thumbnail_upload_url, message }

    } catch (error) {
      // Catch specific errors from ApiService if needed, otherwise log and re-throw
      console.error('Error initiating video upload via backend:', error.message);
      // Provide more context if it's a network error
      if (error.message.includes('Failed to connect') || error.message.includes('Network error')) {
           throw new Error('Cannot connect to the backend server to initiate upload. Please check the server status and your connection.');
      }
      throw error; // Re-throw for the component to handle UI feedback
    }
  },

  /**
   * Upload a file directly to Azure Blob Storage using a SAS URL.
   * @param {string} sasUrl - The SAS URL provided by the backend for uploading.
   * @param {File} file - The file object to upload.
   * @param {Function} [progressCallback=null] - Optional callback function like (percentage) => {}
   * @returns {Promise<void>} Resolves on successful upload, rejects on error.
   */
  async uploadFileToBlob(sasUrl, file, progressCallback = null) {
    return new Promise((resolve, reject) => {
      if (!sasUrl || !file) {
        reject(new Error('SAS URL and File object are required for blob upload.'));
        return;
      }

      try {
        console.log(`Starting direct upload to Azure: ${file.name} (${file.type})`);
        // console.log(`Using SAS URL (first 60 chars): ${sasUrl.substring(0, 60)}...`); // Avoid logging full SAS URL

        const xhr = new XMLHttpRequest();
        xhr.open('PUT', sasUrl, true); // Use PUT method for SAS upload

        // Set REQUIRED headers for Azure Blob Storage PUT request with SAS
        xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
        // Set Content-Type header *crucially* based on the file being uploaded
        // If this is wrong, the blob might be stored incorrectly or unplayable.
        xhr.setRequestHeader('Content-Type', file.type);

        // --- Optional but Recommended Headers ---
        // xhr.setRequestHeader('Content-Length', file.size.toString()); // Browser usually handles this for XHR PUT

        // --- Progress Tracking ---
        if (progressCallback && typeof progressCallback === 'function') {
             xhr.upload.onprogress = (event) => {
               if (event.lengthComputable) {
                 const percentComplete = (event.loaded / event.total) * 100;
                 progressCallback(percentComplete);
               }
             };
        }

        // --- Handle Completion ---
        xhr.onload = () => {
          // Status codes 200-299 are generally success for PUT
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log(`Successfully uploaded ${file.name} to Azure. Status: ${xhr.status}`);
            resolve(); // Resolve the promise on success
          } else {
            // Upload failed
            console.error(`Azure upload failed for ${file.name}. Status: ${xhr.status} ${xhr.statusText}`);
            console.error('Azure Response Text:', xhr.responseText); // Log Azure's error message
             // Try to parse Azure's XML error response if possible
             let errorMessage = `Upload failed with status: ${xhr.status}`;
             if (xhr.responseText) {
                 // Basic parsing attempt - might need a proper XML parser for complex errors
                 const detailMatch = xhr.responseText.match(/<Detail>(.*?)<\/Detail>/i);
                 const messageMatch = xhr.responseText.match(/<Message>(.*?)<\/Message>/i);
                 if (detailMatch && detailMatch[1]) {
                     errorMessage += ` - Detail: ${detailMatch[1]}`;
                 } else if (messageMatch && messageMatch[1]) {
                      errorMessage += ` - Message: ${messageMatch[1]}`;
                 } else {
                     errorMessage += ` - Response: ${xhr.responseText.substring(0, 200)}...`; // Show partial response
                 }
             }
            reject(new Error(errorMessage));
          }
        };

        // --- Handle Network Errors ---
        xhr.onerror = (e) => {
          console.error('Network error during Azure upload:', e);
          reject(new Error('Network error occurred during file upload to Azure.'));
        };

        // --- Send the file ---
        xhr.send(file);

      } catch (error) {
        console.error('Exception occurred during setup or sending of blob upload:', error);
        reject(error);
      }
    });
  },

  /**
   * Format relative time (e.g., "2 days ago")
   * @param {string} timestamp - ISO timestamp string (e.g., from Date.toISOString())
   * @returns {string} Human-readable relative time string
   */
  formatRelativeTime(timestamp) {
    if (!timestamp) return 'unknown date';

    try {
        const date = new Date(timestamp);
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'invalid date';
        }

        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 5) {
          return 'just now';
        }
        if (diffInSeconds < 60) {
          return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
          return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
          return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) {
          return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
        }

        const diffInMonths = Math.floor(diffInDays / 30.44); // Average days in month
        if (diffInMonths < 12) {
          return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
        }

        const diffInYears = Math.floor(diffInMonths / 12);
        return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
    } catch (e) {
        console.error("Error formatting relative time:", e);
        return "error in date";
    }
  }
};

export default VideoService;
// --- END OF FILE VideoService.js ---