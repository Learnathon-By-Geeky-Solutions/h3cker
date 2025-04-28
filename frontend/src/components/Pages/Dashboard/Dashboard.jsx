import React, { useState, useContext, useEffect, lazy, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { Alert, Spinner } from 'flowbite-react';
import { AlertCircle } from 'lucide-react';
import DashboardSideNavbar from '../../Shared/DashboardSideNavbar/DashboardSideNavbar';
import VideoService from '../../../utils/VideoService';
import { LoadingState } from '../../Shared/VideoLoadingStates/VideoLoadingStates';
import DashboardHome from './DashboardHome';

// Lazy load the AdminDashboard component
const AdminDashboard = lazy(() => import('./AdminDashboard'));

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
        // Admin users get all videos, regular users only get their own
        const allVideos = user?.role === 'admin' ? 
          VideoService.adminGetAllVideos() : 
          VideoService.getVideoFeed();
        
        if (!isMounted) return;
        
        if (!Array.isArray(allVideos)) {
          console.error("Data Error: Expected an array of videos, received:", allVideos);
          throw new Error("Invalid data format received from server.");
        }
        
        // Filter videos by user email for non-admin users
        let userVideos = allVideos;
        if (user.role !== 'admin') {
          const userEmailLower = user.email.toLowerCase();
          userVideos = allVideos.filter(video =>
            video &&
            (video.uploader_email?.toLowerCase() === userEmailLower ||
             video.uploader?.email?.toLowerCase() === userEmailLower)
          );
        }

        // Sort videos for display
        const sortedByDate = [...userVideos].sort(
          (a, b) => new Date(b.upload_date || 0) - new Date(a.upload_date || 0)
        );
        
        const sortedByViews = [...userVideos].sort(
          (a, b) => (b.views || 0) - (a.views || 0)
        );

        // Calculate simulated storage usage (only for company/admin users)
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
  }, [isMainDashboard, user?.email, user?.role]);

  const renderDashboardContent = () => {
    if (!isMainDashboard) {
      return <Outlet />;
    }
    
    if (loading) {
      return <LoadingState message="Loading dashboard data..." />;
    }
    
    const isAdmin = user?.role === 'admin';
    
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
        
        {isAdmin ? (
          <div className="space-y-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white">
                Admin Dashboard
              </h1>
              <p className="text-gray-400 mt-1">
                Manage users, videos, and platform settings.
              </p>
            </div>
            
            <Suspense fallback={<div className="flex justify-center py-12"><Spinner size="xl" /></div>}>
              <AdminDashboard />
            </Suspense>
          </div>
        ) : (
          <DashboardHome user={user} stats={stats} />
        )}
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