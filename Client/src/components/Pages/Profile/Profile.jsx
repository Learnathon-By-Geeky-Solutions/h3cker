import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebase/firebase.config';
import { Button, Card, Label, TextInput, Avatar, Spinner, Toast } from 'flowbite-react';
import { HiUser, HiMail, HiPhotograph, HiCheck, HiExclamation } from 'react-icons/hi';
import { Camera, Upload, X } from 'lucide-react';

const Profile = () => {
  const { user, extendSession } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  
  // Form fields with simple string state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  // Load user data on component mount
  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Fetch the latest user data directly from Firestore
  const fetchUserData = async () => {
    if (!user?.uid) return;
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userSnapshot = await getDoc(userDocRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        setFirstName(userData.firstName || '');
        setLastName(userData.lastName || '');
        setPhotoURL(userData.photoURL || '');
        console.log('Fetched user data:', userData);
        return userData;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      showToast(`Error fetching user data: ${error.message}`, 'error');
    }
    return null;
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

  // Handle text input changes
  const handleFirstNameChange = (e) => {
    setFirstName(e.target.value);
  };
  
  const handleLastNameChange = (e) => {
    setLastName(e.target.value);
  };

  // Handle save profile changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    if (!user?.uid) return;
    
    setLoading(true);
    
    try {
      console.log("Updating profile with:", { firstName, lastName, photoURL });
      
      // Update the user document in Firestore first
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        firstName,
        lastName,
        photoURL,
        updatedAt: new Date()
      });
      
      // Then update the auth profile
      await updateProfile(auth.currentUser, {
        displayName: `${firstName} ${lastName}`.trim(),
        photoURL
      });
      
      // Force token refresh for changes to take effect
      await auth.currentUser.getIdToken(true);
      
      // Extend session to ensure token is valid
      await extendSession();
      
      setIsEditing(false);
      setShowPhotoOptions(false);
      
      showToast('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast(`Error updating profile: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload to Cloudinary
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user?.uid) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please select a valid image file (JPEG, PNG, GIF)');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image size should be less than 2MB');
      return;
    }
    
    setUploadLoading(true);
    setUploadError('');
    
    try {
      // Show preview immediately for better UX
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
      
      // Get the Cloudinary URL from environment variables
      const cloudinaryUrl = process.env.REACT_APP_CLOUDINARY_URL;
      if (!cloudinaryUrl) {
        throw new Error('Cloudinary configuration is missing');
      }
      
      // Create a FormData object to send to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', `profile_images/${user.uid}`);
      
      // Upload to Cloudinary
      const response = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image to Cloudinary');
      }
      
      const data = await response.json();
      console.log('Image uploaded successfully:', data);
      
      // Update the photoURL state with the secure URL from Cloudinary
      setPhotoURL(data.secure_url);
      
      showToast('Image uploaded successfully. Click "Save Changes" to update your profile.');
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError(`Failed to upload image: ${error.message}`);
      setPreviewImage(null);
    } finally {
      setUploadLoading(false);
    }
  };

  // Cancel editing and reset to original values
  const handleCancelEdit = () => {
    setIsEditing(false);
    setShowPhotoOptions(false);
    setPreviewImage(null);
    fetchUserData(); // Reset to original values
  };

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-900">
        <Spinner size="xl" color="info" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center py-6 px-4 bg-gray-900 relative">
      {/* Background blur elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-10 -left-40 w-96 h-96 bg-blue-700 opacity-20 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-10 -right-40 w-96 h-96 bg-purple-600 opacity-20 rounded-full filter blur-3xl"></div>
      </div>
      
      <div className="container max-w-3xl z-10">
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
                  img={previewImage || photoURL} 
                  size="xl" 
                  rounded 
                  alt={user.displayName || 'User profile picture'} 
                  className="w-full h-full object-cover"
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
            <h2 className="text-lg md:text-xl font-semibold mt-3 text-white">{`${firstName} ${lastName}`}</h2>
            <p className="text-sm text-gray-400">{user.email}</p>
            
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
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
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
                          <p className="text-xs text-gray-400">JPG, PNG, GIF (max 2MB)</p>
                        </div>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          accept="image/jpeg, image/png, image/gif"
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
                      value={firstName}
                      onChange={handleFirstNameChange}
                      required
                      className="w-full bg-gray-700 border-gray-600 text-white rounded-lg text-sm px-2.5 py-2 pl-9 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <TextInput
                    id="firstName-readonly"
                    type="text"
                    icon={HiUser}
                    value={firstName}
                    disabled
                    sizing="sm"
                    className="mt-1 bg-gray-700 border-gray-600 text-gray-400"
                  />
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
                      value={lastName}
                      onChange={handleLastNameChange}
                      className="w-full bg-gray-700 border-gray-600 text-white rounded-lg text-sm px-2.5 py-2 pl-9 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <TextInput
                    id="lastName-readonly"
                    type="text"
                    icon={HiUser}
                    value={lastName}
                    disabled
                    sizing="sm"
                    className="mt-1 bg-gray-700 border-gray-600 text-gray-400"
                  />
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="email" value="Email Address" className="text-xs font-medium text-gray-300" />
              <TextInput
                id="email"
                type="email"
                icon={HiMail}
                value={user.email}
                disabled
                readOnly
                sizing="sm"
                className="mt-1 bg-gray-700 border-gray-600 text-gray-400"
              />
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
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-3">
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
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Profile;