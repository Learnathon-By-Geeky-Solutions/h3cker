import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Play, X } from 'lucide-react';
import { Button } from 'flowbite-react';
import VideoPlayer from '../VideoPlayer/VideoPlayer';

const HeroBillboard = ({ video }) => {
  const [showVideo, setShowVideo] = useState(false);
  
  if (!video) return null;
  
  const getThumbnailUrl = () => {
    if (!video.thumbnail_url) {
      return `/api/placeholder/1200/600?text=${encodeURIComponent(video.title || 'Featured Video')}`;
    }
    return video.thumbnail_url;
  };
  
  const formatDuration = () => {
    if (!video.duration) return "";
    return video.duration;
  };
  
  const getCategoryTag = () => {
    if (!video.category) return "FEATURED";
    return video.category.toUpperCase();
  };
  
  const handlePlayClick = () => {
    // Only open the video modal if video_url exists
    if (video.video_url) {
      setShowVideo(true);
    } else {
      // Redirect to details page when video_url is not available
      window.location.href = `/video/${video.id}`;
    }
  };
  
  const handleCloseVideo = () => {
    setShowVideo(false);
  };
  
  return (
    <div className="relative overflow-hidden mb-10">
      <div className="relative aspect-[21/9] md:aspect-[3/1]">
        <img 
          src={getThumbnailUrl()} 
          alt={video.title} 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `/api/placeholder/1200/600?text=${encodeURIComponent(video.title || 'Featured Video')}`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-transparent to-gray-900 opacity-60"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
      </div>
      
      <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full md:w-2/3 z-10">
        <div className="mb-4 flex items-center">
          <span className="text-sm font-bold tracking-wide text-blue-400">{getCategoryTag()}</span>
          {formatDuration() && (
            <span className="ml-4 text-sm font-medium text-gray-300 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDuration()}
            </span>
          )}
        </div>
        
        <h1 className="text-3xl md:text-5xl font-bold mb-3 text-white">{video.title}</h1>
        <p className="text-base md:text-lg mb-6 text-gray-300 line-clamp-2 md:line-clamp-3">
          {video.description || "No description available for this video."}
        </p>
        
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handlePlayClick}
            className="relative flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg transition-all duration-300"
          >
            <Play size={20} className="mr-2" /> 
            {video.video_url ? "Watch Now" : "Go to Video"}
          </Button>
          
          <Link to={`/video/${video.id}`}>
            <Button
              color="gray"
              className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-full font-semibold transition-all duration-300"
            >
              View Details
            </Button>
          </Link>
        </div>
        
        {(video.views > 0 || video.likes > 0) && (
          <div className="flex mt-4 text-sm text-gray-400">
            {video.views > 0 && (
              <span className="mr-4">
                <strong>{video.views.toLocaleString()}</strong> views
              </span>
            )}
            {video.likes > 0 && (
              <span>
                <strong>{video.likes.toLocaleString()}</strong> likes
              </span>
            )}
          </div>
        )}
      </div>
      
      {showVideo && video.video_url && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl">
            <Button
              onClick={handleCloseVideo}
              color="gray"
              pill
              className="absolute -top-12 right-0 z-10 bg-gray-800 hover:bg-gray-700 text-white"
              aria-label="Close video"
            >
              <X size={20} />
            </Button>
            
            <div className="rounded-lg overflow-hidden shadow-2xl">
              <VideoPlayer 
                videoUrl={video.video_url}
                thumbnailUrl={getThumbnailUrl()}
                title={video.title}
                autoPlay={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

HeroBillboard.propTypes = {
  video: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    thumbnail_url: PropTypes.string,
    video_url: PropTypes.string,
    category: PropTypes.string,
    duration: PropTypes.string,
    views: PropTypes.number,
    likes: PropTypes.number
  }).isRequired
};

export default HeroBillboard;