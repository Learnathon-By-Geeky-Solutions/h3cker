import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Button } from 'flowbite-react';
import { TrendingUp, Upload as UploadIcon, Users, Video, Settings } from 'lucide-react';
import AdRow from '../../Shared/AdRow/AdRow';
import { 
  StatsOverview, 
  formatVideosForAdRow, 
  AnalyticsPreview,
  UserStatsOverview
} from '../../Shared/DashboardComponents/DashboardComponents';
import UserPointsCard from './User/UserPointsCard';

const DashboardHome = ({ user, stats }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalVideos = stats?.totalVideos || 0;
  const hasVideos = totalVideos > 0;

  const popularVideosForAdRow = formatVideosForAdRow(stats?.popularVideos, true);
  
  // Optimize display name for small screens
  let displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  if (displayName.length > 15) {
    displayName = displayName.split(' ')[0] || displayName.substring(0, 15);
  }

  const isAdmin = user?.role === 'admin';
  const isCompany = user?.role === 'company';
  const canUpload = isAdmin || isCompany;
  const isViewer = user?.role === 'user';

  // Determine welcome message based on user role
  let welcomeMessage;
  if (isAdmin) {
    welcomeMessage = isMobile ? "Manage videos and users" : "Manage your videos and platform users from your admin dashboard.";
  } else if (isCompany) {
    welcomeMessage = isMobile ? "Manage your content" : "Upload and manage your company's video content.";
  } else {
    welcomeMessage = isMobile ? "Your video activity today" : "Here's what's happening with your video activity today.";
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

      {/* Show either admin stats or user activity section based on role */}
      {isViewer ? (
        <UserStatsOverview />
      ) : (
        <StatsOverview stats={stats} />
      )}

      {/* Popular Videos section - only for admin/company users */}
      {!isViewer && (
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
      )}
    
      {!isViewer && <AnalyticsPreview hasVideos={hasVideos} />}
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