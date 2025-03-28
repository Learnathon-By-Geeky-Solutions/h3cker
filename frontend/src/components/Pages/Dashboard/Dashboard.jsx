import React, { useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { 
  Card, 
  Button, 
  Badge,  
  Progress,
  Spinner
} from 'flowbite-react';
import { 
  Clock, 
  TrendingUp, 
  Upload as UploadIcon, 
  Play, 
  ThumbsUp, 
  Eye,
  BarChart2
} from 'lucide-react';
import DashboardSideNavbar from '../../Shared/DashboardSideNavbar/DashboardSideNavbar';

// Default avatar fallback
const DEFAULT_AVATAR = "https://flowbite.com/docs/images/people/profile-picture-5.jpg";

// Video Card Component
const VideoCard = ({ video, type = 'recent' }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-gray-800 border-gray-700">
    <div className="relative">
      <img 
        src={video.thumbnail} 
        alt={video.title} 
        className="w-full h-36 object-cover"
      />
      <div className="absolute bottom-2 right-2 bg-gray-900 bg-opacity-80 text-white text-xs px-2 py-1 rounded-md flex items-center">
        <Clock size={12} className="mr-1" />
        {video.duration}
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
        {video.views.toLocaleString()}
      </div>
      <div className="flex items-center">
        <ThumbsUp size={14} className="mr-1" />
        {video.likes.toLocaleString()}
      </div>
      <div className="flex items-center">
        <Clock size={14} className="mr-1" />
        {video.createdAt}
      </div>
    </div>
  </Card>
);

// Props validation for VideoCard
VideoCard.propTypes = {
  video: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    thumbnail: PropTypes.string.isRequired,
    duration: PropTypes.string.isRequired,
    views: PropTypes.number.isRequired,
    likes: PropTypes.number.isRequired,
    createdAt: PropTypes.string.isRequired
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
            Welcome back, {user?.displayName?.split(' ')[0] || 'Creator'}
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
            {stats.recentVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
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
            {stats.popularVideos.map((video) => (
              <VideoCard key={video.id} video={video} type="popular" />
            ))}
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

// Main Dashboard Component
const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [loading, setLoading] = useState(true);
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

  // Simulate data loading
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // In a real app, this would be an API call
        setLoading(true);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // sample data disi
        setStats({
          totalVideos: 12,
          totalViews: 24758,
          totalLikes: 1832,
          storageUsed: 65,
          recentVideos: [
            {
              id: 'v1',
              title: 'How to Create Modern UI with React',
              thumbnail: 'https://flowbite.com/docs/images/blog/image-1.jpg',
              duration: '12:45',
              views: 1245,
              likes: 89,
              createdAt: '2 days ago'
            },
            {
              id: 'v2',
              title: 'Advanced Animation Techniques',
              thumbnail: 'https://flowbite.com/docs/images/blog/image-2.jpg',
              duration: '8:32',
              views: 987,
              likes: 61,
              createdAt: '1 week ago'
            },
            {
              id: 'v3',
              title: 'Mastering State Management in React',
              thumbnail: 'https://flowbite.com/docs/images/blog/image-3.jpg',
              duration: '15:10',
              views: 756,
              likes: 45,
              createdAt: '3 weeks ago'
            }
          ],
          popularVideos: [
            {
              id: 'v4',
              title: 'Ultimate Guide to Tailwind CSS',
              thumbnail: 'https://flowbite.com/docs/images/blog/image-4.jpg',
              duration: '18:22',
              views: 8754,
              likes: 432,
              createdAt: '2 months ago'
            },
            {
              id: 'v5',
              title: 'Building a Modern Dashboard',
              thumbnail: 'https://flowbite.com/docs/images/blog/image-3.jpg',
              duration: '10:15',
              views: 6543,
              likes: 321,
              createdAt: '3 months ago'
            }
          ]
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    if (isMainDashboard) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [isMainDashboard]);

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
        ) : (
          <>
            {isMainDashboard ? <DashboardHome user={user} stats={stats} /> : <Outlet />}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;