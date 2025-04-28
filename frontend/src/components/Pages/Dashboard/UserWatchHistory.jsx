import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Alert, Spinner } from 'flowbite-react';
import { Clock, Filter, ChevronDown, ChevronUp, Trash, SortAsc, SortDesc } from 'lucide-react';
import VideoService from '../../../utils/VideoService';
import AdCard from '../../Shared/AdCard/AdCard';
import { Link } from 'react-router-dom';

const ITEMS_PER_PAGE = 10;

const UserWatchHistory = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historyVideos, setHistoryVideos] = useState([]);
  const [displayedVideos, setDisplayedVideos] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [sortDirection, setSortDirection] = useState('desc'); // 'desc' = newest first
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Fetch watch history data
  const fetchWatchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const historyData = VideoService.getUserHistory();
      
      if (!Array.isArray(historyData)) {
        throw new Error('Invalid response format from server');
      }
      
      // Extract unique categories
      const categories = [...new Set(historyData
        .filter(video => video.category)
        .map(video => video.category))];
      
      setAvailableCategories(categories);
      setHistoryVideos(historyData);
      
      // Apply initial filtering and sorting
      updateDisplayedVideos(historyData, 1);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching watch history:', err);
      setError(err.message || 'Failed to load watch history. Please try again later.');
      setLoading(false);
    }
  }, []);
  
  // Apply filters and sorting, update displayed videos
  const updateDisplayedVideos = useCallback((videos, currentPage, resetPage = false) => {
    // Filter videos if category filter is set
    let filtered = videos;
    if (categoryFilter) {
      filtered = videos.filter(video => video.category === categoryFilter);
    }
    
    // Sort by date watched
    const sorted = [...filtered].sort((a, b) => {
      // Extract date A, handling fallbacks
      let dateA;
      if (a.last_watched) {
        dateA = new Date(a.last_watched);
      } else if (a.upload_date) {
        dateA = new Date(a.upload_date);
      } else {
        dateA = new Date(0);
      }

      // Extract date B, handling fallbacks
      let dateB;
      if (b.last_watched) {
        dateB = new Date(b.last_watched);
      } else if (b.upload_date) {
        dateB = new Date(b.upload_date);
      } else {
        dateB = new Date(0);
      }
      
      return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    // Calculate pagination
    const newPage = resetPage ? 1 : currentPage;
    const startIndex = 0;
    const endIndex = newPage * ITEMS_PER_PAGE;
    const paginatedVideos = sorted.slice(startIndex, endIndex);
    
    setPage(newPage);
    setDisplayedVideos(paginatedVideos);
    setHasMore(endIndex < sorted.length);
  }, [categoryFilter, sortDirection]);
  
  // Initial data load
  useEffect(() => {
    fetchWatchHistory();
  }, [fetchWatchHistory]);
  
  // Handle filter and sort changes
  useEffect(() => {
    if (historyVideos.length > 0) {
      updateDisplayedVideos(historyVideos, 1, true);
    }
  }, [categoryFilter, sortDirection, updateDisplayedVideos, historyVideos]);
  
  const handleLoadMore = () => {
    setLoadingMore(true);
    // Simulate loading delay for better UX feedback
    setTimeout(() => {
      updateDisplayedVideos(historyVideos, page + 1);
      setLoadingMore(false);
    }, 500);
  };
  
  const handleClearHistory = async () => {
    // This would normally call an API to clear history
    // For now we'll just reset the local state
    if (window.confirm('Are you sure you want to clear your watch history?')) {
      try {
        // In a real implementation, you would call something like:
        // await VideoService.clearWatchHistory();
        setHistoryVideos([]);
        setDisplayedVideos([]);
        setAvailableCategories([]);
      } catch (err) {
        console.error('Failed to clear watch history:', err);
        setError('Failed to clear watch history. Please try again.');
      }
    }
  };
  
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
  };
  
  const toggleFilterPanel = () => {
    setFilterOpen(prev => !prev);
  };
  
  const handleCategorySelect = (category) => {
    setCategoryFilter(prev => prev === category ? '' : category);
  };
  
  // Render loading state
  if (loading && page === 1) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-white">
        <Spinner size="xl" className="mb-4" />
        <p>Loading your watch history...</p>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Alert color="failure" onDismiss={() => setError(null)} className="mx-auto my-8 max-w-4xl">
        <span className="font-medium">Error:</span> {error}
      </Alert>
    );
  }
  
  // Render empty state
  if (historyVideos.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center max-w-4xl mx-auto my-8 shadow-lg">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Your Watch History is Empty</h2>
        <p className="text-gray-400 mb-6">You haven't watched any videos yet. Start exploring our content!</p>
        <Link to="/videos">
          <Button color="blue">Browse Videos</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Your Watch History</h1>
          <p className="text-gray-400">
            {historyVideos.length} {historyVideos.length === 1 ? 'video' : 'videos'} in your history
          </p>
        </div>
        
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button 
            color="gray" 
            size="sm"
            onClick={toggleFilterPanel}
            className="flex items-center bg-gray-700 hover:bg-gray-600"
          >
            <Filter size={16} className="mr-2" />
            Filters
            {filterOpen ? <ChevronUp size={16} className="ml-2" /> : <ChevronDown size={16} className="ml-2" />}
          </Button>
          
          <Button 
            color="gray" 
            size="sm"
            onClick={toggleSortDirection}
            className="flex items-center bg-gray-700 hover:bg-gray-600"
          >
            {sortDirection === 'desc' ? (
              <>
                <SortDesc size={16} className="mr-2" />
                Newest
              </>
            ) : (
              <>
                <SortAsc size={16} className="mr-2" />
                Oldest
              </>
            )}
          </Button>
          
          <Button 
            color="failure" 
            size="sm"
            onClick={handleClearHistory}
            className="flex items-center"
          >
            <Trash size={16} className="mr-2" />
            Clear
          </Button>
        </div>
      </div>
      
      {/* Filter panel */}
      {filterOpen && (
        <Card className="mb-6 bg-gray-800 border-gray-700">
          <h3 className="text-lg font-medium text-white mb-3">Filter by Category</h3>
          <div className="flex flex-wrap gap-2">
            <Button 
              color={!categoryFilter ? "blue" : "gray"}
              size="xs"
              onClick={() => setCategoryFilter('')}
              className={!categoryFilter ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}
            >
              All
            </Button>
            
            {availableCategories.map(category => (
              <Button
                key={category}
                color={categoryFilter === category ? "blue" : "gray"}
                size="xs"
                onClick={() => handleCategorySelect(category)}
                className={categoryFilter === category ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}
              >
                {category}
              </Button>
            ))}
          </div>
        </Card>
      )}
      
      {/* Videos grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        {displayedVideos.length === 0 ? (
          <div className="col-span-full text-center p-8 bg-gray-800 rounded-lg">
            <p className="text-gray-400">No videos match your current filters</p>
          </div>
        ) : (
          displayedVideos.map(video => (
            <Link key={video.id} to={`/video/${video.id}`} className="block transform transition-transform duration-200 hover:scale-105">
              <AdCard ad={video} />
              {video.last_watched && (
                <div className="mt-2 flex items-center text-sm text-gray-400">
                  <Clock size={12} className="mr-1" />
                  Watched {formatLastWatched(video.last_watched)}
                </div>
              )}
            </Link>
          ))
        )}
      </div>
      
      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            color="blue"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6"
          >
            {loadingMore ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

// Helper function to format the last watched time
const formatLastWatched = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  
  return date.toLocaleDateString();
};

export default UserWatchHistory;