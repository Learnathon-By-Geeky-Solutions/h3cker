import React, { useState, useContext, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { Alert } from 'flowbite-react';
import { AlertCircle } from 'lucide-react';
import DashboardSideNavbar from '../../Shared/DashboardSideNavbar/DashboardSideNavbar';
import VideoService from '../../../utils/VideoService';
import { LoadingState } from '../../Shared/VideoLoadingStates/VideoLoadingStates';
import DashboardHome from './DashboardHome';

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
      setStats({ 
        totalVideos: 0, 
        totalViews: 0, 
        totalLikes: 0, 
        storageUsed: 0, 
        recentVideos: [], 
        popularVideos: [] 
      });
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchDashboardData = async () => {
      try {
        const allVideos = await VideoService.getVideoFeed();
        
        if (!isMounted) return;
        
        if (!Array.isArray(allVideos)) {
          console.error("Data Error: Expected an array of videos, received:", allVideos);
          throw new Error("Invalid data format received from server.");
        }
        
        // Filter videos by user email
        const userEmailLower = user.email.toLowerCase();
        const userVideos = allVideos.filter(video =>
          video &&
          (video.uploader_email?.toLowerCase() === userEmailLower ||
           video.uploader?.email?.toLowerCase() === userEmailLower)
        );

        // Sort videos for display
        const sortedByDate = [...userVideos].sort(
          (a, b) => new Date(b.upload_date || 0) - new Date(a.upload_date || 0)
        );
        
        const sortedByViews = [...userVideos].sort(
          (a, b) => (b.views || 0) - (a.views || 0)
        );

        // Calculate simulated storage usage
        const simulatedStorageUsed = Math.min(95, userVideos.length * 5);

        // Update state with video stats
        setStats({
          totalVideos: userVideos.length,
          totalViews: userVideos.reduce((sum, v) => sum + (v?.views || 0), 0),
          totalLikes: userVideos.reduce((sum, v) => sum + (v?.likes || 0), 0),
          storageUsed: simulatedStorageUsed,
          recentVideos: sortedByDate.slice(0, 5),
          popularVideos: sortedByViews.slice(0, 5),
        });
      } catch (error) {
        console.error('Error fetching dashboard video data:', error);
        if (isMounted) {
          setError(error.message || 'Failed to load dashboard data. Please try again later.');
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
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboardData();
    
    return () => { isMounted = false; };
  }, [isMainDashboard, user?.email]);

  const renderDashboardContent = () => {
    if (!isMainDashboard) {
      return <Outlet />;
    }
    
    if (loading) {
      return <LoadingState message="Loading dashboard data..." />;
    }
    
    return (
      <>
        {error && (
          <Alert 
            color="failure" 
            icon={AlertCircle} 
            className="mb-6" 
            onDismiss={() => setError(null)}
          >
            <span className="font-medium">Error:</span> {error}
          </Alert>
        )}
        <DashboardHome user={user} stats={stats} />
      </>
    );
  };

  return (
    <div className="flex bg-gray-900 min-h-screen text-white">
      <DashboardSideNavbar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <main className={`flex-1 p-4 sm:p-6 md:p-8 ${sidebarOpen ? 'ml-64' : 'ml-0 md:ml-20'} lg:ml-64 transition-all duration-300 ease-in-out overflow-y-auto`}>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)} 
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-700 rounded text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500" 
          aria-label="Toggle sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        {renderDashboardContent()}
      </main>
    </div>
  );
};

export default Dashboard;