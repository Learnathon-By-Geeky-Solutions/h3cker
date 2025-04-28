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
  BarChart2, 
  LogOut, 
  Menu, 
  X, 
  Video,
} from 'lucide-react';

const DEFAULT_AVATAR = "https://flowbite.com/docs/images/people/profile-picture-5.jpg";

const getNavItems = (role) => {
  const baseItems = [
    { path: '/dashboard', name: 'Dashboard', icon: <Home size={20} /> },
  ];
  

  if (role === 'admin' || role === 'company') {
    baseItems.push(
      { path: '/dashboard/upload', name: 'Upload Video', icon: <Upload size={20} /> },
      { path: '/dashboard/videos', name: 'My Videos', icon: <Video size={20} /> },
      { path: '/dashboard/analytics', name: 'Analytics', icon: <BarChart2 size={20} /> }
    );
  }

  if (role === 'user') {
    baseItems.push(
      { path: '/dashboard/watchhistory', name: 'Watch History', icon: <Video size={20} /> }
    );
  } 
  return baseItems;
};

const navItemBaseClasses = "flex items-center rounded-lg p-2 text-gray-300 hover:bg-gray-700 group transition-all duration-200";
const navItemActiveClasses = "bg-blue-600 text-white hover:bg-blue-700";

const DashboardSideNavbar = ({ isOpen, setIsOpen }) => {
  const { user, logOut } = useContext(AuthContext);
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  //sidebar width based on state
  const getSidebarWidth = () => {
    if ((isHovering && !isOpen && !isMobile) || isOpen) {
      return 'w-64';
    }
    return 'w-16';
  };
  
  //sidebar class
  const getSidebarClass = () => {
    const translateClass = isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0';
    return `fixed top-0 left-0 z-30 h-screen transition-all duration-300 ${translateClass} ${getSidebarWidth()} bg-gray-900 border-r border-gray-800 overflow-hidden`;
  };

  // Mouse enter handler for hover effect
  const handleMouseEnter = () => {
    if (!isOpen && !isMobile) {
      setIsHovering(true);
    }
  };

  // Render navigation items
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

  // Render user profile
  const renderUserProfile = () => {
    const containerClass = !isOpen && !isHovering ? 'flex justify-center' : 'px-2';
    const profileClass = !isOpen && !isHovering ? 'flex-col items-center' : 'items-center space-x-3';
    const avatarSizeClass = !isOpen && !isHovering ? 'w-10 h-10' : 'w-8 h-8';
    
    return (
      <div className={`mb-6 ${containerClass}`}>
        <div className={`flex ${profileClass}`}>
          <Avatar
            img={user?.photoURL || DEFAULT_AVATAR}
            rounded
            bordered
            color="blue"
            className={`${avatarSizeClass} border-blue-600/50`}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DEFAULT_AVATAR;
            }}
          />
          {(isOpen || isHovering) && (
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-white truncate">
                {user?.displayName || 'User'}
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

  const renderToggleButton = () => {
    if (isMobile) return null;
    
    const buttonClass = `p-1 rounded-lg bg-gray-800 border-gray-700 text-white hover:bg-gray-700 ${
      !isOpen && !isHovering ? 'mx-auto' : ''
    }`;
    
    return (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClass}
      >
        {isOpen ? <X size={16} /> : <Menu size={16} />}
      </button>
    );
  };

  return (
    <>
      <nav 
        className={getSidebarClass()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="h-full flex flex-col justify-between py-4 px-3 pt-20">
          <div className="flex items-center justify-between mb-6 px-2">
            {(isOpen || isHovering) && (
              <div className="flex items-center">
                <span className="self-center text-xl font-semibold whitespace-nowrap text-white">
                  VideoApp
                </span>
              </div>
            )}
            {renderToggleButton()}
          </div>

  
          {renderUserProfile()}

   
          <div className="flex-grow">
            {renderNavItems()}
          </div>
          <div className={`mt-6 ${!isOpen && !isHovering ? 'flex justify-center' : 'px-2'}`}>
            <button
              onClick={handleLogout}
              className={`${navItemBaseClasses} ${
                !isOpen && !isHovering ? 'justify-center' : 'justify-start'
              } w-full text-gray-300 hover:text-white`}
            >
              <LogOut size={20} />
              {(isOpen || isHovering) && <span className="ml-3 text-sm">Logout</span>}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu toggle button */}
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
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-20"
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
};

export default DashboardSideNavbar;