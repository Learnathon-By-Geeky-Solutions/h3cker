/**
 * Extracting YouTube video ID from various URL formats
 * @param {string} url - YouTube video URL
 * @returns {string|null} Extracted YouTube video ID or null
 */
export const extractYouTubeId = (url) => {
    if (!url) return null;
  
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:.*[?&]v=|(?:v|embed)\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
  
    for (const pattern of patterns) {
      const match = pattern.exec(url);
      if (match) {
        return match[1];
      }
    }
  
    return null;
  };
  
  /**
   * @param {string} videoId - YouTube video ID
   * @returns {string} Thumbnail URL
   */
  export const getYouTubeThumbnail = (videoId) => {
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '/api/placeholder/400/225';
  };
  
  /**
   * @param {string} videoId - YouTube video ID
   * @returns {string} Embed URL
   */
  export const createYouTubeEmbedUrl = (videoId) => {
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0` : '';
  };