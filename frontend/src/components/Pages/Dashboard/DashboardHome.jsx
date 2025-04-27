import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Button } from 'flowbite-react';
import { Clock, TrendingUp, Upload as UploadIcon, Users, Video, Settings } from 'lucide-react';
import AdRow from '../../Shared/AdRow/AdRow';
import { 
  StatsOverview, 
  formatVideosForAdRow, 
  EmptyAdRow, 
  AnalyticsPreview 
} from '../../Shared/DashboardComponents/DashboardComponents';
import UserPointsCard from './UserPointsCard';

const DashboardHome = ({ user, stats }) => {
  const totalVideos = stats?.totalVideos || 0;
  const hasVideos = totalVideos > 0;

  const recentVideosForAdRow = formatVideosForAdRow(stats?.recentVideos);
  const popularVideosForAdRow = formatVideosForAdRow(stats?.popularVideos, true);
  const displayName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  // Check user role to determine functionality
  const isAdmin = user?.role === 'admin';
  const isCompany = user?.role === 'company';
  const canUpload = isAdmin || isCompany;
  const isViewer = user?.role === 'user';

  // Determine welcome message based on user role
  let welcomeMessage;
  if (isAdmin) {
    welcomeMessage = "Manage your videos and platform users from your admin dashboard.";
  } else if (isCompany) {
    welcomeMessage = "Upload and manage your company's video content.";
  } else {
    welcomeMessage = "Here's what's happening with your video activity today.";
  }

  // Determine content for the Recent Uploads/Activity section
  let recentUploadsContent;
  if (hasVideos) {
    recentUploadsContent = (
      <AdRow
        title="Recent Uploads"
        ads={recentVideosForAdRow}
        linkTo="/dashboard/videos"
        isVideoSection={true}
        icon={<Clock size={20} className="text-gray-400"/>}
      />
    );
  } else if (canUpload) {
    recentUploadsContent = (
      <EmptyAdRow 
        title="Recent Uploads"
        icon={<Clock size={20} className="text-gray-400" />}
        linkPath="/dashboard/upload"
        linkText="Upload Your First Video"
      />
    );
  } else {
    recentUploadsContent = (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-md">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          <Clock size={20} className="mr-2 text-gray-400" /> Your Activity
        </h2>
        <p className="text-center py-4 text-gray-400">
          You haven't watched any videos yet. Start exploring to see your activity here.
        </p>
        <div className="text-center">
          <Button 
            color="blue" 
            size="sm" 
            className="glossy-button" 
            as={Link} 
            to="/videos"
          >
            Browse Videos
          </Button>
        </div>
      </div>
    );
  }
      
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
             Welcome back, {displayName}
          </h1>
          <p className="text-gray-400 mt-1">
            {welcomeMessage}
          </p>
        </div>
        {canUpload && (
          <Button
            color="blue"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 glossy-button focus:ring-4 focus:ring-blue-800"
            as={Link}
            to="/dashboard/upload"
          >
            <UploadIcon size={18} />
            Upload New Video
          </Button>
        )}
      </div>

      {/* Admin Tools Section */}
      {isAdmin && (
        <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">Admin Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button as={Link} to="/dashboard/admin/users" color="light" className="text-sm">
              <Users className="mr-2 h-4 w-4" />
              Manage Users
            </Button>
            <Button as={Link} to="/dashboard/admin/videos" color="light" className="text-sm">
              <Video className="mr-2 h-4 w-4" />
              Manage Videos
            </Button>
            <Button as={Link} to="/dashboard/admin/settings" color="light" className="text-sm">
              <Settings className="mr-2 h-4 w-4" />
              Platform Settings
            </Button>
          </div>
        </div>
      )}

      {/* User Points Card for Viewers */}
      {isViewer && <UserPointsCard compact={true} />}

      <StatsOverview stats={stats} />

      <div>
        {recentUploadsContent}
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

      {isViewer && (
        <div>
          <UserPointsCard />
        </div>
      )}

      <AnalyticsPreview hasVideos={hasVideos} />
    </div>
  );
};

DashboardHome.propTypes = {
  user: PropTypes.shape({
    displayName: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string
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