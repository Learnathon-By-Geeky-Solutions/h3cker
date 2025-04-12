import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Spinner, 
  Alert,
  Button 
} from 'flowbite-react';
import { 
  TrendingUp, 
  ThumbsUp, 
  AlertCircle,
  Grid,
  List
} from 'lucide-react';
import AdCard from '../../Shared/AdCard/AdCard';
import VideoService from '../../../utils/VideoService';

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
  
 
  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const allVideos = await VideoService.getVideoFeed();
      
      if (!Array.isArray(allVideos)) {
        throw new Error("Invalid response format from server");
      }
      
      // Normalize video data
      const normalizedVideos = allVideos.map(video => ({
        id: video.id,
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
      }));
      
      // Filter public videos only
      const publicVideos = normalizedVideos.filter(video => 
        video.visibility === 'public' || video.visibility === undefined
      );
      
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
    fetchVideos();
  }, [fetchVideos]);
  
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
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 w-full">
        <div className="flex flex-col items-center">
          <Spinner size="xl" color="info" />
          <p className="mt-4 text-gray-300">Loading videos...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Alert
        color="failure"
        icon={AlertCircle}
        className="mb-4 w-full"
        onDismiss={() => setError(null)}
      >
        <span className="font-medium">Error:</span> {error}
      </Alert>
    );
  }
  
  // Empty state
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 w-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">No Videos Available</h2>
          <p className="text-gray-400 mb-8">There are no public videos available at this time.</p>
        </div>
      </div>
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
          <div className="bg-gray-800 rounded-lg p-8 text-center w-full">
            <h3 className="text-xl font-bold text-white mb-2">No videos match your criteria</h3>
            <p className="text-gray-400 mb-4">Try adjusting your search terms</p>
            <Button 
              color="blue" 
              onClick={() => {
                setSearchQuery('');
              }}
              className="glossy-button"
            >
              Clear Search
            </Button>
          </div>
        )}
        
        {/* Videos grid/list view */}
        {filteredVideos.length > 0 && (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
              : "flex flex-col space-y-6"
          }>
            {filteredVideos.map(video => (
              viewMode === 'grid' ? (
                <button
                  key={video.id} 
                  onClick={(e) => handleVideoInteraction(video.id, e)}
                  onKeyDown={(e) => handleVideoInteraction(video.id, e)}
                  className="block w-full text-left bg-transparent border-none p-0"
                  aria-label={`Watch video: ${video.title}`}
                >
                  <div className="transform transition-transform duration-200 hover:scale-105">
                    <AdCard ad={video} />
                  </div>
                </button>
              ) : (
                <button
                  key={video.id}
                  onClick={(e) => handleVideoInteraction(video.id, e)}
                  onKeyDown={(e) => handleVideoInteraction(video.id, e)}
                  className="block w-full text-left bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-700 hover:bg-gray-700/60 p-0"
                  aria-label={`Watch video: ${video.title}`}
                >
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
                    </div>
                  </div>
                </button>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Video;