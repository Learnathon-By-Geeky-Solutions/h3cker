import { useState, useEffect  } from 'react';

/**
 * Custom hook to load and initialize face-api.js library
 */
export const useFaceApiLoader = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  
  useEffect(() => {
    const loadFaceApi = async () => {
      // Skip if already loaded
      if (window.faceapi) {
        setIsLoaded(true);
        return;
      }
      
      try {
        // Load face-api.js script
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
        script.async = true;
        document.body.appendChild(script);
        
        // Wait for script to load
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
        
        console.log('Face API loaded successfully');
        setIsLoaded(true);
      } catch (error) {
        console.error('Error loading face-api.js:', error);
        setIsError(true);
      }
    };
    
    loadFaceApi();
  }, []);
  
  return { isLoaded, isError };
};

/**
 * Custom hook to load face-api.js models
 */
export const useFaceApiModels = (isLibraryLoaded) => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isModelError, setIsModelError] = useState(false);
  
  useEffect(() => {
    // Don't try to load models if library isn't loaded
    if (!isLibraryLoaded || !window.faceapi) return;
    
    const loadModels = async () => {
      try {
        // CDN for pre-trained models
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        
        // Load required models in parallel
        await Promise.all([
          window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);
        
        console.log('Face detection models loaded');
        setIsModelLoaded(true);
      } catch (error) {
        console.error('Error loading face detection models:', error);
        setIsModelError(true);
      }
    };
    
    loadModels();
  }, [isLibraryLoaded]);
  
  return { isModelLoaded, isModelError };
};

/**
 * Custom hook to manage camera access
 */
export const useCameraAccess = () => {
  const [permission, setPermission] = useState('pending');
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  
  // Request camera access
  const requestAccess = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user' 
        } 
      });
      
      setStream(mediaStream);
      setPermission('granted');
      return mediaStream;
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError(err);
      setPermission('denied');
      return null;
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);
  
  return {
    permission,
    stream,
    error,
    requestAccess
  };
};

/**
 * Calculate eye aspect ratio to determine if eyes are open
 */
export const calculateEyeAspectRatio = (eye) => {
  if (!eye || eye.length < 6) return 0;
  
  // Vertical eye landmarks distances
  const v1 = Math.sqrt(
    Math.pow(eye[1].x - eye[5].x, 2) + 
    Math.pow(eye[1].y - eye[5].y, 2)
  );
  
  const v2 = Math.sqrt(
    Math.pow(eye[2].x - eye[4].x, 2) + 
    Math.pow(eye[2].y - eye[4].y, 2)
  );
  
  // Horizontal eye landmark distance
  const h = Math.sqrt(
    Math.pow(eye[0].x - eye[3].x, 2) + 
    Math.pow(eye[0].y - eye[3].y, 2)
  );
  
  // Return eye aspect ratio
  return h === 0 ? 0 : (v1 + v2) / (2 * h);
};