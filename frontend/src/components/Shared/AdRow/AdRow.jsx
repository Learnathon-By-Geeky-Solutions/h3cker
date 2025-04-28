import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Button } from 'flowbite-react';
import AdCard from '../AdCard/AdCard';
import VideoPlayer from '../VideoPlayer/VideoPlayer';

const AdRow = ({ title, icon, ads, linkTo, isVideoSection = false }) => {
  const [selectedAd, setSelectedAd] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  
  const handleAdClick = (ad) => {
    if (isVideoSection && ad.id) {
      return;
    }
    
    if (ad.video_url || ad.videoUrl) {
      setSelectedAd(ad);
      setShowVideo(true);
    }
  };
  
  const handleTrackingData = (data) => {
    if (!selectedAd) return;
    console.log(`Ad ${selectedAd.id} tracking:`, data);
  };
  
  const handleVideoClose = () => {
    setShowVideo(false);
    setSelectedAd(null);
  };
  
  if (!ads || ads.length === 0) {
    return null;
  }
  
  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </h2>
        {linkTo && (
          <Link to={linkTo}>
            <Button 
              color="gray" 
              size="xs" 
              pill 
              className="bg-gray-700 hover:bg-gray-600 text-gray-200"
            >
              View All
            </Button>
          </Link>
        )}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {ads.map((ad) => (
          isVideoSection ? (
            <Link key={ad.id || index} to={`/video/${ad.id}`} className="block">
              <AdCard ad={ad} onPlayClick={handleAdClick} />
            </Link>
          ) : (
            <AdCard key={ad.id || index} ad={ad} onPlayClick={handleAdClick} />
          )
        ))}
      </div>
      
      {showVideo && selectedAd && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center backdrop-blur-sm animate-fadeIn">
          <button 
            onClick={handleVideoClose}
            className="absolute top-4 right-4 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full z-30 shadow-lg transition-colors duration-300"
            aria-label="Close video"
            type="button"
          >
            ✕
          </button>
          
          <div className="w-full max-w-4xl rounded-lg overflow-hidden shadow-2xl animate-scaleIn">
            <VideoPlayer 
              videoUrl={selectedAd.videoUrl || selectedAd.video_url}
              title={selectedAd.title || ""}
              onEnded={handleTrackingData}
              thumbnailUrl={selectedAd.imageUrl || selectedAd.thumbnail_url}
            />
          </div>
        </div>
      )}
    </div>
  );
};

AdRow.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.node,
  ads: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired
    })
  ).isRequired,
  linkTo: PropTypes.string,
  isVideoSection: PropTypes.bool
};

export default AdRow;