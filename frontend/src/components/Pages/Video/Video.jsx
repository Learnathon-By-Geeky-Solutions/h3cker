import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'flowbite-react';
import { Grid, List, TrendingUp, ThumbsUp } from 'lucide-react';
import PropTypes from 'prop-types';
import AdCard from '../../Shared/AdCard/AdCard';
import VideoDataService from '../../../utils/VideoDataService';
import { 
  LoadingState, 
  ErrorState, 
  EmptyState 
} from '../../Shared/VideoLoadingStates/VideoLoadingStates';
import VideoService from '../../../utils/VideoService';

// Extract video list item to separate component
const VideoListItem = ({ video }) => (
  <div className="flex flex-col sm:flex-row">
    <div className="w-full sm:w-64 h-40 overflow-hidden">
      <img 
        src={video.thumbnail_url || '/api/placeholder/400/225'} 
        alt={video.title}
        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
      />
    </div>
    <div className="p-6 flex-1">
      <h3 className="text-white font-semibold text-xl mb-2 line-clamp-1">{video.title}</h3>
      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{video.description}</p>
      <VideoMetrics video={video} />
    </div>
  </div>
);

VideoListItem.propTypes = {
  video: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    title: PropTypes.string,
    description: PropTypes.string,
    thumbnail_url: PropTypes.string
  }).isRequired
};

// Extract video metrics to a separate component
const VideoMetrics = ({ video }) => (
  <>
    <div className="flex items-center text-gray-500 text-sm gap-4">
      <span className="flex items-center">
        <ThumbsUp size={16} className="mr-1" /> 
        {video.likes || 0}
      </span>
      <span className="flex items-center">
        <TrendingUp size={16} className="mr-1" /> 
        {video.views || 0} views
      </span>
      <span>{VideoService.formatRelativeTime(video.upload_date)}</span>
    </div>
    <div className="mt-3 text-sm text-blue-400">
      {video.uploader_name}
    </div>
  </>
);

VideoMetrics.propTypes = {
  video: PropTypes.shape({
    likes: PropTypes.number,
    views: PropTypes.number,
    upload_date: PropTypes.string,
    uploader_name: PropTypes.string
  }).isRequired
};

// Video item renderer function
const renderVideoItem = (video, viewMode, handleInteraction) => {
  if (viewMode === 'grid') {
    return (
      <button
        key={video.id} 
        onClick={(e) => handleInteraction(video.id, e)}
        onKeyDown={(e) => handleInteraction(video.id, e)}
        className="block w-full text-left bg-transparent border-none p-0"
        aria-label={`Watch video: ${video.title}`}
      >
        <div className="transform transition-transform duration-200 hover:scale-105">
          <AdCard ad={video} />
        </div>
      </button>
    );
  } else {
    return (
      <button
        key={video.id}
        onClick={(e) => handleInteraction(video.id, e)}
        onKeyDown={(e) => handleInteraction(video.id, e)}
        className="block w-full text-left bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-700 hover:bg-gray-700/60 p-0"
        aria-label={`Watch video: ${video.title}`}
      >
        <VideoListItem video={video} />
      </button>
    );
  }
};

const Video = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [error, setError] = useState(null);
  const [sortOption] = useState(queryParams.get('sort') || 'newest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState(queryParams.get('q') || '');
  
  const fetchVideoData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { publicVideos } = await VideoDataService.fetchVideos();
      setVideos(publicVideos);
      
    } catch (error) {
      console.error('Error fetching videos:', error);
      setError(error.message || 'Failed to load videos. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Initial fetch
  useEffect(() => {
    fetchVideoData();
  }, [fetchVideoData]);
  
  // Fetch videos when URL parameters change
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const newQuery = params.get('q') || '';
    
    setSearchQuery(newQuery);
  }, [location.search]);
  
  // Apply filters and sorting
  useEffect(() => {
    let results = [...videos];
    
    // Apply smart search filter (YouTube-like)
    if (searchQuery) {
      const queryTerms = searchQuery.toLowerCase().split(/\s+/).filter(term => term.length > 1);
      
      if (queryTerms.length > 0) {
        results = results.filter(video => {
          // Fields to search in
          const titleLower = (video.title || '').toLowerCase();
          const descriptionLower = (video.description || '').toLowerCase();
          const uploaderLower = (video.uploader_name || '').toLowerCase();
          
          // Match if any term appears in any field
          return queryTerms.some(term => 
            titleLower.includes(term) || 
            descriptionLower.includes(term) || 
            uploaderLower.includes(term)
          );
        });
      }
    }
    
    // Apply default sorting (newest)
    results.sort((a, b) => {
      const dateA = a.upload_date ? new Date(a.upload_date) : new Date(0);
      const dateB = b.upload_date ? new Date(b.upload_date) : new Date(0);
      return dateB - dateA;
    });
    
    setFilteredVideos(results);
    
    // Update URL with query parameters
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    
    const newUrl = location.pathname + (params.toString() ? `?${params.toString()}` : '');
    window.history.replaceState({}, '', newUrl);
    
  }, [videos, searchQuery, location.pathname, sortOption]);
  
  // Handle view mode change
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
  };
  
  // Handle video click with keyboard support
  const handleVideoInteraction = (videoId, event) => {
    // Allow both click and keyboard interaction (Enter key)
    if (!event.type || event.type === 'click' || (event.type === 'keydown' && event.key === 'Enter')) {
      navigate(`/video/${videoId}`);
    }
  };
  
  if (loading) {
    return <LoadingState />;
  }
  
  if (error) {
    return <ErrorState error={error} onDismiss={() => setError(null)} />;
  }
  
  if (videos.length === 0) {
    return (
      <EmptyState 
        title="No Videos Available" 
        message="There are no public videos available at this time."
      />
    );
  }
  
  return (
    <div className="bg-gray-900 min-h-screen py-6 px-4 md:px-8 w-full">
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-2xl font-bold text-white">Videos</h1>
          
          {/* View toggle - hidden on mobile */}
          <div className="hidden md:block">
            <Button
              color="gray"
              size="sm"
              onClick={toggleViewMode}
              className="bg-gray-800 border-gray-700 text-white glossy-button"
            >
              {viewMode === 'grid' ? (
                <>
                  <Grid size={16} className="mr-1 text-blue-400" />
                  <List size={16} />
                </>
              ) : (
                <>
                  <Grid size={16} className="mr-1" />
                  <List size={16} className="text-blue-400" />
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Results count */}
        <p className="text-gray-400 mb-6">
          {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'} found
          {searchQuery && ` for "${searchQuery}"`}
        </p>
        
        {/* No results message */}
        {filteredVideos.length === 0 && (
          <EmptyState 
            title="No videos match your criteria"
            message="Try adjusting your search terms"
            action={() => setSearchQuery('')}
            actionText="Clear Search"
          />
        )}
        
        {/* Videos grid/list view */}
        {filteredVideos.length > 0 && (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
              : "flex flex-col space-y-6"
          }>
            {filteredVideos.map(video => (
              renderVideoItem(video, viewMode, handleVideoInteraction)
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Video;