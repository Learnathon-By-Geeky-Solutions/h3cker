import React, { useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "../../../contexts/AuthProvider/AuthProvider";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, Menu, X} from "lucide-react";
import SearchBar from "../SearchBar/SearchBar";

const NavigationBar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close user dropdown when clicking outside
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      
      // Close mobile menu when clicking outside
      if (mobileMenuRef.current && 
          !mobileMenuRef.current.contains(event.target) && 
          !event.target.closest('[data-mobile-toggle]')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const renderNavLinks = (mobile = false) => {
    const baseClass = mobile 
      ? "block px-3 py-2 rounded-md text-base font-medium" 
      : "text-gray-300 hover:text-white transition-colors";
    
    const activeClass = mobile 
      ? "text-white bg-gray-900" 
      : "text-blue-400 hover:text-blue-300";
    
    const inactiveClass = mobile 
      ? "text-gray-300 hover:text-white hover:bg-gray-700" 
      : "text-gray-300 hover:text-white";
    
    const onClick = mobile ? () => setIsMobileMenuOpen(false) : undefined;
    
    return (
      <>
        <Link to="/" onClick={onClick} className={`${baseClass} ${activeClass}`}>
          Home
        </Link>
        <Link to="/about" onClick={onClick} className={`${baseClass} ${inactiveClass}`}>
          About
        </Link>
        <Link to="/videos" onClick={onClick} className={`${baseClass} ${inactiveClass}`}>
          Videos
        </Link>
      </>
    );
  };

  const renderUserMenu = () => {
    if (!showUserMenu) return null;
    
    return (
      <div className="absolute right-0 mt-2 w-48 py-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
        <div className="px-4 py-2 border-b border-gray-700">
          <p className="text-sm font-semibold text-white">
            {user.firstName ? `${user.firstName} ${user.lastName}` : user.displayName}
          </p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>
        <Link to="/profile" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
          Your Profile
        </Link>
        <Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
          Dashboard
        </Link>
        <Link to="/devices" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
          Device Manager
        </Link>
        <div className="border-t border-gray-700 my-1"></div>
        <button 
          onClick={handleLogout}
          className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  };

  const renderUserControls = () => {
    if (!user) {
      return (
        <Link 
          to="/login"
          className="relative group px-6 py-2.5 bg-blue-600 rounded-full text-white text-sm font-medium shadow-md hover:shadow-lg transition-all duration-300"
        >
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full shadow-md"></span>
          <span className="absolute inset-0 w-full h-full bg-white/15 rounded-full blur-[2px]"></span>
          <span className="absolute inset-0 w-full h-full bg-blue-600 rounded-full transform transition-transform group-hover:scale-105"></span>
          <span className="relative">Login</span>
        </Link>
      );
    }
    
    return (
      <div className="flex items-center space-x-4">
        {/* User Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center focus:outline-none"
          >
            <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-gray-700 hover:border-blue-500 transition-colors">
              <img
                src={user.photoURL || "https://flowbite.com/docs/images/people/profile-picture-5.jpg"}
                alt="User profile"
                className="h-full w-full object-cover"
              />
            </div>
          </button>

          {renderUserMenu()}
        </div>
      </div>
    );
  };

  const renderMobileMenu = () => {
    if (!isMobileMenuOpen) return null;
    
    return (
      <div 
        ref={mobileMenuRef}
        className="md:hidden bg-gray-800 shadow-lg transition-all duration-300 max-h-screen opacity-100"
      >
        {/* Mobile Search */}
        <div className="px-4 py-3">
          <SearchBar />
        </div>
        
        {/* Mobile Navigation Links */}
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {renderNavLinks(true)}
        </div>
        
        {/* User info in mobile menu when logged in */}
        {user && (
          <div className="pt-4 pb-3 border-t border-gray-700">
            <div className="flex items-center px-5">
              <div className="flex-shrink-0">
                <img 
                  className="h-10 w-10 rounded-full" 
                  src={user.photoURL || "https://flowbite.com/docs/images/people/profile-picture-5.jpg"} 
                  alt="User avatar" 
                />
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-white">
                  {user.firstName ? `${user.firstName} ${user.lastName}` : user.displayName}
                </div>
                <div className="text-sm font-medium text-gray-400 truncate max-w-[200px]">
                  {user.email}
                </div>
              </div>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <Link 
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700"
              >
                Your Profile
              </Link>
              <Link 
                to="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700"
              >
                Dashboard
              </Link>
              <Link 
                to="/devices"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700"
              >
                Device Manager
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-gray-900/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-md shadow-lg">
              <BarChart3 size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">Engage Analytics</span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-md mx-10">
            <SearchBar />
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-6">
            <nav className="hidden md:flex space-x-6 text-sm font-medium">
              {renderNavLinks()}
            </nav>

            {/* User Controls */}
            {renderUserControls()}
            
            {/* Mobile menu button */}
            <button 
              data-mobile-toggle
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-gray-300 hover:text-white focus:outline-none"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {renderMobileMenu()}
    </div>
  );
};

export default NavigationBar;