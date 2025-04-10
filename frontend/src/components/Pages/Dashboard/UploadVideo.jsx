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
  ArrowRight,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import VideoService from "../../../utils/VideoService";
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';

const UploadVideo = () => {
  const { user } = useContext(AuthContext);

  // === State Definitions ===
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    visibility: 'private'
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [generatedFilename, setGeneratedFilename] = useState('');
  const [uploadUrls, setUploadUrls] = useState({
    videoUrl: null,
    thumbnailUrl: null
  });
  const [uploadStatus, setUploadStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [debugInfo, setDebugInfo] = useState(null); // For development only
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState(null);

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

  // === Logic ===
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
    const uniqueFilename = `${safeName || 'video'}_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;
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
    setDebugInfo(null);

    try {
  
      const response = await VideoService.initiateVideoUpload(metadataPayload);


      setDebugInfo(response);

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
    
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0];

    if (thumbnailPreviewUrl) {
      URL.revokeObjectURL(thumbnailPreviewUrl);
   
      setThumbnailPreviewUrl(null);
    }

    if (!file) {
      setThumbnailFile(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setStatusMessage('Invalid file type. Please select an image file (JPG, PNG, WEBP).');
      setUploadStatus('error');
      e.target.value = '';
      setThumbnailFile(null);
      return;
    }

    setThumbnailFile(file);
    setUploadStatus(null);
    setStatusMessage('');

    const newPreviewUrl = URL.createObjectURL(file);
    setThumbnailPreviewUrl(newPreviewUrl);

  };

  const validateFileForm = () => {
    if (!videoFile) {
      return { valid: false, message: 'Please select a video file to upload.' };
    }
    if (!thumbnailFile) {
      return { valid: false, message: 'Please select a thumbnail image.' };
    }
    if (!uploadUrls.videoUrl || !uploadUrls.thumbnailUrl) {
      return { valid: false, message: 'Upload authorization is missing. Please go back to details.' };
    }
    return { valid: true, message: '' };
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    const validation = validateFileForm();
    if (!validation.valid) {
      setUploadStatus('error');
      setStatusMessage(validation.message);
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);
    setStatusMessage('Starting upload...');


    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
     
      setVideoPreviewUrl(null);
    }
    if (thumbnailPreviewUrl) {
      URL.revokeObjectURL(thumbnailPreviewUrl);
   
      setThumbnailPreviewUrl(null);
    }

    try {

      setStatusMessage(`Uploading video: ${videoFile.name}...`);
      await VideoService.uploadFileToBlob(uploadUrls.videoUrl, videoFile, (progress) => {
  
        setUploadProgress(progress * 70); 
        setStatusMessage(`Uploading video: ${Math.round(progress * 100)}%`);
      });

      setUploadProgress(70); 


      setStatusMessage(`Uploading thumbnail: ${thumbnailFile.name}...`);
      await VideoService.uploadFileToBlob(uploadUrls.thumbnailUrl, thumbnailFile, (progress) => {
   
        setUploadProgress(70 + (progress * 30));
        setStatusMessage(`Uploading thumbnail: ${Math.round(progress * 100)}%`);
      });
    

      setUploadProgress(100); // Ensure 100% at the end
      setUploadStatus('success');
      setStatusMessage('Video and thumbnail uploaded successfully!');
      setCurrentStep(3);

    } catch (error) {
      console.error('File upload failed:', error);
      setUploadStatus('error');
      setStatusMessage(`Upload failed: ${error.message || 'An unknown error occurred during upload.'}`);
  
    }
  };

  const handleReset = () => {
    setFormData({ title: '', description: '', category: '', visibility: 'private' });
    setVideoFile(null);
    setThumbnailFile(null);
    setGeneratedFilename('');
    setUploadUrls({ videoUrl: null, thumbnailUrl: null });
    setUploadStatus(null);
    setStatusMessage('');
    setUploadProgress(0);
    setCurrentStep(1);
    setDebugInfo(null);


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

  // === Render Functions ===

  const renderMetadataForm = () => (
    <form onSubmit={handleMetadataSubmit} className="space-y-4">
      <div>
        <div className="mb-2 block">
          <Label htmlFor="title" value="Video Title (required)" />
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
            <Label htmlFor="description" value="Description" />
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
           <Label htmlFor="category" value="Category" />
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
            <Label htmlFor="visibility" value="Visibility" />
        </div>
        <Select id="visibility" value={formData.visibility} onChange={handleInputChange}>
          <option value="private">Private (Only you can see)</option>
          <option value="unlisted">Unlisted (Anyone with the link)</option>
          <option value="public">Public (Visible to everyone)</option>
        </Select>
         <p className="mt-1 text-xs text-gray-400">
              Choose who can view your video.
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
        <p className="text-gray-400 mt-1">
          Select the video file and a thumbnail image.
        </p>
      </div>

  
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="flex flex-col space-y-4"> 
          <div>
            <div className="mb-2 block">
              <Label htmlFor="video" value="Video File (required)" />
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
                    Your browser does not support the video tag.
                  </video>
                 </div>
              </div>
            ) : (
              <div className="p-3 border border-dashed border-gray-600 rounded-lg bg-gray-700/30 flex items-center justify-center text-gray-500 h-full">
                 <Video className="w-10 h-10" /> 
                 <span className="ml-2">Video preview appears here</span>
              </div>
            )}
          </div>
        </div>

        {/* === Thumbnail Column === */}
        <div className="flex flex-col space-y-4"> 
          <div>
            <div className="mb-2 block">
              <Label htmlFor="thumbnail" value="Thumbnail Image (required)" />
            </div>
            <FileInput
              id="thumbnail"
              onChange={handleThumbnailChange}
              accept="image/jpeg, image/png, image/webp, image/gif"
              helperText="Upload a preview image (JPG, PNG, WEBP). Ratio 16:9."
              required
            />
            {thumbnailFile && (
              <p className="mt-2 text-xs text-green-400 flex items-center">
                 <Check size={14} className="mr-1 flex-shrink-0"/> 
                 <span className="truncate"> 
                   Selected: {thumbnailFile.name} ({(thumbnailFile.size / 1024).toFixed(1)} KB)
                 </span>
              </p>
            )}
          </div>
           <div className="flex-grow flex flex-col min-h-[150px]">
              {thumbnailPreviewUrl ? (
                <div className="p-3 border border-gray-600 rounded-lg bg-gray-700/50 flex flex-col h-full">
                  <Label value="Thumbnail Preview" className="text-sm font-medium text-gray-300 mb-2 block flex-shrink-0"/>
             
                  <div className="relative w-full aspect-video bg-black rounded overflow-hidden flex-grow"> 
                    <img
                      src={thumbnailPreviewUrl}
                      alt="Thumbnail Preview"
                      className="absolute top-0 left-0 w-full h-full object-contain"
                    />
                   </div>
                </div>
              ) : (
                 <div className="p-3 border border-dashed border-gray-600 rounded-lg bg-gray-700/30 flex items-center justify-center text-gray-500 h-full">
                   <ImagePlus className="w-10 h-10" />
                   <span className="ml-2">Thumbnail preview appears here</span>
                 </div>
              )}
           </div>
        </div>
      </div> 

      <div className="flex justify-between items-center pt-5 border-t border-gray-600 mt-8"> {/* Increased top margin */}
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
          disabled={!videoFile || !thumbnailFile || !uploadUrls.videoUrl || !uploadUrls.thumbnailUrl || uploadStatus === 'uploading'}
          color="blue"
          isProcessing={uploadStatus === 'uploading'}
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
        <p className="text-gray-400">
           Please keep this window open until the upload completes.
        </p>
      </div>
      <div className="max-w-lg mx-auto space-y-4">
         <div>
            <div className="flex justify-between text-sm mb-1 text-gray-300">
              <span>Overall Progress</span>
              <span>{Math.round(uploadProgress)}%</span>
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
      <p className="text-gray-400 max-w-md mx-auto mb-8">
        Your video <span className="font-medium text-gray-300">"{formData.title}"</span> has been successfully uploaded. It may take a few moments to process before it's available.
      </p>
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
        <Button onClick={handleReset} color="gray" outline>
          Upload Another Video
        </Button>
        <Button href="/dashboard/videos" color="blue">
          View My Videos
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

  const renderSteps = () => (
    <ol className="flex items-center w-full text-sm font-medium text-center text-gray-400 sm:text-base mb-8">
        {[
            { number: 1, label: 'Video Details' },
            { number: 2, label: 'Upload Files' },
            { number: 3, label: 'Complete' }
        ].map((step, index, arr) => (
            <li key={step.number} className={`flex items-center ${
                currentStep === step.number ? 'text-blue-500' :
                currentStep > step.number ? 'text-green-500' : 'text-gray-500'
            } ${index < arr.length - 1 ? "w-full after:content-[''] after:w-full after:h-1 after:border-b after:border-gray-600 after:border-1 after:inline-block" : ''} ${index > 0 ? 'md:w-full' : ''}`}>
                 <span className={`flex items-center justify-center ${index < arr.length - 1 ? 'after:content-["/"] sm:after:hidden after:mx-2 after:text-gray-500' : ''}`}>
                     <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 mr-2 ${
                          currentStep === step.number ? 'border-blue-500 bg-blue-900' :
                          currentStep > step.number ? 'border-green-500 bg-green-900' :
                          'border-gray-600 bg-gray-700'
                     }`}>
                        {currentStep > step.number ? <Check size={16} /> : <span>{step.number}</span>}
                     </div>
                    {step.label}
                </span>
            </li>
        ))}
    </ol>
);

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
        return <p className="text-center text-gray-400">Loading...</p>;
    }
  };

  const renderDebugInfo = () => {
     if (import.meta.env.MODE !== 'development' || !debugInfo) {
       return null;
     }
    return (
      <div className="mt-6 p-4 bg-gray-900 rounded border border-gray-700 text-xs text-gray-300">
        <h4 className="font-semibold mb-2 text-gray-200">Debug Info (Development Only)</h4>
        <div>
          <p className="font-medium">Backend Response (SAS URLs):</p>
          <pre className="overflow-auto max-h-40 bg-black p-2 rounded mt-1 text-xs">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
         <div className="mt-2">
             <p className="font-medium">Generated Filename Hint:</p>
             <p className="text-mono bg-black p-1 rounded mt-1 inline-block">{generatedFilename || 'Not generated yet'}</p>
         </div>
      </div>
    );
  };


  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-0">
      <h1 className="text-2xl font-bold text-white mb-6">Upload New Video</h1>

      {renderSteps()}
      {renderAlert()}

      <Card className="bg-gray-800 border-gray-700 shadow-lg p-6">
        {renderContent()}
      </Card>

      {renderDebugInfo()}
    </div>
  );
};

export default UploadVideo;
