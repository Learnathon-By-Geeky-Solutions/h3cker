import React, { useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import {
  Card,
  Button,
  Progress,
  Spinner,
  Alert,
} from 'flowbite-react';
import {
  Clock,
  TrendingUp,
  Upload as UploadIcon,
  Play,
  ThumbsUp,
  BarChart2,
  AlertCircle,
  Activity as ViewsIcon,
} from 'lucide-react';

import DashboardSideNavbar from '../../Shared/DashboardSideNavbar/DashboardSideNavbar';
import VideoService from '../../../utils/VideoService';
import AdRow from '../../Shared/AdRow/AdRow';

const StatsCard = ({ title, value, icon: Icon, color }) => (
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


const DashboardHome = ({ user, stats }) => {
  const getStorageColor = (percentage) => {
    if (percentage >= 90) return 'red';
    if (percentage >= 75) return 'yellow';
    return 'blue';
  };

  const totalVideos = stats?.totalVideos || 0;
  const totalViews = stats?.totalViews || 0;
  const totalLikes = stats?.totalLikes || 0;
  const storageUsed = stats?.storageUsed || 0;
  const storageColor = getStorageColor(storageUsed);
  const hasVideos = totalVideos > 0;

  const formatVideosForAdRow = (videos, isPopular = false) => {
    if (!Array.isArray(videos)) return [];
    return videos.map(video => ({
      id: video.id || video._id || `video-${Math.random()}`,
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Videos" value={totalVideos} icon={Play} color="blue" />
        <StatsCard title="Total Views" value={totalViews} icon={ViewsIcon} color="green" />
        <StatsCard title="Total Likes" value={totalLikes} icon={ThumbsUp} color="purple" />
        <Card className="bg-gray-800 border-gray-700 shadow-md">
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-gray-400">Storage Used</p>
              <span className="text-sm font-medium text-white">{storageUsed}%</span>
            </div>
            <Progress progress={storageUsed} size="md" color={storageColor} />
          </div>
        </Card>
      </div>

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
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-md">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                 <Clock size={20} className="mr-2 text-gray-400" /> Recent Uploads
              </h2>
              <div className="text-center py-6">
                <p className="text-gray-400 mb-4">You haven't uploaded any videos yet.</p>
                <Button color="blue" size="sm" className="glossy-button" as={Link} to="/dashboard/upload">
                  Upload Your First Video
                </Button>
              </div>
          </div>
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

      {hasVideos && (
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
      )}
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

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
       totalVideos: 0,
       totalViews: 0,
       totalLikes: 0,
       storageUsed: 0,
       recentVideos: [],
       popularVideos: []
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMainDashboard = location.pathname === '/dashboard';

  useEffect(() => {
     if (!isMainDashboard || !user?.email) {
      setLoading(false);
      setError(null);
      setStats({ totalVideos: 0, totalViews: 0, totalLikes: 0, storageUsed: 0, recentVideos: [], popularVideos: [] });
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    VideoService.getVideoFeed()
      .then(allVideos => {
        if (!isMounted) return;
        if (!Array.isArray(allVideos)) {
            console.error("Data Error: Expected an array of videos, received:", allVideos);
            throw new Error("Invalid data format received from server.");
        }
        const userEmailLower = user.email.toLowerCase();
        const userVideos = allVideos.filter(video =>
            video &&
            (video.uploader_email?.toLowerCase() === userEmailLower ||
             video.uploader?.email?.toLowerCase() === userEmailLower)
        );

        const sortedByDate = [...userVideos].sort((a, b) => new Date(b.upload_date || 0) - new Date(a.upload_date || 0));
        const sortedByViews = [...userVideos].sort((a, b) => (b.views || 0) - (a.views || 0));

        const simulatedStorageUsed = Math.min(95, userVideos.length * 5);

        setStats({
            totalVideos: userVideos.length,
            totalViews: userVideos.reduce((sum, v) => sum + (v?.views || 0), 0),
            totalLikes: userVideos.reduce((sum, v) => sum + (v?.likes || 0), 0),
            storageUsed: simulatedStorageUsed,
            recentVideos: sortedByDate.slice(0, 5),
            popularVideos: sortedByViews.slice(0, 5),
        });
      })
      .catch(fetchError => {
        console.error('Error fetching dashboard video data:', fetchError);
        if (isMounted) {
            setError(fetchError.message || 'Failed to load dashboard data. Please try again later.');
            setStats({ totalVideos: 0, totalViews: 0, totalLikes: 0, storageUsed: 0, recentVideos: [], popularVideos: [] });
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [isMainDashboard, user?.email]);

  let dashboardContent;
  if (isMainDashboard) {
    if (loading) {
      dashboardContent = (
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Spinner size="xl" color="info" aria-label="Loading dashboard data..." />
        </div>
      );
    } else {
      dashboardContent = (
         <>
           {error && (
             <Alert color="failure" icon={AlertCircle} className="mb-6" onDismiss={() => setError(null)}>
                <span className="font-medium">Error:</span> {error}
             </Alert>
           )}
           <DashboardHome user={user} stats={stats} />
         </>
      );
    }
  } else {
    dashboardContent = <Outlet />;
  }

  return (
    <div className="flex bg-gray-900 min-h-screen text-white">
      <DashboardSideNavbar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <main className={`flex-1 p-4 sm:p-6 md:p-8 ${sidebarOpen ? 'ml-64' : 'ml-0 md:ml-20'} lg:ml-64 transition-all duration-300 ease-in-out overflow-y-auto`}>
         <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-700 rounded text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500" aria-label="Toggle sidebar">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
         </button>
        {dashboardContent}
      </main>
    </div>
  );
};

export default Dashboard;