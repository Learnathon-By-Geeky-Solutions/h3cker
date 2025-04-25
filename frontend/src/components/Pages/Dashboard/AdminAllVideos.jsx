import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, TextInput, Dropdown } from 'flowbite-react';
import { FilmStrip, Search, Eye, Pencil, Trash, Filter } from 'lucide-react';
import VideoService from '../../../utils/VideoService';
import { LoadingState, ErrorState } from '../../Shared/VideoLoadingStates/VideoLoadingStates';
import { useNavigate } from 'react-router-dom';

const AdminAllVideos = () => {
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [deleteVideoId, setDeleteVideoId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchAllVideos();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [videos, searchQuery, visibilityFilter]);

  const fetchAllVideos = async () => {
    try {
      setLoading(true);
      const response = await VideoService.adminGetAllVideos();
      setVideos(response);
      setFilteredVideos(response);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError('Failed to load videos. Please try again later.');
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...videos];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(video => 
        video.title?.toLowerCase().includes(query) || 
        video.uploader?.email?.toLowerCase().includes(query) ||
        video.description?.toLowerCase().includes(query)
      );
    }

    // Apply visibility filter
    if (visibilityFilter !== 'all') {
      filtered = filtered.filter(video => video.visibility === visibilityFilter);
    }

    setFilteredVideos(filtered);
  };

  const handleDeleteClick = (videoId) => {
    setDeleteVideoId(videoId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await VideoService.adminDeleteVideo(deleteVideoId);
      setVideos(videos.filter(video => video.id !== deleteVideoId));
      setShowDeleteConfirm(false);
      setDeleteVideoId(null);
    } catch (err) {
      console.error('Error deleting video:', err);
      setError('Failed to delete video. Please try again.');
    }
  };

  const handleVisibilityChange = async (videoId, newVisibility) => {
    try {
      await VideoService.adminUpdateVideoVisibility(videoId, newVisibility);
      setVideos(videos.map(video => {
        if (video.id === videoId) {
          return { ...video, visibility: newVisibility };
        }
        return video;
      }));
    } catch (err) {
      console.error('Error updating video visibility:', err);
      setError('Failed to update video visibility. Please try again.');
    }
  };

  const getVisibilityBadge = (visibility) => {
    switch (visibility) {
      case 'public':
        return <Badge color="success">Public</Badge>;
      case 'private':
        return <Badge color="gray">Private</Badge>;
      case 'unlisted':
        return <Badge color="info">Unlisted</Badge>;
      default:
        return <Badge color="gray">{visibility}</Badge>;
    }
  };

  if (loading) {
    return <LoadingState message="Loading videos..." />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <FilmStrip className="mr-2" size={24} />
          All Videos
        </h1>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
          <div className="flex flex-grow max-w-md relative">
            <TextInput
              id="search"
              type="search"
              placeholder="Search videos by title or uploader..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10"
            />
            <Search className="absolute right-3 top-2.5 text-gray-500" size={18} />
          </div>
          
          <div className="flex items-center space-x-2">
            <Dropdown
              label={
                <span className="flex items-center">
                  <Filter size={16} className="mr-2" />
                  {visibilityFilter === 'all' ? 'All Videos' : 
                    visibilityFilter.charAt(0).toUpperCase() + visibilityFilter.slice(1)}
                </span>
              }
              size="sm"
              color="gray"
            >
              <Dropdown.Item onClick={() => setVisibilityFilter('all')}>
                All Videos
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setVisibilityFilter('public')}>
                Public
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setVisibilityFilter('private')}>
                Private
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setVisibilityFilter('unlisted')}>
                Unlisted
              </Dropdown.Item>
            </Dropdown>
            
            <Button size="sm" onClick={fetchAllVideos}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table hoverable className="bg-gray-700 text-white">
            <Table.Head>
              <Table.HeadCell className="whitespace-nowrap">Title</Table.HeadCell>
              <Table.HeadCell>Uploader</Table.HeadCell>
              <Table.HeadCell>Visibility</Table.HeadCell>
              <Table.HeadCell>Upload Date</Table.HeadCell>
              <Table.HeadCell>Views</Table.HeadCell>
              <Table.HeadCell>Likes</Table.HeadCell>
              <Table.HeadCell>Actions</Table.HeadCell>
            </Table.Head>
            <Table.Body className="divide-y divide-gray-600">
              {filteredVideos.length === 0 ? (
                <Table.Row className="bg-gray-700">
                  <Table.Cell colSpan={7} className="text-center py-10">
                    No videos found
                  </Table.Cell>
                </Table.Row>
              ) : (
                filteredVideos.map(video => (
                  <Table.Row key={video.id} className="bg-gray-700 hover:bg-gray-600">
                    <Table.Cell className="font-medium">
                      {video.title}
                    </Table.Cell>
                    <Table.Cell>
                      {video.uploader?.email || 'Unknown'}
                    </Table.Cell>
                    <Table.Cell>
                      <Dropdown
                        label={getVisibilityBadge(video.visibility)}
                        inline
                        size="sm"
                      >
                        <Dropdown.Item onClick={() => handleVisibilityChange(video.id, 'public')}>
                          Make Public
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => handleVisibilityChange(video.id, 'private')}>
                          Make Private
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => handleVisibilityChange(video.id, 'unlisted')}>
                          Make Unlisted
                        </Dropdown.Item>
                      </Dropdown>
                    </Table.Cell>
                    <Table.Cell>
                      {new Date(video.upload_date).toLocaleDateString()}
                    </Table.Cell>
                    <Table.Cell>
                      {video.views || 0}
                    </Table.Cell>
                    <Table.Cell>
                      {video.likes || 0}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex space-x-2">
                        <Button size="xs" color="blue" onClick={() => navigate(`/video/${video.id}`)}>
                          <Eye size={14} />
                        </Button>
                        <Button size="xs" color="gray" onClick={() => navigate(`/dashboard/edit-video/${video.id}`)}>
                          <Pencil size={14} />
                        </Button>
                        <Button size="xs" color="failure" onClick={() => handleDeleteClick(video.id)}>
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
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <h3 className="text-lg font-bold mb-2">Confirm Deletion</h3>
            <p className="mb-4">Are you sure you want to delete this video? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <Button color="gray" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button color="failure" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminAllVideos;