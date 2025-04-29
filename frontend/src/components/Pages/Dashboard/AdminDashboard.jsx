import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Spinner, Alert } from 'flowbite-react';
import { BarChart2, Upload, Users, DollarSign, VideoIcon, ArrowRight } from 'lucide-react';
import VideoService from '../../../utils/VideoService';
import ApiService from '../../../utils/ApiService';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '../../Shared/DashboardComponents/DashboardComponents';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [adminStats, setAdminStats] = useState({
    totalVideos: 0,
    totalWebcamRecordings: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  
  const navigate = useNavigate();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (fetchAttempted) return;
    
    const fetchDashboardData = async () => {
      try {
        setStatsLoading(true);
        setFetchAttempted(true);
        
        let videos = [];
        let recordings = [];
        
        const requests = [
          VideoService.adminGetAllVideos(),
          VideoService.adminGetWebcamRecordings(),
          VideoService.adminGetVideoStats()
        ];
        
        const [videosResponse, recordingsResponse, statsResponse] = await Promise.allSettled(requests);
        
        if (videosResponse.status === 'fulfilled' && Array.isArray(videosResponse.value)) {
          videos = videosResponse.value;
        }
        
        if (recordingsResponse.status === 'fulfilled' && Array.isArray(recordingsResponse.value)) {
          recordings = recordingsResponse.value;
        }
        
        if (statsResponse.status === 'fulfilled' && statsResponse.value) {

        }
        
        if (isMounted.current) {
          setAdminStats({
            totalVideos: videos.length || 0,
            totalWebcamRecordings: recordings.length || 0
          });
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        if (isMounted.current) {
          setError('Failed to load dashboard data. Please try again.');
        }
      } finally {
        if (isMounted.current) {
          setStatsLoading(false);
        }
      }
    };

    fetchDashboardData();
  }, [fetchAttempted]);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">
          View platform statistics and manage your site.
        </p>
      </div>
      
      {error && (
        <Alert color="failure" onDismiss={() => setError(null)} className="mb-4">
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert color="success" onDismiss={() => setSuccess(null)} className="mb-4">
          {success}
        </Alert>
      )}
      
      {statsLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatsCard 
            title="Total Videos" 
            value={adminStats.totalVideos} 
            icon={Upload} 
            color="blue" 
          />
          <StatsCard 
            title="Webcam Recordings" 
            value={adminStats.totalWebcamRecordings} 
            icon={VideoIcon} 
            color="green" 
          />
        </div>
      )}
      
      <Card className="bg-gray-800 border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button color="blue" onClick={() => navigate('/dashboard/upload')}>
            <Upload className="mr-2 h-5 w-5" />
            Upload New Video
          </Button>
          <Button color="purple" onClick={() => navigate('/dashboard/videos')}>
            <VideoIcon className="mr-2 h-5 w-5" />
            Manage Videos
          </Button>
          <Button color="green" onClick={() => navigate('/dashboard/recorded-videos')}>
            <VideoIcon className="mr-2 h-5 w-5" />
            View Webcam Recordings
          </Button>
        </div>
      </Card>
      
      <Card className="bg-gray-800 border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center">
            <BarChart2 className="mr-2 text-blue-400" size={24} />
            Platform Analytics
          </h2>
          <Button color="blue" size="sm" onClick={() => navigate('/dashboard/analytics')}>
            View Detailed Analytics <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        
        <div className="bg-gray-700 p-6 rounded-lg text-center">
          <div className="h-64 flex items-center justify-center">
            <div className="text-gray-400">
              <BarChart2 size={48} className="mx-auto mb-3 text-gray-500" />
              <p>Analytics dashboard will display charts and metrics here.</p>
              <p className="text-sm mt-2">View the detailed analytics page for more information.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;