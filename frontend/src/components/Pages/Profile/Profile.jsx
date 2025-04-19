import React, { useState, useContext, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebase/firebase.config';
import { Button, Card, Label, TextInput, Avatar, Spinner, Toast } from 'flowbite-react';
import { HiUser, HiMail, HiPhotograph, HiCheck, HiExclamation } from 'react-icons/hi';
import { Camera, Upload, X } from 'lucide-react';
import TokenService from '../../../utils/TokenService';

const DEFAULT_AVATAR = "https://flowbite.com/docs/images/people/profile-picture-5.jpg";
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

const ProfileAvatar = ({ 
  photoURL = DEFAULT_AVATAR, 
  isEditing = false, 
  onShowPhotoOptions, 
  previewImage = null 
}) => (
  <div className="relative group">
    <div className="rounded-full overflow-hidden w-24 h-24 md:w-28 md:h-28 border-4 border-blue-600/30 shadow-lg shadow-blue-700/20">
      <Avatar 
        img={previewImage || photoURL || DEFAULT_AVATAR} 
        size="xl" 
        rounded 
        alt="Profile picture" 
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
        onClick={onShowPhotoOptions}
        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      >
        <Camera size={24} className="text-blue-400" />
      </button>
    )}
  </div>
);

ProfileAvatar.propTypes = {
  photoURL: PropTypes.string,
  isEditing: PropTypes.bool,
  onShowPhotoOptions: PropTypes.func.isRequired,
  previewImage: PropTypes.string
};

const PhotoOptionsPanel = ({ 
  photoURL = '', 
  onInputChange, 
  onClose, 
  onFileUpload, 
  uploadLoading = false, 
  uploadError = '', 
  previewImage = null 
}) => (
  <div className="absolute top-full mt-2 bg-gray-800 rounded-lg shadow-lg p-4 z-20 w-full max-w-sm border border-gray-700">
    <div className="flex justify-between items-center mb-2">
      <h3 className="font-medium text-sm text-white">Update Profile Picture</h3>
      <button 
        type="button" 
        onClick={onClose}
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
          onChange={onInputChange}
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
              onChange={onFileUpload}
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
          onClick={onClose}
          className="mr-2"
          size="xs"
        >
          Close
        </Button>
      </div>
    </div>
  </div>
);

PhotoOptionsPanel.propTypes = {
  photoURL: PropTypes.string,
  onInputChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onFileUpload: PropTypes.func.isRequired,
  uploadLoading: PropTypes.bool,
  uploadError: PropTypes.string,
  previewImage: PropTypes.string
};

const InputField = ({ 
  id, 
  icon, 
  value = '', 
  onChange = () => {}, 
  disabled = false, 
  required = false 
}) => {
  const Icon = icon;
  
  return (
    <div className="mt-1 relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <input
        id={id}
        type="text"
        value={value || ''}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`w-full ${disabled ? 'bg-gray-800 text-gray-400' : 'bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'} border border-gray-600 rounded-lg text-sm px-2.5 py-2.5 pl-10 shadow-sm`}
      />
    </div>
  );
};

InputField.propTypes = {
  id: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  required: PropTypes.bool
};

const EmailField = ({ email = '', isVerified = false }) => (
  <div>
    <Label htmlFor="email" value="Email Address" className="text-xs font-medium text-gray-300" />
    <div className="mt-1 relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <HiMail className="w-4 h-4 text-gray-400" />
      </div>
      <input
        id="email"
        type="email"
        value={email || ''}
        disabled
        readOnly
        className="w-full bg-gray-800 border border-gray-600 text-gray-400 rounded-lg text-sm px-2.5 py-2.5 pl-10 shadow-sm"
      />
    </div>
    <div className="mt-1 flex items-center">
      {isVerified ? (
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
);

EmailField.propTypes = {
  email: PropTypes.string,
  isVerified: PropTypes.bool
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    if (typeof timestamp.toDate === 'function') {
      return new Date(timestamp.toDate()).toLocaleString();
    } else if (timestamp instanceof Date) {
      return timestamp.toLocaleString();
    }
  } catch (error) {
    console.error('Error formatting date:', error);
  }
  
  return 'N/A';
};

const TimelineItem = ({ label, timestamp }) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-sm font-medium text-gray-300">
      {formatDate(timestamp)}
    </p>
  </div>
);

TimelineItem.propTypes = {
  label: PropTypes.string.isRequired,
  timestamp: PropTypes.oneOfType([
    PropTypes.instanceOf(Date),
    PropTypes.object
  ])
};

const AccountInfoSection = ({ user = {}, lastUpdateTime }) => (
  <div className="pt-3 border-t border-gray-700">
    <h3 className="text-sm font-medium mb-3 text-gray-300">Account Information</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <TimelineItem label="Account created" timestamp={user?.createdAt} />
      <TimelineItem label="Last login" timestamp={user?.lastLoginAt} />
      {lastUpdateTime && (
        <TimelineItem label="Last profile update" timestamp={lastUpdateTime} />
      )}
    </div>
  </div>
);

AccountInfoSection.propTypes = {
  user: PropTypes.shape({
    createdAt: PropTypes.oneOfType([
      PropTypes.instanceOf(Date),
      PropTypes.object
    ]),
    lastLoginAt: PropTypes.oneOfType([
      PropTypes.instanceOf(Date),
      PropTypes.object
    ])
  }),
  lastUpdateTime: PropTypes.instanceOf(Date)
};

const ToastMessage = ({ toast, onDismiss }) => {
  if (!toast.show) return null;
  
  return (
    <Toast className="mb-6 mx-auto max-w-lg">
      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
        {toast.type === 'success' ? (
          <HiCheck className="h-5 w-5 text-green-500" />
        ) : (
          <HiExclamation className="h-5 w-5 text-red-500" />
        )}
      </div>
      <div className="ml-3 text-sm font-normal">{toast.message}</div>
      <Toast.Toggle onDismiss={onDismiss} />
    </Toast>
  );
};

ToastMessage.propTypes = {
  toast: PropTypes.shape({
    show: PropTypes.bool,
    message: PropTypes.string,
    type: PropTypes.string
  }).isRequired,
  onDismiss: PropTypes.func.isRequired
};

const ActionButtons = ({ isEditing, loading, canEdit, onSave, onCancel, onEdit }) => (
  <div className="flex justify-end space-x-3">
    {isEditing ? (
      <>
        <Button 
          color="dark" 
          onClick={onCancel}
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
          onClick={onSave}
        >
          {loading ? <Spinner size="sm" className="mr-1" /> : null}
          Save Changes
        </Button>
      </>
    ) : (
      <Button 
        onClick={onEdit}
        color="blue"
        className="bg-blue-600 hover:bg-blue-700"
        size="sm"
        disabled={!canEdit}
        title={!canEdit ? "Profile can only be updated once per day" : ""}
      >
        Edit Profile
      </Button>
    )}
  </div>
);

ActionButtons.propTypes = {
  isEditing: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  canEdit: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired
};

const useProfileData = (user) => {
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    photoURL: '',
    email: ''
  });
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const dataFetchedRef = useRef(false);

  const fetchUserData = async () => {
    if (!user?.uid) return null;
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userSnapshot = await getDoc(userDocRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        
        setFormState({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          photoURL: userData.photoURL || DEFAULT_AVATAR,
          email: user.email || ''
        });
        
        if (userData.updatedAt) {
          setLastUpdateTime(userData.updatedAt.toDate());
          TokenService.setProfileUpdateTime(user.uid, userData.updatedAt.toDate());
        }
        
        return userData;
      } else {
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
      return null;
    }
    return null;
  };

  useEffect(() => {
    if (dataFetchedRef.current === false && user) {
      fetchUserData();
      dataFetchedRef.current = true;
    }
  }, [user]);

  const updateFormState = (field, value) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetDataFetchFlag = () => {
    dataFetchedRef.current = false;
  };

  return {
    formState,
    lastUpdateTime,
    setFormState,
    updateFormState,
    setLastUpdateTime,
    fetchUserData,
    resetDataFetchFlag
  };
};

const useProfileActions = (user, formState, setLastUpdateTime, showToast, resetDataFetchFlag) => {
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const updateUserProfile = async () => {
    const { firstName, lastName, photoURL } = formState;
    
    const userDocRef = doc(db, 'users', user.uid);
    const currentTime = new Date();
    
    await updateDoc(userDocRef, {
      firstName,
      lastName,
      photoURL,
      updatedAt: currentTime
    });
    
    await updateProfile(auth.currentUser, {
      displayName: `${firstName} ${lastName}`.trim(),
      photoURL: photoURL
    });
    
    const token = await auth.currentUser.getIdToken(true);
    TokenService.setToken(token, user.uid);
    TokenService.setProfileUpdateTime(user.uid, currentTime);
    
    return currentTime;
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    
    if (!user?.uid) {
      showToast("You must be logged in to update your profile", "error");
      return;
    }
    
    if (!TokenService.canUpdateProfile(user.uid)) {
      const lastUpdate = TokenService.getProfileUpdateTime(user.uid);
      const timeRemaining = Math.ceil(24 - ((new Date() - lastUpdate) / (1000 * 60 * 60)));
      showToast(`Profile can only be updated once per day. Please try again in ${timeRemaining} hours.`, "error");
      return;
    }
    
    setLoading(true);
    
    try {
      const updatedTime = await updateUserProfile();
      setLastUpdateTime(updatedTime);
      
      setIsEditing(false);
      
      showToast('Profile updated successfully!');
      resetDataFetchFlag();
      
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

  const canEditProfile = () => {
    return user?.uid && TokenService.canUpdateProfile(user.uid);
  };

  const getTimeUntilNextUpdate = () => {
    if (!user?.uid) return '';
    
    const lastUpdate = TokenService.getProfileUpdateTime(user.uid);
    if (!lastUpdate) return '';
    
    const hours = Math.ceil(24 - ((new Date() - lastUpdate) / (1000 * 60 * 60)));
    return `Profile editing will be available in ${hours} hours`;
  };

  return {
    loading,
    isEditing,
    setIsEditing,
    setLoading,
    handleSaveProfile,
    canEditProfile,
    getTimeUntilNextUpdate
  };
};

const usePhotoUpload = (setFormState, showToast) => {
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadLoading(true);
    setUploadError('');
    
    try {
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
      
      // Create FormData for ImgBB
      const formData = new FormData();
      formData.append('image', file);
      formData.append('key', IMGBB_API_KEY);
      
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
      
      if (data.success) {
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

  const resetPhotoState = () => {
    setShowPhotoOptions(false);
    setPreviewImage(null);
    setUploadError('');
  };

  return {
    showPhotoOptions,
    uploadLoading,
    uploadError,
    previewImage,
    setShowPhotoOptions,
    handleFileUpload,
    resetPhotoState
  };
};

const useToast = () => {
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type = 'success') => {
    setToast({
      show: true,
      message,
      type
    });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const dismissToast = () => {
    setToast({ show: false, message: '', type: '' });
  };

  return {
    toast,
    showToast,
    dismissToast
  };
};

const Profile = () => {
  const { user } = useContext(AuthContext);
  const { toast, showToast, dismissToast } = useToast();
  
  const {
    formState,
    lastUpdateTime,
    setFormState,
    updateFormState,
    fetchUserData,
    resetDataFetchFlag,
    setLastUpdateTime
  } = useProfileData(user);
  
  const {
    loading,
    isEditing,
    setIsEditing,
    handleSaveProfile,
    canEditProfile,
    getTimeUntilNextUpdate
  } = useProfileActions(user, formState, setLastUpdateTime, showToast, resetDataFetchFlag);
  
  const {
    showPhotoOptions,
    uploadLoading,
    uploadError,
    previewImage,
    setShowPhotoOptions,
    handleFileUpload,
    resetPhotoState
  } = usePhotoUpload(setFormState, showToast);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    updateFormState(id, value);
  };

  const handleCancelEdit = async () => {
    setIsEditing(false);
    resetPhotoState();
    resetDataFetchFlag();
    await fetchUserData();
  };

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-900">
        <Spinner size="xl" color="info" />
        <p className="ml-3 text-white">Loading user profile...</p>
      </div>
    );
  }

  // Check if emailVerified is properly set from the auth object
  const isEmailVerified = user.emailVerified === true;

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
        <ToastMessage 
          toast={toast} 
          onDismiss={dismissToast} 
        />
        
        <Card className="shadow-lg border-0 bg-gray-800 bg-opacity-70 backdrop-blur-sm">
          <div className="flex flex-col items-center mb-6 relative">
            {/* Profile picture with overlay for editing */}
            <ProfileAvatar
              photoURL={formState.photoURL}
              isEditing={isEditing}
              onShowPhotoOptions={() => setShowPhotoOptions(!showPhotoOptions)}
              previewImage={previewImage}
            />
            
            {/* User name display */}
            <h2 className="text-lg md:text-xl font-semibold mt-3 text-white">
              {formState.firstName ? `${formState.firstName} ${formState.lastName}` : (user.displayName || 'User')}
            </h2>
            <p className="text-sm text-gray-400">{formState.email || user.email}</p>
            
            {/* Photo URL edit popup */}
            {showPhotoOptions && (
              <PhotoOptionsPanel
                photoURL={formState.photoURL}
                onInputChange={handleInputChange}
                onClose={() => setShowPhotoOptions(false)}
                onFileUpload={handleFileUpload}
                uploadLoading={uploadLoading}
                uploadError={uploadError}
                previewImage={previewImage}
              />
            )}
          </div>
          
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" value="First Name" className="text-xs font-medium text-gray-300" />
                <InputField 
                  id="firstName" 
                  icon={HiUser} 
                  value={formState.firstName} 
                  onChange={handleInputChange} 
                  disabled={!isEditing}
                  required={isEditing} 
                />
              </div>
              <div>
                <Label htmlFor="lastName" value="Last Name" className="text-xs font-medium text-gray-300" />
                <InputField 
                  id="lastName" 
                  icon={HiUser} 
                  value={formState.lastName} 
                  onChange={handleInputChange} 
                  disabled={!isEditing} 
                />
              </div>
            </div>
            
            <EmailField email={formState.email || user.email} isVerified={isEmailVerified} />
            
            <AccountInfoSection user={user} lastUpdateTime={lastUpdateTime} />
            
            <div className="flex flex-col space-y-2 pt-3">
              {!canEditProfile() && (
                <p className="text-xs text-amber-500">
                  {getTimeUntilNextUpdate()}
                </p>
              )}
              
              <ActionButtons 
                isEditing={isEditing}
                loading={loading}
                canEdit={canEditProfile()}
                onSave={handleSaveProfile}
                onCancel={handleCancelEdit}
                onEdit={() => setIsEditing(true)}
              />
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Profile;