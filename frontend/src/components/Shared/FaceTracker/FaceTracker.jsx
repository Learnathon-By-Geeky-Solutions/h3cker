import React, { useEffect, useRef, useState, memo } from 'react';
import PropTypes from 'prop-types';
import { AlertCircle } from 'lucide-react';
import { useFaceApiLoader, useFaceApiModels, useCameraAccess, calculateEyeAspectRatio } from './faceTrackerHooks';

/**
 * FaceTracker component for ad evaluation
 * Optimized to reduce complexity and fix black screen issues
 */
const FaceTracker = ({ onTrackingData, isActive, onPermissionGranted, videoElement }) => {
  // Skip initialization if not active
  if (!isActive) return null;
  
  // External hooks for better separation of concerns
  const { isLoaded: isFaceApiLoaded } = useFaceApiLoader();
  const { isModelLoaded } = useFaceApiModels(isFaceApiLoaded);
  const { permission, requestAccess } = useCameraAccess();
  
  // Component state
  const [isLoading, setIsLoading] = useState(true);
  const [faceDetected, setFaceDetected] = useState(false);
  const [eyesOpen, setEyesOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(permission === 'pending');
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  
  // Tracking metrics
  const watchingTimeRef = useRef(0);
  const totalTimeRef = useRef(0);
  const lastUpdateTimeRef = useRef(Date.now());
  
  // Load video stream after permission granted
  useEffect(() => {
    if (permission === 'granted' && videoRef.current) {
      requestAccess().then(stream => {
        if (stream && videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        setIsLoading(false);
        if (onPermissionGranted) onPermissionGranted();
      });
    }
  }, [permission, requestAccess, onPermissionGranted]);
  
  // Start face detection when models are loaded
  useEffect(() => {
    if (!isFaceApiLoaded || !isModelLoaded || permission !== 'granted') {
      return;
    }
    
    let intervalId = null;
    const startDetection = () => {
      // Update tracking metrics at regular intervals
      intervalId = setInterval(() => {
        const now = Date.now();
        const deltaTime = (now - lastUpdateTimeRef.current) / 1000; // in seconds
        lastUpdateTimeRef.current = now;
        
        totalTimeRef.current += deltaTime;
        if (faceDetected && eyesOpen) {
          watchingTimeRef.current += deltaTime;
        }
        
        // Calculate watch percentage
        const watchPercentage = totalTimeRef.current > 0 
          ? Math.round((watchingTimeRef.current / totalTimeRef.current) * 100) 
          : 0;
          
        // Send tracking data to parent component
        if (onTrackingData) {
          onTrackingData({
            faceDetected,
            eyesOpen,
            watchPercentage,
            watchTime: Math.round(watchingTimeRef.current),
            totalTime: Math.round(totalTimeRef.current)
          });
        }
      }, 1000);
      
      // Start detection loop
      detectFace();
    };
    
    const detectFace = async () => {
      if (!videoRef.current || !canvasRef.current) {
        requestRef.current = requestAnimationFrame(detectFace);
        return;
      }
      
      try {
        // Run detection if video is ready
        if (videoRef.current.readyState === 4) {
          const detections = await window.faceapi
            .detectAllFaces(videoRef.current, new window.faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks();
          
          // Clear canvas and draw new detections
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Check if face detected
          const isFaceDetected = detections.length > 0;
          setFaceDetected(isFaceDetected);
          
          if (isFaceDetected) {
            // Draw face detection box
            window.faceapi.draw.drawDetections(canvasRef.current, detections);
            
            // Get landmarks and check eye state
            const landmarks = detections[0].landmarks;
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();
            
            // Calculate eye aspect ratios
            const leftEAR = calculateEyeAspectRatio(leftEye);
            const rightEAR = calculateEyeAspectRatio(rightEye);
            const avgEAR = (leftEAR + rightEAR) / 2;
            
            // Determine if eyes are open
            const eyesAreOpen = avgEAR > 0.2;
            setEyesOpen(eyesAreOpen);
            
            // Control video playback
            if (videoElement?.current) {
              try {
                if (eyesAreOpen && videoElement.current.paused) {
                  videoElement.current.play().catch(e => console.log('Play error:', e));
                } else if (!eyesAreOpen && !videoElement.current.paused) {
                  videoElement.current.pause();
                }
              } catch (err) {
                console.error('Video control error:', err);
              }
            }
            
            // Draw eye state indicator
            ctx.font = '12px Arial';
            ctx.fillStyle = eyesAreOpen ? 'green' : 'red';
            ctx.fillText(eyesAreOpen ? 'Watching' : 'Look', 5, 15);
          } else {
            setEyesOpen(false);
            
            // Pause video if no face detected
            if (videoElement?.current && !videoElement.current.paused) {
              try {
                videoElement.current.pause();
              } catch (err) {
                console.error('Video pause error:', err);
              }
            }
          }
        }
      } catch (err) {
        console.error('Face detection error:', err);
      }
      
      // Continue detection loop
      requestRef.current = requestAnimationFrame(detectFace);
    };
    
    // Start the detection process
    setIsLoading(false);
    startDetection();
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isFaceApiLoaded, isModelLoaded, permission, faceDetected, eyesOpen, onTrackingData, videoElement]);
  
  // Render permission warning
  const renderWarning = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md text-center">
        <AlertCircle className="mx-auto mb-4 text-yellow-400" size={48} />
        <h3 className="text-xl font-bold mb-2 text-white">Ad Evaluation Requires Camera</h3>
        <p className="text-gray-300 mb-4">
          This platform uses your camera to track if you're watching the video.
          The video will play only when you're looking at it.
        </p>
        <p className="text-gray-300 mb-6 text-sm">
          <strong>Note:</strong> Your video feed is processed locally and never recorded or stored.
        </p>
        <div className="flex gap-3 justify-center">
          <button 
            onClick={() => {
              setShowWarning(false);
              requestAccess();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
            type="button"
          >
            Allow Camera
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
  
  // Render tracker UI
  const renderTracker = () => (
    <div className="relative">
      <video 
        ref={videoRef}
        id="faceTrackingVideo"
        autoPlay
        playsInline
        muted
        width="320"
        height="240"
        className="hidden"
      ></video>
      
      <canvas 
        ref={canvasRef}
        id="faceDetectionCanvas"
        width="160"
        height="120"
        className="absolute top-2 right-2 w-16 h-12 rounded-md bg-black bg-opacity-30 z-10"
      ></canvas>
      
      {isLoading && (
        <div className="absolute top-2 right-2 w-16 h-12 flex items-center justify-center bg-black bg-opacity-50 rounded-md z-20">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {faceDetected && (
        <div className={`absolute top-2 right-20 ${eyesOpen ? 'bg-green-500' : 'bg-yellow-500'} text-white text-xs px-2 py-1 rounded-full z-10`}>
          {eyesOpen ? 'Watching' : 'Look at Screen'}
        </div>
      )}
    </div>
  );
  
  // Render component
  return (
    <div className="face-tracker">
      {showWarning && renderWarning()}
      {permission === 'granted' && renderTracker()}
    </div>
  );
};

FaceTracker.propTypes = {
  onTrackingData: PropTypes.func,
  isActive: PropTypes.bool,
  onPermissionGranted: PropTypes.func,
  videoElement: PropTypes.object
};

FaceTracker.defaultProps = {
  isActive: false
};

// Use memo to prevent unnecessary re-renders
export default memo(FaceTracker);