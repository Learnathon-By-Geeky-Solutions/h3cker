import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebase/firebase.config';
import { Button, Card, Label, TextInput, Avatar, Spinner, Toast } from 'flowbite-react';
import { HiUser, HiMail, HiPhotograph, HiCheck, HiExclamation } from 'react-icons/hi';
import { Camera, Upload, X } from 'lucide-react';
import TokenService from '../../../utils/TokenService';

// Default avatar fallback
const DEFAULT_AVATAR = "https://flowbite.com/docs/images/people/profile-picture-5.jpg";

// ImgBB API key from environment variable
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

const Profile = () => {
  const { user } = useContext(AuthContext);
  const dataFetchedRef = useRef(false);
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  
  // Form fields with a single state object
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    photoURL: '',
    email: ''
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  
  // Last update time from Firestore for display only
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // Load user data ONCE on component mount
  useEffect(() => {
    // This ref prevents re-fetching and overwriting user edits
    if (dataFetchedRef.current === false && user) {
      console.log("Initial user data fetch");
      fetchUserData();
      dataFetchedRef.current = true;
    }
  }, [user]);

  // Fetch the latest user data directly from Firestore
  const fetchUserData = async () => {
    if (!user?.uid) return null;
    
    try {
      console.log("Fetching user data from Firestore for UID:", user.uid);
      const userDocRef = doc(db, 'users', user.uid);
      const userSnapshot = await getDoc(userDocRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        console.log('Fetched user data:', userData);
        
        // Set form state with user data
        setFormState({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          photoURL: userData.photoURL || DEFAULT_AVATAR,
          email: user.email || ''
        });
        
        // Set last update time if available (for display only)
        if (userData.updatedAt) {
          setLastUpdateTime(userData.updatedAt.toDate());
          // Also update the TokenService with this time to keep them in sync
          TokenService.setProfileUpdateTime(user.uid, userData.updatedAt.toDate());
        }
        
        return userData;
      } else {
        console.warn("User document doesn't exist in Firestore");
        
        // Fallback to auth user data if Firestore document doesn't exist
        const names = (user.displayName || '').split(' ');
        setFormState({
          firstName: names[0] || '',
          lastName: names.slice(1).join(' ') || '',
          photoURL: user.photoURL || DEFAULT_AVATAR,
          email: user.email || ''
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      showToast(`Error loading profile: ${error.message}`, 'error');
    }
    return null;
  };

  // Handle input changes for all form fields
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Helper to show toast messages
  const showToast = (message, type = 'success') => {
    setToast({
      show: true,
      message,
      type
    });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  // Handle save profile changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    if (!user?.uid) {
      showToast("You must be logged in to update your profile", "error");
      return;
    }
    
    // Check if profile update is allowed using TokenService
    if (!TokenService.canUpdateProfile(user.uid)) {
      const lastUpdate = TokenService.getProfileUpdateTime(user.uid);
      const timeRemaining = Math.ceil(24 - ((new Date() - lastUpdate) / (1000 * 60 * 60)));
      showToast(`Profile can only be updated once per day. Please try again in ${timeRemaining} hours.`, "error");
      return;
    }
    
    setLoading(true);
    
    try {
      const { firstName, lastName, photoURL } = formState;
      console.log("Updating profile with:", { firstName, lastName, photoURL });
      
      // Update the Firestore document first - similar to Google sign-in pattern
      const userDocRef = doc(db, 'users', user.uid);
      const currentTime = new Date();
      
      await updateDoc(userDocRef, {
        firstName,
        lastName,
        photoURL,
        updatedAt: currentTime
      });
      
      console.log("Firestore document updated successfully");
      
      // Then update the Auth profile
      await updateProfile(auth.currentUser, {
        displayName: `${firstName} ${lastName}`.trim(),
        photoURL: photoURL
      });
      
      console.log("Auth profile updated successfully");
      
      // Force a token refresh to ensure changes propagate
      const token = await auth.currentUser.getIdToken(true);
      TokenService.setToken(token, user.uid);
      
      // Update the last update time in TokenService
      TokenService.setProfileUpdateTime(user.uid, currentTime);
      
      // Update state for display
      setLastUpdateTime(currentTime);
      
      setIsEditing(false);
      setShowPhotoOptions(false);
      
      showToast('Profile updated successfully!');
      
      // Reset the data fetched flag to ensure fresh data on next mount
      dataFetchedRef.current = false;
      
      // For a complete reset, reload the page after a delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast(`Failed to update profile: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload to ImgBB
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadLoading(true);
    setUploadError('');
    
    try {
      // Show preview immediately for better UX
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
      
      // Create a FormData object to send to ImgBB
      const formData = new FormData();
      formData.append('image', file);
      formData.append('key', IMGBB_API_KEY); // Use env variable
      
      console.log("Uploading image to ImgBB...");
      
      // Upload to ImgBB
      const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ImgBB API error: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Image upload response:', data);
      
      if (data.success) {
        // Update formState with the new image URL - this is critical!
        setFormState(prev => ({
          ...prev,
          photoURL: data.data.url
        }));
        
        showToast('Image uploaded successfully! Click "Save Changes" to update your profile.');
      } else {
        throw new Error(data.error?.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError(`Upload failed: ${error.message}`);
      setPreviewImage(null);
    } finally {
      setUploadLoading(false);
    }
  };

  // Cancel editing and reset to original values
  const handleCancelEdit = async () => {
    setIsEditing(false);
    setShowPhotoOptions(false);
    setPreviewImage(null);
    setUploadError('');
    
    // Reset the dataFetchedRef so we can fetch fresh data
    dataFetchedRef.current = false;
    await fetchUserData();
  };

  // Helper to check if profile editing is allowed
  const canEditProfile = () => {
    return user?.uid && TokenService.canUpdateProfile(user.uid);
  };

  // Helper to get remaining time until next allowed update
  const getTimeUntilNextUpdate = () => {
    if (!user?.uid) return '';
    
    const lastUpdate = TokenService.getProfileUpdateTime(user.uid);
    if (!lastUpdate) return '';
    
    const hours = Math.ceil(24 - ((new Date() - lastUpdate) / (1000 * 60 * 60)));
    return `Profile editing will be available in ${hours} hours`;
  };

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-900">
        <Spinner size="xl" color="info" />
        <p className="ml-3 text-white">Loading user profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center py-6 px-4 bg-gray-900 relative">
      {/* Background blur elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-10 -left-40 w-96 h-96 bg-blue-700 opacity-20 rounded-full filter blur-3xl" />
        <div className="absolute bottom-10 -right-40 w-96 h-96 bg-purple-600 opacity-20 rounded-full filter blur-3xl" />
      </div>
      
      <div className="container max-w-3xl z-10 mt-16">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center text-white">Your Profile</h1>
        
        {/* Toast notification */}
        {toast.show && (
          <Toast className="mb-6 mx-auto max-w-lg">
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              {toast.type === 'success' ? (
                <HiCheck className="h-5 w-5 text-green-500" />
              ) : (
                <HiExclamation className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className="ml-3 text-sm font-normal">{toast.message}</div>
            <Toast.Toggle onDismiss={() => setToast({ show: false, message: '', type: '' })} />
          </Toast>
        )}
        
        <Card className="shadow-lg border-0 bg-gray-800 bg-opacity-70 backdrop-blur-sm">
          <div className="flex flex-col items-center mb-6 relative">
            {/* Profile picture with overlay for editing */}
            <div className="relative group">
              <div className="rounded-full overflow-hidden w-24 h-24 md:w-28 md:h-28 border-4 border-blue-600/30 shadow-lg shadow-blue-700/20">
                <Avatar 
                  img={previewImage || formState.photoURL || DEFAULT_AVATAR} 
                  size="xl" 
                  rounded 
                  alt={`${formState.firstName || 'User'} profile picture`} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = DEFAULT_AVATAR;
                  }}
                />
              </div>
              
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                  className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <Camera size={24} className="text-blue-400" />
                </button>
              )}
            </div>
            
            {/* User name display */}
            <h2 className="text-lg md:text-xl font-semibold mt-3 text-white">
              {formState.firstName ? `${formState.firstName} ${formState.lastName}` : (user.displayName || 'User')}
            </h2>
            <p className="text-sm text-gray-400">{formState.email || user.email}</p>
            
            {/* Photo URL edit popup */}
            {showPhotoOptions && (
              <div className="absolute top-full mt-2 bg-gray-800 rounded-lg shadow-lg p-4 z-20 w-full max-w-sm border border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-sm text-white">Update Profile Picture</h3>
                  <button 
                    type="button" 
                    onClick={() => setShowPhotoOptions(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="photoURL" value="Image URL" className="text-xs text-gray-300" />
                    <TextInput
                      id="photoURL"
                      type="text"
                      icon={HiPhotograph}
                      value={formState.photoURL}
                      onChange={handleInputChange}
                      placeholder="https://example.com/profile.jpg"
                      sizing="sm"
                      className="mt-1 bg-gray-700 border-gray-600 text-white"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Enter a URL to an image (PNG, JPG)
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-4">
                    <div className="text-center w-full">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        {uploadLoading ? (
                          <Spinner className="mx-auto h-8 w-8 text-blue-500" />
                        ) : (
                          <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        )}
                        <div className="mt-1 text-xs text-gray-300">
                          <p>{uploadLoading ? 'Uploading...' : 'Click to upload an image'}</p>
                          <p className="text-xs text-gray-400">JPG, PNG, GIF or any other image format</p>
                        </div>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleFileUpload}
                          disabled={uploadLoading}
                        />
                      </label>
                      {uploadError && (
                        <p className="mt-1 text-xs text-red-500">{uploadError}</p>
                      )}
                      {previewImage && (
                        <p className="mt-2 text-xs text-green-500 flex items-center justify-center">
                          <HiCheck className="mr-1" /> Image ready to save
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      color="dark" 
                      onClick={() => setShowPhotoOptions(false)}
                      className="mr-2"
                      size="xs"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" value="First Name" className="text-xs font-medium text-gray-300" />
                {isEditing ? (
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <HiUser className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      id="firstName"
                      type="text"
                      value={formState.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-2.5 py-2.5 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <HiUser className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      id="firstName-readonly"
                      type="text"
                      value={formState.firstName}
                      disabled
                      className="w-full bg-gray-800 border border-gray-600 text-gray-400 rounded-lg text-sm px-2.5 py-2.5 pl-10 shadow-sm"
                    />
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="lastName" value="Last Name" className="text-xs font-medium text-gray-300" />
                {isEditing ? (
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <HiUser className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      id="lastName"
                      type="text"
                      value={formState.lastName}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-2.5 py-2.5 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <HiUser className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      id="lastName-readonly"
                      type="text"
                      value={formState.lastName}
                      disabled
                      className="w-full bg-gray-800 border border-gray-600 text-gray-400 rounded-lg text-sm px-2.5 py-2.5 pl-10 shadow-sm"
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="email" value="Email Address" className="text-xs font-medium text-gray-300" />
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <HiMail className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={formState.email || user.email || ''}
                  disabled
                  readOnly
                  className="w-full bg-gray-800 border border-gray-600 text-gray-400 rounded-lg text-sm px-2.5 py-2.5 pl-10 shadow-sm"
                />
              </div>
              <div className="mt-1 flex items-center">
                {user.emailVerified ? (
                  <span className="text-xs text-green-500 flex items-center">
                    <HiCheck className="mr-1" /> Email verified
                  </span>
                ) : (
                  <span className="text-xs text-red-500 flex items-center">
                    <HiExclamation className="mr-1" /> Email not verified
                  </span>
                )}
              </div>
            </div>
            
            {/* Account Information Section */}
            <div className="pt-3 border-t border-gray-700">
              <h3 className="text-sm font-medium mb-3 text-gray-300">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Account created</p>
                  <p className="text-sm font-medium text-gray-300">
                    {user.createdAt && typeof user.createdAt.toDate === 'function' 
                      ? new Date(user.createdAt.toDate()).toLocaleString() 
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Last login</p>
                  <p className="text-sm font-medium text-gray-300">
                    {user.lastLoginAt && typeof user.lastLoginAt.toDate === 'function'
                      ? new Date(user.lastLoginAt.toDate()).toLocaleString() 
                      : 'N/A'}
                  </p>
                </div>
                {lastUpdateTime && (
                  <div>
                    <p className="text-xs text-gray-400">Last profile update</p>
                    <p className="text-sm font-medium text-gray-300">
                      {lastUpdateTime.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col space-y-2 pt-3">
              {!canEditProfile() && (
                <p className="text-xs text-amber-500">
                  {getTimeUntilNextUpdate()}
                </p>
              )}
              
              <div className="flex justify-end space-x-3">
                {isEditing ? (
                  <>
                    <Button 
                      color="dark" 
                      onClick={handleCancelEdit}
                      size="sm"
                      className="bg-gray-700 hover:bg-gray-600"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading}
                      color="blue"
                      className="bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      {loading ? <Spinner size="sm" className="mr-1" /> : null}
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={() => setIsEditing(true)}
                    color="blue"
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                    disabled={!canEditProfile()}
                    title={!canEditProfile() ? "Profile can only be updated once per day" : ""}
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Profile;