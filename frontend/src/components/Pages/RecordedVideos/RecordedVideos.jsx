import React, { useState, useEffect, useContext } from 'react';
import { Card, Button, Spinner, Alert, Table, Badge, TextInput, Select, Pagination } from 'flowbite-react';
import { ArrowLeft, Search, Eye, Download, Filter, Clock, UserRound, Video as VideoIcon, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import VideoService from '../../../utils/VideoService';
import { formatDistanceToNow, parseISO } from 'date-fns';

const RecordedVideos = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordingsPerPage] = useState(10);


  const [filters, setFilters] = useState({
    user_id: '',
    video_id: '',
    status: '',
    search: ''
  });


  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiFilters = {};
      if (filters.user_id) apiFilters.user_id = filters.user_id;
      if (filters.video_id) apiFilters.video_id = filters.video_id;
      if (filters.status) apiFilters.status = filters.status;
      
      const data = await VideoService.adminGetWebcamRecordings(apiFilters);
      
      setRecordings(data);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error fetching webcam recordings:', err);
      setError(err.message || 'An error occurred while fetching recordings');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };


  const applyFilters = (e) => {
    e.preventDefault();
    fetchRecordings();
  };


  const resetFilters = () => {
    setFilters({
      user_id: '',
      video_id: '',
      status: '',
      search: ''
    });

    VideoService.adminGetWebcamRecordings()
      .then(data => {
        setRecordings(data);
        setCurrentPage(1);
      })
      .catch(err => {
        setError(err.message || 'An error occurred while resetting filters');
      });
  };


  const filteredRecordings = recordings.filter(recording => {
    if (!filters.search) return true;
    
    const searchTerm = filters.search.toLowerCase();
    return (
      recording.filename.toLowerCase().includes(searchTerm) ||
      recording.recorder?.email?.toLowerCase().includes(searchTerm) ||
      recording.video?.title?.toLowerCase().includes(searchTerm)
    );
  });

  // Pagination
  const indexOfLastRecording = currentPage * recordingsPerPage;
  const indexOfFirstRecording = indexOfLastRecording - recordingsPerPage;
  const currentRecordings = filteredRecordings.slice(indexOfFirstRecording, indexOfLastRecording);
  const totalPages = Math.ceil(filteredRecordings.length / recordingsPerPage);


  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
    } catch (e) {
      return dateString;
    }
  };


  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'failure';
      default: return 'info';
    }
  };

  const viewVideoDetails = (videoId) => {
    if (videoId) {
      navigate(`/video/${videoId}`);
    }
  };


  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Spinner size="xl" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert color="failure" className="mb-4">
          <div className="font-medium">Error!</div>
          {error}
        </Alert>
      );
    }

    if (filteredRecordings.length === 0) {
      return (
        <div className="text-center p-10 bg-gray-800 rounded-lg border border-gray-700">
          <VideoIcon size={48} className="mx-auto text-gray-500 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Recordings Found</h3>
          <p className="text-gray-400 mb-4">
            {filters.search || filters.user_id || filters.video_id || filters.status
              ? 'No recordings match the applied filters. Try adjusting your filter criteria.'
              : 'No webcam recordings have been uploaded yet.'}
          </p>
          {(filters.search || filters.user_id || filters.video_id || filters.status) && (
            <Button color="light" onClick={resetFilters}>
              <RefreshCw size={16} className="mr-2" />
              Reset Filters
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table className="border border-gray-700">
          <Table.Head>
            <Table.HeadCell className="bg-gray-800 text-white">Filename</Table.HeadCell>
            <Table.HeadCell className="bg-gray-800 text-white">Video</Table.HeadCell>
            <Table.HeadCell className="bg-gray-800 text-white">Recorder</Table.HeadCell>
            <Table.HeadCell className="bg-gray-800 text-white">Date</Table.HeadCell>
            <Table.HeadCell className="bg-gray-800 text-white">Status</Table.HeadCell>
            <Table.HeadCell className="bg-gray-800 text-white">Actions</Table.HeadCell>
          </Table.Head>
          <Table.Body className="divide-y divide-gray-700">
            {currentRecordings.map((recording) => (
              <Table.Row key={recording.id} className="bg-gray-800 hover:bg-gray-700">
                <Table.Cell className="whitespace-nowrap font-medium text-white">
                  {recording.filename}
                </Table.Cell>
                <Table.Cell className="text-gray-300">
                  {recording.video?.title || 'Unknown Video'}
                </Table.Cell>
                <Table.Cell className="text-gray-300">
                  {recording.recorder?.email || 'Unknown User'}
                </Table.Cell>
                <Table.Cell className="text-gray-300">
                  {formatDate(recording.recording_date)}
                </Table.Cell>
                <Table.Cell>
                  <Badge color={getStatusBadgeColor(recording.upload_status)}>
                    {recording.upload_status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex space-x-2">
                    <Button 
                      size="xs" 
                      color="blue" 
                      onClick={() => viewVideoDetails(recording.video?.id)}
                      disabled={!recording.video?.id}
                    >
                      <Eye size={14} />
                    </Button>
                    <Button 
                      size="xs" 
                      color="light" 
                      onClick={() => window.open(recording.recording_url, '_blank')}
                      disabled={!recording.recording_url}
                    >
                      <Download size={14} />
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showIcons
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center">
        <Button color="gray" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} className="mr-2" />
          Back to Dashboard
        </Button>
      </div>
      
      <Card className="mb-6 bg-gray-800 border-gray-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <VideoIcon className="mr-2" /> Webcam Recordings
          </h1>
          <div className="flex mt-4 md:mt-0 gap-2">
            <Button color="gray" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={16} className="mr-2" />
              Filters
            </Button>
            <Button color="blue" onClick={fetchRecordings}>
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <TextInput
            id="search"
            name="search"
            placeholder="Search by filename, user email, or video title..."
            value={filters.search}
            onChange={handleFilterChange}
            icon={Search}
          />
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mb-4 p-4 bg-gray-700 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-3">Advanced Filters</h2>
            <form onSubmit={applyFilters}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Select
                    id="status"
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </Select>
                </div>
                <div>
                  <TextInput
                    id="user_id"
                    name="user_id"
                    placeholder="Filter by User ID..."
                    value={filters.user_id}
                    onChange={handleFilterChange}
                    icon={UserRound}
                  />
                </div>
                <div>
                  <TextInput
                    id="video_id"
                    name="video_id"
                    placeholder="Filter by Video ID..."
                    value={filters.video_id}
                    onChange={handleFilterChange}
                    icon={VideoIcon}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button color="gray" onClick={resetFilters} type="button">
                  Reset
                </Button>
                <Button color="blue" type="submit">
                  Apply Filters
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Recordings Info */}
        <div className="text-gray-400 text-sm mb-4 flex items-center">
          <Clock size={16} className="mr-2" />
          Showing {filteredRecordings.length} recordings
        </div>

        {renderContent()}
      </Card>
    </div>
  );
};

export default RecordedVideos;