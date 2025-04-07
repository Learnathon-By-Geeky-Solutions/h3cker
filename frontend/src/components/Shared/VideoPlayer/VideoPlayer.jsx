import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Spinner } from 'flowbite-react';

/**
 * VideoPlayer component for streaming videos from Azure Blob Storage
 * Uses HTML5 video player
 */
const VideoPlayer = ({ videoUrl, thumbnailUrl, title, autoPlay = false, controls = true }) => {
  const videoRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!videoUrl) {
      setError('Video URL is missing');
      setIsLoading(false);
      return;
    }

    const videoElement = videoRef.current;

    // Handle video load events
    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = (e) => {
      console.error('Error loading video:', e);
      setError('Failed to load video. Please try again later.');
      setIsLoading(false);
    };

    // Add event listeners
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('error', handleError);

    // Clean up event listeners on unmount
    return () => {
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('error', handleError);
    };
  }, [videoUrl]);

  // Reset state when video URL changes
  useEffect(() => {
    setIsLoading(true);
    setError(null);
  }, [videoUrl]);

  return (
    <div className="relative w-full">
      {/* Video loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70 z-10">
          <Spinner size="xl" color="blue" />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70 z-10">
          <div className="text-center p-4">
            <p className="text-red-500 mb-2">{error}</p>
            <button 
              className="text-blue-500 underline"
              onClick={() => {
                if (videoRef.current) {
                  setIsLoading(true);
                  setError(null);
                  videoRef.current.load();
                }
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* The video player */}
      <video
        ref={videoRef}
        className="w-full h-auto rounded-lg"
        poster={thumbnailUrl}
        controls={controls}
        autoPlay={autoPlay}
        preload="auto"
        title={title}
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

VideoPlayer.propTypes = {
  videoUrl: PropTypes.string.isRequired,
  thumbnailUrl: PropTypes.string,
  title: PropTypes.string,
  autoPlay: PropTypes.bool,
  controls: PropTypes.bool
};

export default VideoPlayer;