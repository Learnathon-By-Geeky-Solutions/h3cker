import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Button,
  Label,
  TextInput,
  Textarea,
  Select,
  FileInput,
  Spinner,
  Progress,
  Alert
} from 'flowbite-react';
import {
  Upload as UploadIcon,
  Video, 
  ImagePlus, 
  Check,
  ArrowRight,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import VideoService from "../../../utils/VideoService";

const UploadVideo = () => {
  const thumbnailCanvasRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    visibility: 'private',
    view_limit: '',
    auto_private_after: ''
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [processedThumbnailFile, setProcessedThumbnailFile] = useState(null);
  const [generatedFilename, setGeneratedFilename] = useState('');
  const [uploadUrls, setUploadUrls] = useState({
    videoUrl: null,
    thumbnailUrl: null
  });
  const [uploadStatus, setUploadStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState(null);
  const [thumbDimensions, setThumbDimensions] = useState({ width: 0, height: 0 });
  const [isAutoCropping, setIsAutoCropping] = useState(false);
  const [uploadStage, setUploadStage] = useState('preparing');

  const categories = [
    { value: 'educational', label: 'Educational' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'music', label: 'Music' },
    { value: 'news', label: 'News & Politics' },
    { value: 'technology', label: 'Technology' },
    { value: 'travel', label: 'Travel & Events' },
    { value: 'sports', label: 'Sports' },
    { value: 'other', label: 'Other' },
  ];

  const TARGET_WIDTH = 1280;
  const TARGET_HEIGHT = 720;

  useEffect(() => {
    const currentVideoUrl = videoPreviewUrl;
    const currentThumbnailUrl = thumbnailPreviewUrl;

    return () => {
      if (currentVideoUrl) {
        URL.revokeObjectURL(currentVideoUrl);
      }
      if (currentThumbnailUrl) {
        URL.revokeObjectURL(currentThumbnailUrl);
      }
    };
  }, [videoPreviewUrl, thumbnailPreviewUrl]);

  const handleCanvasBlob = (blob, file, resolve, reject) => {
    if (!blob) {
      setIsAutoCropping(false);
      reject(new Error("Failed to create thumbnail blob"));
      return;
    }
    
    const processedFile = new File(
      [blob], 
      `processed_${file.name.split('.')[0]}.jpg`, 
      { type: 'image/jpeg' }
    );
    
    setProcessedThumbnailFile(processedFile);
    setIsAutoCropping(false);
    resolve(processedFile);
  };

  // Image onload handler to avoid excessive nesting
  const handleImageLoad = (img, file, resolve, reject) => {
    const canvas = thumbnailCanvasRef.current;
    if (!canvas) {
      setIsAutoCropping(false);
      reject(new Error("Canvas reference not available"));
      return;
    }

    const ctx = canvas.getContext('2d');
    const { width: sourceWidth, height: sourceHeight } = img;
    
    canvas.width = TARGET_WIDTH;
    canvas.height = TARGET_HEIGHT;
    
    let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
    
    const sourceAspect = sourceWidth / sourceHeight;
    const targetAspect = TARGET_WIDTH / TARGET_HEIGHT;
    
    if (sourceAspect > targetAspect) {
      drawHeight = TARGET_HEIGHT;
      drawWidth = sourceWidth * (TARGET_HEIGHT / sourceHeight);
      offsetX = (TARGET_WIDTH - drawWidth) / 2;
    } else {
      drawWidth = TARGET_WIDTH;
      drawHeight = sourceHeight * (TARGET_WIDTH / sourceWidth);
      offsetY = (TARGET_HEIGHT - drawHeight) / 2;
    }
    
    ctx.clearRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    
    canvas.toBlob(
      (blob) => handleCanvasBlob(blob, file, resolve, reject), 
      'image/jpeg', 
      0.9
    );
  };

  const processThumbnail = (file) => {
    return new Promise((resolve, reject) => {
      setIsAutoCropping(true);
      const img = new Image();
      img.onload = () => handleImageLoad(img, file, resolve, reject);
      
      img.onerror = () => {
        setIsAutoCropping(false);
        reject(new Error("Failed to load thumbnail image"));
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const generateAndSetFilename = () => {
    if (!formData.title) {
      return '';
    }
    const timestamp = Date.now();
    const safeName = formData.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);
    const randomBytes = new Uint8Array(5); 
    window.crypto.getRandomValues(randomBytes);
    const randomString = Array.from(randomBytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
    const uniqueFilename = `${safeName || 'video'}_${timestamp}_${randomString.substring(0, 7)}`; 
    setGeneratedFilename(uniqueFilename);
    return uniqueFilename;
  };

  const validateMetadataForm = () => {
    if (!formData.title.trim()) {
      return { valid: false, message: 'Video title is required.' };
    }
    return { valid: true, message: '' };
  };

  const handleMetadataSubmit = async (e) => {
    e.preventDefault();
    const validation = validateMetadataForm();
    if (!validation.valid) {
      setUploadStatus('error');
      setStatusMessage(validation.message);
      return;
    }

    const filenameToSubmit = generatedFilename || generateAndSetFilename();
    if (!filenameToSubmit) {
      setStatusMessage("Could not generate a filename. Please ensure title is set.");
      setUploadStatus('error');
      return;
    }

    const metadataPayload = { ...formData, filename: filenameToSubmit };

    setUploadStatus('pending');
    setStatusMessage('Initializing upload...');

    try {
      const response = await VideoService.initiateVideoUpload(metadataPayload);

      if (!response?.video_upload_url || !response?.thumbnail_upload_url) {
        throw new Error("Backend did not return valid upload URLs.");
      }

      setUploadUrls({
        videoUrl: response.video_upload_url,
        thumbnailUrl: response.thumbnail_upload_url
      });
      setCurrentStep(2);
      setUploadStatus(null);
      setStatusMessage('');
    } catch (error) {
      console.error('Error initiating upload:', error);
      setUploadStatus('error');
      setStatusMessage(error.message || 'Failed to initialize upload. Please check details and try again.');
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];

    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }

    if (!file) {
      setVideoFile(null);
      return;
    }
    
    if (!file.type.startsWith('video/')) {
      setStatusMessage('Invalid file type. Please select a video file.');
      setUploadStatus('error');
      e.target.value = '';
      setVideoFile(null);
      return;
    }

    setVideoFile(file);
    setUploadStatus(null);
    setStatusMessage('');

    const newPreviewUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(newPreviewUrl);
    
    generateThumbnailFromVideo(file);
  };

  // Handler for canvas.toBlob in video thumbnail generation to avoid deep nesting
  const handleVideoThumbnailBlob = (blob) => {
    if (blob) {
      const thumbnailFile = new File([blob], `thumbnail_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      setStatusMessage('Auto-generated thumbnail from video. You can replace it if needed.');
      setTimeout(() => setStatusMessage(''), 5000);
      
      handleThumbnailChangeWithFile(thumbnailFile);
    }
  };

  // Handle video seeking for thumbnail generation
  const handleVideoSeeked = (video) => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(handleVideoThumbnailBlob, 'image/jpeg', 0.95);
  };

  const generateThumbnailFromVideo = (videoFile) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      video.currentTime = video.duration * 0.25;
    };
    
    video.onseeked = () => handleVideoSeeked(video);
    
    video.onerror = () => {
      console.error('Error extracting thumbnail from video');
    };
    
    video.src = URL.createObjectURL(videoFile);
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setThumbnailFile(null);
      return;
    }
    
    handleThumbnailChangeWithFile(file);
  };

  const handleThumbnailChangeWithFile = async (file) => {
    if (thumbnailPreviewUrl) {
      URL.revokeObjectURL(thumbnailPreviewUrl);
      setThumbnailPreviewUrl(null);
    }

    if (!file.type.startsWith('image/')) {
      setStatusMessage('Invalid file type. Please select an image file (JPG, PNG, WEBP).');
      setUploadStatus('error');
      const thumbInput = document.getElementById('thumbnail');
      if (thumbInput) thumbInput.value = '';
      setThumbnailFile(null);
      return;
    }

    setThumbnailFile(file);
    setUploadStatus(null);
    setStatusMessage('');

    try {
      const processedFile = await processThumbnail(file);
      
      const newPreviewUrl = URL.createObjectURL(processedFile);
      setThumbnailPreviewUrl(newPreviewUrl);
      
      const img = new Image();
      img.onload = () => {
        setThumbDimensions({
          width: img.width,
          height: img.height
        });
      };
      img.src = newPreviewUrl;
      
    } catch (error) {
      console.error('Error processing thumbnail:', error);
      setStatusMessage('Failed to process thumbnail. Please try another image.');
      setUploadStatus('error');
    }
  };

  const validateFileForm = () => {
    if (!videoFile) {
      return { valid: false, message: 'Please select a video file to upload.' };
    }
    if (!processedThumbnailFile && !thumbnailFile) {
      return { valid: false, message: 'Please select a thumbnail image.' };
    }
    if (!uploadUrls.videoUrl || !uploadUrls.thumbnailUrl) {
      return { valid: false, message: 'Upload authorization is missing. Please go back to details.' };
    }
    return { valid: true, message: '' };
  };

  // Update updateProgressWithDelay function to not focus on percentages
  const updateProgressWithDelay = (value, message = null) => {
    // Still track progress internally for the progress bar
    setUploadProgress(prevProgress => Math.max(prevProgress, value));
    
    if (message) {
      setStatusMessage(message);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    const validation = validateFileForm();
    if (!validation.valid) {
      setUploadStatus('error');
      setStatusMessage(validation.message);
      return;
    }

    // Reset progress tracking
    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadStage('preparing');
    setStatusMessage('Preparing upload...');

    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
    if (thumbnailPreviewUrl) {
      URL.revokeObjectURL(thumbnailPreviewUrl);
      setThumbnailPreviewUrl(null);
    }

    try {
      // Upload video first (70% of total progress)
      setUploadStage('video');
      setStatusMessage(`Uploading video: ${videoFile.name}...`);
      updateProgressWithDelay(1, 'Uploading video...');
      
      await VideoService.uploadFileToBlob(uploadUrls.videoUrl, videoFile, (progress) => {
        const actualProgress = Math.min(Math.floor(progress * 70), 70);
        updateProgressWithDelay(actualProgress, `Uploading video...`);
      });

      // Ensure we reach exactly 70% when video upload is complete
      updateProgressWithDelay(70, 'Video upload complete. Preparing thumbnail...');
      
      // Upload thumbnail next (remaining 30% of progress)
      setUploadStage('thumbnail');
      const thumbnailToUpload = processedThumbnailFile || thumbnailFile;
      setStatusMessage(`Uploading thumbnail: ${thumbnailToUpload.name}...`);
      
      await VideoService.uploadFileToBlob(uploadUrls.thumbnailUrl, thumbnailToUpload, (progress) => {
        const actualProgress = 70 + Math.min(Math.floor(progress * 30), 30);
        updateProgressWithDelay(actualProgress, `Uploading thumbnail...`);
      });

      // Ensure we reach exactly 100% when all uploads complete
      setUploadProgress(100);
      setUploadStage('complete');
      setUploadStatus('success');
      setStatusMessage('Video and thumbnail uploaded successfully!');
      
      // Short delay before moving to success step
      setTimeout(() => {
        setCurrentStep(3);
      }, 500);
    } catch (error) {
      console.error('File upload failed:', error);
      setUploadStatus('error');
      setStatusMessage(`Upload failed: ${error.message || 'An unknown error occurred during upload.'}`);
    }
  };

  const handleReset = () => {
    setFormData({ 
      title: '', 
      description: '', 
      category: '', 
      visibility: 'private',
      view_limit: '',
      auto_private_after: ''
    });
    setVideoFile(null);
    setThumbnailFile(null);
    setProcessedThumbnailFile(null);
    setGeneratedFilename('');
    setUploadUrls({ videoUrl: null, thumbnailUrl: null });
    setUploadStatus(null);
    setStatusMessage('');
    setUploadProgress(0);
    setUploadStage('preparing');
    setCurrentStep(1);

    if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
    }
    if (thumbnailPreviewUrl) {
        URL.revokeObjectURL(thumbnailPreviewUrl);
    }
    setVideoPreviewUrl(null);
    setThumbnailPreviewUrl(null);

    const videoInput = document.getElementById('video');
    const thumbInput = document.getElementById('thumbnail');
    if (videoInput) videoInput.value = '';
    if (thumbInput) thumbInput.value = '';
  };

  const renderMetadataForm = () => (
    <form onSubmit={handleMetadataSubmit} className="space-y-4">
      <div>
        <div className="mb-2 block">
          <Label htmlFor="title" value="Video Title (required)" className="text-white" />
        </div>
        <TextInput
          id="title"
          value={formData.title}
          onChange={handleInputChange}
          onBlur={generateAndSetFilename}
          placeholder="Enter a catchy title for your video"
          required
          maxLength={100}
        />
      </div>
      <div>
         <div className="mb-2 block">
            <Label htmlFor="description" value="Description" className="text-white" />
         </div>
        <Textarea
          id="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Tell viewers about your video (optional)"
          rows={4}
          maxLength={5000}
        />
      </div>
      <div>
         <div className="mb-2 block">
           <Label htmlFor="category" value="Category" className="text-white" />
         </div>
        <Select id="category" value={formData.category} onChange={handleInputChange}>
          <option value="">Select a category (optional)</option>
          {categories.map(category => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <div className="mb-2 block">
            <Label htmlFor="visibility" value="Visibility" className="text-white" />
        </div>
        <Select id="visibility" value={formData.visibility} onChange={handleInputChange}>
          <option value="private">Private (Only you can see)</option>
          <option value="unlisted">Unlisted (Anyone with the link)</option>
          <option value="public">Public (Visible to everyone)</option>
        </Select>
         <p className="mt-1 text-xs text-gray-300">
              Choose who can view your video.
         </p>
      </div>
      
      {/* Add view limit options */}
      <div>
        <div className="mb-2 block">
          <Label htmlFor="view_limit" value="View Limit (optional)" className="text-white" />
        </div>
        <TextInput
          id="view_limit"
          type="number"
          min="0"
          value={formData.view_limit || ''}
          onChange={handleInputChange}
          placeholder="Maximum number of views before video becomes private"
        />
        <p className="mt-1 text-xs text-gray-300">
          Set a maximum number of views. After reaching this limit, the video will become private.
        </p>
      </div>

      {/* Add expiry date option */}
      <div>
        <div className="mb-2 block">
          <Label htmlFor="auto_private_after" value="Auto-Private Date (optional)" className="text-white" />
        </div>
        <TextInput
          id="auto_private_after"
          type="datetime-local"
          value={formData.auto_private_after || ''}
          onChange={handleInputChange}
        />
        <p className="mt-1 text-xs text-gray-300">
          Set a date when this video will automatically become private.
        </p>
      </div>
      
      <div className="flex justify-end space-x-3 pt-5 border-t border-gray-600 mt-5">
        <Button
          type="button"
          onClick={handleReset}
          color="gray"
          outline
          disabled={uploadStatus === 'pending'}
        >
          Clear Form
        </Button>
        <Button
          type="submit"
          disabled={uploadStatus === 'pending' || !formData.title.trim()}
          color="blue"
          isProcessing={uploadStatus === 'pending'}
          processingSpinner={<Spinner size="sm" />}
        >
          {uploadStatus === 'pending' ? 'Initializing...' : (
            <>
              Continue to Upload <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </form>
  );

  const renderFileUploadForm = () => (
    <form onSubmit={handleFileUpload} className="space-y-6">
      <div className="text-center mb-6"> 
        <h3 className="text-xl font-semibold text-white">Upload Files</h3>
        <p className="text-gray-300 mt-1">
          Select the video file and a thumbnail image.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="flex flex-col space-y-4"> 
          <div>
            <div className="mb-2 block">
              <Label htmlFor="video" value="Video File (required)" className="text-white" />
            </div>
            <FileInput
              id="video"
              onChange={handleVideoChange}
              accept="video/*"
              helperText="Select the main video file (e.g., MP4, MOV, AVI)."
              required
            />
            {videoFile && (
              <p className="mt-2 text-xs text-green-400 flex items-center">
                <Check size={14} className="mr-1 flex-shrink-0"/>
                <span className="truncate">
                  Selected: {videoFile.name} ({(videoFile.size / (1024*1024)).toFixed(2)} MB)
                </span>
              </p>
            )}
          </div>

          <div className="flex-grow flex flex-col min-h-[150px]">
            {videoPreviewUrl ? (
              <div className="p-3 border border-gray-600 rounded-lg bg-gray-700/50 flex flex-col h-full"> 
                <Label value="Video Preview" className="text-sm font-medium text-gray-300 mb-2 block flex-shrink-0"/>
                <div className="relative w-full aspect-video bg-black rounded overflow-hidden flex-grow">
                  <video
                    src={videoPreviewUrl}
                    controls
                    preload="metadata"
                    className="absolute top-0 left-0 w-full h-full object-contain" 
                    aria-label="Video Preview"
                  >
                    <track kind="captions" src="" label="English" />
                    Your browser does not support the video tag.
                  </video>
                 </div>
              </div>
            ) : (
              <div className="p-3 border border-dashed border-gray-600 rounded-lg bg-gray-700/30 flex items-center justify-center text-gray-300 h-full">
                 <Video className="w-10 h-10" /> 
                 <span className="ml-2">Video preview appears here</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col space-y-4"> 
          <div>
            <div className="mb-2 block">
              <Label htmlFor="thumbnail" value="Thumbnail Image (required)" className="text-white" />
            </div>
            <FileInput
              id="thumbnail"
              onChange={handleThumbnailChange}
              accept="image/jpeg, image/png, image/webp, image/gif"
              helperText="Upload a preview image. Will be auto-resized to 1280×720 (16:9)."
              required={!thumbnailFile && !processedThumbnailFile}
            />
            {thumbnailFile && (
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-green-400 flex items-center">
                  <Check size={14} className="mr-1 flex-shrink-0"/> 
                  <span className="truncate"> 
                    {isAutoCropping ? "Processing..." : `Selected: ${thumbnailFile.name} (${(thumbnailFile.size / 1024).toFixed(1)} KB)`}
                  </span>
                </p>
                {isAutoCropping && <Spinner size="sm" />}
              </div>
            )}
          </div>
          <div className="flex-grow flex flex-col min-h-[150px]">
            {thumbnailPreviewUrl ? (
              <div className="p-3 border border-gray-600 rounded-lg bg-gray-700/50 flex flex-col h-full">
                <div className="flex justify-between items-center mb-2">
                  <Label value="Thumbnail Preview (16:9)" className="text-sm font-medium text-gray-300 flex-shrink-0"/>
                  <div className="text-xs text-gray-300">
                    {thumbDimensions.width}×{thumbDimensions.height} px
                  </div>
                </div>
                <div className="relative w-full aspect-video bg-black rounded overflow-hidden flex-grow"> 
                  <img
                    src={thumbnailPreviewUrl}
                    alt="Thumbnail Preview"
                    className="absolute top-0 left-0 w-full h-full object-contain"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 border border-dashed border-gray-600 rounded-lg bg-gray-700/30 flex items-center justify-center text-gray-300 h-full">
                <ImagePlus className="w-10 h-10" />
                <span className="ml-2">Thumbnail preview appears here</span>
              </div>
            )}
          </div>
        </div>
      </div> 

      <div className="flex justify-between items-center pt-5 border-t border-gray-600 mt-8">
        <Button
          type="button"
          onClick={() => {
            setCurrentStep(1);
            setUploadStatus(null);
            setStatusMessage('');
          }}
          color="gray"
          outline
          disabled={uploadStatus === 'uploading'}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Details
        </Button>
        <Button
          type="submit"
          disabled={!videoFile || (!thumbnailFile && !processedThumbnailFile) || !uploadUrls.videoUrl || !uploadUrls.thumbnailUrl || uploadStatus === 'uploading' || isAutoCropping}
          color="blue"
          isProcessing={uploadStatus === 'uploading' || isAutoCropping}
          processingSpinner={<Spinner size="sm" />}
        >
          {uploadStatus === 'uploading' ? 'Uploading...' : (
            <>
              <UploadIcon className="mr-2 h-5 w-5" /> Start Upload
            </>
          )}
        </Button>
      </div>
    </form>
  );

  const renderUploadProgress = () => (
    <div className="py-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">
          Uploading Your Files
        </h3>
        <p className="text-gray-300">
           Please keep this window open until the upload completes.
        </p>
      </div>
      <div className="max-w-lg mx-auto space-y-4">
         <div>
            <div className="mb-1 text-gray-300">
              <span>
                {(() => {
                  if (uploadStage === 'preparing') return 'Preparing upload...';
                  if (uploadStage === 'video') return 'Uploading video...';
                  if (uploadStage === 'thumbnail') return 'Uploading thumbnail...';
                  return 'Processing...';
                })()}
              </span>
            </div>
            <Progress progress={uploadProgress} size="lg" color="blue" />
         </div>
        <div className="flex items-center justify-center text-gray-300 mt-4">
          <Spinner size="sm" className="mr-2" aria-label="Uploading" />
          <span>{statusMessage || 'Processing...'}</span>
        </div>
      </div>
    </div>
  );

  const renderSuccessMessage = () => (
    <div className="py-8 text-center">
      <div className="w-16 h-16 rounded-full bg-green-500 text-white mx-auto flex items-center justify-center mb-5 ring-4 ring-green-500/30">
        <Check size={32} strokeWidth={3} />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">
        Upload Complete!
      </h3>
      <p className="text-gray-300 max-w-md mx-auto mb-8">
        Your video <span className="font-medium text-white">"{formData.title}"</span> has been successfully uploaded. It may take a few moments to process before it's available.
      </p>
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
        <Button onClick={handleReset} color="gray" outline>
          Upload Another Video
        </Button>
        <Button href="/dashboard" color="blue">
          View My Dashboard
        </Button>
      </div>
    </div>
  );

  const renderAlert = () => {
    if (!statusMessage || (uploadStatus !== 'error' && uploadStatus !== 'info')) {
      return null;
    }
    return (
      <Alert
        color={uploadStatus === 'error' ? 'failure' : 'info'}
        icon={uploadStatus === 'error' ? AlertCircle : undefined}
        onDismiss={() => {
          setUploadStatus(null);
          setStatusMessage('');
        }}
        className="mb-6"
        rounded
      >
        <p className="font-medium text-sm">{statusMessage}</p>
      </Alert>
    );
  };

  // Helper function to get step icon background class
  const getStepIconClass = (stepNumber) => {
    if (currentStep === stepNumber) {
      return 'border-blue-500 bg-blue-900';
    } 
    if (currentStep > stepNumber) {
      return 'border-green-500 bg-green-900';
    }
    return 'border-gray-600 bg-gray-700';
  };

  const renderSteps = () => {
    const steps = [
      { number: 1, label: 'Video Details' },
      { number: 2, label: 'Upload Files' },
      { number: 3, label: 'Complete' }
    ];
    
    return (
      <ol className="flex items-center w-full text-sm font-medium text-center text-gray-400 sm:text-base mb-8">
        {steps.map((step, index, arr) => {
          let textColorClass = 'text-gray-500';
          if (currentStep === step.number) {
            textColorClass = 'text-blue-500';
          } else if (currentStep > step.number) {
            textColorClass = 'text-green-500';
          }
          
          const hasAfterContent = index < arr.length - 1;
          const iconClassName = getStepIconClass(step.number);
          
          return (
            <li 
              key={step.number} 
              className={`flex items-center ${textColorClass} ${
                hasAfterContent ? "w-full after:content-[''] after:w-full after:h-1 after:border-b after:border-gray-600 after:border-1 after:inline-block" : ''
              } ${index > 0 ? 'md:w-full' : ''}`}
            >
              <span className={`flex items-center justify-center ${
                hasAfterContent ? 'after:content-["/"] sm:after:hidden after:mx-2 after:text-gray-500' : ''
              }`}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 mr-2 ${iconClassName}`}>
                  {currentStep > step.number ? <Check size={16} /> : <span>{step.number}</span>}
                </div>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    );
  };

  const renderContent = () => {
    if (uploadStatus === 'uploading') {
      return renderUploadProgress();
    }
    switch (currentStep) {
      case 1:
        return renderMetadataForm();
      case 2:
        return renderFileUploadForm();
      case 3:
        return renderSuccessMessage();
      default:
        return <p className="text-center text-gray-300">Loading...</p>;
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-0">
      <h1 className="text-2xl font-bold text-white mb-6">Upload New Video</h1>

      {renderSteps()}
      {renderAlert()}

      <Card className="bg-gray-800 border-gray-700 shadow-lg p-6">
        {renderContent()}
      </Card>

      <canvas 
        ref={thumbnailCanvasRef} 
        className="hidden" 
        width={TARGET_WIDTH} 
        height={TARGET_HEIGHT}
      />
    </div>
  );
};

export default UploadVideo;