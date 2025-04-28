import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Play, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from 'flowbite-react';
import VideoPlayer from '../VideoPlayer/VideoPlayer';
import VideoService from '../../../utils/VideoService';

const HeroBillboard = ({ videos }) => {
  const [showVideo, setShowVideo] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  
  if (!videos || !videos.length) return null;
  
  const currentVideo = videos[currentIndex];
  
  useEffect(() => {
    let timer;
    if (autoplay && videos.length > 1) {
      timer = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % videos.length);
      }, 5000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoplay, videos.length]);
  
  useEffect(() => {
    if (showVideo) {
      setAutoplay(false);
    }
  }, [showVideo]);
  
  const getThumbnailUrl = () => {
    if (!currentVideo.thumbnail_url) {
      return `/api/placeholder/1200/600?text=${encodeURIComponent(currentVideo.title || 'Featured Video')}`;
    }
    return currentVideo.thumbnail_url;
  };
  
  const getCategoryTag = () => {
    if (!currentVideo.category) return "FEATURED";
    return currentVideo.category.toUpperCase();
  };
  
  const handlePlayClick = () => {
    if (currentVideo.video_url) {
      setShowVideo(true);
    } else {
      window.location.href = `/video/${currentVideo.id}`;
    }
  };
  
  const handleCloseVideo = () => {
    setShowVideo(false);
    setAutoplay(true);
  };
  
  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? videos.length - 1 : prevIndex - 1
    );
    setAutoplay(false);
    setTimeout(() => setAutoplay(true), 10000);
  };
  
  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      (prevIndex + 1) % videos.length
    );
    setAutoplay(false);
    setTimeout(() => setAutoplay(true), 10000);
  };
  
  const goToSlide = (index) => {
    setCurrentIndex(index);
    setAutoplay(false);
    setTimeout(() => setAutoplay(true), 10000);
  };
  
  return (
    <div className="relative overflow-hidden mb-10">
      <div className="relative aspect-[16/9] md:aspect-[21/9] lg:aspect-[3/1]">
        <img 
          src={getThumbnailUrl()} 
          alt={currentVideo.title} 
          className="w-full h-full object-cover transition-opacity duration-500"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `/api/placeholder/1200/600?text=${encodeURIComponent(currentVideo.title || 'Featured Video')}`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-transparent to-gray-900 opacity-60"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
      </div>
      
      <div className="absolute bottom-0 left-0 p-4 sm:p-6 md:p-12 w-full md:w-2/3 z-10">
        <div className="mb-2 sm:mb-4 flex items-center">
          <span className="text-xs sm:text-sm font-bold tracking-wide text-blue-400">{getCategoryTag()}</span>
        </div>
        
        <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 text-white">{currentVideo.title}</h1>
        <p className="text-sm sm:text-base md:text-lg mb-4 sm:mb-6 text-gray-300 line-clamp-2 md:line-clamp-3">
          {currentVideo.description || "No description available for this video."}
        </p>
        
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button
            onClick={handlePlayClick}
            className="relative flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-base font-semibold shadow-lg transition-all duration-300"
          >
            <Play size={18} className="mr-2" /> 
            {currentVideo.video_url ? "Watch Now" : "Go to Video"}
          </Button>
          
          <Link to={`/video/${currentVideo.id}`}>
            <Button
              color="gray"
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-base font-semibold transition-all duration-300"
            >
              View Details
            </Button>
          </Link>
        </div>
        
        {(currentVideo.views > 0 || currentVideo.likes > 0) && (
          <div className="flex mt-3 sm:mt-4 text-xs sm:text-sm text-gray-400">
            {currentVideo.views > 0 && (
              <span className="mr-4">
                <strong>{currentVideo.views.toLocaleString()}</strong> views
              </span>
            )}
            {currentVideo.likes > 0 && (
              <span>
                <strong>{currentVideo.likes.toLocaleString()}</strong> likes
              </span>
            )}
          </div>
        )}
      </div>
      
      {videos.length > 1 && (
        <>
          <button 
            onClick={goToPrevious}
            className="absolute top-1/2 left-2 sm:left-4 transform -translate-y-1/2 bg-black/50 hover:bg-blue-600 text-white p-1.5 sm:p-3 rounded-full transition-all duration-300 z-20 shadow-lg"
            aria-label="Previous video"
          >
            <ChevronLeft size={20} />
          </button>
          
          <button 
            onClick={goToNext}
            className="absolute top-1/2 right-2 sm:right-4 transform -translate-y-1/2 bg-black/50 hover:bg-blue-600 text-white p-1.5 sm:p-3 rounded-full transition-all duration-300 z-20 shadow-lg"
            aria-label="Next video"
          >
            <ChevronRight size={20} />
          </button>
          
          <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 flex items-center gap-1.5 sm:gap-2 z-20">
            {videos.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 sm:w-3 h-2 sm:h-3 rounded-full transition-all duration-300 ${
                  currentIndex === index
                    ? 'bg-blue-500 scale-125'
                    : 'bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
      
      {showVideo && currentVideo.video_url && (
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
                videoUrl={currentVideo.video_url}
                thumbnailUrl={getThumbnailUrl()}
                title={currentVideo.title}
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
  videos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
      thumbnail_url: PropTypes.string,
      video_url: PropTypes.string,
      category: PropTypes.string,
      views: PropTypes.number,
      likes: PropTypes.number
    })
  ).isRequired
};

export default HeroBillboard;