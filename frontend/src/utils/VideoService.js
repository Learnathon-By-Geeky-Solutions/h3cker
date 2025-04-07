import ApiService from './ApiService';

/**
 * Service for video-related API operations
 */
const VideoService = {
  /**
   * Get a list of all videos for the feed
   * @param {Object} adminCredentials - Optional admin credentials
   * @returns {Promise<Array>} Array of video objects
   */
  async getVideoFeed(adminCredentials = null) {
    try {
      const response = await ApiService.get('video-feed/', adminCredentials);
      return response;
    } catch (error) {
      console.error('Error fetching video feed:', error);
      throw error;
    }
  },
  
  /**
   * Simple test to check backend connectivity
   */
  async testBackendConnection() {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      console.log(`Testing connection to ${apiBaseUrl}/video-feed/`);
      
      const response = await fetch(`${apiBaseUrl}/video-feed/`);
      const status = response.status;
      const headers = Object.fromEntries([...response.headers.entries()]);
      
      console.log(`Connection test results:`);
      console.log(`- Status: ${status}`);
      console.log(`- Headers:`, headers);
      
      return {
        success: response.ok,
        status,
        headers
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Get detailed information about a specific video
   * @param {number} videoId - The ID of the video to fetch
   * @param {Object} adminCredentials - Optional admin credentials
   * @returns {Promise<Object>} Video details
   */
  async getVideoDetails(videoId, adminCredentials = null) {
    try {
      const response = await ApiService.get(`video/${videoId}/`, adminCredentials);
      return response;
    } catch (error) {
      console.error(`Error fetching video ID ${videoId}:`, error);
      throw error;
    }
  },

  /**
   * Initiate a video upload with the backend
   * This will get SAS tokens for Azure blob storage
   * @param {Object} videoData - Video metadata (title, description, etc.)
   * @param {Object} adminCredentials - Optional admin credentials
   * @returns {Promise<Object>} Response with upload URLs
   */
  async initiateVideoUpload(videoData, adminCredentials = null) {
    try {
      // Required fields based on backend analysis
      const requiredFields = ['title', 'filename'];
      
      for (const field of requiredFields) {
        if (!videoData[field]) {
          throw new Error(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
        }
      }
      
      // Format data exactly as backend expects
      const formattedData = {
        title: videoData.title,
        description: videoData.description || '',
        category: videoData.category || '',
        visibility: videoData.visibility || 'private',
        filename: videoData.filename
      };
      
      // Log the request for debugging
      console.log('Initiating video upload with data:', formattedData);
      
      try {
        const response = await ApiService.post('upload-video/', formattedData, adminCredentials);
        console.log('Upload response:', response);
        
        if (!response || !response.video_upload_url || !response.thumbnail_upload_url) {
          throw new Error('Backend did not return required upload URLs');
        }
        
        return response;
      } catch (error) {
        if (error.message === 'Failed to fetch') {
          console.error('Backend connectivity issue. Check server connection and CORS settings.');
          
          // Provide more specific debugging
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
          console.error(`API base URL: ${apiBaseUrl}`);
          console.error('Check that:');
          console.error('1. Backend server is running');
          console.error('2. CORS is properly configured on the backend');
          console.error('3. Network connection is available');
          
          throw new Error('Cannot connect to the backend server. Is it running?');
        }
        throw error;
      }
    } catch (error) {
      console.error('Error initiating video upload:', error);
      throw error;
    }
  },

  /**
   * Upload a file to Azure Blob Storage using a SAS URL
   * @param {string} sasUrl - The SAS URL for uploading
   * @param {File} file - The file to upload
   * @param {Function} progressCallback - Callback function for upload progress
   * @returns {Promise<void>}
   */
  async uploadFileToBlob(sasUrl, file, progressCallback = null) {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Starting upload to Azure Blob Storage: ${file.name} (${file.type})`);
        console.log(`SAS URL format check: ${sasUrl.substring(0, 50)}...`);
        
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', sasUrl, true);
        
        // These headers are crucial for Azure blob storage
        xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
        xhr.setRequestHeader('Content-Type', file.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && progressCallback) {
            const percentComplete = (event.loaded / event.total) * 100;
            progressCallback(percentComplete);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log(`Successfully uploaded ${file.name} to Azure`);
            resolve();
          } else {
            console.error(`Upload failed with status: ${xhr.status}`);
            console.error('Response:', xhr.responseText);
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        };

        xhr.onerror = (e) => {
          console.error('Network error during upload:', e);
          reject(new Error('Network error occurred during upload'));
        };

        xhr.send(file);
      } catch (error) {
        console.error('Exception during blob upload:', error);
        reject(error);
      }
    });
  },

  /**
   * Format relative time (e.g., "2 days ago")
   * @param {string} timestamp - ISO timestamp
   * @returns {string} Relative time
   */
  formatRelativeTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
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
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
    }
    
    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
  }
};

export default VideoService;