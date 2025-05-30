import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Alert, Select } from 'flowbite-react';
import { Camera, CameraOff, Info, RefreshCw, SwitchCamera } from 'lucide-react';
import VideoService from '../../../utils/VideoService';

const WebcamRecorder = forwardRef(({ 
  isVideoPlaying, 
  videoId,
  onPermissionChange,
  onError
}, ref) => {
  const [webcamPermission, setWebcamPermission] = useState('pending'); 
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [deviceError, setDeviceError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showTroubleshootModal, setShowTroubleshootModal] = useState(false);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const recordingTimeoutRef = useRef(null);
  

  useImperativeHandle(ref, () => ({
    stopAndUploadRecording: async () => {
      console.log('Stopping and uploading webcam recording...');
      return stopAndUploadRecording();
    }
  }));
  
  useEffect(() => {
    checkWebcamPermission();
    
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, []);
  

  useEffect(() => {
    return () => {
      stopAndCleanupWebcam();
    };
  }, []);
  

  useEffect(() => {
    if (webcamPermission === 'granted') {
      if (isVideoPlaying && !isRecording) {
        startRecording();
      } else if (isVideoPlaying && isRecording && isPaused) {
        resumeRecording();
      } else if (!isVideoPlaying && isRecording && !isPaused) {
        pauseRecording();
      }
    }
  }, [isVideoPlaying, webcamPermission, isRecording, isPaused]);
  
  // This function gets a single label for a device
  const getDeviceLabel = async (deviceId) => {
    try {

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } }
      });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const device = devices.find(d => d.deviceId === deviceId);
      
      stream.getTracks().forEach(track => track.stop());
      
      return device?.label || `Camera ${deviceId.slice(0, 4)}`;
    } catch (error) {
      console.error('Error getting device label:', error);
      return `Camera ${deviceId.slice(0, 4)}`;
    }
  };
  
 
  const getVideoDevices = async () => {
    try {
      console.log('Enumerating video devices...');
      
  
      let initialStream;
      try {
        initialStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        console.error('Error getting initial media stream:', err);
     
      }
      
      // enumerate all devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Available video devices:', videoInputs);
      
      if (initialStream) {
        initialStream.getTracks().forEach(track => track.stop());
      }
      
   
      const enhancedDevices = await Promise.all(
        videoInputs.map(async (device) => {
          if (!device.label) {
            const label = await getDeviceLabel(device.deviceId);
            return { ...device, label };
          }
          return device;
        })
      );
      
      console.log('Enhanced video devices with labels:', enhancedDevices);
      setVideoDevices(enhancedDevices);

      if (enhancedDevices.length === 1) {
        setSelectedDeviceId(enhancedDevices[0].deviceId);
        return enhancedDevices;
      } 
    
      else if (enhancedDevices.length > 1) {
       
        if (!selectedDeviceId) {
          setSelectedDeviceId(enhancedDevices[0].deviceId);
        }
        setShowDeviceSelector(true);
        return enhancedDevices;
      }
      
      return enhancedDevices;
    } catch (error) {
      console.error('Error enumerating devices:', error);
      return [];
    }
  };
  
  const checkWebcamPermission = async () => {
    try {
      console.log('Checking webcam permission...');
      
      let permissionState;
      try {

        const result = await navigator.permissions.query({ name: 'camera' });
        permissionState = result.state;
        console.log('Camera permission state:', permissionState);
      } catch (err) {
        console.warn('Could not query camera permission:', err);
        setShowPermissionModal(true);
        return;
      }
      
      if (permissionState === 'granted') {
        setWebcamPermission('granted');
 
        const devices = await getVideoDevices();
        
      
        if (devices.length > 1) {
          setShowDeviceSelector(true);
        }
       
        else if (selectedDeviceId || devices.length === 1) {
          try {
            await setupWebcam(selectedDeviceId || devices[0]?.deviceId);
          } catch (deviceErr) {
            handleDeviceError(deviceErr);
          }
        }
        
        if (onPermissionChange) onPermissionChange('granted');
      } else if (permissionState === 'prompt') {
        // Show permission modal if we need to ask
        setShowPermissionModal(true);
      } else {
        setWebcamPermission('denied');
        if (onPermissionChange) onPermissionChange('denied');
      }
    } catch (error) {
      console.error('Error in checkWebcamPermission:', error);
      // Fallback to showing the permission modal
      setShowPermissionModal(true);
    }
  };
  
  const requestWebcamPermission = async () => {
    try {
      console.log('Requesting webcam permission...');
      
      // First just try to get access to any camera to get permission
      const initialStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      initialStream.getTracks().forEach(track => track.stop());
      
      console.log('Initial permission granted, retrieving devices');
      
 
      const devices = await getVideoDevices();
      
      if (devices.length > 0) {
        setWebcamPermission('granted');
        setShowPermissionModal(false);
        
        if (devices.length === 1) {
          // Only one camera, use it
          console.log('Only one camera detected, using it automatically');
          setSelectedDeviceId(devices[0].deviceId);
          await setupWebcam(devices[0].deviceId);
          if (onPermissionChange) onPermissionChange('granted');
        } else {
          // Multiple cameras, show selector
          console.log('Multiple cameras detected, showing selection dialog');
          setShowDeviceSelector(true);
          if (onPermissionChange) onPermissionChange('granted');
        }
      } else {
        throw new Error('No camera devices found');
      }
    } catch (error) {
      console.error('Error requesting webcam:', error);
      
      if (error.name === 'NotAllowedError') {
        setWebcamPermission('denied');
        if (onPermissionChange) onPermissionChange('denied');
      } else {
        handleDeviceError(error);
      }
    }
  };
  
  const handleDeviceError = (error) => {
    console.error('Device error:', error);
    let errorMessage = 'Unknown error accessing webcam.';
    
    if (error.name === 'NotReadableError') {
      errorMessage = 'Could not start video source. Your camera may be in use by another application.';
    } else if (error.name === 'OverconstrainedError') {
      errorMessage = 'The requested camera settings are not supported by your device.';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No camera was found on your device or the camera is disabled.';
    } else if (error.name === 'AbortError') {
      errorMessage = 'Camera access was aborted.';
    } else if (error.name === 'SecurityError') {
      errorMessage = 'Camera access was blocked due to security restrictions.';
    } else if (error.name === 'TypeError') {
      errorMessage = 'Invalid constraints were used to access your camera.';
    }
    
    setDeviceError(errorMessage);
    setShowTroubleshootModal(true);
  };
  
  const retryWebcamSetup = async () => {
    setRetryCount(prev => prev + 1);
    setDeviceError(null);
    setShowTroubleshootModal(false);
    
    try {
      // Stop any existing streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Wait a moment before retry
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Re-check devices (in case any were connected/disconnected)
      const devices = await getVideoDevices();
      
      if (devices.length > 0) {
  
        const deviceId = selectedDeviceId || devices[0].deviceId;
        await setupWebcam(deviceId);
        setWebcamPermission('granted');
        if (onPermissionChange) onPermissionChange('granted');
      } else {
        throw new Error('No camera devices found');
      }
    } catch (error) {
      console.error('Retry failed:', error);
      handleDeviceError(error);
    }
  };
  
  const handleDeviceSelection = async (deviceId) => {
    try {
      console.log('Selecting device:', deviceId);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      setSelectedDeviceId(deviceId);
      await setupWebcam(deviceId);
      setShowDeviceSelector(false);
    } catch (error) {
      console.error('Error switching camera:', error);
      handleDeviceError(error);
    }
  };
  
  const setupWebcam = async (deviceId) => {
    if (!deviceId) {
      console.error('No device ID provided to setupWebcam');
      return;
    }
    
    try {
      console.log('Setting up webcam with device ID:', deviceId);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      

      let constraints = {};
      
      if (retryCount > 1) {
    
        constraints = { 
          video: { deviceId: { exact: deviceId } },
          audio: true 
        };
      } else {
        constraints = {
          video: {
            deviceId: { exact: deviceId },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: true
        };
      }
      
      console.log('Attempting to access webcam with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = stream;
      
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error('Error accessing webcam:', error);
      throw error;
    }
  };
  
  const startRecording = () => {
    if (!streamRef.current) {
      console.error('Cannot start recording: No active stream');
      return;
    }
    
    try {
  
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
      }
      

      chunksRef.current = [];
      
      // Create a new MediaRecorder
      const options = { videoBitsPerSecond: 2500000 }; // 2.5 Mbps
  
      try {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
          options.mimeType = 'video/webm;codecs=vp9,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
          options.mimeType = 'video/webm;codecs=vp8,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          options.mimeType = 'video/webm';
        }
      } catch (e) {
        console.warn('Error checking codec support:', e);
      }
      
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        if (onError) onError('Recording error: ' + (event.error?.message || 'Unknown error'));
      };
      
      // Start recording with 1-second chunks
      mediaRecorderRef.current.start(1000);
      
      // Set state to recording
      setIsRecording(true);
      setIsPaused(false);
      console.log('Webcam recording started');
      
      // Schedule a recording restart after 60 seconds to prevent potential browser bugs
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      
      recordingTimeoutRef.current = setTimeout(() => {
        if (isRecording && !isPaused && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('Restarting recording to prevent browser issues...');
          
          mediaRecorderRef.current.stop();
          
          // Start a new recorder after a short delay
          setTimeout(() => {
            if (streamRef.current && isVideoPlaying) {
              startRecording();
            }
          }, 500);
        }
      }, 60000); // 60 seconds
      
    } catch (error) {
      console.error('Error starting recording:', error);
      if (onError) onError('Failed to start recording: ' + error.message);
    }
  };
  
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        console.log('Webcam recording paused');
       
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current);
          recordingTimeoutRef.current = null;
        }
      } catch (error) {
        console.error('Error pausing recording:', error);
      }
    }
  };
  
  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      try {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        console.log('Webcam recording resumed');
        
        // Restart the timeout for auto-restart mechanism
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current);
        }
        
        recordingTimeoutRef.current = setTimeout(() => {
          if (isRecording && !isPaused && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log('Restarting recording to prevent browser issues...');
            
            // Stop the current recorder
            mediaRecorderRef.current.stop();
            
            // Start a new recorder after a short delay
            setTimeout(() => {
              if (streamRef.current && isVideoPlaying) {
                startRecording();
              }
            }, 500);
          }
        }, 60000); // 60 seconds
      } catch (error) {
        console.error('Error resuming recording:', error);
      }
    }
  };
  
  const stopAndUploadRecording = async () => {
    // Clear any existing timeouts
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    
    if (!mediaRecorderRef.current) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      const handleStop = async () => {
        try {
          // Wait a short delay to ensure all chunks are processed
          await new Promise(r => setTimeout(r, 500));
          
          // Create a new Blob from all chunks
          const recordingBlob = new Blob(chunksRef.current, { type: 'video/webm' });
          
          // Only upload if we have actual content
          if (recordingBlob.size > 0) {
            console.log(`Recording stopped with ${chunksRef.current.length} chunks, size: ${recordingBlob.size} bytes`);
            await uploadRecording(recordingBlob);
            resolve();
          } else {
            console.log('No recording data to upload');
            resolve();
          }
        } catch (error) {
          console.error('Error processing recording:', error);
          if (error instanceof Error) {
            reject(error);
          } else {
            reject(new Error(String(error || 'Unknown error processing recording')));
          }
        }
      };
      
      if (mediaRecorderRef.current.state !== 'inactive') {
        // Ensure we get all remaining data
        if (mediaRecorderRef.current.state === 'paused') {
          try {
            mediaRecorderRef.current.resume();
          } catch (e) {
            console.warn('Error resuming paused recorder before stopping', e);
          }
        }
        
        // Request a final data chunk
        try {
          if (typeof mediaRecorderRef.current.requestData === 'function') {
            mediaRecorderRef.current.requestData();
          }
        } catch (e) {
          console.warn('Error requesting final data from recorder', e);
        }
        
        mediaRecorderRef.current.onstop = handleStop;
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setIsPaused(false);
        console.log('Stopping webcam recording');
      } else {
        console.log('MediaRecorder already inactive');
        resolve();
      }
    });
  };
  
  const uploadRecording = async (recordingBlob) => {
    if (!videoId) {
      console.error('Missing videoId for upload');
      return;
    }
    
    try {
      // Validate blob has content
      if (!recordingBlob || recordingBlob.size === 0) {
        console.error('Empty recording blob, cannot upload');
        if (onError) onError('Recording failed: No data was captured');
        return;
      }
      
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      
      // Generate a unique filename with timestamp and random ID
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const randomId = Math.random().toString(36).substring(2, 10);
      const filename = `webcam-${videoId}-${timestamp}-${randomId}.webm`;
      
      console.log(`Initiating webcam recording upload for video ID: ${videoId} with filename: ${filename}`);
      
      // Request upload URL from backend
      const response = await VideoService.initiateWebcamUpload(videoId, filename);
      
      if (!response?.upload_url) {
        throw new Error('Failed to get webcam upload URL from server');
      }
      
      console.log('Received upload URL, starting upload to Azure...');
      
      // Create File object with explicit MIME type
      const fileToUpload = new File([recordingBlob], filename, { 
        type: recordingBlob.type || 'video/webm',
        lastModified: new Date().getTime()
      });
      
      // Upload the recording with chunked upload for better reliability
      await VideoService.uploadFileToBlob(
        response.upload_url,
        fileToUpload,
        (progress) => {
          console.log(`Upload progress: ${progress}%`);
          setUploadProgress(progress);
        }
      );
      
      console.log('Webcam recording uploaded successfully');
      setIsUploading(false);
    } catch (error) {
      console.error('Error uploading recording:', error);
      setUploadError('Failed to upload recording. Please try again.');
      setIsUploading(false);
      if (onError) onError('Upload failed: ' + error.message);
    }
  };
  
  const stopAndCleanupWebcam = () => {
    // Clear recording timeout
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    
    // Stop recording if active
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
      } catch (e) {
        console.error('Error stopping MediaRecorder during cleanup:', e);
      }
      setIsRecording(false);
      setIsPaused(false);
    }
    
    // Stop and release webcam stream
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.warn('Error stopping track:', e);
          }
        });
        streamRef.current = null;
      } catch (e) {
        console.error('Error stopping stream during cleanup:', e);
      }
    }
    
    // Clear webcam element src
    if (webcamRef.current) {
      webcamRef.current.srcObject = null;
    }
    
    // Clear chunks
    chunksRef.current = [];
  };
  
  const handleDenyPermission = () => {
    setWebcamPermission('denied');
    setShowPermissionModal(false);
    if (onPermissionChange) onPermissionChange('denied');
  };
  
  // Handle the toggle camera button click
  const toggleCameraSelector = () => {
    setShowDeviceSelector(true);
  };

  return (
    <>
      {/* Webcam video element (hidden) */}
      <video 
        ref={webcamRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />
      
      {/* Recording indicator and camera switch button */}
      {webcamPermission === 'granted' && !deviceError && (
        <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
          {videoDevices.length > 1 && (
            <button 
              onClick={toggleCameraSelector}
              className="flex items-center bg-gray-900/70 backdrop-blur-sm px-3 py-1.5 rounded-full text-white hover:bg-gray-800/80 transition-colors"
              title="Change camera"
              type="button"
            >
              <SwitchCamera size={16} className="mr-2" />
              <span className="text-sm">Switch camera</span>
            </button>
          )}
          
          {isRecording && !isPaused && (
            <div className="flex items-center bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <div className="h-3 w-3 bg-red-500 rounded-full mr-2 animate-pulse" />
              <span className="text-white text-sm font-medium">Recording</span>
            </div>
          )}
          
          {isRecording && isPaused && (
            <div className="flex items-center bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <div className="h-3 w-3 bg-yellow-500 rounded-full mr-2" />
              <span className="text-white text-sm font-medium">Paused</span>
            </div>
          )}
        </div>
      )}
      
      {/* Upload progress overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
          <div className="max-w-md w-full p-6 bg-gray-800 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-4">Uploading Recording</h3>
            <div className="mb-4">
              <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-white mt-2 text-center">{Math.round(uploadProgress)}%</p>
            </div>
            <Alert color="warning">
              <div className="flex items-center">
                <Info className="h-4 w-4 mr-2" />
                <span>Please don't close this window until upload completes</span>
              </div>
            </Alert>
          </div>
        </div>
      )}
      
      {/* Permission request modal */}
      <Modal
        show={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        size="md"
        dismissible={false}
      >
        <Modal.Header className="bg-gray-800 text-white border-b border-gray-700">
          <p className="text-white">
          Webcam Permission Required
          </p>
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-gray-300">
          <div className="flex flex-col items-center">
            <Camera size={48} className="text-blue-400 mb-4" />
            <p className="mb-4 text-center">
              This video requires webcam recording during playback. 
              Your recording will be uploaded after the video completes.
            </p>
            <Alert color="info" className="mb-4">
              <p>You can still watch the video if you choose not to allow webcam access.</p>
            </Alert>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-gray-800 border-t border-gray-700 flex justify-between">
          <Button
            color="gray"
            onClick={handleDenyPermission}
          >
            <CameraOff className="mr-2 h-5 w-5" />
            Don't Allow
          </Button>
          <Button
            color="blue"
            onClick={requestWebcamPermission}
          >
            <Camera className="mr-2 h-5 w-5" />
            Allow Webcam
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Camera device selector modal */}
      <Modal
        show={showDeviceSelector}
        onClose={() => {
          // Only allow closing if a camera is already selected and working
          if (streamRef.current) {
            setShowDeviceSelector(false);
          }
        }}
        size="md"
        dismissible={!!streamRef.current}
      >
        <Modal.Header className="bg-gray-800 text-white border-b border-gray-700">
          Select Camera
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-gray-300">
          <div className="flex flex-col">
            <p className="mb-4">
              Multiple cameras detected. Please select which camera you want to use for recording:
            </p>
            
            {videoDevices.length > 0 ? (
              <div className="mb-4">
                <Select
                  id="camera-selector"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="bg-gray-700 text-white border-gray-600"
                >
                  {videoDevices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <Alert color="warning">
                <p>No cameras detected. Please check your device connections.</p>
              </Alert>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-gray-800 border-t border-gray-700 flex justify-between">
          <Button
            color="gray"
            onClick={() => {
              if (streamRef.current) {
                setShowDeviceSelector(false);
              } else {
                setWebcamPermission('denied');
                if (onPermissionChange) onPermissionChange('denied');
                setShowDeviceSelector(false);
              }
            }}
          >
            {streamRef.current ? 'Cancel' : 'Continue Without Camera'}
          </Button>
          <Button
            color="blue"
            onClick={() => handleDeviceSelection(selectedDeviceId)}
            disabled={!selectedDeviceId}
          >
            <Camera className="mr-2 h-5 w-5" />
            Use Selected Camera
          </Button>
        </Modal.Footer>
      </Modal>
      
      <Modal
        show={showTroubleshootModal}
        onClose={() => setShowTroubleshootModal(false)}
        size="md"
      >
        <Modal.Header className="bg-gray-800 text-white border-b border-gray-700">
          Camera Access Problem
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-gray-300">
          <div className="flex flex-col">
            <Alert color="failure" className="mb-4">
              <p>{deviceError || 'Could not access your camera.'}</p>
            </Alert>
            
            <h4 className="text-white font-medium mb-2">Troubleshooting Steps:</h4>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-4">
              <li>Close other applications that might be using your camera (like Zoom, Teams, etc.)</li>
              <li>Check your browser permissions to ensure camera access is allowed</li>
              <li>Try refreshing the page</li>
              <li>Make sure your camera is properly connected and not disabled in device settings</li>
              <li>If using an external webcam, try disconnecting and reconnecting it</li>
              <li>Try selecting a different camera if you have multiple cameras</li>
            </ul>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-gray-800 border-t border-gray-700 flex justify-between">
          <Button
            color="gray"
            onClick={() => {
              setShowTroubleshootModal(false);
              setWebcamPermission('denied');
              if (onPermissionChange) onPermissionChange('denied');
            }}
          >
            <CameraOff className="mr-2 h-5 w-5" />
            Continue Without Camera
          </Button>
          <div className="flex gap-2">
            {videoDevices.length > 1 && (
              <Button
                color="light"
                onClick={() => {
                  setShowTroubleshootModal(false);
                  setShowDeviceSelector(true);
                }}
              >
                <SwitchCamera className="mr-2 h-5 w-5" />
                Switch Camera
              </Button>
            )}
            <Button
              color="blue"
              onClick={retryWebcamSetup}
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Retry
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
      
      {uploadError && (
        <Alert color="failure" className="mt-4">
          {uploadError}
        </Alert>
      )}
    </>
  );
});

//global error handler to catch any issues with MediaRecorder
window.addEventListener('error', (event) => {
  if (event.error && event.error.message && event.error.message.includes('MediaRecorder')) {
    console.error('Global MediaRecorder error:', event.error);
  }
});

WebcamRecorder.displayName = 'WebcamRecorder';

WebcamRecorder.propTypes = {
  isVideoPlaying: PropTypes.bool.isRequired,
  videoId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onPermissionChange: PropTypes.func,
  onError: PropTypes.func
};

export default WebcamRecorder;