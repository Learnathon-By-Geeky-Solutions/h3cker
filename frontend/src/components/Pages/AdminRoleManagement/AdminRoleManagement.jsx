import React, { useState, useEffect, useRef } from 'react';
import { Card, TextInput, Button, Spinner, Alert, Modal } from 'flowbite-react';
import { Search, UserPlus } from 'lucide-react';
import VideoService from '../../../utils/VideoService';

const AdminRoleManagement = () => {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

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
      
      if (isMounted.current) {
        setSearchResults(response);
      }
    } catch (err) {
      console.error('Search error:', err);
      if (isMounted.current) {
        setError(err.message || 'User not found');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
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
      
      if (isMounted.current) {
        setSuccess(response.message || 'User successfully promoted to admin');
        setSearchResults(response.user);
        setConfirmModalOpen(false);
      }
    } catch (err) {
      console.error('Promotion error:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to promote user. Please check your password and try again.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setAdminPassword('');
      }
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-6">User Role Management</h1>
      
      <Card className="bg-gray-800 border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Find User</h2>
        
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
    </div>
  );
};

export default AdminRoleManagement;