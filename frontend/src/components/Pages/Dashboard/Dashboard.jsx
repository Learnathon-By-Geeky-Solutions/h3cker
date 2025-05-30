import React, { useState, useContext, useEffect, lazy, Suspense } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { Alert, Spinner, Button } from 'flowbite-react';
import { AlertCircle } from 'lucide-react';
import VideoService from '../../../utils/VideoService';
import { LoadingState } from '../../Shared/VideoLoadingStates/VideoLoadingStates';
import DashboardHome from './DashboardHome';

const AdminDashboard = lazy(() => import('./Admin/AdminDashboard'));

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
        const allVideos = user?.role === 'admin' ? 
          await Promise.resolve(VideoService.adminGetAllVideos()) : 
          await Promise.resolve(VideoService.getVideoFeed());
        
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
      // For admin routes, we need to check permissions
      const isAdminRoute = location.pathname.includes('/dashboard/edit-video/') || 
                       location.pathname === '/dashboard/videos';
                       
      if (isAdminRoute && user?.role !== 'admin' && user?.role !== 'company') {
        return (
          <div className="p-6 bg-gray-800 rounded-lg border border-gray-700 text-center">
            <Alert color="failure" className="mb-4">
              You don't have permission to access this page
            </Alert>
            <Button color="blue" as={Link} to="/dashboard">
              Return to Dashboard
            </Button>
          </div>
        );
      }
      
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
    <div className="p-4 sm:p-6 md:p-8 overflow-y-auto">
      {renderDashboardContent()}
    </div>
  );
};

export default Dashboard;