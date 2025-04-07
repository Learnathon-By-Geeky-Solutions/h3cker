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
  Eye,
  BarChart2,
  AlertCircle
} from 'lucide-react';
import DashboardSideNavbar from '../../Shared/DashboardSideNavbar/DashboardSideNavbar';
import VideoService from '../../../utils/VideoService';

// Default avatar fallback
const DEFAULT_AVATAR = "https://flowbite.com/docs/images/people/profile-picture-5.jpg";

// Video Card Component
const VideoCard = ({ video, type = 'recent' }) => {
  // Calculate video duration (this is a placeholder as we'd need the actual duration)
  const duration = video.duration || "00:00";
  
  // Format timestamp for display
  const createdAt = video.upload_date 
    ? VideoService.formatRelativeTime(video.upload_date)
    : "Unknown date";

  return (
    <Link to={`/video/${video.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-gray-800 border-gray-700">
        <div className="relative">
          <img 
            src={video.thumbnail_url || '/path/to/default-thumbnail.jpg'} 
            alt={video.title} 
            className="w-full h-36 object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://flowbite.com/docs/images/blog/image-1.jpg'; // Fallback image
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
            <Eye size={14} className="mr-1" />
            {video.views || 0}
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

// Props validation for VideoCard
VideoCard.propTypes = {
  video: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    thumbnail_url: PropTypes.string,
    duration: PropTypes.string,
    views: PropTypes.number,
    likes: PropTypes.number,
    upload_date: PropTypes.string
  }).isRequired,
  type: PropTypes.oneOf(['recent', 'popular'])
};

VideoCard.defaultProps = {
  type: 'recent'
};

// Stats Card Component
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

// Props validation for StatsCard
StatsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string.isRequired
};

// DashboardHome Component 
const DashboardHome = ({ user, stats }) => {
 
  const getStorageColor = (percentage) => {
    if (percentage < 50) return 'green';
    if (percentage < 80) return 'yellow';
    return 'red';
  };

  const storageColor = getStorageColor(stats.storageUsed);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Welcome back, {user?.displayName?.split(' ')[0] || user?.first_name || 'Creator'}
          </h1>
          <p className="text-gray-400 mt-1">
            Here's what's happening with your videos today
          </p>
        </div>
        <Button 
          color="blue" 
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          href="/dashboard/upload"
        >
          <UploadIcon size={18} />
          Upload New Video
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Videos"
          value={stats.totalVideos}
          icon={Play}
          color="blue"
        />
        <StatsCard
          title="Total Views"
          value={stats.totalViews}
          icon={Eye}
          color="green"
        />
        <StatsCard
          title="Total Likes"
          value={stats.totalLikes}
          icon={ThumbsUp}
          color="purple"
        />
        <Card className="bg-gray-800 border-gray-700">
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-gray-400">Storage Used</p>
              <span className="text-sm font-medium text-white">{stats.storageUsed}%</span>
            </div>
            <Progress
              progress={stats.storageUsed}
              size="md"
              color={storageColor}
            />
          </div>
        </Card>
      </div>

      {/* Recent & Popular Videos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Videos */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Recent Videos</h2>
            <Button 
              color="gray" 
              size="xs" 
              pill
              className="bg-gray-700 hover:bg-gray-600 text-gray-200"
              href="/dashboard/videos"
            >
              View All
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.recentVideos.length > 0 ? (
              stats.recentVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))
            ) : (
              <div className="col-span-full text-center p-4 text-gray-400">
                <p>No videos uploaded yet.</p>
                <Button 
                  color="blue" 
                  size="sm"
                  className="mt-2"
                  href="/dashboard/upload"
                >
                  Upload Your First Video
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Popular Videos */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Popular Videos</h2>
            <Button 
              color="gray" 
              size="xs" 
              pill
              className="bg-gray-700 hover:bg-gray-600 text-gray-200"
              href="/dashboard/analytics"
            >
              Analytics
            </Button>
          </div>
          <div className="space-y-4">
            {stats.popularVideos.length > 0 ? (
              stats.popularVideos.map((video) => (
                <VideoCard key={video.id} video={video} type="popular" />
              ))
            ) : (
              <div className="text-center p-4 text-gray-400 bg-gray-800 rounded-lg">
                <p>No popular videos yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Analytics Section */}
      <Card className="bg-gray-800 border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Quick Analytics</h2>
          <Button 
            color="gray" 
            size="xs"
            className="bg-gray-700 hover:bg-gray-600 text-gray-200"
            href="/dashboard/analytics"
          >
            <BarChart2 size={16} className="mr-2" />
            Detailed Analytics
          </Button>
        </div>
        
        <div className="relative">
          {/* Placeholder for chart - in a real app, use recharts or other charting library */}
          <div className="h-64 bg-gray-700 rounded-lg flex items-center justify-center">
            <p className="text-gray-400">
              Analytics chart would render here with actual data
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Main Dashboard Component
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

  // Determine if we're on the main dashboard page or a sub-route
  const isMainDashboard = location.pathname === '/dashboard';

  // Helper function to filter videos that match the user's email
  const filterUserVideos = (videos) => {
    if (!user || !user.email) {
      return [];
    }
    
    // This uses the email matching function from VideoService
    return videos.filter(video => {
      // Check if video has uploader information with email
      if (video.uploader && video.uploader.email) {
        return VideoService.checkEmailMatch(video.uploader.email, user.email);
      }
      
      // If there's no uploader info, check for uploader_email field (might be flattened)
      if (video.uploader_email) {
        return VideoService.checkEmailMatch(video.uploader_email, user.email);
      }
      
      // If we can't determine the uploader, don't include in user's videos
      return false;
    });
  };

  // Fetch real data from the backend
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        try {
          // Fetch videos from the API
          const videoFeed = await VideoService.getVideoFeed();
          
          // If we have videos, filter for those that match the user's email
          if (videoFeed && Array.isArray(videoFeed)) {
            // Filter videos where uploader email matches current user
            const userVideos = filterUserVideos(videoFeed);
            
            if (userVideos.length > 0) {
              // Sort videos by upload date (newest first)
              const sortedVideos = [...userVideos].sort((a, b) => 
                new Date(b.upload_date) - new Date(a.upload_date)
              );
              
              // Get the most recent videos
              const recentVideos = sortedVideos.slice(0, 3).map(video => ({
                ...video,
                views: video.views || 0,
                likes: video.likes || 0,
              }));
              
              // For popular videos, we'd ideally sort by views
              const popularVideos = [...userVideos]
                .sort((a, b) => (b.views || 0) - (a.views || 0))
                .slice(0, 2)
                .map(video => ({
                  ...video,
                  views: video.views || Math.floor(Math.random() * 1000),
                  likes: video.likes || Math.floor(Math.random() * 100),
                }));
              
              setStats({
                totalVideos: userVideos.length,
                totalViews: userVideos.reduce((sum, video) => sum + (video.views || 0), 0),
                totalLikes: userVideos.reduce((sum, video) => sum + (video.likes || 0), 0),
                storageUsed: 25, // Placeholder - would need actual storage data
                recentVideos: recentVideos,
                popularVideos: popularVideos
              });
            } else {
              // No videos found for this user
              setStats({
                totalVideos: 0,
                totalViews: 0,
                totalLikes: 0,
                storageUsed: 0,
                recentVideos: [],
                popularVideos: []
              });
            }
          } else {
            // If no videos yet, set empty arrays
            setStats({
              totalVideos: 0,
              totalViews: 0,
              totalLikes: 0,
              storageUsed: 0,
              recentVideos: [],
              popularVideos: []
            });
          }
        } catch (error) {
          console.error('Error fetching video feed:', error);
          setError('Failed to load videos. Please try again later.');
          
          // Fallback to empty stats if API fails
          setStats({
            totalVideos: 0,
            totalViews: 0,
            totalLikes: 0,
            storageUsed: 0,
            recentVideos: [],
            popularVideos: []
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };

    if (isMainDashboard && user?.email) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [isMainDashboard, user?.email]);

  return (
    <div className="flex bg-gray-900 min-h-screen">
      {/* Sidebar Navigation */}
      <DashboardSideNavbar />
      
      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 md:p-8 ml-0 md:ml-20 lg:ml-64 transition-all duration-300">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Spinner size="xl" color="blue" />
          </div>
        ) : error ? (
          <Alert 
            color="failure" 
            icon={AlertCircle}
            className="mb-4"
          >
            <span className="font-medium">Error:</span> {error}
          </Alert>
        ) : (
          <>
            {isMainDashboard ? <DashboardHome user={user} stats={stats} /> : <Outlet />}
          </>
        )}
      </div>
    </div>
  );
};

// Props validation for DashboardHome
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

export default Dashboard;