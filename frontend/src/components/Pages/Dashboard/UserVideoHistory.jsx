import React, { useState, useEffect } from 'react';
import { Card, Button } from 'flowbite-react';
import { Clock, Eye } from 'lucide-react';
import VideoService from '../../../utils/VideoService';
import { LoadingState, ErrorState, EmptyState } from '../../Shared/VideoLoadingStates/VideoLoadingStates';
import AdRow from '../../Shared/AdRow/AdRow';

const UserVideoHistory = () => {
  const [viewedVideos, setViewedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const history = await VideoService.getUserHistory();
        setViewedVideos(history);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching video history:', err);
        setError('Failed to load your viewing history. Please try again later.');
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return <LoadingState message="Loading your viewing history..." />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (viewedVideos.length === 0) {
    return (
      <EmptyState
        title="No Viewing History"
        message="You haven't watched any videos yet. Start watching to build your history!"
        actionLink="/videos"
        actionText="Browse Videos"
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          Your Viewing History
        </h1>
        <Button color="gray" size="sm" onClick={() => window.history.back()}>
          Back
        </Button>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <div className="flex items-center mb-4">
          <Clock size={20} className="text-blue-400 mr-2" />
          <h2 className="text-xl font-bold text-white">Recently Watched</h2>
        </div>

        <AdRow
          title="Recently Watched"
          icon={<Eye size={20} className="text-gray-400" />}
          ads={viewedVideos}
          isVideoSection={true}
        />
      </Card>
    </div>
  );
};

export default UserVideoHistory;