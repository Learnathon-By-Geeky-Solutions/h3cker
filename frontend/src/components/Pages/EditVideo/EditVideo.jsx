import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, TextInput, Textarea, Select, Button, Spinner, Alert } from 'flowbite-react';
import { Save, ArrowLeft, Trash } from 'lucide-react';
import VideoService from '../../../utils/VideoService';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';

const EditVideo = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    visibility: 'private',
    view_limit: '',
    auto_private_after: ''
  });
  
  // Add these to prevent infinite loops
  const fetchAttempted = useRef(false);
  const isMounted = useRef(true);
  
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
  
  // Set up the isMounted ref
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    
    // Only fetch once
    if (fetchAttempted.current) return;
    
    const fetchVideoDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        fetchAttempted.current = true;
        
        const videoData = await VideoService.getVideoDetails(id);
        
        if (videoData && isMounted.current) {
          setVideo(videoData);
          setFormData({
            title: videoData.title || '',
            description: videoData.description || '',
            category: videoData.category || '',
            visibility: videoData.visibility || 'private',
            view_limit: videoData.view_limit || '',
            auto_private_after: videoData.auto_private_after ? 
              new Date(videoData.auto_private_after).toISOString().slice(0, 16) : ''
          });
        }
      } catch (err) {
        console.error('Error fetching video details:', err);
        if (isMounted.current) {
          setError('Failed to load video details. Please try again.');
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };
    
    if (id) {
      fetchVideoDetails();
    }
  }, [id, navigate, user]);
  
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const updateData = {
        ...formData
      };
      
      if (updateData.view_limit === '') {
        updateData.view_limit = null;
      }
      
      if (updateData.auto_private_after === '') {
        updateData.auto_private_after = null;
      }
      
      await VideoService.adminEditVideo(id, updateData);
      
      setSuccess('Video updated successfully');
      
      // Get updated data without causing a loop
      try {
        const updatedVideo = await VideoService.getVideoDetails(id);
        if (isMounted.current) {
          setVideo(updatedVideo);
        }
      } catch (updateError) {
        console.error('Error fetching updated video:', updateError);
      }
      
    } catch (err) {
      console.error('Error updating video:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to update video. Please try again.');
      }
    } finally {
      if (isMounted.current) {
        setSaving(false);
      }
    }
  };
  
  const handleBack = () => {
    navigate('/dashboard/videos');
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="xl" />
      </div>
    );
  }
  
  if (!video) {
    return (
      <div className="text-center py-12">
        <Alert color="failure">
          Video not found or you don't have permission to edit it.
        </Alert>
        <Button color="gray" onClick={handleBack} className="mt-4">
          Back to Videos
        </Button>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Edit Video</h1>
        <Button color="gray" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Videos
        </Button>
      </div>
      
      {error && (
        <Alert color="failure" onDismiss={() => setError(null)} className="mb-6">
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert color="success" onDismiss={() => setSuccess(null)} className="mb-6">
          {success}
        </Alert>
      )}
      
      <Card className="bg-gray-800 border-gray-700 mb-6">
        <div className="flex items-center space-x-4 mb-6">
          <img 
            src={video.thumbnail_url || '/api/placeholder/300/169'} 
            alt={video.title}
            className="w-32 h-18 object-cover rounded"
          />
          <div>
            <h2 className="text-white font-medium">Current Thumbnail</h2>
            <p className="text-gray-400 text-sm">ID: {video.id}</p>
            <p className="text-gray-400 text-sm">Views: {video.views || 0}</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="mb-2 block">
              <label htmlFor="title" className="text-white">
                Title (required)
              </label>
            </div>
            <TextInput
              id="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter video title"
              required
            />
          </div>
          
          <div>
            <div className="mb-2 block">
              <label htmlFor="description" className="text-white">
                Description
              </label>
            </div>
            <Textarea
              id="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Video description"
              rows={4}
            />
          </div>
          
          <div>
            <div className="mb-2 block">
              <label htmlFor="category" className="text-white">
                Category
              </label>
            </div>
            <Select 
              id="category" 
              value={formData.category} 
              onChange={handleInputChange}
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </Select>
          </div>
          
          <div>
            <div className="mb-2 block">
              <label htmlFor="visibility" className="text-white">
                Visibility
              </label>
            </div>
            <Select 
              id="visibility" 
              value={formData.visibility} 
              onChange={handleInputChange}
            >
              <option value="private">Private (Only owner can view)</option>
              <option value="unlisted">Unlisted (Anyone with the link)</option>
              <option value="public">Public (Visible to everyone)</option>
            </Select>
          </div>
          
          <div>
            <div className="mb-2 block">
              <label htmlFor="view_limit" className="text-white">
                View Limit (optional)
              </label>
            </div>
            <TextInput
              id="view_limit"
              type="number"
              value={formData.view_limit}
              onChange={handleInputChange}
              placeholder="Maximum number of views"
            />
            <p className="text-xs text-gray-400 mt-1">
              After reaching this limit, the video will become private.
            </p>
          </div>
          
          <div>
            <div className="mb-2 block">
              <label htmlFor="auto_private_after" className="text-white">
                Auto-Private Date (optional)
              </label>
            </div>
            <TextInput
              id="auto_private_after"
              type="datetime-local"
              value={formData.auto_private_after}
              onChange={handleInputChange}
            />
            <p className="text-xs text-gray-400 mt-1">
              The video will automatically become private after this date and time.
            </p>
          </div>
          
          <div className="flex justify-between pt-4 border-t border-gray-700">
            <Button
              color="failure"
              outline
              onClick={() => navigate(`/video/${id}`)}
              type="button"
            >
              <Trash className="mr-2 h-5 w-5" />
              Delete Video
            </Button>
            
            <Button
              color="blue"
              type="submit"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditVideo;