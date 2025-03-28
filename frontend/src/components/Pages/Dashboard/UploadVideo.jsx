import React, { useState } from 'react';
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
  Checkbox,
  Alert
} from 'flowbite-react';
import { 
  Upload as UploadIcon, 
  Video, 
  ImagePlus, 
  Check, 
  X, 
  AlertCircle
} from 'lucide-react';

const UploadVideo = () => {
  // Form states
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    category: '',
    visibility: 'private',
    allowComments: true,
    videoFile: null,
    thumbnailFile: null,
    customThumbnail: false,
  });

  // UI states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error', null er jonno
  const [statusMessage, setStatusMessage] = useState('');
  const [videoPreview, setVideoPreview] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [uploadStep, setUploadStep] = useState(1); // 1: Details, 2: Upload, 3: Complete 3steps for upl

  // Basic categories for testing
  const categories = [
    { value: 'educational', label: 'Educational' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'other', label: 'Other' },
  ];

  // Handle input changes
  const handleInputChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormState(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle file selection for video
  const handleVideoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Only validate if it's a video file - no size limit for testing oke
    if (!file.type.startsWith('video/')) {
      setUploadStatus('error');
      setStatusMessage('Please select a valid video file');
      return;
    }

    setFormState(prev => ({ ...prev, videoFile: file }));
    
    // Create video preview
    const videoURL = URL.createObjectURL(file);
    setVideoPreview(videoURL);
    
    // Reset error state
    setUploadStatus(null);
    setStatusMessage('');
    
    // BACKEND INTEGRATION POINT: 
    // Check server-side validation for the video file here if needed
  };

  // Handle file selection for thumbnail
  const handleThumbnailFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate image type
    if (!file.type.startsWith('image/')) {
      setUploadStatus('error');
      setStatusMessage('Please select a valid image file for thumbnail');
      return;
    }

    setFormState(prev => ({ ...prev, thumbnailFile: file }));
    
    // Create thumbnail preview
    const imageURL = URL.createObjectURL(file);
    setThumbnailPreview(imageURL);
    
    // BACKEND INTEGRATION POINT:
    // Add thumbnail validation on the server-side if needed and handle errors
  };

  // Toggle custom thumbnail option
  const handleToggleCustomThumbnail = () => {
    setFormState(prev => ({ 
      ...prev, 
      customThumbnail: !prev.customThumbnail,
      thumbnailFile: !prev.customThumbnail ? prev.thumbnailFile : null
    }));
    
    if (thumbnailPreview && !formState.customThumbnail) {
      URL.revokeObjectURL(thumbnailPreview);
      setThumbnailPreview(null);
    }
  };

  // Basic form validation
  const validateForm = () => {
    if (!formState.title.trim()) {
      return { valid: false, message: 'Please enter a title for your video' };
    }
    
    if (!formState.videoFile) {
      return { valid: false, message: 'Please select a video file to upload' };
    }
    
    return { valid: true };
  };

  // replace with actual upload function ***Ariyan***
  const simulateUpload = async () => {
    // BACKEND INTEGRATION POINT:

    // For testing: simulate upload progress
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setUploadProgress(progress);
        
        if (progress >= 100) {
          clearInterval(interval);
          resolve({ success: true, message: 'Video uploaded successfully!' });
        }
      }, 200);
    });
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
    
    try {
      // BACKEND INTEGRATION POINT:
      // Replace simulateUpload with actual API call
      const result = await simulateUpload();
      
      if (result.success) {
        setUploadStatus('success');
        setStatusMessage(result.message || 'Video uploaded successfully!');
        setUploadStep(3);
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      setUploadStatus('error');
      setStatusMessage(error.message || 'Failed to upload video. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Reset the form
  const handleReset = () => {
    // BACKEND INTEGRATION POINT:
    // You might need to cancel any ongoing uploads here
    
    setFormState({
      title: '',
      description: '',
      category: '',
      visibility: 'private',
      allowComments: true,
      videoFile: null,
      thumbnailFile: null,
      customThumbnail: false,
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
    if (!uploadStatus) return null;
    
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
  
  // Render thumbnail section
  const renderThumbnail = () => {
    if (!formState.customThumbnail) {
      return null;
    }
    
    if (!thumbnailPreview) {
      return (
        <div className="flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-4 mt-2">
          <label htmlFor="thumbnail" className="cursor-pointer text-center">
            <ImagePlus className="mx-auto h-8 w-8 text-gray-400" />
            <div className="mt-2 text-sm text-gray-300">
              <p>Upload thumbnail</p>
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
      <div className="relative rounded-lg overflow-hidden mt-2">
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
          href="/dashboard/videos"
          color="blue"
        >
          Go to My Videos
        </Button>
      </div>
    </div>
  );

  // Render content based on current step
  const renderContent = () => {
    if (uploadStep === 1) {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Video Upload */}
          <div>
            <Label htmlFor="video" value="Video File" className="mb-2" />
            {renderVideoUpload()}
          </div>

          {/* Title & Description */}
          <div>
            <Label htmlFor="title" value="Title" className="mb-2" />
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
            <Label htmlFor="category" value="Category" className="mb-2" />
            <Select
              id="category"
              value={formState.category}
              onChange={handleInputChange}
            >
              <option value="" disabled>Select category</option>
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Custom Thumbnail */}
          <div>
            <div className="flex items-center mb-2">
              <Checkbox
                id="customThumbnail"
                checked={formState.customThumbnail}
                onChange={handleToggleCustomThumbnail}
                className="mr-2"
              />
              <Label htmlFor="customThumbnail" value="Use custom thumbnail" />
            </div>
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

          {/* Allow Comments */}
          <div className="flex items-center">
            <Checkbox
              id="allowComments"
              checked={formState.allowComments}
              onChange={handleInputChange}
              className="mr-2"
            />
            <Label htmlFor="allowComments" value="Allow comments" />
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
              disabled={!formState.videoFile || isUploading}
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