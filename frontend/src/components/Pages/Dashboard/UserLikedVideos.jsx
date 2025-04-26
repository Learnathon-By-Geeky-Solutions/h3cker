import React, { useState, useEffect } from 'react';
import { Card, Button, Alert } from 'flowbite-react';
import { Heart, AlertCircle } from 'lucide-react';
import VideoService from '../../../utils/VideoService';
import { LoadingState, EmptyState } from '../../Shared/VideoLoadingStates/VideoLoadingStates';
import AdRow from '../../Shared/AdRow/AdRow';

const UserLikedVideos = () => {
  const [likedVideos, setLikedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLikedVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch liked videos from the API
        const videos = await VideoService.getUserLikedVideos();
        
        // Ensure we have an array of videos (defensive programming)
        if (Array.isArray(videos)) {
          setLikedVideos(videos);
        } else {
          console.error("Expected array of videos but got:", videos);
          setLikedVideos([]);
        }
      } catch (err) {
        console.error('Error fetching liked videos:', err);
        setError('Failed to load your liked videos. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchLikedVideos();
  }, []);

  if (loading) {
    return <LoadingState message="Loading your liked videos..." />;
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <Alert color="failure" icon={AlertCircle}>
          <span className="font-medium">Error:</span> {error}
        </Alert>
        <div className="mt-4">
          <Button color="gray" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (likedVideos.length === 0) {
    return (
      <EmptyState
        title="No Liked Videos"
        message="You haven't liked any videos yet. Start liking videos to build your collection!"
        actionLink="/videos"
        actionText="Browse Videos"
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          Your Liked Videos
        </h1>
        <Button color="gray" size="sm" onClick={() => window.history.back()}>
          Back
        </Button>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <div className="flex items-center mb-4">
          <Heart size={20} className="text-red-400 mr-2" />
          <h2 className="text-xl font-bold text-white">Videos You've Liked</h2>
        </div>
        
        {likedVideos.length > 0 ? (
          <AdRow
            title="Liked Videos"
            icon={<Heart size={20} className="text-red-400" />}
            ads={likedVideos}
            isVideoSection={true}
          />
        ) : (
          <p className="text-gray-400 py-8 text-center">No liked videos to display.</p>
        )}
      </Card>
    </div>
  );
};

export default UserLikedVideos;