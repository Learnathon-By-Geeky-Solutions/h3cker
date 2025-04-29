import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Button, Spinner, Alert, Modal } from 'flowbite-react';
import { Trash, Edit, Eye } from 'lucide-react';
import VideoService from '../../../utils/VideoService';
import { useNavigate } from 'react-router-dom';

const AdminVideos = () => {
  const [allVideos, setAllVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteVideoId, setDeleteVideoId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  
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
    
    const fetchAllVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        setFetchAttempted(true);
        
        const response = await VideoService.adminGetAllVideos();
        
        if (isMounted.current) {
          setAllVideos(response || []);
        }
      } catch (err) {
        console.error('Error fetching videos:', err);
        if (isMounted.current) {
          setError('Failed to load videos. Please try again.');
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    fetchAllVideos();
  }, [fetchAttempted]);

  const openDeleteModal = (videoId) => {
    setDeleteVideoId(videoId);
    setDeleteModalOpen(true);
  };

  const handleDeleteVideo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await VideoService.adminDeleteVideo(deleteVideoId);
      
      if (isMounted.current) {
        setSuccess('Video successfully deleted');
        setAllVideos(allVideos.filter(video => video.id !== deleteVideoId));
        setDeleteModalOpen(false);
      }
    } catch (err) {
      console.error('Delete video error:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to delete video');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setDeleteVideoId(null);
      }
    }
  };

  const handleViewVideo = (videoId) => {
    navigate(`/video/${videoId}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-6">Video Management</h1>
      
      <Card className="bg-gray-800 border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">All Videos</h2>
        
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
                <Table.HeadCell>Title</Table.HeadCell>
                <Table.HeadCell>Uploader</Table.HeadCell>
                <Table.HeadCell>Visibility</Table.HeadCell>
                <Table.HeadCell>Upload Date</Table.HeadCell>
                <Table.HeadCell>Views</Table.HeadCell>
                <Table.HeadCell>Actions</Table.HeadCell>
              </Table.Head>
              <Table.Body className="divide-y divide-gray-600">
                {allVideos.length === 0 ? (
                  <Table.Row className="bg-gray-700">
                    <Table.Cell colSpan={7} className="text-center py-10">
                      No videos found
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  allVideos.map(video => (
                    <Table.Row key={video.id} className="bg-gray-700 hover:bg-gray-600">
                      <Table.Cell>
                        <img 
                          src={video.thumbnail_url || '/api/placeholder/80/45'} 
                          alt={video.title}
                          className="w-20 h-12 object-cover rounded"
                        />
                      </Table.Cell>
                      <Table.Cell className="whitespace-nowrap font-medium">
                        {video.title}
                      </Table.Cell>
                      <Table.Cell>
                        {video.uploader?.email || 'Unknown'}
                      </Table.Cell>
                      <Table.Cell>
                        <span className="capitalize">{video.visibility}</span>
                      </Table.Cell>
                      <Table.Cell>
                        {new Date(video.upload_date).toLocaleDateString()}
                      </Table.Cell>
                      <Table.Cell>
                        {video.views || 0}
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex space-x-2">
                          <Button size="xs" color="blue" onClick={() => handleViewVideo(video.id)}>
                            <Eye size={14} />
                          </Button>
                          <Button size="xs" color="gray" onClick={() => navigate(`/dashboard/edit-video/${video.id}`)}>
                            <Edit size={14} />
                          </Button>
                          <Button size="xs" color="failure" onClick={() => openDeleteModal(video.id)}>
                            <Trash size={14} />
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
      
      {/* Delete Video Confirmation Modal */}
      <Modal show={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <Modal.Header className="bg-gray-800 text-white border-b border-gray-700">
          Delete Video
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          <p className="mb-2">Are you sure you want to delete this video?</p>
          <p className="text-red-400">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer className="bg-gray-800 border-t border-gray-700">
          <Button
            color="failure"
            onClick={handleDeleteVideo}
            disabled={loading}
          >
            {loading && <Spinner size="sm" className="mr-2" />}
            Delete Video
          </Button>
          <Button
            color="gray"
            onClick={() => setDeleteModalOpen(false)}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminVideos;