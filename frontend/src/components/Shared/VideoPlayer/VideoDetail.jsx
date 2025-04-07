import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Spinner, 
  Alert,
  Avatar
} from 'flowbite-react';
import { 
  ThumbsUp, 
  MessageCircle, 
  Share2, 
  ArrowLeft,
  Calendar,
  Tag
} from 'lucide-react';
import VideoService from '../../../utils/VideoService';
import VideoPlayer from './VideoPlayer';
const VideoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch video details on component mount
  useEffect(() => {
    const fetchVideoDetails = async () => {
      try {
        setLoading(true);
        const videoData = await VideoService.getVideoDetails(id);
        setVideo(videoData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching video details:', error);
        setError('Failed to load video. Please try again later.');
        setLoading(false);
      }
    };

    if (id) {
      fetchVideoDetails();
    }
  }, [id]);

  // Handle back button click
  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="xl" color="blue" />
      </div>
    );
  }

  // Show error message if fetching failed
  if (error) {
    return (
      <Alert color="failure" className="mb-4">
        <p className="font-medium">{error}</p>
        <Button color="failure" onClick={handleBack} className="mt-2">
          Go Back
        </Button>
      </Alert>
    );
  }

  // Show not found message if video doesn't exist
  if (!video) {
    return (
      <Alert color="info" className="mb-4">
        <p className="font-medium">Video not found</p>
        <Button color="light" onClick={handleBack} className="mt-2">
          Go Back
        </Button>
      </Alert>
    );
  }

  // Format upload date
  const formattedDate = video.upload_date 
    ? new Date(video.upload_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown date';

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back button */}
      <Button 
        color="gray" 
        size="sm" 
        onClick={handleBack}
        className="mb-4 flex items-center"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Video player */}
      <div className="mb-4">
        <VideoPlayer 
          videoUrl={video.video_url}
          thumbnailUrl={video.thumbnail_url}
          title={video.title}
        />
      </div>

      {/* Video info */}
      <Card className="bg-gray-800 border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {video.title}
          </h1>
          
          <div className="flex items-center text-gray-400 text-sm mb-4">
            <Calendar className="h-4 w-4 mr-1" />
            <span>Uploaded on {formattedDate}</span>
            
            {video.category && (
              <>
                <span className="mx-2">•</span>
                <Tag className="h-4 w-4 mr-1" />
                <span>{video.category}</span>
              </>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 mb-6">
            <Button color="gray" size="sm" className="flex items-center">
              <ThumbsUp className="mr-2 h-4 w-4" />
              Like
            </Button>
            <Button color="gray" size="sm" className="flex items-center">
              <MessageCircle className="mr-2 h-4 w-4" />
              Comment
            </Button>
            <Button color="gray" size="sm" className="flex items-center">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
          
          <hr className="border-gray-700 my-4" />
          
          {/* Uploader info (placeholder) */}
          <div className="flex items-center mb-4">
            <Avatar rounded />
            <div className="ml-3">
              <p className="text-white font-medium">Uploaded by Video Creator</p>
              <p className="text-gray-400 text-sm">Channel information would go here</p>
            </div>
          </div>
          
          {/* Description */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h2 className="text-white font-medium mb-2">Description</h2>
            <p className="text-gray-300 whitespace-pre-line">
              {video.description || 'No description provided.'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default VideoDetail;