import React, { useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import {
  Card,
  Button,
  Badge,
  Progress,
  Spinner,
  Alert
} from 'flowbite-react';
import {
  Clock,
  TrendingUp,
  Upload as UploadIcon,
  Play,
  ThumbsUp,
  BarChart2,
  AlertCircle
} from 'lucide-react';
import DashboardSideNavbar from '../../Shared/DashboardSideNavbar/DashboardSideNavbar';
import VideoService from '../../../utils/VideoService';

const VideoCard = ({ video, type = 'recent' }) => {
  const duration = video.duration || "00:00";
  const createdAt = video.upload_date
    ? VideoService.formatRelativeTime(video.upload_date)
    : "Unknown date";

  return (
    <Link to={`/video/${video.id}`} className="block">
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-gray-800 border-gray-700 card-hover">
        <div className="relative aspect-video">
          <img
            src={video.thumbnail_url || 'https://flowbite.com/docs/images/blog/image-1.jpg'}
            alt={video.title}
            className="w-full h-full object-cover rounded-t-lg"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://flowbite.com/docs/images/blog/image-1.jpg';
            }}
          />
          <div className="absolute bottom-2 right-2 bg-gray-900 bg-opacity-80 text-white text-xs px-2 py-1 rounded-md flex items-center">
            <Clock size={12} className="mr-1" />
            {duration}
          </div>
          {type === 'popular' && (
            <div className="absolute top-2 left-2">
              <Badge color="purple" icon={TrendingUp} className="flex items-center">
                Popular
              </Badge>
            </div>
          )}
        </div>
        <h5 className="text-md font-medium text-white line-clamp-1 mt-2">
          {video.title}
        </h5>
        <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
          <div className="flex items-center">
            <span className="mr-1">{video.views || 0} views</span>
          </div>
          <div className="flex items-center">
            <ThumbsUp size={14} className="mr-1" />
            {video.likes || 0}
          </div>
          <div className="flex items-center">
            <Clock size={14} className="mr-1" />
            {createdAt}
          </div>
        </div>
      </Card>
    </Link>
  );
};

VideoCard.propTypes = {
  video: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    thumbnail_url: PropTypes.string,
    duration: PropTypes.string,
    views: PropTypes.number,
    likes: PropTypes.number,
    upload_date: PropTypes.string,
    uploader_email: PropTypes.string
  }).isRequired,
  type: PropTypes.oneOf(['recent', 'popular'])
};
VideoCard.defaultProps = { type: 'recent' };

const StatsCard = ({ title, value, icon: Icon, color }) => (
  <Card className="bg-gray-800 border-gray-700">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <h5 className="text-2xl font-bold tracking-tight text-white mt-1">
          {value.toLocaleString()}
        </h5>
      </div>
      <div className={`p-3 rounded-lg bg-${color}-600 bg-opacity-20`}>
        <Icon size={24} className={`text-${color}-400`} />
      </div>
    </div>
  </Card>
);
StatsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string.isRequired
};

const DashboardHome = ({ user, stats }) => {
  const getStorageColor = (percentage) => {
    if (percentage < 50) return 'green';
    if (percentage < 80) return 'yellow';
    return 'red';
  };
  const storageColor = getStorageColor(stats.storageUsed);
  const hasVideos = stats.totalVideos > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Welcome back, {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Administrator'}
          </h1>
          <p className="text-gray-400 mt-1">
            Here's what's happening with your videos today
          </p>
        </div>
        <Button
          color="blue"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 glossy-button"
          as={Link}
          to="/dashboard/upload"
        >
          <UploadIcon size={18} />
          Upload New Video
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Videos" value={stats.totalVideos} icon={Play} color="blue" />
        <StatsCard title="Total Views" value={stats.totalViews} icon={Play} color="green" />
        <StatsCard title="Total Likes" value={stats.totalLikes} icon={ThumbsUp} color="purple" />
        <Card className="bg-gray-800 border-gray-700">
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-gray-400">Storage Used</p>
              <span className="text-sm font-medium text-white">{stats.storageUsed}%</span>
            </div>
            <Progress progress={stats.storageUsed} size="md" color={storageColor} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Recent Videos</h2>
            {hasVideos && (
                <Button
                  color="gray" 
                  size="xs" 
                  pill
                  className="bg-gray-700 hover:bg-gray-600 text-gray-200"
                  as={Link} 
                  to="/dashboard/videos"
                >
                  View All
                </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hasVideos && stats.recentVideos.length > 0 ? (
              stats.recentVideos.map((video) => (
                <VideoCard key={video.id} video={video} type="recent" />
              ))
            ) : (
              <div className="col-span-full text-center p-6 bg-gray-800 rounded-lg">
                <p className="text-gray-400">You haven't uploaded any videos yet.</p>
                <Button
                  color="blue" 
                  size="sm" 
                  className="mt-3 glossy-button"
                  as={Link} 
                  to="/dashboard/upload"
                >
                  Upload Your First Video
                </Button>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Popular Videos</h2>
            {hasVideos && (
              <Button
                color="gray" 
                size="xs" 
                pill
                className="bg-gray-700 hover:bg-gray-600 text-gray-200"
                as={Link} 
                to="/dashboard/analytics"
              >
                Analytics
              </Button>
            )}
          </div>
          <div className="space-y-4">
            {hasVideos && stats.popularVideos.length > 0 ? (
              stats.popularVideos.map((video) => (
                <VideoCard key={video.id} video={video} type="popular" />
              ))
            ) : (
              <div className={`text-center p-4 text-gray-400 ${hasVideos ? 'bg-gray-800 rounded-lg' : 'hidden'}`}>
                <p>No popular videos to show yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {hasVideos && (
        <Card className="bg-gray-800 border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Quick Analytics</h2>
            <Button
              color="gray" 
              size="xs"
              className="bg-gray-700 hover:bg-gray-600 text-gray-200"
              as={Link} 
              to="/dashboard/analytics"
            >
              <BarChart2 size={16} className="mr-2" />
              Detailed Analytics
            </Button>
          </div>
          <div className="relative">
            <div className="h-64 bg-gray-700 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">
                Analytics chart placeholder
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

DashboardHome.propTypes = {
  user: PropTypes.object,
  stats: PropTypes.shape({
    totalVideos: PropTypes.number.isRequired,
    totalViews: PropTypes.number.isRequired,
    totalLikes: PropTypes.number.isRequired,
    storageUsed: PropTypes.number.isRequired,
    recentVideos: PropTypes.array.isRequired,
    popularVideos: PropTypes.array.isRequired
  }).isRequired
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

  const isMainDashboard = location.pathname === '/dashboard';

  useEffect(() => {
    if (!isMainDashboard || !user?.email) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      console.log(`Fetching dashboard data for user: ${user.email}`);

      try {
        const allVideos = await VideoService.getVideoFeed();

        if (!isMounted) return;

        if (!Array.isArray(allVideos)) {
          console.error("Received non-array response from getVideoFeed:", allVideos);
          setStats({
            totalVideos: 0, 
            totalViews: 0, 
            totalLikes: 0,
            storageUsed: 0, 
            recentVideos: [], 
            popularVideos: []
          });
          setLoading(false);
          return;
        }

        const userVideos = allVideos.filter(video =>
          video.uploader_email?.toLowerCase() === user.email.toLowerCase() ||
          video.uploader?.email?.toLowerCase() === user.email.toLowerCase()
        );

        console.log(`Found ${userVideos.length} videos for user ${user.email}`);

        if (userVideos.length > 0) {
          const sortedByDate = [...userVideos].sort((a, b) =>
            new Date(b.upload_date || 0) - new Date(a.upload_date || 0)
          );
          const sortedByViews = [...userVideos].sort((a, b) =>
            (b.views || 0) - (a.views || 0)
          );

          setStats({
            totalVideos: userVideos.length,
            totalViews: userVideos.reduce((sum, v) => sum + (v.views || 0), 0),
            totalLikes: userVideos.reduce((sum, v) => sum + (v.likes || 0), 0),
            storageUsed: 25,
            recentVideos: sortedByDate.slice(0, 3),
            popularVideos: sortedByViews.slice(0, 2),
          });
        } else {
          setStats({
            totalVideos: 0, 
            totalViews: 0, 
            totalLikes: 0,
            storageUsed: 0, 
            recentVideos: [], 
            popularVideos: []
          });
        }

      } catch (fetchError) {
        console.error('Error fetching dashboard video data:', fetchError);
        if (isMounted) {
          setError(fetchError.message || 'Failed to load video data. Please try again later.');
          setStats({
            totalVideos: 0, 
            totalViews: 0, 
            totalLikes: 0,
            storageUsed: 0, 
            recentVideos: [], 
            popularVideos: []
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [isMainDashboard, user?.email]);

  // Extract nested ternary into separate variable
  let dashboardContent;
  if (isMainDashboard) {
    if (loading) {
      dashboardContent = (
        <div className="flex items-center justify-center h-96">
          <Spinner size="xl" color="info" />
        </div>
      );
    } else if (error) {
      dashboardContent = (
        <Alert
          color="failure"
          icon={AlertCircle}
          className="mb-4"
          onDismiss={() => setError(null)}
        >
          <span className="font-medium">Error:</span> {error}
        </Alert>
      );
    } else {
      dashboardContent = <DashboardHome user={user} stats={stats} />;
    }
  } else {
    dashboardContent = <Outlet />;
  }

  return (
    <div className="flex bg-gray-900 min-h-screen">
      <DashboardSideNavbar />
      <div className="flex-1 p-4 sm:p-6 md:p-8 ml-0 md:ml-20 lg:ml-64 transition-all duration-300">
        {dashboardContent}
      </div>
    </div>
  );
};

export default Dashboard;