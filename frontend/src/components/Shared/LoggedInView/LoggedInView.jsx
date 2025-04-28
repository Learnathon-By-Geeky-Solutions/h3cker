import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, ThumbsUp } from 'lucide-react';
import ApiService from '../../../utils/ApiService';
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
  const [featuredVideos, setFeaturedVideos] = useState([]);
  const [recentVideos, setRecentVideos] = useState([]);
  const [popularVideos, setPopularVideos] = useState([]);
  const [recommendedVideos, setRecommendedVideos] = useState([]);
  
  useEffect(() => {
    const loadVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use Promise.allSettled to handle multiple requests without failing if one fails
        const [featuredResponse, recentResponse, trendingResponse, recommendedResponse] = 
          await Promise.allSettled([
            ApiService.get('featured-carousel/?limit=5'),
            ApiService.get('recent-videos/?limit=8'),
            ApiService.get('trending-videos/?limit=8'),
            ApiService.get('recommendations/?limit=8')
          ]);
        
        // Process responses safely
        if (featuredResponse.status === 'fulfilled') {
          const data = featuredResponse.value;
          setFeaturedVideos(Array.isArray(data) ? data : []);
        }
        
        if (recentResponse.status === 'fulfilled') {
          const data = recentResponse.value;
          setRecentVideos(Array.isArray(data) ? data : []);
        }
        
        if (trendingResponse.status === 'fulfilled') {
          const data = trendingResponse.value;
          setPopularVideos(Array.isArray(data) ? data : []);
        }
        
        if (recommendedResponse.status === 'fulfilled') {
          const data = recommendedResponse.value;
          setRecommendedVideos(Array.isArray(data) ? data : []);
        }
        
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
  
  // Show empty state if no videos at all
  if (
    !featuredVideos.length && 
    !recentVideos.length && 
    !popularVideos.length && 
    !recommendedVideos.length
  ) {
    return (
      <EmptyState 
        title="No Public Videos Available"
      />
    );
  }
  
  return (
    <div className="bg-gray-900 px-4 py-6 md:px-8 md:py-10 min-h-screen">
      {featuredVideos && featuredVideos.length > 0 && (
        <div className="mb-10 transform transition-transform duration-700 hover:scale-[1.01]">
          <HeroBillboard videos={featuredVideos} />
        </div>
      )}
      
      <div className="space-y-12">
        {recommendedVideos && recommendedVideos.length > 0 && (
          <AdRow 
            title="Recommended For You" 
            icon={<ThumbsUp size={24} className="text-emerald-400" />}
            ads={recommendedVideos}
            linkTo="/videos?type=foryou"
            isVideoSection={true}
          />
        )}
        
        {recentVideos && recentVideos.length > 0 && (
          <AdRow 
            title="Recently Added" 
            icon={<Clock size={24} className="text-blue-400" />}
            ads={recentVideos}
            linkTo="/videos?sort=newest"
            isVideoSection={true}
          />
        )}
        
        {popularVideos && popularVideos.length > 0 && (
          <AdRow 
            title="Popular Videos" 
            icon={<TrendingUp size={24} className="text-purple-400" />}
            ads={popularVideos}
            linkTo="/videos?sort=popular"
            isVideoSection={true}
          />
        )}
      </div>
    </div>
  );
};

export default LoggedInView;