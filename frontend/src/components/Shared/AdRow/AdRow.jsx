import React, { useState } from 'react';
import PropTypes from 'prop-types';
import AdCard from '../../Shared/AdCard/AdCard';
import VideoPlayer from '../../Shared/VideoPlayer/VideoPlayer';

/**
 * AdRow component
 * Renders a row of ad cards with video playback functionality
 */
const AdRow = ({ title, icon, ads }) => {
  const [selectedAd, setSelectedAd] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  
  // Handle ad card click
  const handleAdClick = (ad) => {
    setSelectedAd(ad);
    setShowVideo(true);
  };
  
  // Handle tracking data
  const handleTrackingData = (data) => {
    if (!selectedAd) return;
    
    console.log(`Ad ${selectedAd.id} tracking:`, data);
    // You can send this data to your backend
  };
  
  // Handle video close
  const handleVideoClose = () => {
    setShowVideo(false);
    setSelectedAd(null);
  };
  
  // Render title section
  const renderTitle = () => (
    <h2 className="text-xl font-bold mb-5 flex items-center text-white">
      {icon && <span className="mr-2">{icon}</span>}
      {title}
    </h2>
  );
  
  // Render ad cards grid
  const renderGrid = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {ads.map((ad) => (
        <AdCard 
          key={ad.id} 
          ad={ad} 
          onPlayClick={handleAdClick} 
        />
      ))}
    </div>
  );
  
  // Render video overlay
  const renderVideoOverlay = () => (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      <button 
        onClick={handleVideoClose}
        className="absolute top-4 right-4 bg-gray-800 text-white p-2 rounded-full z-30"
        aria-label="Close video"
        type="button"
      >
        ✕
      </button>
      
      <div className="w-full max-w-4xl">
        <VideoPlayer 
          videoSource={selectedAd.videoUrl}
          title={selectedAd.title}
          onTrackingData={handleTrackingData}
          previewImage={selectedAd.imageUrl}
        />
      </div>
    </div>
  );

  return (
    <div className="mb-10 px-6 md:px-12">
      {renderTitle()}
      {renderGrid()}
      {showVideo && selectedAd && renderVideoOverlay()}
    </div>
  );
};

AdRow.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.node,
  ads: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired
    })
  ).isRequired
};

export default AdRow;