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
  const [webcamPermission, setWebcamPermission] = useState('pending'); // 'pending', 'granted', 'denied'
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
  
  // Expose functions to parent component via ref
  useImperativeHandle(ref, () => ({
    stopAndUploadRecording: async () => {
      console.log('Stopping and uploading webcam recording...');
      return stopAndUploadRecording();
    }
  }));
  
  // Check webcam permission on component mount
  useEffect(() => {
    checkWebcamPermission();
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAndCleanupWebcam();
    };
  }, []);
  
  // Handle recording state based on video playback state
  useEffect(() => {
    if (webcamPermission === 'granted') {
      if (isVideoPlaying && !isRecording) {
        startRecording();
      } else if (isVideoPlaying && isRecording && isPaused) {
        resumeRecording();
        setIsPaused(false);
      } else if (!isVideoPlaying && isRecording && !isPaused) {
        pauseRecording();
        setIsPaused(true);
      }
    }
  }, [isVideoPlaying, webcamPermission, isRecording, isPaused]);
  
  // This function gets a single label for a device
  const getDeviceLabel = async (deviceId) => {
    try {
      // Request access to the specific device to get its label
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } }
      });
      
      // Get all devices again to get the updated labels
      const devices = await navigator.mediaDevices.enumerateDevices();
      const device = devices.find(d => d.deviceId === deviceId);
      
      // Stop the stream we just created
      stream.getTracks().forEach(track => track.stop());
      
      return device?.label || `Camera ${deviceId.slice(0, 4)}`;
    } catch (error) {
      console.error('Error getting device label:', error);
      return `Camera ${deviceId.slice(0, 4)}`;
    }
  };
  
  // Detect all available video devices with proper labels
  const getVideoDevices = async () => {
    try {
      console.log('Enumerating video devices...');
      
      // First request access to get labels (browsers don't expose labels without permission)
      let initialStream;
      try {
        initialStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        console.error('Error getting initial media stream:', err);
        // Continue anyway, we might still get device IDs without labels
      }
      
      // Now enumerate all devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Available video devices:', videoInputs);
      
      // Stop the initial stream if we have one
      if (initialStream) {
        initialStream.getTracks().forEach(track => track.stop());
      }
      
      // If no labels are available (which can happen), we need to fetch them one by one
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
      
      // If only one device, select it automatically
      if (enhancedDevices.length === 1) {
        setSelectedDeviceId(enhancedDevices[0].deviceId);
        return enhancedDevices;
      } 
      // If multiple devices and none selected yet, show selector
      else if (enhancedDevices.length > 1) {
        // Select the first device by default
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
        // Check if permission was previously granted
        const result = await navigator.permissions.query({ name: 'camera' });
        permissionState = result.state;
        console.log('Camera permission state:', permissionState);
      } catch (err) {
        console.warn('Could not query camera permission:', err);
        // Fall back to showing the permission modal
        setShowPermissionModal(true);
        return;
      }
      
      if (permissionState === 'granted') {
        setWebcamPermission('granted');
        
        // Get available devices
        const devices = await getVideoDevices();
        
        // If we have multiple devices, show the device selector
        if (devices.length > 1) {
          setShowDeviceSelector(true);
        }
        // Setup webcam if we have a device already selected or only one device
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
      
      // Stop the stream right away, we'll create a new one with the selected device
      initialStream.getTracks().forEach(track => track.stop());
      
      console.log('Initial permission granted, retrieving devices');
      
      // Now get all video devices
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
        // Try to use the first device if no device is selected
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
      
      // Stop any existing stream
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
      
      // First try to release any existing streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Try different constraints based on retry count
      let constraints = {};
      
      if (retryCount > 1) {
        // Fallback to basic constraints after multiple retries
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
      mediaRecorderRef.current = new MediaRecorder(streamRef.current);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.start(1000); // Capture in 1-second chunks
      setIsRecording(true);
      setIsPaused(false);
      console.log('Webcam recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      if (onError) onError('Failed to start recording');
    }
  };
  
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        console.log('Webcam recording paused');
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
      } catch (error) {
        console.error('Error resuming recording:', error);
      }
    }
  };
  
  const stopAndUploadRecording = async () => {
    if (!mediaRecorderRef.current) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      const handleStop = async () => {
        try {
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
          reject(error);
        }
      };
      
      if (mediaRecorderRef.current.state !== 'inactive') {
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
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      
      // Generate a unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `webcam-${videoId}-${timestamp}.webm`;
      
      console.log(`Initiating webcam recording upload for video ID: ${videoId} with filename: ${filename}`);
      
      // Request upload URL from backend
      const response = await VideoService.initiateWebcamUpload(videoId, filename);
      
      if (!response?.webcam_upload_url) {
        throw new Error('Failed to get webcam upload URL from server');
      }
      
      console.log('Received upload URL, starting upload to Azure...');
      
      // Upload the recording to Azure Blob Storage
      await VideoService.uploadFileToBlob(
        response.webcam_upload_url,
        new File([recordingBlob], filename, { type: 'video/webm' }),
        (progress) => setUploadProgress(progress)
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
    // Stop recording if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
    
    // Stop and release webcam stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
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
            >
              <SwitchCamera size={16} className="mr-2" />
              <span className="text-sm">Switch camera</span>
            </button>
          )}
          
          {isRecording && !isPaused && (
            <div className="flex items-center bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <div className="h-3 w-3 bg-red-500 rounded-full mr-2 animate-pulse" />
              <span className="text-white text-sm font-medium">Recording</span>
            </div>
          )}
          
          {isRecording && isPaused && (
            <div className="flex items-center bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
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
          Webcam Permission Required
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
              // Only allow canceling if a camera is already set up
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
      
      {/* Troubleshoot modal */}
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
      
      {/* Error message */}
      {uploadError && (
        <Alert color="failure" className="mt-4">
          {uploadError}
        </Alert>
      )}
    </>
  );
});

WebcamRecorder.displayName = 'WebcamRecorder';

WebcamRecorder.propTypes = {
  isVideoPlaying: PropTypes.bool.isRequired,
  videoId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onPermissionChange: PropTypes.func,
  onError: PropTypes.func
};

export default WebcamRecorder;