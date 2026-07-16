import React, { useState, useEffect, useRef, useContext } from 'react';
import { Card, Button, Spinner, Alert, Select, Table, Modal } from 'flowbite-react';
import { Play, RefreshCw, BarChart3, Activity, UserRound, Download, Trash2, Video as VideoIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import VideoService from '../../../../utils/VideoService';
import { AuthContext } from '../../../../contexts/AuthProvider/AuthProvider';

const EMOTIONS = [
  { key: 'happy', label: 'Happy', color: '#22c55e' },
  { key: 'neutral', label: 'Neutral', color: '#64748b' },
  { key: 'sad', label: 'Sad', color: '#3b82f6' },
  { key: 'angry', label: 'Angry', color: '#ef4444' },
  { key: 'fear', label: 'Fear', color: '#a855f7' },
  { key: 'surprise', label: 'Surprise', color: '#f59e0b' },
  { key: 'disgust', label: 'Disgust', color: '#8b5cf6' },
];

const EMOTION_COLOR = Object.fromEntries(EMOTIONS.map(e => [e.key, e.color]));

const WINDOW_SECONDS = 10;

const DetailedAnalytics = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  const [videos, setVideos] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [runStatus, setRunStatus] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteRecording = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await VideoService.adminDeleteWebcamRecording(deleteTarget.recording_id);
      setRecordings(prev => prev.filter(r => r.recording_id !== deleteTarget.recording_id));
      setDeleteTarget(null);
      if (selectedVideoId) loadAnalytics(selectedVideoId);
    } catch (err) {
      console.error('Error deleting recording:', err);
    } finally {
      setDeleting(false);
    }
  };

  const pollTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadVideos();
    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  const loadVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = isAdmin
        ? await VideoService.adminGetAllVideos()
        : await VideoService.getVideoFeed();
      const list = Array.isArray(data) ? data : [];
      if (!mountedRef.current) return;
      setVideos(list);
      if (list.length > 0 && !selectedVideoId) {
        setSelectedVideoId(list[0].id);
        loadAnalytics(list[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading videos for analytics:', err);
      if (!mountedRef.current) return;
      setError(err.message || 'Failed to load videos');
      setLoading(false);
    }
  };

  const loadAnalytics = async (videoId) => {
    if (!videoId) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryData, recordingsData] = await Promise.all([
        VideoService.getVideoEmotionSummary(videoId),
        VideoService.getVideoEmotionRecordings(videoId),
      ]);
      if (!mountedRef.current) return;
      setSummary(summaryData);
      setRecordings(recordingsData);
    } catch (err) {
      console.error('Error loading emotion analytics:', err);
      if (!mountedRef.current) return;
      setError(err.message || 'Failed to load emotion analytics');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const loadRunStatus = async () => {
    try {
      const statusData = await VideoService.getEmotionAnalysisStatus();
      if (mountedRef.current) setRunStatus(statusData);
    } catch {
      if (mountedRef.current) setRunStatus(null);
    }
  };

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsRunning(false);
  };

  const handleSelectVideo = (e) => {
    const id = parseInt(e.target.value, 10);
    setSelectedVideoId(id);
    setExpanded(null);
    loadAnalytics(id);
  };

  const handleRunAnalysis = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setError(null);
    try {
      await VideoService.runEmotionAnalysis();
      loadRunStatus();
      const timer = setInterval(async () => {
        try {
          const statusData = await VideoService.getEmotionAnalysisStatus();
          if (!mountedRef.current) { clearInterval(timer); return; }
          setRunStatus(statusData);
          if (statusData?.status !== 'running') {
            clearInterval(timer);
            pollTimerRef.current = null;
            setIsRunning(false);
            if (selectedVideoId) loadAnalytics(selectedVideoId);
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
      if (mountedRef.current) {
        setError(err.message || 'Failed to start analysis');
        setIsRunning(false);
      }
    }
  };

  const distributionData = summary
    ? EMOTIONS.map(e => ({
        name: e.label,
        key: e.key,
        value: summary.distribution?.[e.key] || 0,
      }))
    : [];

  const timeline = summary?.timeline || [];

  const segments = computeSegments(timeline);

  const progressText =
    runStatus && runStatus.status === 'running'
      ? `${runStatus.processed || 0} / ${runStatus.total || 0} processed`
      : runStatus
      ? `Last run: ${runStatus.status} (${runStatus.processed || 0}/${runStatus.total || 0})`
      : 'No runs yet';

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <BarChart3 className="mr-2" /> Emotion Analytics
        </h1>
        {isAdmin && (
          <div className="flex items-center gap-3">
            {runStatus && (
              <span className="text-sm text-gray-400">{progressText}</span>
            )}
            <Button
              color="blue"
              onClick={handleRunAnalysis}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Running…
                </>
              ) : (
                <>
                  <Play size={16} className="mr-2" /> Run analysis now
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <Alert color="failure" className="mb-4">{error}</Alert>
      )}

      <Card className="bg-gray-800 border-gray-700 mb-6">
        <div className="flex items-center gap-3">
          <label className="text-white text-sm font-medium">Video:</label>
          {videos.length === 0 ? (
            <span className="text-gray-400 text-sm">No videos available</span>
          ) : (
            <Select
              value={selectedVideoId || ''}
              onChange={handleSelectVideo}
              className="bg-gray-700 text-white border-gray-600 max-w-md"
            >
              {videos.map(v => (
                <option key={v.id} value={v.id}>{v.title}</option>
              ))}
            </Select>
          )}
          <Button color="light" onClick={() => selectedVideoId && loadAnalytics(selectedVideoId)}>
            <RefreshCw size={16} className="mr-1" /> Refresh
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="xl" />
        </div>
      ) : !summary || summary.total_frames === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <p className="text-gray-300">
            No emotion data yet for this video. Recordings are analyzed daily at 12:00 PM
            (BD time), or click <span className="font-medium">Run analysis now</span> to
            process completed webcam recordings immediately.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">Overall Reaction Mix</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    label={(d) => `${d.name} ${(d.value * 100).toFixed(0)}%`}
                  >
                    {distributionData.map((d) => (
                      <Cell key={d.key} fill={EMOTION_COLOR[d.key]} />
                    ))}
                  </Pie>
                  <RTooltip formatter={(v) => `${(v * 100).toFixed(1)}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">Engagement Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="t" stroke="#9ca3af" tickFormatter={(t) => `${t}s`} />
                  <YAxis stroke="#9ca3af" domain={[0, 1]} />
                  <RTooltip formatter={(v) => `${(v * 100).toFixed(0)}%`} labelFormatter={(t) => `${t}s`} />
                  <Legend />
                  {EMOTIONS.map(e => (
                    <Line
                      key={e.key}
                      type="monotone"
                      dataKey={e.key}
                      name={e.label}
                      stroke={e.color}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {segments && (
            <Card className="bg-gray-800 border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <Activity size={18} className="mr-2" /> Best / Worst {WINDOW_SECONDS}s Segments
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-green-900/30 border border-green-700">
                  <p className="text-green-300 font-medium">Most positive</p>
                  <p className="text-white">{segments.best.label} — {(segments.best.happy * 100).toFixed(0)}% happy</p>
                </div>
                <div className="p-4 rounded-lg bg-red-900/30 border border-red-700">
                  <p className="text-red-300 font-medium">Least positive</p>
                  <p className="text-white">{segments.worst.label} — {(segments.worst.happy * 100).toFixed(0)}% happy</p>
                </div>
              </div>
            </Card>
          )}

          <Card className="bg-gray-800 border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <UserRound size={18} className="mr-2" /> Per-Person Breakdown
              <span className="ml-2 text-sm text-gray-400 font-normal">
                (identities hidden — {recordings.length} analyzed recordings)
              </span>
            </h3>
            {recordings.length === 0 ? (
              <p className="text-gray-400">No analyzed recordings for this video.</p>
            ) : (
              <Table hoverable>
                <Table.Head>
                  <Table.HeadCell>Recording</Table.HeadCell>
                  <Table.HeadCell>Preview</Table.HeadCell>
                  <Table.HeadCell>Duration</Table.HeadCell>
                  <Table.HeadCell>Top emotion</Table.HeadCell>
                  <Table.HeadCell>Happy</Table.HeadCell>
                  <Table.HeadCell></Table.HeadCell>
                </Table.Head>
                <Table.Body>
                  {recordings.map((r) => {
                    const top = Object.entries(r.distribution || {})
                      .sort((a, b) => b[1] - a[1])[0];
                    const topLabel = EMOTIONS.find(e => e.key === top?.[0])?.label || top?.[0];
                    return (
                      <React.Fragment key={r.recording_id}>
                        <Table.Row className="bg-gray-800 border-gray-700">
                          <Table.Cell className="text-white">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{r.filename || `Recording #${r.recording_id}`}</span>
                              <span className="text-xs text-gray-500">ID: {r.recording_id}</span>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            {r.thumbnail_url ? (
                              <img
                                src={r.thumbnail_url}
                                alt={r.filename}
                                loading="lazy"
                                className="w-16 h-10 object-cover rounded border border-gray-600"
                              />
                            ) : (
                              <div className="w-16 h-10 bg-gray-700 rounded flex items-center justify-center border border-gray-600">
                                <VideoIcon size={16} className="text-gray-500" />
                              </div>
                            )}
                          </Table.Cell>
                          <Table.Cell className="text-gray-300">{r.duration}s</Table.Cell>
                          <Table.Cell className="text-gray-300">
                            {topLabel} {top ? `${(top[1] * 100).toFixed(0)}%` : ''}
                          </Table.Cell>
                          <Table.Cell className="text-gray-300">
                            {((r.distribution?.happy || 0) * 100).toFixed(0)}%
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex gap-1">
                              {r.recording_url && (
                                <Button
                                  color="gray"
                                  size="xs"
                                  onClick={() => triggerDownload(r.recording_url, r.filename || `recording-${r.recording_id}.webm`)}
                                  title="Download recording"
                                >
                                  <Download size={14} />
                                </Button>
                              )}
                              <Button
                                color="light"
                                size="xs"
                                onClick={() => setExpanded(expanded === r.recording_id ? null : r.recording_id)}
                              >
                                {expanded === r.recording_id ? 'Hide' : 'Timeline'}
                              </Button>
                              <Button
                                color="failure"
                                size="xs"
                                onClick={() => setDeleteTarget(r)}
                                title="Delete recording"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                        {expanded === r.recording_id && (
                          <Table.Row className="bg-gray-900 border-gray-700">
                            <Table.Cell colSpan={5}>
                              <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={r.timeline || []}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                  <XAxis dataKey="t" stroke="#9ca3af" tickFormatter={(t) => `${t}s`} />
                                  <YAxis stroke="#9ca3af" domain={[0, 1]} />
                                  <RTooltip formatter={(v) => `${(v * 100).toFixed(0)}%`} labelFormatter={(t) => `${t}s`} />
                                  <Legend />
                                  {EMOTIONS.map(e => (
                                    <Line
                                      key={e.key}
                                      type="monotone"
                                      dataKey={e.key}
                                      name={e.label}
                                      stroke={e.color}
                                      dot={false}
                                      isAnimationActive={false}
                                    />
                                  ))}
                                </LineChart>
                              </ResponsiveContainer>
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </React.Fragment>
                    );
                  })}
                </Table.Body>
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal show={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}>
        <Modal.Header className="bg-gray-800 text-white border-b border-gray-700">
          Delete Recording
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          <p className="mb-2">Are you sure you want to delete this recording?</p>
          {deleteTarget && (
            <p className="text-gray-400 text-sm mb-4">
              &quot;{deleteTarget.filename || `Recording #${deleteTarget.recording_id}`}&quot;
            </p>
          )}
          <p className="text-red-400 text-sm">This action cannot be undone. All emotion analysis data for this recording will also be removed.</p>
        </Modal.Body>
        <Modal.Footer className="bg-gray-800 border-t border-gray-700">
          <Button color="failure" onClick={handleDeleteRecording} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
          <Button color="gray" onClick={() => !deleting && setDeleteTarget(null)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

function computeSegments(timeline) {
  if (!timeline || timeline.length === 0) return null;

  const byT = [...timeline].sort((a, b) => a.t - b.t);
  const windowed = [];
  for (let i = 0; i < byT.length; i++) {
    const start = byT[i].t;
    const end = start + WINDOW_SECONDS;
    const slice = byT.filter(p => p.t >= start && p.t <= end);
    if (slice.length === 0) continue;
    const happy = slice.reduce((s, p) => s + (p.happy || 0), 0) / slice.length;
    windowed.push({ start, end, happy, slice });
  }
  if (windowed.length === 0) return null;

  const best = windowed.reduce((a, b) => (b.happy > a.happy ? b : a));
  const worst = windowed.reduce((a, b) => (b.happy < a.happy ? b : a));

  return {
    best: { label: `${best.start}s – ${best.end}s`, happy: best.happy },
    worst: { label: `${worst.start}s – ${worst.end}s`, happy: worst.happy },
  };
}

function triggerDownload(url, filename) {
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default DetailedAnalytics;
