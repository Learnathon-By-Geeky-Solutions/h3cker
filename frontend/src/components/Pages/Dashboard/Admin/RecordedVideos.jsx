import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Button, Spinner, Alert, Modal } from 'flowbite-react';
import { Trash2, Download, Eye, Video as VideoIcon } from 'lucide-react';
import VideoService from '../../../../utils/VideoService';

const RecordedVideos = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await VideoService.adminGetWebcamRecordings();
      if (isMounted.current) {
        setRecordings(data || []);
      }
    } catch (err) {
      console.error('Error fetching recordings:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to load recordings');
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const openDeleteModal = (recording) => {
    setDeleteTarget(recording);
    setDeleteModalOpen(true);
  };

  const handleDeleteRecording = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await VideoService.adminDeleteWebcamRecording(deleteTarget.id);
      if (isMounted.current) {
        setSuccess('Recording deleted successfully');
        setRecordings(prev => prev.filter(r => r.id !== deleteTarget.id));
        setDeleteModalOpen(false);
        setDeleteTarget(null);
      }
    } catch (err) {
      console.error('Error deleting recording:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to delete recording');
      }
    } finally {
      if (isMounted.current) setDeleting(false);
    }
  };

  const handleViewRecording = (url) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadRecording = async (recording) => {
    if (!recording.recording_url || downloadingId) return;
    setDownloadingId(recording.id);
    try {
      const response = await fetch(recording.recording_url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = recording.filename || `recording-${recording.id}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download recording. The URL may have expired.');
    } finally {
      if (isMounted.current) setDownloadingId(null);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'processing': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-6">Webcam Recordings</h1>

      <Card className="bg-gray-800 border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">All Recordings</h2>
          <Button color="blue" size="sm" onClick={fetchRecordings} disabled={loading}>
            Refresh
          </Button>
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

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Spinner size="xl" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table hoverable className="bg-gray-700 text-white">
              <Table.Head>
                <Table.HeadCell>Thumbnail</Table.HeadCell>
                <Table.HeadCell>Filename</Table.HeadCell>
                <Table.HeadCell>Video</Table.HeadCell>
                <Table.HeadCell>Recorder</Table.HeadCell>
                <Table.HeadCell>Status</Table.HeadCell>
                <Table.HeadCell>Date</Table.HeadCell>
                <Table.HeadCell>Actions</Table.HeadCell>
              </Table.Head>
              <Table.Body className="divide-y divide-gray-600">
                {recordings.length === 0 ? (
                  <Table.Row className="bg-gray-700">
                    <Table.Cell colSpan={7} className="text-center py-10 text-gray-400">
                      No recordings found
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  recordings.map(recording => (
                    <Table.Row key={recording.id} className="bg-gray-700 hover:bg-gray-600">
                      <Table.Cell>
                        {recording.thumbnail_url ? (
                      <img 
                        src={recording.thumbnail_url || '/api/placeholder/80/45'}
                        alt={recording.filename}
                        loading="lazy"
                        className="w-20 h-12 object-cover rounded"
                      />
                        ) : null}
                        <div className={`w-20 h-12 bg-gray-600 rounded flex items-center justify-center ${recording.thumbnail_url ? 'hidden' : ''}`}>
                          <VideoIcon size={20} className="text-gray-400" />
                        </div>
                      </Table.Cell>
                      <Table.Cell className="whitespace-nowrap font-medium">
                        {recording.filename || `Recording #${recording.id}`}
                      </Table.Cell>
                      <Table.Cell>
                        {recording.video?.title || 'Unknown'}
                      </Table.Cell>
                      <Table.Cell>
                        {recording.recorder?.email || 'Unknown'}
                      </Table.Cell>
                      <Table.Cell>
                        <span className={getStatusBadgeColor(recording.upload_status)}>
                          Upload: {recording.upload_status}
                        </span>
                        <br />
                        <span className={getStatusBadgeColor(recording.analysis_status)}>
                          Analysis: {recording.analysis_status}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        {formatDate(recording.recording_date)}
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex space-x-2">
                          <Button
                            size="xs"
                            color="blue"
                            onClick={() => handleViewRecording(recording.recording_url)}
                            disabled={!recording.recording_url}
                            title="View recording"
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            size="xs"
                            color="gray"
                            onClick={() => handleDownloadRecording(recording)}
                            disabled={!recording.recording_url || downloadingId === recording.id}
                            title="Download recording"
                          >
                            {downloadingId === recording.id ? (
                              <Spinner size="sm" />
                            ) : (
                              <Download size={14} />
                            )}
                          </Button>
                          <Button
                            size="xs"
                            color="failure"
                            onClick={() => openDeleteModal(recording)}
                            title="Delete recording"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table>
          </div>
        )}
      </Card>

      <Modal show={deleteModalOpen} onClose={() => !deleting && setDeleteModalOpen(false)}>
        <Modal.Header className="bg-gray-800 text-white border-b border-gray-700">
          Delete Recording
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          <p className="mb-2">Are you sure you want to delete this recording?</p>
          {deleteTarget && (
            <p className="text-gray-400 text-sm mb-4">
              &quot;{deleteTarget.filename || `Recording #${deleteTarget.id}`}&quot;
            </p>
          )}
          <p className="text-red-400 text-sm">This action cannot be undone. All emotion analysis data for this recording will also be removed.</p>
        </Modal.Body>
        <Modal.Footer className="bg-gray-800 border-t border-gray-700">
          <Button
            color="failure"
            onClick={handleDeleteRecording}
            disabled={deleting}
          >
            {deleting && <Spinner size="sm" className="mr-2" />}
            Delete Permanently
          </Button>
          <Button
            color="gray"
            onClick={() => setDeleteModalOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default RecordedVideos;
