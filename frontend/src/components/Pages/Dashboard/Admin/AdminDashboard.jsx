import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Spinner, Alert, Badge } from 'flowbite-react';
import { BarChart2, Upload, VideoIcon, ArrowRight, Play, Activity } from 'lucide-react';
import VideoService from '../../../../utils/VideoService';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '../../../Shared/DashboardComponents/DashboardComponents';

const AdminDashboard = () => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [adminStats, setAdminStats] = useState({
    totalVideos: 0,
    totalWebcamRecordings: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const [runStatus, setRunStatus] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const navigate = useNavigate();
  const isMounted = useRef(true);
  const pollTimerRef = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
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
          VideoService.adminGetVideoStats(),
          VideoService.getEmotionAnalysisStatus(),
        ];

        const [videosResponse, recordingsResponse, statsResponse, statusResponse] = await Promise.allSettled(requests);

        if (videosResponse.status === 'fulfilled' && Array.isArray(videosResponse.value)) {
          videos = videosResponse.value;
        }

        if (recordingsResponse.status === 'fulfilled' && Array.isArray(recordingsResponse.value)) {
          recordings = recordingsResponse.value;
        }

        if (statsResponse.status === 'fulfilled' && statsResponse.value) {
          const { totalVideos, totalWebcamRecordings } = statsResponse.value;
          setAdminStats({
            totalVideos: totalVideos || 0,
            totalWebcamRecordings: totalWebcamRecordings || 0
          });
        }

        if (isMounted.current) {
          setAdminStats({
            totalVideos: videos.length || 0,
            totalWebcamRecordings: recordings.length || 0
          });
        }

        if (statusResponse.status === 'fulfilled' && statusResponse.value) {
          setRunStatus(statusResponse.value);
          if (statusResponse.value.status === 'running') {
            setIsRunning(true);
          }
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

  const handleRunAnalysis = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setError(null);
    try {
      await VideoService.runEmotionAnalysis();
      const timer = setInterval(async () => {
        try {
          if (!isMounted.current) { clearInterval(timer); return; }
          const statusData = await VideoService.getEmotionAnalysisStatus();
          setRunStatus(statusData);
          if (statusData?.status !== 'running') {
            clearInterval(timer);
            pollTimerRef.current = null;
            setIsRunning(false);
          }
        } catch (err) {
          console.error('Error polling analysis status:', err);
          clearInterval(timer);
          pollTimerRef.current = null;
          setIsRunning(false);
        }
      }, 3000);
      pollTimerRef.current = timer;
    } catch (err) {
      console.error('Error starting emotion analysis:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to start analysis');
        setIsRunning(false);
      }
    }
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const statusBadge = () => {
    if (!runStatus) return <Badge color="gray">Never run</Badge>;
    if (runStatus.status === 'running') return <Badge color="warning" className="animate-pulse">Running</Badge>;
    if (runStatus.status === 'done') return <Badge color="success">Completed</Badge>;
    if (runStatus.status === 'failed') return <Badge color="failure">Failed</Badge>;
    return <Badge color="gray">Idle</Badge>;
  };

  const progressText =
    runStatus && runStatus.status === 'running'
      ? `${runStatus.processed || 0} / ${runStatus.total || 0} recordings`
      : runStatus
      ? `Last run: ${runStatus.processed || 0}/${runStatus.total || 0} recordings`
      : 'No runs yet';

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">Admin Dashboard</h1>
        <p className="text-sm md:text-base text-gray-400">
          {isMobile ? "Manage platform stats & content" : "View platform statistics and manage your site."}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <Button
            color="warning"
            onClick={handleRunAnalysis}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Spinner size="sm" className="mr-2" /> Running…
              </>
            ) : (
              <>
                <Play size={16} className="mr-2" /> Run Analysis
              </>
            )}
          </Button>
        </div>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Activity className="mr-2 text-blue-400" size={24} />
            Emotion Analysis
          </h2>
          <div className="flex items-center gap-3">
            {statusBadge()}
            <span className="text-sm text-gray-400">{progressText}</span>
            <Button color="blue" size="sm" onClick={() => navigate('detailed-analytics')}>
              View Detailed Analytics <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="bg-gray-700/50 p-6 rounded-lg text-center">
          <div className="flex items-center justify-center">
            <div className="text-gray-400">
              <BarChart2 size={48} className="mx-auto mb-3 text-gray-500" />
              <p>Emotion analysis runs daily at 12:00 PM (BD time).</p>
              <p className="text-sm mt-1">Use <span className="text-yellow-400">Run Analysis</span> above to process pending recordings immediately.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
