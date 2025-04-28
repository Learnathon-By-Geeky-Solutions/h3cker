import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Play, X } from 'lucide-react';
import { Button } from 'flowbite-react';
import VideoPlayer from '../VideoPlayer/VideoPlayer';

const HeroBillboard = ({ featuredVideos }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState({});
  
  const timerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const carouselRef = useRef(null);
  
  const videos = Array.isArray(featuredVideos) ? featuredVideos : (featuredVideos ? [featuredVideos] : []);
  
  useEffect(() => {
    setIsLoaded(false);
    setImagesLoaded({});
  }, [featuredVideos]);
  
  useEffect(() => {
    if (videos.length > 0 && Object.keys(imagesLoaded).length >= Math.min(2, videos.length)) {
      setIsLoaded(true);
    }
  }, [imagesLoaded, videos.length]);
  
  useEffect(() => {
    if (videos.length <= 1) return;
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    setProgressWidth(0);
    
    if (!isPaused && !showVideo && isLoaded) {
      const duration = 5000;
      const interval = 50;
      const increment = (interval / duration) * 100;
      
      progressIntervalRef.current = setInterval(() => {
        setProgressWidth(prev => {
          const newWidth = prev + increment;
          return newWidth > 100 ? 100 : newWidth;
        });
      }, interval);
      
      timerRef.current = setTimeout(() => {
        handleNext();
      }, duration);
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentIndex, isPaused, showVideo, videos.length, isLoaded]);
  
  useEffect(() => {
    if (videos.length <= 1) return;
    
    videos.forEach((video, index) => {
      const img = new Image();
      img.src = getThumbnailUrl(video);
      img.onload = () => {
        setImagesLoaded(prev => ({
          ...prev,
          [index]: true
        }));
      };
      img.onerror = () => {
        setImagesLoaded(prev => ({
          ...prev,
          [index]: true
        }));
      };
    });
  }, [videos]);
  
  if (videos.length === 0) {
    return null;
  }
  
  const currentVideo = videos[currentIndex];
  
  const getThumbnailUrl = (video) => {
    if (!video.thumbnail_url && !video.imageUrl) {
      return `/api/placeholder/1200/600?text=${encodeURIComponent(video.title || 'Featured Video')}`;
    }
    return video.thumbnail_url || video.imageUrl;
  };
  
  const getCategoryTag = (video) => {
    if (!video.category) return "FEATURED";
    return video.category.toUpperCase();
  };
  
  const handlePrev = () => {
    if (isTransitioning || videos.length <= 1) return;
    
    setIsTransitioning(true);
    setCurrentIndex(prev => (prev === 0 ? videos.length - 1 : prev - 1));
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };
  
  const handleNext = () => {
    if (isTransitioning || videos.length <= 1) return;
    
    setIsTransitioning(true);
    setCurrentIndex(prev => (prev === videos.length - 1 ? 0 : prev + 1));
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };
  
  const handleDotClick = (index) => {
    if (currentIndex === index || isTransitioning || videos.length <= 1) return;
    
    setIsTransitioning(true);
    setCurrentIndex(index);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };
  
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(null);
  };
  
  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isSwipe = Math.abs(distance) > 50;
    
    if (isSwipe) {
      if (distance > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };
  
  const handleMouseDown = (e) => {
    if (videos.length <= 1) return;
    
    setIsDragging(true);
    setDragStartX(e.clientX);
    setIsPaused(true);
    
    document.body.style.userSelect = 'none';
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
  };
  
  const handleMouseUp = (e) => {
    if (!isDragging) return;
    
    const dragEndX = e.clientX;
    const distance = dragStartX - dragEndX;
    const isSignificantDrag = Math.abs(distance) > 100;
    
    if (isSignificantDrag) {
      if (distance > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    
    setIsDragging(false);
    document.body.style.userSelect = '';
    
    setTimeout(() => {
      if (!showVideo) {
        setIsPaused(false);
      }
    }, 1000);
  };
  
  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.userSelect = '';
      
      if (!showVideo) {
        setIsPaused(false);
      }
    }
  };
  
  const handleWheel = (e) => {
    if (videos.length <= 1 || isTransitioning) return;
    
    setIsPaused(true);
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    if (e.deltaY > 0 || e.deltaX > 0) {
      handleNext();
    } else if (e.deltaY < 0 || e.deltaX < 0) {
      handlePrev();
    }
    
    setTimeout(() => {
      if (!showVideo) {
        setIsPaused(false);
      }
    }, 2000);
  };
  
  const handlePlayClick = () => {
    if (currentVideo.video_url || currentVideo.videoUrl) {
      setShowVideo(true);
      setIsPaused(true);
    } else {
      window.location.href = `/video/${currentVideo.id}`;
    }
  };
  
  const handleCloseVideo = () => {
    setShowVideo(false);
    setIsPaused(false);
  };
  
  const handleMouseEnter = () => {
    setIsPaused(true);
  };
  
  const handleImageLoad = (index) => {
    setImagesLoaded(prev => ({
      ...prev,
      [index]: true
    }));
  };
  
  const getDescription = (video) => {
    if (video.description && video.description.trim() !== '') {
      return video.description;
    }
    
    if (video.brand || video.uploader_name) {
      return `A video by ${video.brand || video.uploader_name}`;
    }
    
    return "Watch this featured video";
  };
  
  if (!isLoaded && videos.length > 0) {
    return (
      <div className="relative overflow-hidden mb-10 rounded-xl shadow-2xl bg-gray-800 animate-pulse">
        <div className="aspect-[21/9] md:aspect-[3/1] flex items-center justify-center">
          <div className="text-white text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4">Loading featured content...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      ref={carouselRef}
      className="relative overflow-hidden mb-10 rounded-xl shadow-2xl"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      tabIndex="0"
      aria-label="Featured videos carousel"
    >
      <div className="relative aspect-[21/9] md:aspect-[3/1]">
        <div 
          className={`w-full h-full transition-opacity duration-500 ${isTransitioning ? 'opacity-80' : 'opacity-100'}`}
        >
          <img 
            src={getThumbnailUrl(currentVideo)} 
            alt={currentVideo.title} 
            className="w-full h-full object-cover"
            onLoad={() => handleImageLoad(currentIndex)}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `/api/placeholder/1200/600?text=${encodeURIComponent(currentVideo.title || 'Featured Video')}`;
              handleImageLoad(currentIndex);
            }}
            style={{ pointerEvents: 'none' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-transparent to-gray-900 opacity-60"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
        </div>
        
        {videos.length > 1 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center md:hidden">
            <div className="text-white text-center text-sm bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm opacity-70">
              Swipe to navigate
            </div>
          </div>
        )}
        
        <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full md:w-2/3 z-10">
          <div className="mb-4 flex items-center">
            <span className="text-sm font-bold tracking-wide text-blue-400">{getCategoryTag(currentVideo)}</span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-bold mb-3 text-white">{currentVideo.title}</h1>
          <p className="text-base md:text-lg mb-6 text-gray-300 line-clamp-2 md:line-clamp-3">
            {getDescription(currentVideo)}
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handlePlayClick}
              className="relative flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg transition-all duration-300"
            >
              <Play size={20} className="mr-2" /> 
              {(currentVideo.video_url || currentVideo.videoUrl) ? "Watch Now" : "Go to Video"}
            </Button>
            
            <Link to={`/video/${currentVideo.id}`}>
              <Button
                color="gray"
                className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-full font-semibold transition-all duration-300"
              >
                View Details
              </Button>
            </Link>
          </div>
          
          {(currentVideo.views > 0 || currentVideo.likes > 0) && (
            <div className="flex mt-4 text-sm text-gray-400">
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
      </div>
      
      {videos.length > 1 && !isPaused && !showVideo && isLoaded && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800 z-20">
          <div 
            className="h-full bg-blue-500 transition-all duration-50 ease-linear"
            style={{ width: `${progressWidth}%` }}
          ></div>
        </div>
      )}
      
      {videos.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
          {videos.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`w-3 h-3 rounded-full transition-all focus:outline-none ${
                index === currentIndex 
                  ? 'bg-white scale-110' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentIndex ? "true" : "false"}
            />
          ))}
        </div>
      )}
      
      {showVideo && (currentVideo.video_url || currentVideo.videoUrl) && (
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
                videoUrl={currentVideo.video_url || currentVideo.videoUrl}
                thumbnailUrl={getThumbnailUrl(currentVideo)}
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
  featuredVideos: PropTypes.oneOfType([
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
      thumbnail_url: PropTypes.string,
      imageUrl: PropTypes.string,
      video_url: PropTypes.string,
      videoUrl: PropTypes.string,
      category: PropTypes.string,
      views: PropTypes.number,
      likes: PropTypes.number,
      brand: PropTypes.string,
      uploader_name: PropTypes.string
    }),
    PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string,
        thumbnail_url: PropTypes.string,
        imageUrl: PropTypes.string,
        video_url: PropTypes.string,
        videoUrl: PropTypes.string,
        category: PropTypes.string,
        views: PropTypes.number,
        likes: PropTypes.number,
        brand: PropTypes.string,
        uploader_name: PropTypes.string
      })
    )
  ]).isRequired
};

export default HeroBillboard;