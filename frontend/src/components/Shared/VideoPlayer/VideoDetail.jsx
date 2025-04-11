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
  Tag,
  Bookmark,
  Flag
} from 'lucide-react';
import VideoService from '../../../utils/VideoService';
import VideoPlayer from './VideoPlayer';

const VideoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState([]);

  // Fetch video details on component mount
  useEffect(() => {
    const fetchVideoDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const videoData = await VideoService.getVideoDetails(id);
        setVideo(videoData);
        
        // Fetch related videos (similar category or from same uploader)
        try {
          const videoFeed = await VideoService.getVideoFeed();
          if (Array.isArray(videoFeed) && videoFeed.length > 0 && videoData) {
            const related = videoFeed
              .filter(v => v.id !== videoData.id) // Exclude current video
              .filter(v => 
                v.category === videoData.category || 
                v.uploader_email === videoData.uploader_email
              )
              .slice(0, 4); // Get at most 4 related videos
              
            setRelatedVideos(related);
          }
        } catch (relatedError) {
          console.error('Error fetching related videos:', relatedError);
          // Don't set main error - still show video if possible
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching video details:', error);
        setError('Failed to load video. Please try again later.');
        setLoading(false);
      }
    };

    if (id) {
      fetchVideoDetails();
    } else {
      setError('Invalid video ID');
      setLoading(false);
    }

    // Clean up function
    return () => {
      // Any cleanup if needed
    };
  }, [id]);

  // Handle back button click
  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  // Handle video like
  const handleLike = async () => {
    try {
      // In a real app, you'd call an API to record the like
      // await VideoService.likeVideo(id);
      
      // For now, just toggle the UI state
      setLiked(!liked);
      
      // Update the video object to reflect the like
      if (video) {
        setVideo(prev => ({
          ...prev,
          likes: (prev.likes || 0) + (liked ? -1 : 1)
        }));
      }
    } catch (error) {
      console.error('Error liking video:', error);
    }
  };

  // Handle video end event
  const handleVideoEnded = () => {
    console.log('Video playback ended');
    // You could implement autoplay next video here
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
    <div className="max-w-6xl mx-auto px-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Video player */}
          <div className="mb-4 rounded-lg overflow-hidden shadow-xl">
            <VideoPlayer 
              videoUrl={video.video_url}
              thumbnailUrl={video.thumbnail_url}
              title={video.title}
              onEnded={handleVideoEnded}
            />
          </div>

          {/* Video info */}
          <Card className="bg-gray-800 border-gray-700 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {video.title}
              </h1>
              
              <div className="flex flex-wrap items-center justify-between">
                <div className="flex items-center text-gray-400 text-sm mb-4">
                  <span className="mr-3">{video.views || 0} views</span>
                  
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{formattedDate}</span>
                  </div>
                  
                  {video.category && (
                    <div className="flex items-center ml-3">
                      <Tag className="h-4 w-4 mr-1" />
                      <span>{video.category}</span>
                    </div>
                  )}
                </div>
              
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button 
                    color={liked ? "blue" : "gray"} 
                    size="sm" 
                    className={`flex items-center ${liked ? 'bg-blue-600' : ''}`}
                    onClick={handleLike}
                  >
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    {liked ? 'Liked' : 'Like'} {video.likes ? `(${video.likes})` : ''}
                  </Button>
                  
                  <Button color="gray" size="sm" className="flex items-center">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Comment
                  </Button>
                  
                  <Button color="gray" size="sm" className="flex items-center">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                  
                  <Button color="gray" size="sm" className="flex items-center">
                    <Bookmark className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </div>
              </div>
              
              <hr className="border-gray-700 my-4" />
              
              {/* Uploader info */}
              <div className="flex items-center mb-6">
                <Avatar rounded size="md" />
                <div className="ml-3">
                  <p className="text-white font-medium">
                    {video.uploader_name || 'Video Creator'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {video.uploader_email || 'Administrator'}
                  </p>
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
          
          {/* Comments section placeholder */}
          <Card className="bg-gray-800 border-gray-700 mb-6">
            <h3 className="text-lg font-medium text-white mb-4">Comments</h3>
            <div className="flex items-center mb-4">
              <Avatar rounded size="sm" />
              <input 
                type="text" 
                placeholder="Add a comment..." 
                className="ml-3 w-full bg-gray-700 border-none rounded-lg text-white"
              />
            </div>
            <div className="text-center text-gray-400 py-6">
              No comments yet. Be the first to comment!
            </div>
          </Card>
        </div>
        
        {/* Related videos column */}
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Related Videos</h3>
          
          {relatedVideos.length > 0 ? (
            <div className="space-y-4">
              {relatedVideos.map(relatedVideo => (
                <Card 
                  key={relatedVideo.id}
                  className="bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer"
                  onClick={() => navigate(`/video/${relatedVideo.id}`)}
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:w-24 h-24 sm:h-auto flex-shrink-0 mb-2 sm:mb-0">
                      <img 
                        src={relatedVideo.thumbnail_url || 'https://flowbite.com/docs/images/blog/image-1.jpg'} 
                        alt={relatedVideo.title}
                        className="w-full h-full object-cover rounded-lg"
                        loading="lazy"
                      />
                    </div>
                    <div className="sm:ml-3 flex-grow">
                      <h5 className="text-sm font-medium text-white line-clamp-2">
                        {relatedVideo.title}
                      </h5>
                      <p className="text-xs text-gray-400 mt-1">
                        {relatedVideo.uploader_name || 'Administrator'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {relatedVideo.views || 0} views • {VideoService.formatRelativeTime(relatedVideo.upload_date)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 p-6 bg-gray-800 rounded-lg">
              No related videos found.
            </div>
          )}

          {/* Report section */}
          <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <Button 
              color="gray" 
              size="xs" 
              className="flex items-center mx-auto"
            >
              <Flag className="mr-2 h-3 w-3" />
              Report video
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetail;