import React, { useState, useRef, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Play, X, AlertCircle } from 'lucide-react';
import FaceTracker from '../../Shared/FaceTracker/FaceTracker';
import { extractYouTubeId, getYouTubeThumbnail, createYouTubeEmbedUrl } from './youtubeUtils';

/**
 * VideoPlayer component with face tracking
 * Fixed issues with black screen and refactored for lower complexity
 */
const VideoPlayer = ({ videoSource, title, onTrackingData, previewImage }) => {
  // Component state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [youtubeId, setYoutubeId] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  // Refs
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  
  // Process video source on mount
  useEffect(() => {
    if (!videoSource) return;
    
    // Check if YouTube video and extract ID
    const id = extractYouTubeId(videoSource);
    if (id) {
      setYoutubeId(id);
    }
  }, [videoSource]);
  
  // Handler functions
  const handlePlayClick = useCallback(() => {
    setShowWarning(true);
  }, []);
  
  const handleStartVideo = useCallback(() => {
    setShowWarning(false);
    setIsPlaying(true);
    setTrackingActive(true);
    
    // Delay going fullscreen to allow components to mount
    setTimeout(() => {
      setIsFullScreen(true);
    }, 100);
  }, []);
  
  const handleCloseVideo = useCallback(() => {
    setIsFullScreen(false);
    setTrackingActive(false);
    
    // Delay hiding video for smooth animation
    setTimeout(() => {
      setIsPlaying(false);
      setVideoLoaded(false);
    }, 300);
  }, []);
  
  const handleTrackingData = useCallback((data) => {
    if (onTrackingData) {
      onTrackingData(data);
    }
  }, [onTrackingData]);
  
  const handlePermissionGranted = useCallback(() => {
    // Video should already be visible by now
    console.log('Permission granted, ready to play');
  }, []);
  
  const handleVideoLoad = useCallback(() => {
    setVideoLoaded(true);
  }, []);
  
  // Get preview image
  const getPreviewImage = () => {
    if (previewImage) return previewImage;
    if (youtubeId) return getYouTubeThumbnail(youtubeId);
    return '/api/placeholder/400/225';
  };
  
  // Render video preview
  const renderPreview = () => (
    <div className="absolute inset-0 bg-gradient-to-r from-gray-900/50 via-transparent to-gray-900/50">
      <img 
        src={getPreviewImage()} 
        alt={title || "Video preview"} 
        className="w-full h-full object-cover" 
        onError={(e) => {
          e.target.src = '/api/placeholder/400/225';
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <button
          onClick={handlePlayClick}
          className="w-16 h-16 bg-blue-600 bg-opacity-90 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400"
          type="button"
          aria-label="Play video"
        >
          <Play size={32} className="text-white ml-1" />
        </button>
      </div>
    </div>
  );
  
  // Render YouTube video
  const renderYouTubeVideo = () => (
    <iframe 
      width="100%" 
      height="100%" 
      src={createYouTubeEmbedUrl(youtubeId)}
      title={title || "Video"}
      style={{ border: 0 }}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
      allowFullScreen={false}
      className={`z-20 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
      id="youtube-player"
      onLoad={handleVideoLoad}
    ></iframe>
  );
  
  // Render direct video
  const renderDirectVideo = () => (
    <video
      ref={videoRef}
      src={videoSource}
      className={`w-full h-full z-20 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
      autoPlay
      playsInline
      controls={false}
      onContextMenu={(e) => e.preventDefault()}
      onCanPlay={handleVideoLoad}
    >
      <track kind="captions" />
    </video>
  );
  
  // Render permission warning
  const renderWarning = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md">
        <div className="flex justify-center mb-4">
          <AlertCircle size={48} className="text-yellow-400" />
        </div>
        <h3 className="text-xl font-bold mb-3 text-white text-center">Advertisement Engagement Analysis</h3>
        <p className="text-gray-300 mb-4">
          This platform uses your camera to measure engagement with the advertisement. 
          The ad will only play while your attention is focused on it.
        </p>
        <p className="text-gray-300 mb-6 text-sm">
          <strong>Note:</strong> Your facial reactions will be recorded and stored for engagement analysis purposes.
          All data is handled according to our privacy policy.
        </p>
        <div className="flex gap-3 justify-center">
          <button 
            onClick={handleStartVideo}
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
            type="button"
          >
            Begin Ad Analysis
          </button>
          <button 
            onClick={() => setShowWarning(false)}
            className="bg-gray-700 text-white px-4 py-2 rounded-md font-medium"
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
  
  // Render loading indicator
  const renderLoading = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  
  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden transition-all duration-300 ${isFullScreen ? 'fixed inset-0 bg-black z-50' : 'aspect-video'}`}
    >
      {!isPlaying && renderPreview()}
      
      {isPlaying && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
          <button 
            onClick={handleCloseVideo}
            className="absolute top-4 right-4 bg-gray-800 text-white p-2 rounded-full z-30 hover:bg-gray-700 transition-all"
            type="button"
            aria-label="Close video"
          >
            <X size={20} />
          </button>
          
          <div className={`relative ${isFullScreen ? 'w-full h-full' : 'w-4/5 h-4/5'}`}>
            {!videoLoaded && renderLoading()}
            {youtubeId ? renderYouTubeVideo() : renderDirectVideo()}
            
            {trackingActive && (
              <FaceTracker 
                isActive={trackingActive}
                onTrackingData={handleTrackingData}
                onPermissionGranted={handlePermissionGranted}
                videoElement={videoRef.current ? videoRef : null}
              />
            )}
          </div>
        </div>
      )}
      
      {showWarning && renderWarning()}
    </div>
  );
};

VideoPlayer.propTypes = {
  videoSource: PropTypes.string.isRequired,
  title: PropTypes.string,
  onTrackingData: PropTypes.func,
  previewImage: PropTypes.string
};

export default VideoPlayer;