import React, { useState, useContext, useEffect } from 'react';
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
  X, 
  AlertCircle,
  Lock
} from 'lucide-react';
import VideoService from "../../../utils/VideoService";
import ApiService from "../../../utils/ApiService";
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { BlobServiceClient } from '@azure/storage-blob';

const UploadVideo = () => {
  const { user } = useContext(AuthContext);
  
  // Form states
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    category: '',
    visibility: 'private',
    videoFile: null,
    thumbnailFile: null
  });

  // UI states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error', null
  const [statusMessage, setStatusMessage] = useState('');
  const [videoPreview, setVideoPreview] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [uploadStep, setUploadStep] = useState(1); // 1: Details, 2: Upload, 3: Complete
  const [isTestingBackend, setIsTestingBackend] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  // Basic categories for testing - align with your actual backend categories
  const categories = [
    { value: 'educational', label: 'Educational' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'other', label: 'Other' },
  ];

  // Handle input changes
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Handle file selection for video
  const handleVideoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormState(prev => ({ ...prev, videoFile: file }));
    
    // Create video preview
    const videoURL = URL.createObjectURL(file);
    setVideoPreview(videoURL);
    
    // Reset error state
    setUploadStatus(null);
    setStatusMessage('');
  };

  // Handle file selection for thumbnail
  const handleThumbnailFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormState(prev => ({ ...prev, thumbnailFile: file }));
    
    // Create thumbnail preview
    const imageURL = URL.createObjectURL(file);
    setThumbnailPreview(imageURL);
    
    // Reset error state
    setUploadStatus(null);
    setStatusMessage('');
  };

  // Basic form validation
  const validateForm = () => {
    if (!formState.title.trim()) {
      return { valid: false, message: 'Please enter a title for your video' };
    }
    
    if (!formState.videoFile) {
      return { valid: false, message: 'Please select a video file to upload' };
    }
    
    if (!formState.thumbnailFile) {
      return { valid: false, message: 'Please upload a thumbnail image' };
    }
    
    if (!formState.category) {
      return { valid: false, message: 'Please select a category for your video' };
    }
    
    return { valid: true };
  };

  // Test backend connection
  const testBackendConnection = async () => {
    setIsTestingBackend(true);
    setConnectionStatus(null);
    try {
      const result = await VideoService.testBackendConnection();
      setConnectionStatus({
        success: result.success,
        message: result.success 
          ? 'Successfully connected to backend' 
          : `Failed to connect: ${result.error || 'Unknown error'}`
      });
    } catch (error) {
      setConnectionStatus({
        success: false,
        message: `Connection test failed: ${error.message}`
      });
    } finally {
      setIsTestingBackend(false);
    }
  };

  // Generate a unique filename that matches what backend expects
  const generateSafeFilename = (originalFilename) => {
    const timestamp = Date.now();
    const fileExt = originalFilename.split('.').pop();
    // Replace spaces and special characters, add timestamp for uniqueness
    const safeName = originalFilename
      .split('.')[0]
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    
    return `${safeName}_${timestamp}.${fileExt}`;
  };

  // Main upload function that integrates with your Django backend
  const uploadToServer = async () => {
    try {
      // Generate safe filenames that match backend expectations
      const videoFilename = generateSafeFilename(formState.videoFile.name);
      const thumbnailFilename = `thumb_${videoFilename}`;
      
      // Step 1: Call the backend API to initiate the upload and get SAS URLs
      const uploadData = {
        title: formState.title,
        description: formState.description || '',
        category: formState.category,
        visibility: formState.visibility,
        filename: videoFilename  // This must match exactly what the backend expects
      };
      
      setUploadProgress(10); // Show initial progress
      console.log('Initiating video upload with data:', uploadData);
      
      // This calls the Django /api/upload-video/ endpoint to get SAS tokens
      const response = await VideoService.initiateVideoUpload(uploadData);
      
      // Check if we got the required URLs
      if (!response || !response.video_upload_url || !response.thumbnail_upload_url) {
        throw new Error('Failed to get upload URLs from the server');
      }
      
      console.log('Received SAS tokens. Proceeding with upload...');
      
      setUploadProgress(20);
      
      // Step 2: Upload the video file to Azure using the SAS URL
      console.log(`Uploading video file: ${videoFilename} (${formState.videoFile.size} bytes)`);
      await VideoService.uploadFileToBlob(
        response.video_upload_url, 
        formState.videoFile,
        (progress) => {
          // Video is 70% of total progress (20-90%)
          setUploadProgress(20 + (progress * 0.7));
        }
      );
      
      setUploadProgress(90);
      
      // Step 3: Upload the thumbnail to Azure
      console.log(`Uploading thumbnail: ${thumbnailFilename} (${formState.thumbnailFile.size} bytes)`);
      await VideoService.uploadFileToBlob(
        response.thumbnail_upload_url, 
        formState.thumbnailFile,
        (progress) => {
          // Thumbnail is final 10% of progress (90-100%)
          setUploadProgress(90 + (progress * 0.1));
        }
      );
      
      setUploadProgress(100);
      console.log('Upload completed successfully');
      return { success: true, message: 'Video uploaded successfully!' };
    } catch (error) {
      console.error('Error during upload process:', error);
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validation = validateForm();
    if (!validation.valid) {
      setUploadStatus('error');
      setStatusMessage(validation.message);
      return;
    }
    
    // Set UI state to uploading
    setIsUploading(true);
    setUploadStatus(null);
    setUploadProgress(0);
    setUploadStep(2);
    
    console.log('Starting upload process...');
    console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
    
    try {
      const result = await uploadToServer();
      
      if (result.success) {
        console.log('Upload successful');
        setUploadStatus('success');
        setStatusMessage(result.message || 'Video uploaded successfully!');
        setUploadStep(3);
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading:', error);
      setUploadStatus('error');
      setStatusMessage(error.message || 'Failed to upload video. Please try again.');
      setUploadStep(1);
    } finally {
      setIsUploading(false);
    }
  };

  // Reset the form
  const handleReset = () => {
    setFormState({
      title: '',
      description: '',
      category: '',
      visibility: 'private',
      videoFile: null,
      thumbnailFile: null
    });
    
    // Clear previews
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setVideoPreview(null);
    setThumbnailPreview(null);
    
    // Reset UI states
    setUploadProgress(0);
    setUploadStatus(null);
    setStatusMessage('');
    setUploadStep(1);
  };

  // Render step indicator
  const renderSteps = () => (
    <div className="flex items-center justify-between mb-6">
      {[
        { step: 1, label: 'Details' },
        { step: 2, label: 'Upload' },
        { step: 3, label: 'Complete' }
      ].map(({ step, label }) => (
        <div key={step} className="flex flex-col items-center">
          <div 
            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step < uploadStep ? 'bg-green-600 text-white' : 
              step === uploadStep ? 'bg-blue-600 text-white' : 
              'bg-gray-700 text-gray-400'
            }`}
          >
            {step < uploadStep ? (
              <Check size={16} />
            ) : (
              <span>{step}</span>
            )}
          </div>
          <span className="mt-2 text-xs">{label}</span>
        </div>
      ))}
    </div>
  );

  // Render status alert if any
  const renderAlert = () => {
    if (!uploadStatus && !connectionStatus) return null;
    
    // Connection test alert
    if (connectionStatus) {
      return (
        <Alert
          color={connectionStatus.success ? 'success' : 'failure'}
          icon={connectionStatus.success ? Check : AlertCircle}
          onDismiss={() => setConnectionStatus(null)}
          className="mb-4"
        >
          {connectionStatus.message}
        </Alert>
      );
    }
    
    // Upload status alert
    return (
      <Alert
        color={uploadStatus === 'success' ? 'success' : 'failure'}
        icon={uploadStatus === 'success' ? Check : AlertCircle}
        onDismiss={() => {
          setUploadStatus(null);
          setStatusMessage('');
        }}
        className="mb-4"
      >
        {statusMessage}
      </Alert>
    );
  };

  // Render video upload area
  const renderVideoUpload = () => {
    if (!videoPreview) {
      return (
        <div className="flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-6">
          <label htmlFor="video" className="cursor-pointer text-center">
            <Video className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-2 text-sm text-gray-300">
              <p className="font-semibold">Click to upload a video</p>
              <p className="text-xs text-gray-400 mt-1">MP4, MOV, AVI, etc.</p>
            </div>
            <FileInput
              id="video"
              onChange={handleVideoFileChange}
              accept="video/*"
              className="hidden"
            />
          </label>
        </div>
      );
    }
    
    return (
      <div className="relative rounded-lg overflow-hidden bg-gray-900">
        <video 
          src={videoPreview} 
          controls 
          className="w-full h-auto max-h-64"
        />
        <button
          type="button"
          onClick={() => {
            URL.revokeObjectURL(videoPreview);
            setVideoPreview(null);
            setFormState(prev => ({ ...prev, videoFile: null }));
          }}
          className="absolute top-2 right-2 p-1 bg-red-600 rounded-full text-white"
        >
          <X size={16} />
        </button>
      </div>
    );
  };
  
  // Render thumbnail section - now required
  const renderThumbnail = () => {
    if (!thumbnailPreview) {
      return (
        <div className="flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-4">
          <label htmlFor="thumbnail" className="cursor-pointer text-center">
            <ImagePlus className="mx-auto h-8 w-8 text-gray-400" />
            <div className="mt-2 text-sm text-gray-300">
              <p className="font-semibold">Upload thumbnail (required)</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, etc.</p>
            </div>
            <FileInput
              id="thumbnail"
              onChange={handleThumbnailFileChange}
              accept="image/*"
              className="hidden"
            />
          </label>
        </div>
      );
    }
    
    return (
      <div className="relative rounded-lg overflow-hidden">
        <img 
          src={thumbnailPreview} 
          alt="Thumbnail" 
          className="w-full h-auto max-h-40 object-cover"
        />
        <button
          type="button"
          onClick={() => {
            URL.revokeObjectURL(thumbnailPreview);
            setThumbnailPreview(null);
            setFormState(prev => ({ ...prev, thumbnailFile: null }));
          }}
          className="absolute top-2 right-2 p-1 bg-red-600 rounded-full text-white"
        >
          <X size={16} />
        </button>
      </div>
    );
  };

  // Render upload progress UI
  const renderUploadProgress = () => (
    <div className="py-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">
          Uploading Your Video
        </h3>
        <p className="text-gray-400">
          Please wait while we upload your video
        </p>
      </div>
      
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between text-sm mb-1">
          <span>Upload Progress</span>
          <span>{Math.round(uploadProgress)}%</span>
        </div>
        <Progress
          progress={uploadProgress}
          size="lg"
          color="blue"
          className="mb-4"
        />
        
        <div className="flex items-center justify-center mt-6">
          <Spinner className="mr-2" />
          <span>Uploading {formState.videoFile?.name}</span>
        </div>
      </div>
    </div>
  );

  // Render success message
  const renderSuccess = () => (
    <div className="py-6 text-center">
      <div className="w-16 h-16 rounded-full bg-green-600 mx-auto flex items-center justify-center mb-4">
        <Check size={32} className="text-white" />
      </div>
      
      <h3 className="text-xl font-bold text-white mb-2">
        Upload Complete!
      </h3>
      <p className="text-gray-400 max-w-md mx-auto mb-6">
        Your video has been uploaded successfully.
      </p>
      
      <div className="flex justify-center space-x-4">
        <Button
          onClick={handleReset}
          color="gray"
        >
          Upload Another
        </Button>
        <Button
          href="/dashboard"
          color="blue"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );

  // Render content based on current step
  const renderContent = () => {
    if (uploadStep === 1) {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Debug Button - Only in development */}
          {import.meta.env.DEV && (
            <div className="mb-4">
              <Button 
                color="gray" 
                size="sm" 
                onClick={testBackendConnection}
                disabled={isTestingBackend}
                className="mb-2"
              >
                {isTestingBackend ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Testing Connection...
                  </>
                ) : (
                  'Test Backend Connection'
                )}
              </Button>
              <p className="text-xs text-gray-400">
                API URL: {import.meta.env.VITE_API_BASE_URL || 'Not set'}
              </p>
            </div>
          )}

          {/* Video Upload */}
          <div>
            <Label htmlFor="video" value="Video File (required)" className="mb-2" />
            {renderVideoUpload()}
          </div>

          {/* Title & Description */}
          <div>
            <Label htmlFor="title" value="Title (required)" className="mb-2" />
            <TextInput
              id="title"
              value={formState.title}
              onChange={handleInputChange}
              placeholder="Video title"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description" value="Description (Optional)" className="mb-2" />
            <Textarea
              id="description"
              value={formState.description}
              onChange={handleInputChange}
              placeholder="Describe your video"
              rows={3}
            />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category" value="Category (required)" className="mb-2" />
            <Select
              id="category"
              value={formState.category}
              onChange={handleInputChange}
              required
            >
              <option value="" disabled>Select category</option>
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Thumbnail - Now required */}
          <div>
            <Label htmlFor="thumbnail" value="Thumbnail (required)" className="mb-2" />
            {renderThumbnail()}
          </div>

          {/* Privacy */}
          <div>
            <Label htmlFor="visibility" value="Privacy" className="mb-2" />
            <Select
              id="visibility"
              value={formState.visibility}
              onChange={handleInputChange}
            >
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <Button
              type="button"
              onClick={handleReset}
              color="gray"
            >
              Clear
            </Button>
            <Button
              type="submit"
              disabled={!formState.videoFile || !formState.thumbnailFile || isUploading}
              color="blue"
            >
              <UploadIcon className="mr-2 h-5 w-5" />
              Upload Video
            </Button>
          </div>
        </form>
      );
    } else if (uploadStep === 2) {
      return renderUploadProgress();
    } else {
      return renderSuccess();
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-4">Upload Video</h1>
      
      {/* Progress steps */}
      {renderSteps()}
      
      {/* Status alert */}
      {renderAlert()}
      
      {/* Main Content */}
      <Card className="bg-gray-800 border-gray-700">
        {renderContent()}
      </Card>
    </div>
  );
};

export default UploadVideo;