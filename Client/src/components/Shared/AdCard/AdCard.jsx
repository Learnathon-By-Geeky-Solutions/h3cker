import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Play, BarChart2, Plus, X } from 'lucide-react';

const AdCard = ({ ad }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  
  // Generate color based on engagement score
  const getScoreColor = (score) => {
    if (score >= 85) return "text-green-400";
    if (score >= 70) return "text-blue-400";
    return "text-yellow-400";
  };
  
  const handlePlayClick = useCallback((e) => {
    e.stopPropagation();
    setShowVideo(true);
  }, []);
  
  const handleCloseVideo = useCallback(() => {
    setShowVideo(false);
  }, []);
  
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);
  
  const handleKeyDown = useCallback((e) => {
    // Handle Enter or Space key press
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsHovered(true);
    }
    // Handle Escape key to close hover state
    if (e.key === 'Escape') {
      setIsHovered(false);
    }
  }, []);
  
  return (
    <button 
      className="relative rounded-md overflow-hidden shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg bg-gray-800 w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      onClick={() => setIsHovered(true)}
      type="button"
      aria-label={`View details for ${ad.title}`}
    >
      {showVideo ? (
        <div className="relative pt-[56.25%]"> {/* 16:9 aspect ratio */}
          <iframe 
            className="absolute inset-0 w-full h-full"
            src={ad.videoUrl}
            title={ad.title}
            style={{ border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
          ></iframe>
          <button 
            onClick={handleCloseVideo}
            className="absolute top-2 right-2 bg-gray-900 bg-opacity-75 rounded-full p-1.5 text-white z-20 hover:bg-opacity-100"
            type="button"
            aria-label="Close video"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <div className="relative pt-[56.25%]"> {/* Fixed aspect ratio container */}
            <img 
              src={ad.imageUrl} 
              alt={ad.title} 
              className="absolute inset-0 w-full h-full object-cover" 
            />
          </div>
          
          {/* Engagement score badge */}
          <div className="absolute top-2 right-2 bg-gray-900 bg-opacity-75 px-2 py-1 rounded-full text-xs font-bold">
            <span className={getScoreColor(ad.engagementScore)}>{ad.engagementScore}%</span>
          </div>
          
          {isHovered && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-90 flex flex-col p-3">
              <div className="flex justify-between mb-2">
                <div className="flex gap-2">
                  <button 
                    onClick={handlePlayClick}
                    className="bg-blue-600 text-white rounded-full p-1.5 hover:bg-blue-500"
                    type="button"
                    aria-label="Play"
                  >
                    <Play size={16} />
                  </button>
                  <button 
                    className="border border-gray-600 rounded-full p-1.5 hover:border-white text-white"
                    type="button"
                    aria-label="Add to list"
                  >
                    <Plus size={16} />
                  </button>
                  <button 
                    className="border border-gray-600 rounded-full p-1.5 hover:border-white text-white"
                    type="button"
                    aria-label="View analytics"
                  >
                    <BarChart2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="mt-1">
                <h3 className="font-bold text-sm text-white">{ad.title}</h3>
                <div className="flex items-center text-xs mt-1">
                  <span className={`${getScoreColor(ad.engagementScore)} font-bold mr-2`}>
                    {ad.engagementScore}% Engagement
                  </span>
                </div>
                <div className="flex flex-col mt-2 text-xs">
                  <span className="text-gray-300">Brand: {ad.brand}</span>
                  <span className="text-gray-300">Length: {ad.duration}</span>
                  <span className="text-gray-300">Dominant Emotion: {ad.dominantEmotion}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </button>
  );
};

AdCard.propTypes = {
  ad: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    imageUrl: PropTypes.string.isRequired,
    videoUrl: PropTypes.string.isRequired,
    duration: PropTypes.string.isRequired,
    brand: PropTypes.string.isRequired,
    engagementScore: PropTypes.number.isRequired,
    dominantEmotion: PropTypes.string.isRequired,
    viewCount: PropTypes.number.isRequired,
  }).isRequired
};

export default AdCard;