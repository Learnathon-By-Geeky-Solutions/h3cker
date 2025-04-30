import React, { useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { 
  Avatar,
} from 'flowbite-react';
import { 
  Home, 
  Upload, 
  Menu, 
  X, 
  Video,
  User,
  Clock,
  ThumbsUp,

  UserCog,
  VideoIcon
} from 'lucide-react';

const DEFAULT_AVATAR = "https://flowbite.com/docs/images/people/profile-picture-5.jpg";

const getNavItems = (role) => {
  const baseItems = [
    { path: '/dashboard', name: 'Dashboard', icon: <Home size={20} /> },
  ];
  
  // Admin section
  if (role === 'admin') {
    baseItems.push(
      { path: '/dashboard/upload', name: 'Upload Video', icon: <Upload size={20} /> },
      { path: '/dashboard/videos', name: 'Manage Videos', icon: <Video size={20} /> },
      { path: '/dashboard/role-management', name: 'User Management', icon: <UserCog size={20} /> },
      { path: '/dashboard/recorded-videos', name: 'Webcam Recordings', icon: <VideoIcon size={20} /> },
    );
  }
  // Regular user section
  else if (role === 'user') {
    baseItems.push(
      { path: '/dashboard/history', name: 'Watch History', icon: <Clock size={20} /> },
      { path: '/dashboard/liked-videos', name: 'Liked Videos', icon: <ThumbsUp size={20} /> },
    );
  } 
  return baseItems;
};

const navItemBaseClasses = "flex items-center rounded-lg p-2 text-gray-300 hover:bg-gray-700 group transition-all duration-200";
const navItemActiveClasses = "bg-blue-600 text-white hover:bg-blue-700";

const DashboardSideNavbar = ({ isOpen, setIsOpen, isHovering, setIsHovering }) => {
  const { user} = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (user?.photoURL) {
      setImageError(false);
    }
  }, [user?.photoURL]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const getSidebarWidth = () => {
    if ((isHovering && !isOpen && !isMobile) || isOpen) {
      return 'w-64';
    }
    return 'w-16';
  };
  
  const getSidebarClass = () => {
    const translateClass = isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0';
    return `fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] transition-all duration-300 ${translateClass} ${getSidebarWidth()} bg-gray-900 border-r border-gray-800 overflow-hidden`;
  };

  const handleMouseEnter = () => {
    if (!isOpen && !isMobile) {
      setIsHovering(true);
    }
  };
  const handleMouseLeave = () => {
    setIsHovering(false);
  };
  const renderNavItems = () => {
    const navItems = getNavItems(user?.role || 'user');
    
    return (
      <ul className="space-y-1">
        {navItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) => {
                const activeClass = isActive ? navItemActiveClasses : '';
                const justifyClass = !isOpen && !isHovering ? 'justify-center' : 'justify-start';
                return `${navItemBaseClasses} ${activeClass} ${justifyClass} mb-1`;
              }}
            >
              {item.icon}
              {(isOpen || isHovering) && (
                <span className="ml-3 text-sm">{item.name}</span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    );
  };

  const renderUserProfile = () => {
    const containerClass = !isOpen && !isHovering ? 'flex justify-center' : 'px-2';
    const profileClass = !isOpen && !isHovering ? 'flex-col items-center' : 'items-center space-x-3';
    const avatarSizeClass = !isOpen && !isHovering ? 'w-10 h-10' : 'w-8 h-8';
    
    return (
      <div className={`mb-6 ${containerClass}`}>
        <div className={`flex ${profileClass}`}>
          {imageError || !user?.photoURL ? (
            <div className={`${avatarSizeClass} rounded-full bg-gray-700 flex items-center justify-center border-2 border-blue-600/50`}>
              <User size={!isOpen && !isHovering ? 20 : 16} className="text-gray-300" />
            </div>
          ) : (
            <Avatar
              img={user?.photoURL}
              rounded
              bordered
              color="blue"
              className={`${avatarSizeClass} border-blue-600/50`}
              onError={(e) => {
                e.target.onerror = null;
                setImageError(true);
              }}
              loading="eager"
            />
          )}
          {(isOpen || isHovering) && (
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user?.displayName || 'User'}
              </p>
              <p className="text-xs text-gray-400 truncate max-w-[160px]">
                {user?.email || 'user@example.com'}
              </p>
              {user?.role && (
                <p className="text-xs text-blue-400 font-medium capitalize">
                  {user.role}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <nav 
        className={getSidebarClass()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="h-full flex flex-col justify-between py-4 px-3">
          {renderUserProfile()}

   
          <div className="flex-grow">
            {renderNavItems()}
          </div>
        </div>
      </nav>

      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-blue-600 text-white shadow-lg md:hidden"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {isMobile && isOpen && (
        <button 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-10"
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsOpen(false);
            }
          }}
        />
      )}
    </>
  );
};

DashboardSideNavbar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  setIsOpen: PropTypes.func.isRequired,
  isHovering: PropTypes.bool,
  setIsHovering: PropTypes.func
};

DashboardSideNavbar.defaultProps = {
  isHovering: false,
  setIsHovering: () => {}
};

export default DashboardSideNavbar;