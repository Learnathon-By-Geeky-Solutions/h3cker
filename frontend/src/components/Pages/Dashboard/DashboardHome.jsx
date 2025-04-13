import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Button } from 'flowbite-react';
import { Clock, TrendingUp, Upload as UploadIcon } from 'lucide-react';
import AdRow from '../../Shared/AdRow/AdRow';
import { 
  StatsOverview, 
  formatVideosForAdRow, 
  EmptyAdRow, 
  AnalyticsPreview 
} from '../../Shared/DashboardComponents/DashboardComponents';

const DashboardHome = ({ user, stats }) => {
  const totalVideos = stats?.totalVideos || 0;
  const hasVideos = totalVideos > 0;

  const recentVideosForAdRow = formatVideosForAdRow(stats?.recentVideos);
  const popularVideosForAdRow = formatVideosForAdRow(stats?.popularVideos, true);
  const displayName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
             Welcome back, {displayName}
          </h1>
          <p className="text-gray-400 mt-1">
            Here's what's happening with your videos today.
          </p>
        </div>
        <Button
          color="blue"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 glossy-button focus:ring-4 focus:ring-blue-800"
          as={Link}
          to="/dashboard/upload"
        >
          <UploadIcon size={18} />
          Upload New Video
        </Button>
      </div>

      <StatsOverview stats={stats} />

      <div>
        {hasVideos ? (
          <AdRow
            title="Recent Uploads"
            ads={recentVideosForAdRow}
            linkTo="/dashboard/videos"
            isVideoSection={true}
            icon={<Clock size={20} className="text-gray-400"/>}
          />
        ) : (
          <EmptyAdRow 
            title="Recent Uploads"
            icon={<Clock size={20} className="text-gray-400" />}
            linkPath="/dashboard/upload"
            linkText="Upload Your First Video"
          />
        )}
      </div>

      <div>
         {hasVideos && popularVideosForAdRow.length > 0 ? (
           <AdRow
              title="Popular Videos"
              ads={popularVideosForAdRow}
              linkTo="/dashboard/analytics"
              isVideoSection={true}
              icon={<TrendingUp size={20} className="text-gray-400"/>}
           />
         ) : (
           hasVideos && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-md">
                 <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                   <TrendingUp size={20} className="mr-2 text-gray-400" /> Popular Videos
                 </h2>
                 <p className="text-center py-4 text-gray-400">No popular videos to display yet.</p>
              </div>
           )
         )}
      </div>

      <AnalyticsPreview hasVideos={hasVideos} />
    </div>
  );
};

DashboardHome.propTypes = {
  user: PropTypes.shape({
    displayName: PropTypes.string,
    email: PropTypes.string,
  }),
  stats: PropTypes.shape({
    totalVideos: PropTypes.number,
    totalViews: PropTypes.number,
    totalLikes: PropTypes.number,
    storageUsed: PropTypes.number,
    recentVideos: PropTypes.arrayOf(PropTypes.object),
    popularVideos: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
};

export default DashboardHome;