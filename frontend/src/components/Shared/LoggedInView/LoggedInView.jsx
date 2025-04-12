import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Alert, Button, Spinner } from 'flowbite-react';
import { Link } from 'react-router-dom';
import VideoService from '../../../utils/VideoService';
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
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const allVideos = await VideoService.getVideoFeed();
        
        if (!Array.isArray(allVideos)) {
          console.error("Received non-array response from getVideoFeed:", allVideos);
          throw new Error("Invalid response format from server");
        }
        
        // Normalize video data to match AdCard expectations
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
        
        const publicVideos = normalizedVideos.filter(video => 
          video.visibility === 'public' || video.visibility === undefined
        );
        
        if (publicVideos.length === 0) {
          setVideos([]);
          setLoading(false);
          return;
        }
        
        const sortedByDate = [...publicVideos].sort((a, b) => {
          const dateA = a.upload_date ? new Date(a.upload_date) : new Date(0);
          const dateB = b.upload_date ? new Date(b.upload_date) : new Date(0);
          return dateB - dateA;
        });
        
        const sortedByViews = [...publicVideos].sort((a, b) =>
          (b.views || 0) - (a.views || 0)
        );
        
        const featured = sortedByViews.length > 0 ? sortedByViews[0] : null;
        setFeaturedVideo(featured);
        
        const recent = featured ? 
          sortedByDate.filter(v => v.id !== featured.id).slice(0, 10) : 
          sortedByDate.slice(0, 10);
        setRecentVideos(recent);
        
        const popular = featured ? 
          sortedByViews.filter(v => v.id !== featured.id).slice(0, 10) : 
          sortedByViews.slice(0, 10);
        setPopularVideos(popular);
        
        setVideos(publicVideos);
        
      } catch (error) {
        console.error('Error fetching videos:', error);
        setError(error.message || 'Failed to load videos. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideos();
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <Spinner size="xl" color="info" />
          <p className="mt-4 text-gray-300">Loading videos...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert
        color="failure"
        icon={AlertCircle}
        className="mb-4"
        onDismiss={() => setError(null)}
      >
        <span className="font-medium">Error:</span> {error}
      </Alert>
    );
  }
  
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">No Public Videos Available</h2>
          <p className="text-gray-400 mb-8">Be the first to upload public content to share with others!</p>
          <Link to="/dashboard/upload">
            <Button color="blue" className="glossy-button">
              Upload Video
            </Button>
          </Link>
        </div>
      </div>
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