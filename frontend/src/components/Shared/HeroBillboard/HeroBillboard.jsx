import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Play } from 'lucide-react';
import VideoPlayer from '../../Shared/VideoPlayer/VideoPlayer';

/**
 * HeroBillboard component
 * Displays featured content with video playback
 */
const HeroBillboard = ({ content }) => {
  const [showVideo, setShowVideo] = useState(false);
  
  // Handle tracking data in background
  const handleTrackingData = (data) => {
    // Track metrics but don't display them
    if (content.onTrackingData) {
      content.onTrackingData(data);
    }
  };
  
  // Get a reliable image URL with fallback
  const getImageUrl = () => {
    if (!content.imageUrl) {
      return `/api/placeholder/1200/600?text=${encodeURIComponent(content.title)}`;
    }
    return content.imageUrl;
  };
  
  // Render background section
  const renderBackground = () => (
    <>
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-transparent to-gray-900 z-0">
        <img 
          src={getImageUrl()} 
          alt={content.title} 
          className="w-full h-full object-cover opacity-70"
          onError={(e) => {
            e.target.src = `/api/placeholder/1200/600?text=${encodeURIComponent(content.title)}`;
          }}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-1"></div>
    </>
  );
  
  // Render content section
  const renderContent = () => (
    <div className="absolute bottom-0 left-0 p-12 z-10 w-full md:w-2/3">
      <div className="mb-4 flex items-center">
        <span className="text-sm font-bold tracking-wide text-blue-400">{content.category}</span>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white">{content.title}</h1>
      <p className="text-lg mb-6 text-gray-300">{content.description}</p>
      
      <button 
        onClick={() => setShowVideo(true)}
        className="relative group flex items-center bg-blue-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg"
        type="button"
      >
        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full shadow-md"></span>
        <span className="absolute inset-0 w-full h-full bg-white/15 rounded-full blur-[2px]"></span>
        <span className="absolute inset-0 w-full h-full bg-blue-600 rounded-full transform transition-transform group-hover:scale-105"></span>
        <span className="relative flex items-center">
          <Play size={20} className="mr-2" /> Watch Video
        </span>
      </button>
    </div>
  );
  
  // Render video overlay
  const renderVideoOverlay = () => (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      <div className="w-full max-w-5xl">
        <VideoPlayer 
          videoSource={content.videoUrl}
          title={content.title}
          onTrackingData={handleTrackingData}
          previewImage={content.imageUrl}
        />
      </div>
    </div>
  );

  return (
    <div className="relative overflow-hidden h-[70vh]">
      {renderBackground()}
      {renderContent()}
      {showVideo && renderVideoOverlay()}
    </div>
  );
};

HeroBillboard.propTypes = {
  content: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    imageUrl: PropTypes.string,
    category: PropTypes.string.isRequired,
    onTrackingData: PropTypes.func,
    videoUrl: PropTypes.string.isRequired
  }).isRequired
};

export default HeroBillboard;