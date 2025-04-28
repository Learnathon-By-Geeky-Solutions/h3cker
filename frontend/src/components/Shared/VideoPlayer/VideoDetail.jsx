import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import {  
  Avatar,
  Modal,
  TextInput,
  Alert,
  Button as FlowbiteButton
} from 'flowbite-react';
import { 
  ThumbsUp, 
  Share2, 
  ArrowLeft,
  Calendar,
  Tag,
  Copy, 
  MessageSquare,
  Link as LinkIcon,
  Edit,
  Trash,
  Eye,
  EyeOff,

} from 'lucide-react';
import VideoService from '../../../utils/VideoService';
import VideoPlayer from '../../Shared/VideoPlayer/VideoPlayer';
import { LoadingState, ErrorState } from '../../Shared/VideoLoadingStates/VideoLoadingStates';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';

// Modern primary action button component
const PrimaryButton = ({ icon, label, onClick, disabled = false, count, active = false }) => {
  const Icon = icon;
  
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative group shadow-lg h-auto overflow-hidden disabled:opacity-60"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <span className={`absolute inset-0 w-full h-full ${active 
        ? 'bg-gradient-to-r from-blue-600 to-blue-800' 
        : 'bg-gradient-to-r from-blue-500 to-blue-700'} rounded-[12px] sm:rounded-[14px] shadow-md`} />
      <span className="absolute inset-0 w-full h-full bg-white/10 rounded-[12px] sm:rounded-[14px] blur-[1px]" />
      <span className={`absolute inset-0 w-full h-full ${active 
        ? 'bg-blue-700' 
        : 'bg-blue-600'} rounded-[12px] sm:rounded-[14px] transform transition-transform group-hover:scale-[1.02] group-hover:brightness-110`} />
      <span className="relative flex items-center justify-center text-white font-medium py-2 sm:py-2.5 px-4 text-sm">
        {disabled ? (
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </div>
        ) : (
          <>
            <Icon size={18} className="mr-2" />
            {label}
            {count !== undefined && <span className="ml-2">({count})</span>}
          </>
        )}
      </span>
    </motion.button>
  );
};

// Secondary button component
const SecondaryButton = ({ icon, label, onClick, disabled = false }) => {
  const Icon = icon;
  
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-[12px] text-sm font-medium transition-colors disabled:opacity-50 flex items-center"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Icon size={16} className="mr-2" />
      {label}
    </motion.button>
  );
};

const VideoHeader = ({ video, handleBack, handleLike, handleShare, liked }) => {
  const formattedDate = video.upload_date 
    ? new Date(video.upload_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown date';
    
  return (
    <>
      <motion.button
        onClick={handleBack}
        className="mb-4 flex items-center px-3 py-2 bg-gray-700/50 text-gray-200 hover:bg-gray-600 rounded-[12px] border border-gray-600 transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </motion.button>
      
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
      
        <div className="flex flex-wrap gap-3 mb-4">
          <PrimaryButton 
            icon={ThumbsUp}
            label={liked ? 'Liked' : 'Like'}
            onClick={handleLike}
            count={video.likes || 0}
            active={liked}
          />
          
          <SecondaryButton
            icon={Share2}
            label="Share"
            onClick={handleShare}
          />
        </div>
      </div>
    </>
  );
};

// Separate component for the uploader info
const UploaderInfo = ({ video }) => (
  <div className="flex items-center mb-6">
    <div className="h-10 w-10 rounded-full bg-gray-600 overflow-hidden flex-shrink-0">
      <Avatar rounded size="md" />
    </div>
    <div className="ml-3">
      <p className="text-white font-medium">
        {video.uploader_name || video.uploader?.email || 'Video Creator'}
      </p>
      <p className="text-gray-400 text-sm">
        {video.uploader_email || video.uploader?.email || 'Creator'}
      </p>
    </div>
  </div>
);

UploaderInfo.propTypes = {
  video: PropTypes.shape({
    uploader_name: PropTypes.string,
    uploader_email: PropTypes.string,
    uploader: PropTypes.shape({
      email: PropTypes.string
    })
  }).isRequired
};

// Separate component for the description section
const VideoDescription = ({ description }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gray-700/50 p-4 rounded-[14px] border border-gray-600"
  >
    <h2 className="text-white font-medium mb-2">Description</h2>
    <p className="text-gray-300 whitespace-pre-line">
      {description || 'No description provided.'}
    </p>
  </motion.div>
);

VideoDescription.propTypes = {
  description: PropTypes.string
};

const CommentInput = ({ onSubmit }) => {
  const [comment, setComment] = useState('');
  
  const handleSubmit = () => {
    if (comment.trim()) {
      onSubmit(comment);
      setComment('');
    }
  };
  
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="h-8 w-8 rounded-full bg-gray-600 overflow-hidden flex-shrink-0">
        <Avatar rounded size="sm" />
      </div>
      <div className="flex-1">
        <input 
          type="text" 
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment..." 
          className="w-full bg-gray-700/50 border border-gray-600 rounded-[12px] px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
      </div>
      <motion.button
        onClick={handleSubmit}
        disabled={!comment.trim()}
        className="p-2 bg-blue-600 text-white rounded-full disabled:opacity-50 disabled:bg-gray-600"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageSquare size={16} />
      </motion.button>
    </div>
  );
};


const CommentsSection = () => {
  const handleCommentSubmit = (comment) => {
    console.log('New comment:', comment);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gray-800/80 backdrop-blur-md rounded-[16px] border border-gray-700 shadow-md p-5 mb-6"
    >
      <h3 className="text-lg font-medium text-white mb-4">Comments</h3>
      <CommentInput onSubmit={handleCommentSubmit} />
      <div className="text-center text-gray-400 py-6">
        No comments yet. Be the first to comment!
      </div>
    </motion.div>
  );
};

const ShareModal = ({ isOpen, onClose, videoId, videoTitle }) => {
  const [shareUrl, setShareUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && videoId) {
      setIsLoading(true);
      setError('');
      setIsCopied(false);
      
      const generateShareLink = async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/await-thenable
          const response = await VideoService.createVideoShare(videoId);
          if (response?.share_url) {
            setShareUrl(response.share_url);
          } else {
            setError('Could not generate share link.');
          }
        } catch (err) {
          setError('Failed to create share link. Please try again.');
          console.error('Share link creation failed:', err);
        } finally {
          setIsLoading(false);
        }
      };
      
      generateShareLink();
    }
  }, [isOpen, videoId]);

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 3000);
        })
        .catch(err => {
          console.error('Failed to copy:', err);
          setError('Failed to copy to clipboard. Please try manually selecting the link.');
        });
    }
  };

  return (
    <Modal show={isOpen} onClose={onClose} size="md">
      <Modal.Header className="bg-gray-800 text-white border-b border-gray-700">
        Share "{videoTitle}"
      </Modal.Header>
      <Modal.Body className="bg-gray-800 text-gray-300">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert color="failure" className="mb-4">
                {error}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-2">Generating share link...</span>
          </div>
        ) : (
          <>
            <p className="mb-4">Share this video with others using this unique link:</p>
            <div className="flex items-center gap-2">
              <TextInput
                icon={LinkIcon}
                value={shareUrl}
                readOnly
                className="flex-1"
                onChange={() => {}}
              />
              <PrimaryButton 
                icon={Copy} 
                label={isCopied ? 'Copied!' : 'Copy'} 
                onClick={copyToClipboard} 
              />
            </div>
            
            <AnimatePresence>
              {isCopied && (
                <motion.p 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-2 text-sm text-green-400"
                >
                  Link copied to clipboard!
                </motion.p>
              )}
            </AnimatePresence>
            
            <div className="mt-6">
              <p className="text-sm text-gray-400">
                This link allows anyone to view this video, even if it's set to private.
              </p>
            </div>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

// Related video card component
const RelatedVideoCard = ({ video, onClick }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gray-800/80 border border-gray-700 hover:bg-gray-700/80 transition-colors cursor-pointer rounded-[14px] overflow-hidden"
    onClick={onClick}
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex flex-col sm:flex-row p-3">
      <div className="w-full sm:w-24 h-24 sm:h-auto flex-shrink-0 mb-2 sm:mb-0">
        <img 
          src={video.thumbnail_url || '/api/placeholder/400/225'} 
          alt={video.title}
          className="w-full h-full object-cover rounded-lg"
          loading="lazy"
        />
      </div>
      <div className="sm:ml-3 flex-grow">
        <h5 className="text-sm font-medium text-white line-clamp-2">
          {video.title}
        </h5>
        <p className="text-xs text-gray-400 mt-1">
          {video.uploader_name || video.uploader?.email || 'Creator'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {video.views || 0} views • {VideoService.formatRelativeTime(video.upload_date)}
        </p>
      </div>
    </div>
  </motion.div>
);

// Separate component for related videos
const RelatedVideos = ({ videos, navigate }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <h3 className="text-lg font-medium text-white mb-4">Related Videos</h3>
    
    {videos.length > 0 ? (
      <div className="space-y-4">
        {videos.map(relatedVideo => (
          <RelatedVideoCard 
            key={relatedVideo.id}
            video={relatedVideo}
            onClick={() => navigate(`/video/${relatedVideo.id}`)} 
          />
        ))}
      </div>
    ) : (
      <div className="text-center text-gray-400 p-6 bg-gray-800/80 rounded-[14px] border border-gray-700">
        No related videos found.
      </div>
    )}

  </motion.div>
);

const VideoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [viewRecorded, setViewRecorded] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    const fetchVideoDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        setViewRecorded(false);
        
        // eslint-disable-next-line @typescript-eslint/await-thenable
        const videoData = await VideoService.getVideoDetails(id);
        setVideo(videoData);
        setLiked(!!videoData.is_liked);
        
        await fetchRelatedVideos(videoData);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching video details:', error);
        const errorResponse = error.response || {};
        const errorStatus = errorResponse.status;
        let errorMessage = 'Failed to load video. Please try again later.';
        
        if (errorStatus === 404) {
          errorMessage = 'Video not found or link has expired.';
        } else if (errorStatus === 403) {
          errorMessage = 'This video is private or no longer available.';
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    };

    const fetchRelatedVideos = async (currentVideo) => {
      if (!currentVideo) return;
      
      try {
        // eslint-disable-next-line @typescript-eslint/await-thenable
        const videoFeed = await VideoService.getVideoFeed();
        if (Array.isArray(videoFeed) && videoFeed.length > 0) {
          const related = videoFeed
            .filter(v => v.id !== currentVideo.id) 
            .filter(v => 
              v.category === currentVideo.category || 
              (v.uploader?.email === currentVideo.uploader?.email)
            )
            .slice(0, 4);
            
          setRelatedVideos(related);
        }
      } catch (relatedError) {
        console.error('Error fetching related videos:', relatedError);
      }
    };

    if (id) {
      fetchVideoDetails();
    } else {
      setError('Invalid video ID');
      setLoading(false);
    }
  }, [id]);

  const handleBack = () => {
    navigate(-1); 
  };

  const recordView = useCallback(async () => {
    if (!id || viewRecorded) return;
    
    try {
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await VideoService.recordVideoView(id);
      setViewRecorded(true);
      
      setVideo(prev => ({
        ...prev,
        views: (prev.views || 0) + 1
      }));
    } catch (error) {
      console.error('Error recording view:', error);
    }
  }, [id, viewRecorded]);

  const handleLike = async () => {
    if (!id) return;
    
    try {
      // eslint-disable-next-line @typescript-eslint/await-thenable
      const response = await VideoService.toggleVideoLike(id);
      
      if (response) {
        const newLikedStatus = response.liked;
        setLiked(newLikedStatus);
        
        setVideo(prev => ({
          ...prev,
          likes: response.likes
        }));
      }
    } catch (error) {
      console.error('Error liking video:', error);
      alert('Failed to update like status. Please try again.');
    }
  };

  const handleShare = () => {
    setShareModalOpen(true);
  };

  const handleVideoEnded = () => {
    console.log('Video playback ended');
  };

  // Admin functions
  const handleToggleVisibility = async () => {
    try {
      const newVisibility = video.visibility === 'private' ? 'public' : 'private';
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await VideoService.adminUpdateVideoVisibility(id, newVisibility);
      setVideo({
        ...video,
        visibility: newVisibility
      });
      setError(null);
    } catch (error) {
      console.error('Error updating video visibility:', error);
      setError('Failed to update video visibility. Please try again.');
    }
  };

  const handleDeleteVideo = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await VideoService.adminDeleteVideo(id);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Error deleting video:', error);
      setError('Failed to delete video. Please try again.');
      setDeleteModalOpen(false);
    }
  };

  const renderAdminControls = () => {
    // Only show for admin users
    if (!user || user.role !== 'admin') return null;
    
    return (
      <div className="bg-gray-800/80 backdrop-blur-md rounded-[16px] border border-gray-700 shadow-md p-5 mb-6">
        <h3 className="text-lg font-medium text-white mb-4">Admin Controls</h3>
        <div className="flex flex-wrap gap-3">
          <PrimaryButton 
            icon={Edit}
            label="Edit Video"
            onClick={() => navigate(`/dashboard/edit-video/${id}`)}
          />
          <SecondaryButton
            icon={Trash}
            label="Delete Video"
            onClick={() => setDeleteModalOpen(true)}
          />
          <SecondaryButton
            icon={video?.visibility === 'private' ? Eye : EyeOff}
            label={video?.visibility === 'private' ? 'Make Public' : 'Make Private'}
            onClick={handleToggleVisibility}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingState message="Loading video..." />;
  }

  if (error) {
    return (
      <ErrorState 
        error={error} 
        onBack={handleBack}
      />
    );
  }

  if (!video) {
    return (
      <ErrorState 
        error="Video not found" 
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-lg overflow-hidden shadow-xl"
          >
            <VideoPlayer 
              videoUrl={video.video_url}
              thumbnailUrl={video.thumbnail_url}
              title={video.title}
              videoId={id}
              onPlay={recordView}
              onEnded={handleVideoEnded}
            />
          </motion.div>

          {/* Admin Controls - Only visible for admins */}
          {renderAdminControls()}
    
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/80 backdrop-blur-md rounded-[16px] border border-gray-700 shadow-md p-5 mb-6"
          >
            <VideoHeader 
              video={video} 
              handleBack={handleBack} 
              handleLike={handleLike}
              handleShare={handleShare}
              liked={liked}
            />
            
            <hr className="border-gray-700 my-4" />
            
            <UploaderInfo video={video} />
            <VideoDescription description={video.description} />
          </motion.div>
          
          <CommentsSection />
        </div>
        <div className="lg:col-span-1">
          <RelatedVideos videos={relatedVideos} navigate={navigate} />
        </div>
      </div>
      <ShareModal 
        isOpen={shareModalOpen} 
        onClose={() => setShareModalOpen(false)} 
        videoId={id}
        videoTitle={video.title} 
      />
      
      {/* Delete Video Confirmation Modal */}
      <Modal show={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <Modal.Header className="bg-gray-800 text-white border-b border-gray-700">
          Delete Video
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          <p className="mb-2">Are you sure you want to delete "{video?.title}"?</p>
          <p className="text-red-400">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer className="bg-gray-800 border-t border-gray-700">
          <FlowbiteButton color="failure" onClick={handleDeleteVideo}>
            Delete Permanently
          </FlowbiteButton>
          <FlowbiteButton color="gray" onClick={() => setDeleteModalOpen(false)}>
            Cancel
          </FlowbiteButton>
        </Modal.Footer>
      </Modal>
    </div>
  );
};


PrimaryButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  count: PropTypes.number,
  active: PropTypes.bool
};

SecondaryButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

VideoHeader.propTypes = {
  video: PropTypes.shape({
    title: PropTypes.string,
    views: PropTypes.number,
    upload_date: PropTypes.string,
    category: PropTypes.string,
    likes: PropTypes.number
  }).isRequired,
  handleBack: PropTypes.func.isRequired,
  handleLike: PropTypes.func.isRequired,
  handleShare: PropTypes.func.isRequired,
  liked: PropTypes.bool.isRequired,
};

RelatedVideoCard.propTypes = {
  video: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string,
    thumbnail_url: PropTypes.string,
    uploader_name: PropTypes.string,
    uploader: PropTypes.shape({
      email: PropTypes.string
    }),
    views: PropTypes.number,
    upload_date: PropTypes.string
  }).isRequired,
  onClick: PropTypes.func.isRequired
};

CommentInput.propTypes = {
  onSubmit: PropTypes.func.isRequired
};

ShareModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  videoId: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  videoTitle: PropTypes.string
};

RelatedVideos.propTypes = {
  videos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string,
      thumbnail_url: PropTypes.string,
      uploader_name: PropTypes.string,
      views: PropTypes.number,
      upload_date: PropTypes.string
    })
  ).isRequired,
  navigate: PropTypes.func.isRequired
};

export default VideoDetail;