import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Spinner } from 'flowbite-react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import WebcamRecorder from './WebcamRecorder';

const BUFFER_AHEAD = 30; 
const BUFFER_BEHIND = 10; 
const VideoPlayer = ({ videoUrl, thumbnailUrl, title, autoPlay = false, onEnded, onPlay, videoId }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [playbackStarted, setPlaybackStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRecordingPausedIndicator, setShowRecordingPausedIndicator] = useState(false);
  const [webcamPermissionState, setWebcamPermissionState] = useState(null);

  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const webcamRecorderRef = useRef(null);
  
  const bufferCache = useRef({});
  const segmentsLoaded = useRef(new Set());
  const lastBufferCheck = useRef(0);

  useEffect(() => {
    if (!videoUrl) {
      setError('Video URL is missing');
      setIsLoading(false);
      return;
    }

    const videoElement = videoRef.current;
    if (!videoElement) return;

    const manageBufferCache = () => {
      const segmentsToRemove = [];
      segmentsLoaded.current.forEach(segKey => {
        const [, end] = segKey.split('-').map(Number);
        if (end < currentTime - BUFFER_BEHIND) {
          segmentsToRemove.push(segKey);
        }
      });
      
      segmentsToRemove.forEach(key => {
        segmentsLoaded.current.delete(key);
        delete bufferCache.current[key];
        console.log(`Removed segment: ${key} from buffer cache`);
      });
    };

    const handleProgress = () => {
      if (videoElement.buffered.length > 0) {
        for (let i = 0; i < videoElement.buffered.length; i++) {
          const start = videoElement.buffered.start(i);
          const end = videoElement.buffered.end(i);
          const segKey = `${Math.floor(start)}-${Math.floor(end)}`;
          
          if (!segmentsLoaded.current.has(segKey)) {
            bufferCache.current[segKey] = true;
            segmentsLoaded.current.add(segKey);
            console.log(`Buffered segment: ${segKey}`);
          }
        }
      }
      
      const now = Date.now();
      if (now - lastBufferCheck.current > 2000) {
        lastBufferCheck.current = now;
        manageBufferCache();
      }
    };

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
      
      // Handle webcam recording completion when video ends
      handleVideoComplete();
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (!playbackStarted && onPlay) {
        setPlaybackStarted(true);
        onPlay();
      }
      
      // Hide paused indicator when video plays
      setShowRecordingPausedIndicator(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
      
      // Show paused indicator when video is paused
      if (webcamPermissionState === 'granted') {
        setShowRecordingPausedIndicator(true);
      }
    };

    const handleVolumeChange = () => {
      setVolume(videoElement.volume);
      setIsMuted(videoElement.muted);
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
    videoElement.addEventListener('progress', handleProgress);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
      
    const handleMouseMove = () => {
      setShowControls(true);
      resetControlsTimer();
    };

    if (videoContainerRef.current) {
      videoContainerRef.current.addEventListener('mousemove', handleMouseMove);
    }

    // Handle page unload to ensure recording is saved
    const handleBeforeUnload = (e) => {
      if (webcamPermissionState === 'granted' && isPlaying) {
        // Notify the user that navigating away might lose their recording
        e.preventDefault();
        e.returnValue = 'Recording in progress - are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('ended', handleEnded);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('volumechange', handleVolumeChange);
      videoElement.removeEventListener('progress', handleProgress);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (videoContainerRef.current) {
        videoContainerRef.current.removeEventListener('mousemove', handleMouseMove);
      }
      
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
      
      segmentsLoaded.current.clear();
      Object.keys(bufferCache.current).forEach(key => {
        delete bufferCache.current[key];
      });
    };
  }, [videoUrl, autoPlay, onEnded, onPlay, playbackStarted, currentTime, webcamPermissionState, isPlaying]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setPlaybackStarted(false);
    
    segmentsLoaded.current.clear();
    Object.keys(bufferCache.current).forEach(key => {
      delete bufferCache.current[key];
    });
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

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      if (videoContainerRef.current.requestFullscreen) {
        videoContainerRef.current.requestFullscreen();
      } else if (videoContainerRef.current.webkitRequestFullscreen) {
        videoContainerRef.current.webkitRequestFullscreen();
      } else if (videoContainerRef.current.msRequestFullscreen) {
        videoContainerRef.current.msRequestFullscreen();
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00';
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  // Handle webcam permission change
  const handleWebcamPermissionChange = (state) => {
    setWebcamPermissionState(state);
  };
  
  // Handle recording error
  const handleRecordingError = (errorMessage) => {
    console.error('Recording error:', errorMessage);
    // We don't need to stop video playback on recording error,
    // just log the error and allow the video to continue playing
  };
  
  // Handle video complete (end of playback or user navigating away)
  const handleVideoComplete = async () => {
    try {
      if (webcamRecorderRef.current?.stopAndUploadRecording) {
        // This will be called from the WebcamRecorder's ref
        await webcamRecorderRef.current.stopAndUploadRecording();
      }
    } catch (error) {
      console.error('Error processing recording on video completion:', error);
    }
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
     
      {videoId && (
        <WebcamRecorder
          ref={webcamRecorderRef}
          isVideoPlaying={isPlaying}
          videoId={videoId}
          onPermissionChange={handleWebcamPermissionChange}
          onError={handleRecordingError}
        />
      )}

      {showRecordingPausedIndicator && (
        <div className="absolute top-4 left-4 z-20 flex items-center bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <div className="h-3 w-3 bg-yellow-500 rounded-full mr-2" />
          <span className="text-white text-sm font-medium">Recording paused</span>
        </div>
      )}

      <button 
        className="absolute inset-0 w-full h-full bg-transparent border-0 cursor-default focus:outline-none"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause video" : "Play video"}
        type="button"
        tabIndex="0"
      />

      <div
        className={`absolute inset-0 transition-opacity duration-300 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
    
          if (e.key === ' ' || e.key === 'Enter') {
             e.stopPropagation(); 
          }
        }}
        role="toolbar"
        aria-label="Video controls"
        tabIndex="-1" 
      >
        <div className="mx-4 my-2 h-1 bg-gray-600 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500" 
            style={{ width: `${(currentTime / duration) * 100}%` }} 
            aria-label="Video progress"
          />
        </div>
        
     
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
          
          <div>
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
  onEnded: PropTypes.func,
  onPlay: PropTypes.func,
  videoId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default VideoPlayer;