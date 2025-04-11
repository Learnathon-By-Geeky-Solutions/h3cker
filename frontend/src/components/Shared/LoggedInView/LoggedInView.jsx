import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Clock, TrendingUp, Play, ThumbsUp, AlertCircle } from 'lucide-react';
import { Alert, Button, Card, Badge, Spinner } from 'flowbite-react';
import VideoService from '../../../utils/VideoService';
import HeroBillboard from '../HeroBillboard/HeroBillboard';

const VideoCard = ({ video }) => {
  const duration = video.duration || "00:00";
  const createdAt = video.upload_date
    ? VideoService.formatRelativeTime(video.upload_date)
    : "Unknown date";

  return (
    <Link to={`/video/${video.id}`} className="block">
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-gray-800 border-gray-700 card-hover h-full">
        <div className="relative aspect-video">
          <img
            src={video.thumbnail_url || '/api/placeholder/400/225'}
            alt={video.title}
            className="w-full h-full object-cover rounded-t-lg"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/api/placeholder/400/225';
            }}
          />
          <div className="absolute bottom-2 right-2 bg-gray-900 bg-opacity-80 text-white text-xs px-2 py-1 rounded-md flex items-center">
            <Clock size={12} className="mr-1" />
            {duration}
          </div>
          {video.views > 100 && (
            <div className="absolute top-2 left-2">
              <Badge color="purple" icon={TrendingUp} className="flex items-center">
                Popular
              </Badge>
            </div>
          )}
        </div>
        <h5 className="text-md font-medium text-white line-clamp-1 mt-2">
          {video.title}
        </h5>
        <p className="text-xs text-gray-400 line-clamp-2 mt-1">
          {video.description || "No description available"}
        </p>
        <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
          <div className="flex items-center">
            <Play size={14} className="mr-1" />
            <span>{video.views || 0} views</span>
          </div>
          <div className="flex items-center">
            <ThumbsUp size={14} className="mr-1" />
            {video.likes || 0}
          </div>
          <div className="flex items-center">
            <Clock size={14} className="mr-1" />
            {createdAt}
          </div>
        </div>
      </Card>
    </Link>
  );
};

VideoCard.propTypes = {
  video: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    thumbnail_url: PropTypes.string,
    description: PropTypes.string,
    duration: PropTypes.string,
    views: PropTypes.number,
    likes: PropTypes.number,
    upload_date: PropTypes.string
  }).isRequired
};

const VideoSection = ({ title, icon, videos }) => {
  if (!videos || videos.length === 0) return null;
  
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </h2>
        <Link to="/videos">
          <Button color="gray" size="xs" pill className="bg-gray-700 hover:bg-gray-600 text-gray-200">
            View All
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
};

VideoSection.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.node,
  videos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
    })
  ).isRequired
};

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
        
        const publicVideos = allVideos.filter(video => 
          video.visibility === 'public' || video.visibility === undefined
        );
        
        if (publicVideos.length === 0) {
          setVideos([]);
          setLoading(false);
          return;
        }
        
        const sortedByDate = [...publicVideos].sort((a, b) =>
          new Date(b.upload_date || 0) - new Date(a.upload_date || 0)
        );
        
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
    <div className="bg-gray-900 px-4 py-6 md:px-8 md:py-10">
      {featuredVideo && <HeroBillboard video={featuredVideo} />}
      
      <VideoSection 
        title="Recently Added" 
        icon={<Clock size={24} className="text-blue-400" />}
        videos={recentVideos}
      />
      
      <VideoSection 
        title="Popular Videos" 
        icon={<TrendingUp size={24} className="text-purple-400" />}
        videos={popularVideos}
      />
    </div>
  );
};

export default LoggedInView;