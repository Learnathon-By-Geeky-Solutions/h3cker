import React, { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Alert, Select } from 'flowbite-react';
import { Camera, CameraOff, Info, RefreshCw, SwitchCamera, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VideoService from '../../../utils/VideoService';
import { FaceTracker } from '../../../utils/FaceTracker';
import { useToast } from '../../../utils/ToastService';

const STORAGE_KEY = 'wc_recording_indicator_visible';
const CONSENT_KEY = 'wc_webcam_consent';
const FACE_PRE_CHECK_MS = 5000;
const FACE_MISSED_THRESHOLD = 3;

const WebcamRecorder = forwardRef(({ 
  isVideoPlaying, 
  videoId,
  onPermissionChange,
  onError,
  showControls,
  onFaceBlockedChange,
}, ref) => {
  const navigate = useNavigate();
  const { toasts, addToast, dismissToast, clearToasts } = useToast();
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
  const [showRecordingIndicator, setShowRecordingIndicator] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [faceTrackerReady, setFaceTrackerReady] = useState(false);
  const [faceTrackerFailed, setFaceTrackerFailed] = useState(false);
  const [facePreCheckDone, setFacePreCheckDone] = useState(false);
  const [faceAway, setFaceAway] = useState(false);
  const [hasExistingRecording, setHasExistingRecording] = useState(false);
  
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const recordingTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  const recordingCompletedRef = useRef(false);
  const faceTrackerRef = useRef(null);
  const facePreCheckTimerRef = useRef(null);
  const faceWasMetRef = useRef(true);
  const facePreCheckDoneRef = useRef(false);
  const handleFaceResultRef = useRef(null);
  const faceAwayRef = useRef(false);
  const awayToastIdRef = useRef(null);
  const preCheckToastIdRef = useRef(null);
  const missedFramesRef = useRef(0);
  

  useImperativeHandle(ref, () => ({
    stopAndUploadRecording: async () => {
      console.log('Stopping and uploading webcam recording...');
      return stopAndUploadRecording();
    }
  }));
  
  const getStoredConsent = () => {
    try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
  };

  const setStoredConsent = (value) => {
    try { localStorage.setItem(CONSENT_KEY, value); } catch {}
  };

  const checkExistingRecording = useCallback(async (vid) => {
    try {
      const list = await VideoService.getUserWebcamRecordings();
      const exists = Array.isArray(list) && list.some(r => Number(r.video_id) === Number(vid));
      recordingCompletedRef.current = exists;
      setHasExistingRecording(exists);
      if (exists) {
        addToast('You already recorded for this video — rewards still active', 'info', 4000);
      }
    } catch {
      recordingCompletedRef.current = false;
      setHasExistingRecording(false);
    }
  }, [addToast]);

  useEffect(() => {
    mountedRef.current = true;
    checkExistingRecording(videoId);

    const stored = getStoredConsent();
    if (stored === 'denied') {
      setShowPermissionModal(true);
    } else if (stored === 'granted') {
      setWebcamPermission('granted');
      initWebcamAfterPermission();
    } else {
      checkWebcamPermission();
    }

    return () => {
      mountedRef.current = false;
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (facePreCheckTimerRef.current) {
        clearTimeout(facePreCheckTimerRef.current);
      }
      if (faceTrackerRef.current) {
        faceTrackerRef.current.destroy();
        faceTrackerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    checkExistingRecording(videoId);
  }, [videoId, checkExistingRecording]);

  const initWebcamAfterPermission = async (existingStream = null) => {
    const devices = await getVideoDevices(existingStream);
    if (selectedDeviceId || devices.length >= 1) {
      try {
        await setupWebcam(selectedDeviceId || devices[0]?.deviceId);
      } catch (deviceErr) {
        handleDeviceError(deviceErr);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopAndCleanupWebcam();
    };
  }, []);

  const shouldRecord = isVideoPlaying && (
    !faceTrackerReady ||
    faceTrackerFailed ||
    !facePreCheckDone ||
    !faceAway
  );

  useEffect(() => {
    if (webcamPermission !== 'granted') return;

    if (shouldRecord && !isRecording) {
      startRecording();
    } else if (shouldRecord && isRecording && isPaused) {
      resumeRecording();
    } else if (!shouldRecord && isRecording && !isPaused) {
      pauseRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRecord, webcamPermission, isRecording, isPaused]);
  
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
  
 
  const getVideoDevices = async (existingStream = null) => {
    try {
      let stream = existingStream;
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch {
          stream = null;
        }
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');

      if (stream && !existingStream) {
        stream.getTracks().forEach(track => track.stop());
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

      setVideoDevices(enhancedDevices);

      if (enhancedDevices.length === 1) {
        setSelectedDeviceId(enhancedDevices[0].deviceId);
        return enhancedDevices;
      } else if (enhancedDevices.length > 1) {
        if (!selectedDeviceId) {
          setSelectedDeviceId(enhancedDevices[0].deviceId);
        }
        return enhancedDevices;
      }

      return enhancedDevices;
    } catch (error) {
      console.error('Error enumerating devices:', error);
      return [];
    }
  };
  
  const checkWebcamPermission = async () => {
    const stored = getStoredConsent();
    if (stored === 'denied') {
      setWebcamPermission('denied');
      if (onPermissionChange) onPermissionChange('denied');
      return;
    }
    if (stored === 'granted') {
      setWebcamPermission('granted');
      await initWebcamAfterPermission();
      if (onPermissionChange) onPermissionChange('granted');
      return;
    }

    try {
      let permissionState = 'prompt';
      try {
        const result = await navigator.permissions.query({ name: 'camera' });
        permissionState = result.state;
      } catch {
        // Permissions API unsupported — fall through to modal
      }

      if (permissionState === 'granted') {
        setWebcamPermission('granted');
        setStoredConsent('granted');
        await initWebcamAfterPermission();
        if (onPermissionChange) onPermissionChange('granted');
      } else if (permissionState === 'prompt') {
        setShowPermissionModal(true);
      } else {
        setWebcamPermission('denied');
        setStoredConsent('denied');
        if (onPermissionChange) onPermissionChange('denied');
      }
    } catch (error) {
      console.error('Error in checkWebcamPermission:', error);
      setShowPermissionModal(true);
    }
  };
  
  const requestWebcamPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      setStoredConsent('granted');
      const devices = await getVideoDevices(stream);
      stream.getTracks().forEach(track => track.stop());

      if (devices.length > 0) {
        setWebcamPermission('granted');
        setShowPermissionModal(false);

        if (devices.length >= 1) {
          setSelectedDeviceId(devices[0].deviceId);
          await setupWebcam(devices[0].deviceId);
          if (onPermissionChange) onPermissionChange('granted');
        }
      } else {
        throw new Error('No camera devices found');
      }
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        setWebcamPermission('denied');
        setStoredConsent('denied');
        if (onPermissionChange) onPermissionChange('denied');
      } else {
        handleDeviceError(error);
      }
    }
  };

  function handleFaceResult(result) {
    if (!mountedRef.current) return;

    const criteria = result.faceCriteriaMet !== undefined ? result.faceCriteriaMet : true;
    const isCurrentlyAway = faceAwayRef.current;
    const preCheckDone = facePreCheckDoneRef.current;

    if (!preCheckDone) {
      if (criteria) {
        if (preCheckToastIdRef.current !== null) {
          dismissToast(preCheckToastIdRef.current);
          preCheckToastIdRef.current = null;
        }
        setFacePreCheckDone(true);
        facePreCheckDoneRef.current = true;
        if (facePreCheckTimerRef.current) {
          clearTimeout(facePreCheckTimerRef.current);
          facePreCheckTimerRef.current = null;
        }
      }
      return;
    }

    if (criteria) {
      missedFramesRef.current = 0;
      if (isCurrentlyAway) {
        setFaceAway(false);
        faceAwayRef.current = false;
        if (awayToastIdRef.current !== null) {
          dismissToast(awayToastIdRef.current);
          awayToastIdRef.current = null;
        }
        addToast('Resumed', 'success', 2000);
        if (onFaceBlockedChange) onFaceBlockedChange(false);
      }
      faceWasMetRef.current = true;
    } else {
      missedFramesRef.current++;
      if (missedFramesRef.current >= FACE_MISSED_THRESHOLD && !isCurrentlyAway) {
        setFaceAway(true);
        faceAwayRef.current = true;
        awayToastIdRef.current = addToast(
          'Face not detected — video paused',
          'warning',
          0
        );
        if (onFaceBlockedChange) onFaceBlockedChange(true);
      }
    }
  }

  useEffect(() => {
    handleFaceResultRef.current = handleFaceResult;
  });

  const initFaceTracker = async () => {
    try {
      if (faceTrackerRef.current) {
        faceTrackerRef.current.destroy();
        faceTrackerRef.current = null;
      }

      if (!webcamRef.current) {
        console.warn('[FaceTracker] No video element available');
        setFaceTrackerFailed(true);
        return;
      }

      const tracker = new FaceTracker({
        preCheckTimeoutMs: FACE_PRE_CHECK_MS,
      });

      const ok = await tracker.init();
      if (!ok) {
        console.warn('[FaceTracker] Model failed to load — running without face verification');
        setFaceTrackerFailed(true);
        setFacePreCheckDone(true);
        addToast('Face verification unavailable — rewards still active', 'info', 4000);
        return;
      }

      faceTrackerRef.current = tracker;
      setFaceTrackerReady(true);

      faceWasMetRef.current = true;
      faceAwayRef.current = false;

      preCheckToastIdRef.current = addToast(
        'Please position your face in the center of the camera',
        'info',
        0
      );

      tracker.start(webcamRef.current, (result) => {
        if (handleFaceResultRef.current) {
          handleFaceResultRef.current(result);
        }
      });

      facePreCheckTimerRef.current = setTimeout(() => {
        if (mountedRef.current && !facePreCheckDoneRef.current) {
          if (preCheckToastIdRef.current !== null) {
            dismissToast(preCheckToastIdRef.current);
            preCheckToastIdRef.current = null;
          }
          setFacePreCheckDone(true);
          facePreCheckDoneRef.current = true;
          addToast('Face not detected — verification skipped', 'warning', 5000);
        }
      }, FACE_PRE_CHECK_MS);
    } catch (err) {
      console.warn('[FaceTracker] Init error:', err);
      setFaceTrackerFailed(true);
      setFacePreCheckDone(true);
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
          audio: false 
        };
      } else {
        constraints = {
          video: {
            deviceId: { exact: deviceId },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false
        };
      }
      
      console.log('Attempting to access webcam with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = stream;
      
      // Detect manual permission revocation (browser UI, right-click → disable)
      stream.getVideoTracks().forEach(track => {
        track.onended = () => {
          if (!mountedRef.current) return;
          stopAndCleanupWebcam();
          setShowDeviceSelector(true);
        };
      });
      
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
      }
      
      setFaceTrackerReady(false);
      setFaceTrackerFailed(false);
      setFacePreCheckDone(false);
      setFaceAway(false);
      faceAwayRef.current = false;
      missedFramesRef.current = 0;
      faceWasMetRef.current = true;

      initFaceTracker();

      if (isVideoPlaying && !recordingCompletedRef.current && !isRecording) {
        startRecording();
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
    if (recordingCompletedRef.current) return;
    
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
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          options.mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
          options.mimeType = 'video/webm;codecs=vp8';
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
        if (!mountedRef.current) return;
        if (isRecording && !isPaused && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('Restarting recording to prevent browser issues...');
          
          mediaRecorderRef.current.stop();
          
          // Start a new recorder after a short delay
          setTimeout(() => {
            if (mountedRef.current && streamRef.current && isVideoPlaying) {
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
          if (!mountedRef.current) return;
          if (isRecording && !isPaused && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log('Restarting recording to prevent browser issues...');
            
            // Stop the current recorder
            mediaRecorderRef.current.stop();
            
            // Start a new recorder after a short delay
            setTimeout(() => {
              if (mountedRef.current && streamRef.current && isVideoPlaying) {
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

      const recordingId = response?.recording_id;

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
      recordingCompletedRef.current = true;

      // Signal the backend that the blob upload finished so the analysis
      // cron can pick this recording up. Best-effort; do not block the UI.
      if (recordingId) {
        try {
          await VideoService.markWebcamUploadComplete(videoId, recordingId);
        } catch (completeErr) {
          console.error('Failed to mark webcam upload complete:', completeErr);
        }
      }

      setIsUploading(false);
    } catch (error) {
      console.error('Error uploading recording:', error);
      setUploadError('Failed to upload recording. Please try again.');
      setIsUploading(false);
      if (onError) onError('Upload failed: ' + error.message);
    }
  };
  
  // Global MediaRecorder error handler — registered once at component mount
  const mediaRecorderErrorRef = useRef(null);
  useEffect(() => {
    const handler = (event) => {
      if (event.error && event.error.message && event.error.message.includes('MediaRecorder')) {
        console.error('Global MediaRecorder error:', event.error);
      }
    };
    mediaRecorderErrorRef.current = handler;
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);

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
    
    // Clean up face tracker
    if (faceTrackerRef.current) {
      faceTrackerRef.current.destroy();
      faceTrackerRef.current = null;
    }
    setFaceTrackerReady(false);
    setFacePreCheckDone(false);
    facePreCheckDoneRef.current = false;
    faceAwayRef.current = false;
    missedFramesRef.current = 0;
    faceWasMetRef.current = true;
    if (facePreCheckTimerRef.current) {
      clearTimeout(facePreCheckTimerRef.current);
      facePreCheckTimerRef.current = null;
    }
    if (preCheckToastIdRef.current !== null) {
      dismissToast(preCheckToastIdRef.current);
      preCheckToastIdRef.current = null;
    }
    if (awayToastIdRef.current !== null) {
      dismissToast(awayToastIdRef.current);
      awayToastIdRef.current = null;
    }
    if (faceAwayRef.current) {
      faceAwayRef.current = false;
      if (onFaceBlockedChange) onFaceBlockedChange(false);
    }
    clearToasts();
  };
  
  // Toggle recording indicator visibility — if camera isn't working, show selector popup instead
  const toggleRecordingIndicator = () => {
    if (webcamPermission !== 'granted' || deviceError || videoDevices.length === 0) {
      setShowDeviceSelector(true);
      return;
    }
    setShowRecordingIndicator(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  // Detect fullscreen for repositioning
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handleChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  // Handle the toggle camera button click
  const toggleCameraSelector = () => {
    setShowDeviceSelector(true);
  };

  const pipVisible = webcamPermission === 'granted' && !deviceError && videoDevices.length > 0;

  return (
    <>
      {/* Webcam PiP preview — top-left, below navbar in normal mode */}
      {webcamPermission === 'granted' && !deviceError && videoDevices.length > 0 && (
        <div className={`${isFullscreen ? 'absolute' : 'fixed'} z-50 ${isFullscreen ? 'top-4' : 'top-[72px]'} left-4 flex flex-col items-center`}>
          <div className={`transition-all duration-300 ${showRecordingIndicator ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="relative rounded-lg overflow-hidden border-2 border-gray-600 shadow-lg bg-black" style={{ width: '160px', height: '120px' }}>
              <video
                ref={webcamRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {hasExistingRecording && (
                <div className="absolute top-1 left-1 right-1 flex items-center bg-blue-600/80 px-1.5 py-0.5 rounded text-xs text-white">
                  <CameraOff size={10} className="mr-1 shrink-0" />
                  <span className="truncate">Already recorded</span>
                </div>
              )}
              {!hasExistingRecording && isRecording && !isPaused && (
                <div className="absolute top-1 left-1 flex items-center bg-red-600/80 px-1.5 py-0.5 rounded text-xs text-white">
                  <div className="h-2 w-2 bg-red-500 rounded-full mr-1 animate-pulse" />
                  REC
                </div>
              )}
              {!hasExistingRecording && isRecording && isPaused && (
                <div className="absolute top-1 left-1 flex items-center bg-yellow-600/80 px-1.5 py-0.5 rounded text-xs text-white">
                  <div className="h-2 w-2 bg-yellow-400 rounded-full mr-1" />
                  PAUSED
                </div>
              )}
              {videoDevices.length > 1 && showRecordingIndicator && (
                <button 
                  onClick={toggleCameraSelector}
                  className="absolute bottom-1 right-1 bg-gray-900/70 backdrop-blur-sm p-1 rounded-full text-white hover:bg-gray-800/80 transition-colors"
                  title="Change camera"
                  type="button"
                >
                  <SwitchCamera size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Eye toggle — in the controls bar area (bottom-right), opacity matches controls visibility */}
      <button
        onClick={toggleRecordingIndicator}
        className={`absolute bottom-4 right-20 z-30 flex items-center bg-gray-900/80 backdrop-blur-sm p-2 rounded-full text-white hover:bg-gray-800/80 transition-all duration-300 ${showControls || pipVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        title={showRecordingIndicator ? 'Hide camera preview' : 'Show camera preview'}
        type="button"
      >
        {showRecordingIndicator ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      
      {/* Info banner — click to open permission modal */}
      {webcamPermission === 'denied' && isVideoPlaying && (
        <button
          onClick={() => setShowPermissionModal(true)}
          className="absolute bottom-0 left-0 right-0 z-20 px-4 py-2 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700 hover:bg-gray-800/80 transition-colors cursor-pointer text-left"
          type="button"
        >
          <p className="text-gray-300 text-xs text-center">
            <CameraOff size={12} className="inline mr-1" />
            Webcam off — enable camera access to get your rewards
          </p>
        </button>
      )}

      {/* Toast notifications overlay */}
      {toasts.length > 0 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium text-white whitespace-nowrap ${
                t.type === 'success' ? 'bg-green-600' :
                t.type === 'warning' ? 'bg-yellow-600' :
                t.type === 'error' ? 'bg-red-600' :
                'bg-blue-600'
              }`}
              onClick={() => dismissToast(t.id)}
              role="alert"
            >
              {t.message}
            </div>
          ))}
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
      
      {/* Permission request modal — close navigates to home + persists deny */}
      <Modal
        show={showPermissionModal}
        onClose={() => {
          setStoredConsent('denied');
          setShowPermissionModal(false);
          navigate('/');
        }}
        size="md"
        dismissible
      >
        <Modal.Header className="bg-gray-800 text-white border-b border-gray-700">
          <p className="text-white">
          Webcam Recording
          </p>
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-gray-300">
          <div className="flex flex-col items-center">
            <Camera size={48} className="text-blue-400 mb-4" />
            <p className="mb-4 text-center">
              Enable your webcam to earn rewards while watching. Your reactions help creators 
              understand what works.
            </p>
            <Alert color="warning" className="mb-4 w-full">
              <p>Without your webcam, you won't earn any rewards during playback.</p>
            </Alert>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-gray-800 border-t border-gray-700">
          <div className="flex justify-center w-full">
            <Button
              color="blue"
              onClick={requestWebcamPermission}
              className="min-w-[180px]"
            >
              <Camera className="mr-2 h-4 w-4" />
              Allow Webcam
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
      
      {/* Camera device selector modal */}
      <Modal
        show={showDeviceSelector}
        onClose={() => setShowDeviceSelector(false)}
        size="md"
        dismissible={videoDevices.length === 0}
      >
        {videoDevices.length > 0 && (
          <div className="bg-gray-800 text-white border-b border-gray-700 px-6 py-4 text-lg font-semibold">
            Select Camera
          </div>
        )}
        <Modal.Body className="bg-gray-800 text-gray-300">
          <div className="flex flex-col">
            {videoDevices.length > 0 ? (
              <>
                <p className="mb-4">
                  Multiple cameras detected. Please select which camera you want to use for recording:
                </p>
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
              </>
            ) : (
              <div className="text-center py-4">
                <CameraOff size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-300 mb-2">
                  No cameras detected. Without a webcam, your emotional reactions won't be recorded.
                </p>
                <Button
                  color="dark"
                  onClick={() => navigate('/')}
                  className="mt-4"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Go to Home
                </Button>
              </div>
            )}
          </div>
        </Modal.Body>
        {videoDevices.length > 0 && (
          <Modal.Footer className="bg-gray-800 border-t border-gray-700">
            <div className="flex justify-center w-full">
              <Button
                color="blue"
                onClick={() => handleDeviceSelection(selectedDeviceId)}
                disabled={!selectedDeviceId}
                className="min-w-[200px]"
              >
                <Camera className="mr-2 h-4 w-4" />
                Use Selected Camera
              </Button>
            </div>
          </Modal.Footer>
        )}
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
        <Modal.Footer className="bg-gray-800 border-t border-gray-700">
          <div className="flex justify-center gap-3 w-full">
            <Button
              color="gray"
              onClick={() => {
                setShowTroubleshootModal(false);
                setWebcamPermission('denied');
                setStoredConsent('denied');
                if (onPermissionChange) onPermissionChange('denied');
              }}
              className="flex-1 min-w-[120px]"
            >
              <CameraOff className="mr-2 h-4 w-4" />
              Skip Camera
            </Button>
            {videoDevices.length > 1 && (
              <Button
                color="light"
                onClick={() => {
                  setShowTroubleshootModal(false);
                  setShowDeviceSelector(true);
                }}
                className="flex-1 min-w-[120px]"
              >
                <SwitchCamera className="mr-2 h-4 w-4" />
                Switch
              </Button>
            )}
            <Button
              color="blue"
              onClick={retryWebcamSetup}
              className="flex-1 min-w-[120px]"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
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

WebcamRecorder.displayName = 'WebcamRecorder';

WebcamRecorder.propTypes = {
  isVideoPlaying: PropTypes.bool.isRequired,
  videoId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onPermissionChange: PropTypes.func,
  onError: PropTypes.func,
  showControls: PropTypes.bool,
  onFaceBlockedChange: PropTypes.func,
};

export default WebcamRecorder;