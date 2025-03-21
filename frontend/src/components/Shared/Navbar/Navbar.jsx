import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../../contexts/AuthProvider/AuthProvider";
import { Link, useNavigate } from "react-router-dom";
import { HiOutlineBell } from "react-icons/hi";
import { BarChart3 } from "lucide-react";
import SearchBar from "../SearchBar/SearchBar";

const NavigationBar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Logout error:", error);
    }
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
              <Link to="/" className="text-blue-400 hover:text-blue-300 transition-colors">Home</Link>
              <Link to="/about" className="text-gray-300 hover:text-white transition-colors">About</Link>
              <Link to="/videos" className="text-gray-300 hover:text-white transition-colors">Videos</Link>
            </nav>

            {/* User Controls */}
            {user ? (
              <div className="flex items-center space-x-4">
                {/* Notification Button */}
                <button 
                  type="button"
                  className="p-1.5 text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-800 rounded-full transition-colors"
                >
                  <HiOutlineBell className="w-5 h-5" />
                </button>

                {/* User Profile Dropdown */}
                <div className="relative">
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

                  {/* Dropdown Menu */}
                  {showUserMenu && (
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
                      <Link to="/settings" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                        Settings
                      </Link>
                      <div className="border-t border-gray-700 my-1"></div>
                      <button 
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Link 
                to="/login"
                className="relative group px-6 py-2.5 bg-blue-600 rounded-full text-white text-sm font-medium shadow-md hover:shadow-lg transition-all duration-300"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full shadow-md"></span>
                <span className="absolute inset-0 w-full h-full bg-white/15 rounded-full blur-[2px]"></span>
                <span className="absolute inset-0 w-full h-full bg-blue-600 rounded-full transform transition-transform group-hover:scale-105"></span>
                <span className="relative">Login</span>
              </Link>
            )}
            
            {/* Mobile menu button */}
            <button className="md:hidden text-gray-300 hover:text-white focus:outline-none">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <div className="md:hidden bg-gray-800 mt-16 absolute w-full shadow-lg hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link to="/" className="block px-3 py-2 rounded-md text-base font-medium text-white bg-gray-900">Home</Link>
          <Link to="/about" className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700">About</Link>
          <Link to="/videos" className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700">Videos</Link>
        </div>
      </div>
    </div>
  );
};

export default NavigationBar;