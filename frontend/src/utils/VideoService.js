import ApiService from './ApiService';

const VideoService = {
  async getVideoFeed() {
    try {
      console.log('Fetching public video feed...');
      const response = await ApiService.get('video-feed/');
      console.log(`Fetched ${response?.length || 0} videos for feed.`);
      
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error fetching video feed:', error);
      return [];
    }
  },

  async testBackendConnection() {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      const testUrl = `${apiBaseUrl}/video-feed/`;
      console.log(`Testing connection to ${testUrl}`);

      const response = await fetch(testUrl, { method: 'GET', mode: 'cors' });
      const status = response.status;
      const headers = Object.fromEntries([...response.headers.entries()]);

      console.log(`Connection test results:`);
      console.log(`- Status: ${status}`);
      console.log(`- OK: ${response.ok}`);

      return {
        success: response.ok,
        status,
        headers
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        status: null,
        error: error.message
      };
    }
  },

  async getVideoDetails(videoId) {
    if (!videoId) {
      console.error("getVideoDetails requires a videoId.");
      throw new Error("Video ID is required.");
    }
    try {
      console.log(`Fetching details for video ID: ${videoId}`);
      const response = await ApiService.get(`video/${videoId}/`);
      console.log(`Fetched details for video ID: ${videoId}`, response);
      return response;
    } catch (error) {
      console.error(`Error fetching details for video ID ${videoId}:`, error);
      throw error;
    }
  },

  async getMyVideos(userEmail) {
    if (!userEmail) {
      console.error("getMyVideos requires a userEmail.");
      throw new Error("User email is required.");
    }

    try {
      console.log(`Fetching videos for user: ${userEmail}`);
      const response = await ApiService.get(`user-videos/${userEmail}/`);
      console.log(`Fetched ${response?.length || 0} videos for user: ${userEmail}`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error(`Error fetching videos for user ${userEmail}:`, error);
      throw error;
    }
  },

  async getVideosByCategory(category) {
    if (!category) {
      console.error("getVideosByCategory requires a category.");
      throw new Error("Category is required.");
    }

    try {
      console.log(`Fetching videos for category: ${category}`);
      const response = await ApiService.get(`category-videos/${category}/`);
      console.log(`Fetched ${response?.length || 0} videos for category: ${category}`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error(`Error fetching videos for category ${category}:`, error);
      return [];
    }
  },

  async initiateVideoUpload(videoMetadata) {
    try {
      const requiredFields = ['title', 'filename'];
      for (const field of requiredFields) {
        if (!videoMetadata[field]) {
          throw new Error(`${field.charAt(0).toUpperCase() + field.slice(1)} is required to initiate upload.`);
        }
      }

      const payload = {
        title: videoMetadata.title,
        description: videoMetadata.description || '',
        category: videoMetadata.category || '',
        visibility: videoMetadata.visibility || 'private',
        filename: videoMetadata.filename,
        view_limit: videoMetadata.view_limit || null,
        auto_private_after: videoMetadata.auto_private_after || null
      };

      console.log('Initiating video upload with backend, sending metadata:', payload);

      const response = await ApiService.post('upload-video/', payload);

      console.log('Backend response received:', response);

      if (!response?.video_upload_url || !response?.thumbnail_upload_url) {
        console.error('Backend response missing required upload URLs:', response);
        throw new Error('Failed to get upload URLs from the server. Response was invalid.');
      }

      return response;

    } catch (error) {
      console.error('Error initiating video upload via backend:', error.message);
      if (error.message.includes('Failed to connect') || error.message.includes('Network error')) {
        throw new Error('Cannot connect to the backend server to initiate upload. Please check the server status and your connection.');
      }
      throw error;
    }
  },
  
  async recordVideoView(videoId) {
    if (!videoId) {
      throw new Error("Video ID is required to record a view");
    }
    
    try {
      console.log(`Recording view for video ID: ${videoId}`);
      const response = await ApiService.post(`videos/${videoId}/view/`);
      console.log(`View recorded for video ID: ${videoId}`, response);
      return response;
    } catch (error) {
      console.error(`Error recording view for video ID ${videoId}:`, error);
      throw error;
    }
  },
  
  async toggleVideoLike(videoId) {
    if (!videoId) {
      throw new Error("Video ID is required to toggle like status");
    }
    
    try {
      console.log(`Toggling like status for video ID: ${videoId}`);
      const response = await ApiService.post(`videos/${videoId}/like/`);
      console.log(`Like status updated for video ID: ${videoId}`, response);
      return response;
    } catch (error) {
      console.error(`Error toggling like for video ID ${videoId}:`, error);
      throw error;
    }
  },
  
  async createVideoShare(videoId) {
    if (!videoId) {
      throw new Error("Video ID is required to create a share link");
    }
    
    try {
      console.log(`Creating share link for video ID: ${videoId}`);
      const response = await ApiService.post(`videos/${videoId}/share/`);
      console.log(`Share link created for video ID: ${videoId}`, response);
      return response;
    } catch (error) {
      console.error(`Error creating share link for video ID ${videoId}:`, error);
      throw error;
    }
  },
  
  async getUserHistory() {
    try {
      console.log('Fetching user video history...');
      const response = await ApiService.get('user/history/');
      console.log(`Fetched ${response?.length || 0} videos from history.`);
      
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error fetching user history:', error);
      return [];
    }
  },
  
  async getSharedVideoByToken(shareToken) {
    if (!shareToken) {
      throw new Error("Share token is required");
    }
    
    try {
      console.log(`Fetching shared video with token: ${shareToken}`);
      const response = await ApiService.get(`shared/${shareToken}/`);
      console.log(`Fetched shared video:`, response);
      return response;
    } catch (error) {
      console.error(`Error fetching shared video with token ${shareToken}:`, error);
      throw error;
    }
  },

  // Admin-specific methods
  async adminGetAllVideos() {
    try {
      console.log('Fetching all videos (admin)');
      const response = await ApiService.get('admin/videos/');
      console.log(`Fetched ${response?.length || 0} videos (admin).`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error fetching admin videos:', error);
      throw error;
    }
  },
  
  async adminDeleteVideo(videoId) {
    if (!videoId) {
      throw new Error("Video ID is required for deletion");
    }
    
    try {
      console.log(`Deleting video ID: ${videoId} (admin)`);
      return await ApiService.delete(`admin/videos/${videoId}/`);
    } catch (error) {
      console.error(`Error deleting video ID ${videoId}:`, error);
      throw error;
    }
  },
  
  async adminUpdateVideoVisibility(videoId, visibility) {
    if (!videoId || !visibility) {
      throw new Error("Video ID and visibility are required");
    }
    
    if (!['public', 'private', 'unlisted'].includes(visibility)) {
      throw new Error("Invalid visibility option");
    }
    
    try {
      console.log(`Updating visibility for video ID: ${videoId} to ${visibility} (admin)`);
      return await ApiService.patch(`admin/videos/${videoId}/`, {
        visibility: visibility
      });
    } catch (error) {
      console.error(`Error updating video visibility for ID ${videoId}:`, error);
      throw error;
    }
  },

  async adminEditVideo(videoId, videoData) {
    if (!videoId) {
      throw new Error("Video ID is required for updating");
    }
    
    try {
      console.log(`Updating video ID: ${videoId} (admin)`);
      return await ApiService.patch(`admin/videos/${videoId}/`, videoData);
    } catch (error) {
      console.error(`Error updating video ID ${videoId}:`, error);
      throw error;
    }
  },

  async adminGetVideoStats() {
    try {
      console.log('Fetching video statistics (admin)');
      return await ApiService.get('admin/video-stats/');
    } catch (error) {
      console.error('Error fetching video statistics:', error);
      throw error;
    }
  },
  
  async adminSearchUser(email) {
    if (!email) {
      throw new Error("Email is required for user search");
    }
    
    try {
      console.log(`Searching for user with email: ${email} (admin)`);
      return await ApiService.get(`admin/users/search/?email=${encodeURIComponent(email)}`);
    } catch (error) {
      console.error(`Error searching for user with email ${email}:`, error);
      throw error;
    }
  },
  
  async adminPromoteToAdmin(userId, adminPassword) {
    if (!userId) {
      throw new Error("User ID is required");
    }
    
    if (!adminPassword) {
      throw new Error("Admin password is required for security verification");
    }
    
    try {
      console.log(`Promoting user ID: ${userId} to admin (admin)`);
      return await ApiService.post('admin/users/promote/', {
        user_id: userId,
        admin_password: adminPassword
      });
    } catch (error) {
      console.error(`Error promoting user ID ${userId} to admin:`, error);
      throw error;
    }
  },

  async uploadFileToBlob(sasUrl, file, progressCallback = null) {
    return new Promise((resolve, reject) => {
      if (!sasUrl || !file) {
        reject(new Error('SAS URL and File object are required for blob upload.'));
        return;
      }

      try {
        console.log(`Starting direct upload to Azure: ${file.name} (${file.type})`);

        const xhr = new XMLHttpRequest();
        xhr.open('PUT', sasUrl, true);

        xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
        xhr.setRequestHeader('Content-Type', file.type);

        if (progressCallback && typeof progressCallback === 'function') {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentComplete = (event.loaded / event.total) * 100;
              progressCallback(percentComplete);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log(`Successfully uploaded ${file.name} to Azure. Status: ${xhr.status}`);
            resolve();
          } else {
            console.error(`Azure upload failed for ${file.name}. Status: ${xhr.status} ${xhr.statusText}`);
            console.error('Azure Response Text:', xhr.responseText);
            let errorMessage = `Upload failed with status: ${xhr.status}`;
            if (xhr.responseText) {
              const detailRegex = /<Detail>(.*?)<\/Detail>/i;
              const messageRegex = /<Message>(.*?)<\/Message>/i;
              const detailMatch = detailRegex.exec(xhr.responseText);
              const messageMatch = messageRegex.exec(xhr.responseText);
              
              if (detailMatch?.[1]) {
                errorMessage += ` - Detail: ${detailMatch[1]}`;
              } else if (messageMatch?.[1]) {
                errorMessage += ` - Message: ${messageMatch[1]}`;
              } else {
                errorMessage += ` - Response: ${xhr.responseText.substring(0, 200)}...`;
              }
            }
            reject(new Error(errorMessage));
          }
        };

        xhr.onerror = (e) => {
          console.error('Network error during Azure upload:', e);
          reject(new Error('Network error occurred during file upload to Azure.'));
        };

        xhr.send(file);

      } catch (error) {
        console.error('Exception occurred during setup or sending of blob upload:', error);
        reject(error instanceof Error ? error : new Error(error));
      }
    });
  },

  optimizeVideoPlayback(videoElement) {
    if (!videoElement) return null;

    videoElement.preload = "metadata";
    videoElement.playsInline = true;

    const setQualityBasedOnConnection = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        if (connection.downlink < 1.5) {
          videoElement.setAttribute("data-quality", "low");
        } else if (connection.downlink < 5) {
          videoElement.setAttribute("data-quality", "medium");
        } else {
          videoElement.setAttribute("data-quality", "high");
        }
      }
    };

    const buffering = { 
      isBuffering: false,
      timerId: null,
      startTime: 0
    };

    const handleWaiting = () => {
      if (!buffering.isBuffering) {
        buffering.isBuffering = true;
        buffering.startTime = Date.now();
        console.log("Video buffering started");
      }
    };

    const handlePlaying = () => {
      if (buffering.isBuffering) {
        const bufferTime = Date.now() - buffering.startTime;
        console.log(`Video buffering ended after ${bufferTime}ms`);
        buffering.isBuffering = false;
      }
    };

    const handleError = (e) => {
      console.error("Video playback error:", e);
      const errorCode = videoElement.error ? videoElement.error.code : "unknown";
      console.error(`Error code: ${errorCode}`);
    };

    if ('connection' in navigator) {
      setQualityBasedOnConnection();
      navigator.connection.addEventListener('change', setQualityBasedOnConnection);
    }

    videoElement.addEventListener('waiting', handleWaiting);
    videoElement.addEventListener('playing', handlePlaying);
    videoElement.addEventListener('error', handleError);

    return {
      cleanup: () => {
        if ('connection' in navigator) {
          navigator.connection.removeEventListener('change', setQualityBasedOnConnection);
        }
        videoElement.removeEventListener('waiting', handleWaiting);
        videoElement.removeEventListener('playing', handlePlaying);
        videoElement.removeEventListener('error', handleError);
      }
    };
  },

  generateOptimizedThumbnail(videoFile) {
    return new Promise((resolve, reject) => {
      if (!videoFile?.type?.startsWith('video/')) {
        reject(new Error('Invalid video file'));
        return;
      }

      const videoUrl = URL.createObjectURL(videoFile);
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.addEventListener('loadeddata', () => {
        video.currentTime = video.duration * 0.25;
      });

      video.addEventListener('seeked', () => {
        const maxWidth = 640;
        const aspectRatio = video.videoWidth / video.videoHeight;

        canvas.width = Math.min(video.videoWidth, maxWidth);
        canvas.height = canvas.width / aspectRatio;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(videoUrl);
            resolve(blob);
          },
          'image/jpeg',
          0.85
        );
      });

      video.addEventListener('error', (e) => {
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Error generating thumbnail: ' + e.message));
      });

      video.src = videoUrl;
      video.load();
    });
  },

  formatRelativeTime(timestamp) {
    if (!timestamp) return 'unknown date';

    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'invalid date';
      }

      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      return this._getTimeString(diffInSeconds);
    } catch (e) {
      console.error("Error formatting relative time:", e);
      return "error in date";
    }
  },

  _getTimeString(diffInSeconds) {
    // Just now (less than 5 seconds)
    if (diffInSeconds < 5) return 'just now';
    
    // Seconds (less than a minute)
    if (diffInSeconds < 60) {
      return this._formatUnit(diffInSeconds, 'second');
    }
    
    // Minutes (less than an hour)
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return this._formatUnit(diffInMinutes, 'minute');
    }
    
    // Hours (less than a day)
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return this._formatUnit(diffInHours, 'hour');
    }
    
    // Days (less than a month)
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return this._formatUnit(diffInDays, 'day');
    }
    
    // Months (less than a year)
    const diffInMonths = Math.floor(diffInDays / 30.44);
    if (diffInMonths < 12) {
      return this._formatUnit(diffInMonths, 'month');
    }
    
    // Years
    const diffInYears = Math.floor(diffInMonths / 12);
    return this._formatUnit(diffInYears, 'year');
  },
  
  _formatUnit(value, unit) {
    return `${value} ${unit}${value !== 1 ? 's' : ''} ago`;
  }
};

export default VideoService;