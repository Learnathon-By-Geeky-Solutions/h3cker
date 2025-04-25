import React, { useState, useEffect } from 'react';
import { Card, TextInput, Button, Spinner, Alert, Table, Modal } from 'flowbite-react';
import { Search, UserPlus, Trash, Edit, Eye } from 'lucide-react';
import VideoService from '../../../utils/VideoService';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [allVideos, setAllVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosError, setVideosError] = useState(null);
  const [deleteVideoId, setDeleteVideoId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllVideos();
  }, []);

  const fetchAllVideos = async () => {
    try {
      setVideosLoading(true);
      setVideosError(null);
      const response = await VideoService.adminGetAllVideos();
      setAllVideos(response || []);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setVideosError('Failed to load videos. Please try again.');
    } finally {
      setVideosLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setSearchResults(null);

      const response = await VideoService.adminSearchUser(searchEmail);
      setSearchResults(response);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'User not found');
    } finally {
      setLoading(false);
    }
  };

  const openPromoteModal = (userId) => {
    setSelectedUserId(userId);
    setAdminPassword('');
    setConfirmModalOpen(true);
  };

  const handlePromoteUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await VideoService.adminPromoteToAdmin(selectedUserId, adminPassword);
      
      setSuccess(response.message || 'User successfully promoted to admin');
      setSearchResults(response.user);
      setConfirmModalOpen(false);
    } catch (err) {
      console.error('Promotion error:', err);
      setError(err.message || 'Failed to promote user. Please check your password and try again.');
    } finally {
      setLoading(false);
      setAdminPassword('');
    }
  };

  const openDeleteModal = (videoId) => {
    setDeleteVideoId(videoId);
    setDeleteModalOpen(true);
  };

  const handleDeleteVideo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await VideoService.adminDeleteVideo(deleteVideoId);
      
      setSuccess('Video successfully deleted');
      setAllVideos(allVideos.filter(video => video.id !== deleteVideoId));
      setDeleteModalOpen(false);
    } catch (err) {
      console.error('Delete video error:', err);
      setError(err.message || 'Failed to delete video');
    } finally {
      setLoading(false);
      setDeleteVideoId(null);
    }
  };

  const handleViewVideo = (videoId) => {
    navigate(`/video/${videoId}`);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">User Management</h2>
        
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
        
        <div className="flex flex-col sm:flex-row gap-3">
          <TextInput
            id="email-search"
            type="email"
            placeholder="Search user by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="flex-1"
          />
          <Button
            color="blue"
            onClick={handleSearch}
            disabled={loading}
            className="flex-shrink-0"
          >
            {loading ? <Spinner size="sm" className="mr-2" /> : <Search size={18} className="mr-2" />}
            Search
          </Button>
        </div>
        
        {searchResults && (
          <div className="mt-4">
            <h3 className="text-lg font-medium text-white mb-2">Search Results</h3>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-gray-400 text-sm">Name:</p>
                  <p className="text-white">{searchResults.first_name} {searchResults.last_name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email:</p>
                  <p className="text-white">{searchResults.email}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Current Role:</p>
                  <p className="text-white capitalize">{searchResults.role}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Member Since:</p>
                  <p className="text-white">{new Date(searchResults.date_joined).toLocaleDateString()}</p>
                </div>
              </div>
              
              {searchResults.role !== 'admin' && (
                <Button 
                  color="blue" 
                  onClick={() => openPromoteModal(searchResults.id)}
                  disabled={loading}
                >
                  <UserPlus size={18} className="mr-2" />
                  Promote to Admin
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
      
      <Card className="bg-gray-800 border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Video Management</h2>
        
        {videosError && (
          <Alert color="failure" onDismiss={() => setVideosError(null)} className="mb-4">
            {videosError}
          </Alert>
        )}
        
        {videosLoading ? (
          <div className="flex justify-center items-center py-8">
            <Spinner size="xl" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table hoverable className="bg-gray-700 text-white">
              <Table.Head>
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
                    <Table.Cell colSpan={6} className="text-center py-10">
                      No videos found
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  allVideos.map(video => (
                    <Table.Row key={video.id} className="bg-gray-700 hover:bg-gray-600">
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
      
      {/* Confirm Admin Password Modal */}
      <Modal show={confirmModalOpen} onClose={() => setConfirmModalOpen(false)}>
        <Modal.Header className="bg-gray-800 text-white border-b border-gray-700">
          Confirm Admin Password
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          <p className="mb-4">Please enter your admin password to confirm this action:</p>
          <TextInput
            id="admin-password"
            type="password"
            placeholder="Your admin password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
          />
          <p className="mt-3 text-yellow-400">This will give the user full administrative access to the platform.</p>
        </Modal.Body>
        <Modal.Footer className="bg-gray-800 border-t border-gray-700">
          <Button
            color="blue"
            onClick={handlePromoteUser}
            disabled={loading || !adminPassword}
          >
            {loading && <Spinner size="sm" className="mr-2" />}
            Confirm Promotion
          </Button>
          <Button
            color="gray"
            onClick={() => setConfirmModalOpen(false)}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Delete Video Confirmation Modal */}
      <Modal show={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <Modal.Header className="bg-gray-800 text-white border-b border-gray-700">
          Confirm Video Deletion
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

export default AdminDashboard;