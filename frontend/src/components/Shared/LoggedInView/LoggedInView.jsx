import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp } from 'lucide-react';
import VideoDataService from '../../../utils/VideoDataService';
import { 
  LoadingState, 
  ErrorState, 
  EmptyState 
} from '../VideoLoadingStates/VideoLoadingStates';
import HeroBillboard from '../HeroBillboard/HeroBillboard';
import AdRow from '../AdRow/AdRow';

const LoggedInView = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videos, setVideos] = useState([]);
  const [featuredVideo, setFeaturedVideo] = useState(null);
  const [recentVideos, setRecentVideos] = useState([]);
  const [popularVideos, setPopularVideos] = useState([]);
  
  useEffect(() => {
    const loadVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { publicVideos } = await VideoDataService.fetchVideos();
        
        if (publicVideos.length === 0) {
          setVideos([]);
          setLoading(false);
          return;
        }
        
        const { 
          featuredVideo: featured, 
          recentVideos: recent, 
          popularVideos: popular 
        } = VideoDataService.prepareVideoCollections(publicVideos);
        
        setFeaturedVideo(featured);
        setRecentVideos(recent);
        setPopularVideos(popular);
        setVideos(publicVideos);
        
      } catch (error) {
        console.error('Error fetching videos:', error);
        setError(error.message || 'Failed to load videos. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadVideos();
  }, []);
  
  if (loading) {
    return <LoadingState />;
  }
  
  if (error) {
    return <ErrorState error={error} onDismiss={() => setError(null)} />;
  }
  
  if (videos.length === 0) {
    return (
      <EmptyState 
        title="No Public Videos Available"
      />
    );
  }
  
  return (
    <div className="bg-gray-900 px-4 py-6 md:px-8 md:py-10 min-h-screen">
      {featuredVideo && (
        <div className="mb-10 transform transition-transform duration-700 hover:scale-[1.01]">
          <HeroBillboard video={featuredVideo} />
        </div>
      )}
      
      <div className="space-y-12">
        <AdRow 
          title="Recently Added" 
          icon={<Clock size={24} className="text-blue-400" />}
          ads={recentVideos}
          linkTo="/videos"
          isVideoSection={true}
        />
        
        <AdRow 
          title="Popular Videos" 
          icon={<TrendingUp size={24} className="text-purple-400" />}
          ads={popularVideos}
          linkTo="/videos"
          isVideoSection={true}
        />
      </div>
    </div>
  );
};

export default LoggedInView;