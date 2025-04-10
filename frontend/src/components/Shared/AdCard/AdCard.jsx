import React from 'react';
import PropTypes from 'prop-types';
import { Play } from 'lucide-react';
import { extractYouTubeId, getYouTubeThumbnail } from '../../Shared/VideoPlayer/youtubeUtils';

/**
 * AdCard component 
 * Simplified to avoid SonarQube issues
 */
const AdCard = ({ ad, onPlayClick }) => {
  // Get thumbnail from video URL if available
  const getThumbnail = () => {
    // If image URL is provided, use it
    if (ad.imageUrl) return ad.imageUrl;
    
    // Try to extract YouTube thumbnail
    const videoId = extractYouTubeId(ad.videoUrl);
    if (videoId) return getYouTubeThumbnail(videoId);
    
    // Fallback to placeholder
    return `/api/placeholder/400/225?text=${encodeURIComponent(ad.title)}`;
  };
  
  // Handle play button click
  const handleClick = (e) => {
    e.preventDefault();
    if (onPlayClick) onPlayClick(ad);
  };
  
  // Render card
  return (
    <div className="relative rounded-md overflow-hidden shadow-md bg-gray-800 h-full group">
      {/* Card thumbnail */}
      <div className="relative aspect-video bg-gray-900">
        <img 
          src={getThumbnail()} 
          alt={ad.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            // Fallback for broken images
            e.target.src = `/api/placeholder/400/225?text=${encodeURIComponent(ad.title)}`;
          }}
        />
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button 
            onClick={handleClick}
            aria-label={`Play ${ad.title}`}
            className="w-12 h-12 bg-blue-600 bg-opacity-90 rounded-full flex items-center justify-center transition-transform transform group-hover:scale-110"
            type="button"
          >
            <Play size={24} className="text-white ml-1" />
          </button>
        </div>
        
        {/* Brand tag */}
        <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded-full text-xs font-bold text-white">
          {ad.brand}
        </div>
      </div>
      
      {/* Card title */}
      <div className="p-3">
        <h3 className="font-bold text-sm text-white">{ad.title}</h3>
      </div>
    </div>
  );
};

AdCard.propTypes = {
  ad: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    imageUrl: PropTypes.string,
    videoUrl: PropTypes.string.isRequired,
    brand: PropTypes.string.isRequired
  }).isRequired,
  onPlayClick: PropTypes.func
};

export default AdCard;