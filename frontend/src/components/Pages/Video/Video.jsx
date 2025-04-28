import React, { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Spinner } from 'flowbite-react';
import { Grid, List, TrendingUp, ThumbsUp, Clock, ChevronDown, Filter } from 'lucide-react';
import PropTypes from 'prop-types';
import VideoDataService from '../../../utils/VideoDataService';
import { 
  LoadingState, 
  ErrorState, 
  EmptyState 
} from '../../Shared/VideoLoadingStates/VideoLoadingStates';
import VideoService from '../../../utils/VideoService';

const AdCard = lazy(() => import('../../Shared/AdCard/AdCard'));

const VIDEOS_PER_PAGE = 12;

const AdCardPlaceholder = () => (
  <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg animate-pulse">
    <div className="aspect-video bg-gray-700"></div>
    <div className="p-3">
      <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
    </div>
  </div>
);

const VideoListItem = ({ video }) => (
  <div className="flex flex-col sm:flex-row">
    <div className="w-full sm:w-64 h-40 overflow-hidden">
      <img 
        src={video.thumbnail_url || '/api/placeholder/400/225'} 
        alt={video.title}
        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
        loading="lazy"
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
      <span className="flex items-center">
        <Clock size={16} className="mr-1" />
        {VideoService.formatRelativeTime(video.upload_date)}
      </span>
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

const Video = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialCategory = queryParams.get('category') || '';
  const initialSortOption = queryParams.get('sort') || 'newest';
  const initialType = queryParams.get('type') || '';
  const initialSearchQuery = queryParams.get('q') || '';
  
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [displayedVideos, setDisplayedVideos] = useState([]);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState(initialSortOption);
  const [viewMode, setViewMode] = useState('grid');
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  
  const observer = useRef();
  const lastVideoElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreVideos();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);
  
  const fetchVideoData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { publicVideos } = await VideoDataService.fetchVideos();
      setVideos(publicVideos);
      
      const uniqueCategories = [...new Set(publicVideos
        .filter(v => v.category)
        .map(v => v.category))];
      setCategories(uniqueCategories);
      
    } catch (error) {
      console.error('Error fetching videos:', error);
      setError(error.message || 'Failed to load videos. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchVideoData();
  }, [fetchVideoData]);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('q');
    if (searchParam !== searchQuery) {
      setSearchQuery(searchParam || '');
    }
  }, [location.search]);
  
  useEffect(() => {
    if (videos.length === 0) return;
    
    let results = [...videos];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(video => 
        (video.title && video.title.toLowerCase().includes(query)) ||
        (video.description && video.description.toLowerCase().includes(query)) ||
        (video.uploader_name && video.uploader_name.toLowerCase().includes(query)) ||
        (video.category && video.category.toLowerCase().includes(query))
      );
    }
    
    if (categoryFilter) {
      results = results.filter(video => video.category === categoryFilter);
    }
    
    if (typeFilter) {
      if (typeFilter === 'foryou') {
        results.sort((a, b) => {
          const dateA = a.upload_date ? new Date(a.upload_date) : new Date(0);
          const dateB = b.upload_date ? new Date(b.upload_date) : new Date(0);
          return dateB - dateA;
        });
      } else if (typeFilter === 'recommended') {
        results.sort((a, b) => (b.views || 0) - (a.views || 0));
      }
    }
    
    switch (sortOption) {
      case 'popular':
        results.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'liked':
        results.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case 'oldest':
        results.sort((a, b) => {
          const dateA = a.upload_date ? new Date(a.upload_date) : new Date(0);
          const dateB = b.upload_date ? new Date(b.upload_date) : new Date(0);
          return dateA - dateB;
        });
        break;
      case 'newest':
      default:
        results.sort((a, b) => {
          const dateA = a.upload_date ? new Date(a.upload_date) : new Date(0);
          const dateB = b.upload_date ? new Date(b.upload_date) : new Date(0);
          return dateB - dateA;
        });
        break;
    }
    
    setFilteredVideos(results);
    setPage(1);
    
    const initialVideos = results.slice(0, VIDEOS_PER_PAGE);
    setDisplayedVideos(initialVideos);
    setHasMore(initialVideos.length < results.length);
    
    const params = new URLSearchParams();
    if (sortOption && sortOption !== 'newest') params.set('sort', sortOption);
    if (categoryFilter) params.set('category', categoryFilter);
    if (typeFilter) params.set('type', typeFilter);
    if (searchQuery) params.set('q', searchQuery);
    
    const newUrl = location.pathname + (params.toString() ? `?${params.toString()}` : '');
    window.history.replaceState({}, '', newUrl);
    
  }, [videos, sortOption, categoryFilter, typeFilter, searchQuery, location.pathname, navigate]);
  
  const loadMoreVideos = () => {
    if (!hasMore || loadingMore || filteredVideos.length === 0) return;
    
    setLoadingMore(true);
    
    const nextPage = page + 1;
    const startIndex = 0;
    const endIndex = nextPage * VIDEOS_PER_PAGE;
    
    const newDisplayedVideos = filteredVideos.slice(startIndex, endIndex);
    setDisplayedVideos(newDisplayedVideos);
    setPage(nextPage);
    setHasMore(endIndex < filteredVideos.length);
    setLoadingMore(false);
  };
  
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
  };
  
  const handleSortChange = (option) => {
    setSortOption(option);
  };
  
  const handleCategoryChange = (category) => {
    setCategoryFilter(prev => prev === category ? '' : category);
  };
  
  const handleClearFilters = () => {
    setCategoryFilter('');
    setSortOption('newest');
    setTypeFilter('');
    
    const params = new URLSearchParams(location.search);
    if (searchQuery) {
      params.set('q', searchQuery);
      navigate(`${location.pathname}?${params.toString()}`);
    } else {
      navigate(location.pathname);
    }
  };
  
  const handleVideoInteraction = (videoId, event) => {
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
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              {searchQuery ? `Search results for "${searchQuery}"` : 'Videos'}
            </h1>
            {(categoryFilter || typeFilter) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {categoryFilter && (
                  <div className="bg-purple-900/40 text-purple-300 rounded-full px-3 py-1 text-sm">
                    Category: {categoryFilter}
                  </div>
                )}
                
                {typeFilter && (
                  <div className="bg-green-900/40 text-green-300 rounded-full px-3 py-1 text-sm capitalize">
                    {typeFilter === 'foryou' ? 'For You' : typeFilter}
                  </div>
                )}
                
                <button
                  onClick={handleClearFilters}
                  className="text-gray-400 hover:text-white text-sm underline ml-1"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              color="gray"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              <Filter size={16} className="mr-1" />
              Filters
              <ChevronDown size={16} className={`ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
            
            <Button
              color="gray"
              size="sm"
              onClick={toggleViewMode}
              className="hidden md:flex bg-gray-800 border-gray-700 text-white items-center"
            >
              {viewMode === 'grid' ? (
                <>
                  <Grid size={16} className="text-blue-400 mr-1" />
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
        
        {showFilters && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-white font-medium mb-2">Sort By</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'newest', label: 'Newest' },
                    { id: 'oldest', label: 'Oldest' },
                    { id: 'popular', label: 'Most Viewed' },
                    { id: 'liked', label: 'Most Liked' }
                  ].map(option => (
                    <Button
                      key={option.id}
                      color={sortOption === option.id ? "blue" : "gray"}
                      size="xs"
                      onClick={() => handleSortChange(option.id)}
                      className={sortOption === option.id ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              {categories.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-2">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                      <Button
                        key={category}
                        color={categoryFilter === category ? "blue" : "gray"}
                        size="xs"
                        onClick={() => handleCategoryChange(category)}
                        className={categoryFilter === category ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <p className="text-gray-400 mb-6">
          {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'} found
        </p>
        
        {filteredVideos.length === 0 && (
          <EmptyState 
            title={searchQuery ? `No videos found for "${searchQuery}"` : "No videos match your criteria"}
            message="Try adjusting your search or filters"
          />
        )}
        
        {filteredVideos.length > 0 && (
          <Suspense fallback={
            <div className={
              viewMode === 'grid'
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                : "flex flex-col space-y-6"
            }>
              {Array.from({ length: 8 }, (_, i) => `ph-${i}`).map((key) => (
                <AdCardPlaceholder key={key} />
              ))}
            </div>
          }>
            <div className={
              viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" 
                : "flex flex-col space-y-6"
            }>
              {displayedVideos.map((video, index) => {
                const isLastElement = index === displayedVideos.length - 1;
                
                if (viewMode === 'grid') {
                  return (
                    <button
                      key={video.id}
                      ref={isLastElement ? lastVideoElementRef : null}
                      onClick={(e) => handleVideoInteraction(video.id, e)}
                      onKeyDown={(e) => handleVideoInteraction(video.id, e)}
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
                      ref={isLastElement ? lastVideoElementRef : null}
                      onClick={(e) => handleVideoInteraction(video.id, e)}
                      onKeyDown={(e) => handleVideoInteraction(video.id, e)}
                      className="block w-full text-left bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-700 hover:bg-gray-700/60 p-0"
                      aria-label={`Watch video: ${video.title}`}
                    >
                      <VideoListItem video={video} />
                    </button>
                  );
                }
              })}
            </div>
          </Suspense>
        )}
        
        {loadingMore && (
          <div className="flex justify-center mt-8">
            <Spinner size="xl" />
          </div>
        )}
        
        {hasMore && !loadingMore && (
          <div className="flex justify-center mt-8">
            <Button 
              color="blue" 
              onClick={loadMoreVideos}
              className="px-8"
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Video;