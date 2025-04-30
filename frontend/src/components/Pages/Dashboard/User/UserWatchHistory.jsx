import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'flowbite-react';
import { History, ArrowLeft, Clock, Eye } from 'lucide-react';
import VideoService from '../../../../utils/VideoService';
import { LoadingState, ErrorState, EmptyState } from '../../../Shared/VideoLoadingStates/VideoLoadingStates';
import { AuthContext } from '../../../../contexts/AuthProvider/AuthProvider';

const UserWatchHistory = () => {
  const [watchHistory, setWatchHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  useEffect(() => {
    if (!user || user.role !== 'user') {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  
  const fetchWatchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const historyData = await VideoService.getUserHistory().then(data => data);
      const publicVideos = historyData.filter(video => video.visibility === 'public');
      setWatchHistory(publicVideos);
    } catch (err) {
      console.error('Error fetching watch history:', err);
      setError('Failed to load your watch history. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchWatchHistory();
  }, [fetchWatchHistory]);
  
  const handleBack = () => {
    navigate('/dashboard');
  };
  
  if (loading) {
    return <LoadingState message="Loading your watch history..." />;
  }
  
  if (error) {
    return <ErrorState error={error} onRetry={fetchWatchHistory} />;
  }
  
  if (watchHistory.length === 0) {
    return (
      <EmptyState 
        title="No Watch History" 
        message="You haven't watched any videos yet. Start watching videos to build your history!"
        actionLink="/videos"
        actionText="Browse Videos"
      />
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto px-3 py-4 md:p-4 space-y-4 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center">
            <History className="mr-2 text-blue-400" size={24} />
            Your Watch History
          </h1>
          <p className="text-lg md:text-2xl font-semibold text-gray-300 mt-1 md:mt-2">
            Total: {watchHistory.length} videos
          </p>
        </div>
        <Button color="gray" size="sm" className="self-start sm:self-auto py-2" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
        {watchHistory.map(video => (
          <button 
            key={video.id} 
            className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-700 hover:bg-gray-700/60 w-full text-left"
            onClick={() => navigate(`/video/${video.id}`)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/video/${video.id}`)}
          >
            <div className="aspect-video overflow-hidden">
              <img 
                src={video.thumbnail_url || '/api/placeholder/400/225'} 
                alt={video.title}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                loading="lazy"
              />
            </div>
            <div className="p-3 md:p-4">
              <h3 className="text-white font-semibold text-lg md:text-xl mb-1 md:mb-2 line-clamp-1">{video.title}</h3>
              <p className="text-gray-400 text-sm md:text-base mb-2 md:mb-3 line-clamp-2">{video.description}</p>
              <div className="flex flex-wrap items-center text-gray-500 text-xs md:text-base gap-2 md:gap-4">
                <span className="flex items-center">
                  <Eye size={16} className="mr-1 text-blue-400" /> 
                  {video.views || 0} views
                </span>
                <span className="flex items-center">
                  <Clock size={16} className="mr-1" />
                  {VideoService.formatRelativeTime(video.last_watched || video.upload_date)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default UserWatchHistory;