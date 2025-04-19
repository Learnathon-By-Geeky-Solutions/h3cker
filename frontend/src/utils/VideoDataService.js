import VideoService from './VideoService';

// Normalize video data to a consistent format
export const normalizeVideoData = (video, index) => ({
  id: video.id || `fallback-video-${index}`,
  title: video.title || 'Untitled Video',
  description: video.description || '',
  imageUrl: video.thumbnail_url || null,
  thumbnail_url: video.thumbnail_url || null,
  videoUrl: video.video_url || null,
  video_url: video.video_url || null,
  brand: video.uploader_name || 'Anonymous',
  uploader_name: video.uploader_name || 'Anonymous',
  views: typeof video.views === 'number' ? video.views : 0,
  likes: typeof video.likes === 'number' ? video.likes : 0,
  upload_date: video.upload_date || null,
  duration: video.duration || '00:00',
  visibility: video.visibility || 'public'
});

// Filter videos to show only public ones
export const filterPublicVideos = (videos) => {
  return videos.filter(video => 
    video.visibility === 'public' || video.visibility === undefined
  );
};

// Sort videos by upload date (newest first)
export const sortVideosByDate = (videos) => {
  return [...videos].sort((a, b) => {
    const dateA = a.upload_date ? new Date(a.upload_date) : new Date(0);
    const dateB = b.upload_date ? new Date(b.upload_date) : new Date(0);
    return dateB - dateA;
  });
};

// Sort videos by view count (most viewed first)
export const sortVideosByViews = (videos) => {
  return [...videos].sort((a, b) => (b.views || 0) - (a.views || 0));
};

// Main function to fetch and process videos
export const fetchVideos = async () => {
  try {
    const allVideos = await VideoService.getVideoFeed();
    
    if (!Array.isArray(allVideos)) {
      throw new Error("Invalid response format from server");
    }
    
    // Normalize video data
    const normalizedVideos = allVideos.map(normalizeVideoData);
    
    // Filter public videos only
    const publicVideos = filterPublicVideos(normalizedVideos);
    
    return {
      allVideos: normalizedVideos,
      publicVideos,
      recentVideos: sortVideosByDate(publicVideos),
      popularVideos: sortVideosByViews(publicVideos)
    };
  } catch (error) {
    console.error('Error fetching videos:', error);
    throw error;
  }
};

// Prepare organized video collections for display
export const prepareVideoCollections = (videos) => {
  if (videos.length === 0) {
    return {
      featuredVideo: null,
      recentVideos: [],
      popularVideos: []
    };
  }
  
  const sortedByDate = sortVideosByDate(videos);
  const sortedByViews = sortVideosByViews(videos);
  
  const featured = sortedByViews.length > 0 ? sortedByViews[0] : null;
  
  const recent = featured ? 
    sortedByDate.filter(v => v.id !== featured.id).slice(0, 10) : 
    sortedByDate.slice(0, 10);
  
  const popular = featured ? 
    sortedByViews.filter(v => v.id !== featured.id).slice(0, 10) : 
    sortedByViews.slice(0, 10);
  
  return {
    featuredVideo: featured,
    recentVideos: recent,
    popularVideos: popular
  };
};

// Default export for the entire service
const VideoDataService = {
  normalizeVideoData,
  filterPublicVideos,
  sortVideosByDate,
  sortVideosByViews,
  fetchVideos,
  prepareVideoCollections
};

export default VideoDataService;