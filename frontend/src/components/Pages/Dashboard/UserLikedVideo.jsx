import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'flowbite-react';
import { Heart, ArrowLeft } from 'lucide-react';
import VideoService from '../../../utils/VideoService';
import { LoadingState, ErrorState, EmptyState } from '../../Shared/VideoLoadingStates/VideoLoadingStates';
import AdRow from '../../Shared/AdRow/AdRow';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';

const UserLikedVideo = () => {
  const [likedVideos, setLikedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  useEffect(() => {
    if (!user || user.role !== 'user') {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  
  const fetchLikedVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const videos = await VideoService.getUserLikedVideos();
      const publicVideos = videos.filter(video => video.visibility === 'public');
      setLikedVideos(publicVideos);
    } catch (err) {
      console.error('Error fetching liked videos:', err);
      setError('Failed to load your liked videos. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchLikedVideos();
  }, [fetchLikedVideos]);
  
  const handleBack = () => {
    navigate('/dashboard');
  };
  
  if (loading) {
    return <LoadingState message="Loading your liked videos..." />;
  }
  
  if (error) {
    return <ErrorState error={error} onRetry={fetchLikedVideos} />;
  }
  
  if (likedVideos.length === 0) {
    return (
      <EmptyState 
        title="No Liked Videos" 
        message="You haven't liked any videos yet. Start liking videos to build your collection!"
        actionLink="/videos"
        actionText="Browse Videos"
      />
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Heart className="mr-2 text-red-400" size={30} />
            Your Liked Videos
          </h1>
          <p className="text-2xl font-semibold text-gray-300 mt-2">
            Total: {likedVideos.length} videos
          </p>
        </div>
        <Button color="gray" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {likedVideos.map(video => (
          <div 
            key={video.id} 
            className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-700 hover:bg-gray-700/60"
            onClick={() => navigate(`/video/${video.id}`)}
          >
            <div className="aspect-video overflow-hidden">
              <img 
                src={video.thumbnail_url || '/api/placeholder/400/225'} 
                alt={video.title}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
              />
            </div>
            <div className="p-4">
              <h3 className="text-white font-semibold text-xl mb-2 line-clamp-1">{video.title}</h3>
              <p className="text-gray-400 text-base mb-3 line-clamp-2">{video.description}</p>
              <div className="flex items-center text-gray-500 text-base gap-4">
                <span className="flex items-center">
                  <Heart size={18} className="mr-1 text-red-400" /> 
                  {video.likes || 0}
                </span>
                <span>
                  {video.views || 0} views
                </span>
                <span>
                  {video.duration || '0:00'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserLikedVideo;