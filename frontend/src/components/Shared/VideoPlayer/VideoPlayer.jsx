import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Spinner } from 'flowbite-react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, RotateCcw } from 'lucide-react';

const VideoPlayer = ({ videoUrl, thumbnailUrl, title, autoPlay = false, onEnded }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const controlsTimerRef = useRef(null);

  useEffect(() => {
    if (!videoUrl) {
      setError('Video URL is missing');
      setIsLoading(false);
      return;
    }

    const videoElement = videoRef.current;
    
    const handleCanPlay = () => {
      setIsLoading(false);
      setDuration(videoElement.duration);
      if (autoPlay) {
        videoElement.play().catch(e => {
          console.error('Autoplay prevented:', e);
        });
      }
    };

    const handleError = (e) => {
      console.error('Error loading video:', e);
      setError('Failed to load video. Please try again later.');
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleVolumeChange = () => {
      setVolume(videoElement.volume);
      setIsMuted(videoElement.muted);
    };

    const handleKeyDown = (e) => {
      if (document.activeElement === videoElement || document.activeElement === videoContainerRef.current) {
        switch (e.key.toLowerCase()) {
          case ' ':
          case 'k':
            e.preventDefault();
            togglePlay();
            break;
          case 'f':
            e.preventDefault();
            toggleFullscreen();
            break;
          case 'm':
            e.preventDefault();
            toggleMute();
            break;
          case 'arrowright':
            e.preventDefault();
            skip(10);
            break;
          case 'arrowleft':
            e.preventDefault();
            skip(-10);
            break;
          case 'arrowup':
            e.preventDefault();
            changeVolume(0.1);
            break;
          case 'arrowdown':
            e.preventDefault();
            changeVolume(-0.1);
            break;
          default:
            break;
        }
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('error', handleError);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('ended', handleEnded);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('volumechange', handleVolumeChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    const handleMouseMove = () => {
      setShowControls(true);
      resetControlsTimer();
    };

    videoContainerRef.current.addEventListener('mousemove', handleMouseMove);

    return () => {
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('ended', handleEnded);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('volumechange', handleVolumeChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      
      if (videoContainerRef.current) {
        videoContainerRef.current.removeEventListener('mousemove', handleMouseMove);
      }
      
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, [videoUrl, autoPlay, onEnded]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [videoUrl]);

  const resetControlsTimer = () => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    
    if (isPlaying) {
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(e => {
        console.error('Play prevented:', e);
      });
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
  };

  const changeVolume = (delta) => {
    if (!videoRef.current) return;
    
    const newVolume = Math.max(0, Math.min(1, volume + delta));
    videoRef.current.volume = newVolume;
    if (newVolume > 0 && isMuted) {
      videoRef.current.muted = false;
    }
  };

  const skip = (seconds) => {
    if (!videoRef.current) return;
    
    const newTime = videoRef.current.currentTime + seconds;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, newTime));
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    
    // Fix for Issue #1: Don't use Promise returns in boolean contexts
    if (!document.fullscreenElement) {
      if (videoContainerRef.current.requestFullscreen) {
        videoContainerRef.current.requestFullscreen();
      } else if (videoContainerRef.current.webkitRequestFullscreen) {
        videoContainerRef.current.webkitRequestFullscreen();
      } else if (videoContainerRef.current.msRequestFullscreen) {
        videoContainerRef.current.msRequestFullscreen();
      }
    } else {
      // Fix: Call each method separately without using them in a boolean context
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      } catch (error) {
        console.error('Error exiting fullscreen:', error);
      }
    }
  };

  const changePlaybackRate = (rate) => {
    if (!videoRef.current) return;
    
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00';
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div 
      ref={videoContainerRef}
      className={`relative w-full ${isFullscreen ? 'h-full' : 'aspect-video'} bg-black rounded-lg overflow-hidden group`}
      role="application"
      aria-label="Video Player"
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70 z-10">
          <Spinner size="xl" color="info" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70 z-10">
          <div className="text-center p-4">
            <p className="text-red-500 mb-2">{error}</p>
            <Button 
              color="blue"
              onClick={() => {
                if (videoRef.current) {
                  setIsLoading(true);
                  setError(null);
                  videoRef.current.load();
                }
              }}
              className="mt-2 flex items-center justify-center"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full"
        poster={thumbnailUrl}
        preload="metadata"
        playsInline
        onClick={togglePlay}
        title={title}
      >
        <source src={videoUrl} type="video/mp4" />
        <track kind="captions" src="" label="English" />
        Your browser does not support the video tag.
      </video>

      {/* Fix for Issues #2 and #3: Replace div with proper button that has keyboard support */}
      <button 
        className={`absolute inset-0 w-full h-full bg-transparent border-0 cursor-default focus:outline-none`}
        onClick={togglePlay}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePlay();
          }
        }}
        aria-label={isPlaying ? "Pause video" : "Play video"}
        type="button"
        tabIndex="0"
        style={{ display: 'block' }}
      />

      <div 
        className={`absolute inset-0 transition-opacity duration-300 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="toolbar"
        aria-label="Video controls"
        tabIndex="0"
      >
        <input
          type="range"
          min="0"
          max={duration || 1}
          step="0.01"
          value={currentTime}
          onChange={(e) => {
            if (videoRef.current) {
              videoRef.current.currentTime = parseFloat(e.target.value);
            }
          }}
          className="mx-4 my-2 h-1 bg-gray-600 accent-blue-500 rounded-full overflow-hidden"
          aria-label="Seek video timeline"
        />
        
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <button 
              onClick={togglePlay}
              className="text-white focus:outline-none hover:text-blue-400"
              aria-label={isPlaying ? "Pause" : "Play"}
              type="button"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            
            <div className="flex items-center">
              <button 
                onClick={toggleMute}
                className="text-white focus:outline-none hover:text-blue-400 mr-2"
                aria-label={isMuted ? "Unmute" : "Mute"}
                type="button"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  if (videoRef.current) {
                    videoRef.current.volume = newVolume;
                    if (newVolume > 0 && isMuted) {
                      videoRef.current.muted = false;
                    }
                  }
                }}
                className="w-16 h-1 bg-gray-500 rounded-full accent-blue-500"
                aria-label="Volume control"
              />
            </div>
            
            <div className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button 
                onClick={() => {
                  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
                  const currentIndex = speeds.indexOf(playbackRate);
                  const nextIndex = (currentIndex + 1) % speeds.length;
                  changePlaybackRate(speeds[nextIndex]);
                }}
                className="text-white focus:outline-none hover:text-blue-400 flex items-center"
                aria-label="Change Playback Speed"
                type="button"
              >
                <Settings size={20} />
                <span className="ml-1 text-xs">{playbackRate}x</span>
              </button>
            </div>
            
            <button 
              onClick={toggleFullscreen}
              className="text-white focus:outline-none hover:text-blue-400"
              aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              type="button"
            >
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>
      
      {!isPlaying && !isLoading && !error && (
        <button 
          onClick={togglePlay}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white bg-blue-600 bg-opacity-70 hover:bg-opacity-90 rounded-full p-4 transition-all duration-150"
          aria-label="Play"
          type="button"
        >
          <Play size={32} />
        </button>
      )}
    </div>
  );
};

VideoPlayer.propTypes = {
  videoUrl: PropTypes.string.isRequired,
  thumbnailUrl: PropTypes.string,
  title: PropTypes.string,
  autoPlay: PropTypes.bool,
  onEnded: PropTypes.func
};

export default VideoPlayer;