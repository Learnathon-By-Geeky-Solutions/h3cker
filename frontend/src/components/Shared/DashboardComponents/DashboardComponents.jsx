import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Card, Button, Progress } from 'flowbite-react';
import {
  Play,
  ThumbsUp,
  BarChart2,
  Activity as ViewsIcon,
  Clock
} from 'lucide-react';

export const StatsCard = ({ title, value, icon: Icon, color }) => (
  <Card className="bg-gray-800 border-gray-700 shadow-md">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <h5 className="text-2xl font-bold tracking-tight text-white mt-1">
          {(typeof value === 'number' ? value.toLocaleString() : value) || '0'}
        </h5>
      </div>
      <div className={`p-3 rounded-lg bg-${color}-500 bg-opacity-20`}>
        {Icon && <Icon size={24} className={`text-${color}-400`} />}
      </div>
    </div>
  </Card>
);

StatsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  icon: PropTypes.elementType,
  color: PropTypes.string.isRequired,
};

export const StorageCard = ({ storageUsed }) => {
  const getStorageColor = (percentage) => {
    if (percentage >= 90) return 'red';
    if (percentage >= 75) return 'yellow';
    return 'blue';
  };

  const storageColor = getStorageColor(storageUsed);

  return (
    <Card className="bg-gray-800 border-gray-700 shadow-md">
      <div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium text-gray-400">Storage Used</p>
          <span className="text-sm font-medium text-white">{storageUsed}%</span>
        </div>
        <Progress progress={storageUsed} size="md" color={storageColor} />
      </div>
    </Card>
  );
};

StorageCard.propTypes = {
  storageUsed: PropTypes.number.isRequired,
};

export const EmptyAdRow = ({ title, icon, linkPath, linkText }) => (
  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-md">
    <h2 className="text-xl font-bold text-white mb-4 flex items-center">
      {icon && <span className="mr-2">{icon}</span>}
      {title}
    </h2>
    <div className="text-center py-6">
      <p className="text-gray-400 mb-4">You haven't uploaded any videos yet.</p>
      <Button color="blue" size="sm" className="glossy-button" as={Link} to={linkPath}>
        {linkText}
      </Button>
    </div>
  </div>
);

EmptyAdRow.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.node,
  linkPath: PropTypes.string.isRequired,
  linkText: PropTypes.string.isRequired,
};

export const AnalyticsPreview = ({ hasVideos }) => (
  hasVideos && (
    <Card className="bg-gray-800 border-gray-700 shadow-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          <BarChart2 size={20} className="mr-2 text-gray-400"/> Quick Analytics
        </h2>
        <Link to="/dashboard/analytics">
          <Button color="gray" size="xs" pill className="bg-gray-700 hover:bg-gray-600 text-gray-200">
            View Detailed Analytics
          </Button>
        </Link>
      </div>
      <div className="relative h-64 bg-gray-700 rounded-lg flex items-center justify-center">
        <p className="text-gray-400 italic">Analytics chart placeholder</p>
      </div>
    </Card>
  )
);

AnalyticsPreview.propTypes = {
  hasVideos: PropTypes.bool.isRequired,
};

export const formatVideosForAdRow = (videos, isPopular = false) => {
  if (!Array.isArray(videos)) return [];
  return videos.map((video, index) => ({
    id: video.id || video._id || `fallback-video-${index}`,
    title: video.title || 'Untitled Video',
    thumbnail_url: video.thumbnail_url || video.imageUrl,
    video_url: video.video_url || video.videoUrl,
    upload_date: video.upload_date,
    views: video.views || 0,
    likes: video.likes || 0,
    duration: video.duration || '00:00',
    featured: isPopular || video.featured || false,
    popular: isPopular || video.popular || false,
    description: video.description || '',
    brand: video.brand || '',
    uploader_name: video.uploader_name || '',
  }));
};

export const StatsOverview = ({ stats }) => {
  const { totalVideos, totalViews, totalLikes, storageUsed } = stats;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard title="Total Videos" value={totalVideos} icon={Play} color="blue" />
      <StatsCard title="Total Views" value={totalViews} icon={ViewsIcon} color="green" />
      <StatsCard title="Total Likes" value={totalLikes} icon={ThumbsUp} color="purple" />
      <StorageCard storageUsed={storageUsed} />
    </div>
  );
};

StatsOverview.propTypes = {
  stats: PropTypes.shape({
    totalVideos: PropTypes.number.isRequired,
    totalViews: PropTypes.number.isRequired,
    totalLikes: PropTypes.number.isRequired,
    storageUsed: PropTypes.number.isRequired,
  }).isRequired,
};

// Create a UserStatsOverview component for regular users (without admin metrics)
export const UserStatsOverview = () => {
  return (
    <div className="mb-6">
      {/* User-specific content can be added here if needed */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Your Activity</h2>
        <p className="text-gray-400 mb-2">
          Use the links in the sidebar to access your watch history and liked videos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <Link to="/dashboard/history" className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-gray-700 hover:bg-gray-600 text-white">
            <Clock className="mr-2 h-4 w-4" />
            View Watch History
          </Link>
          <Link to="/dashboard/liked-videos" className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-gray-700 hover:bg-gray-600 text-white">
            <ThumbsUp className="mr-2 h-4 w-4" />
            View Liked Videos
          </Link>
        </div>
      </div>
    </div>
  );
};