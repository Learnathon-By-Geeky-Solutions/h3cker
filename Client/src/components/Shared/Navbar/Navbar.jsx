import React, { useContext } from "react";
import { Navbar, Avatar, Dropdown } from "flowbite-react";
import { AuthContext } from "../../../contexts/AuthProvider/AuthProvider";
import { HiSearch, HiOutlineBell, HiOutlineLogout, HiOutlineUser, HiOutlineCog, HiOutlineViewGrid } from "react-icons/hi";
import { BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const NavigationBar = () => {
  const { user, logout } = useContext(AuthContext);

  const handleLogout = async () => {
    try {
      await logout();
      // logout logic need to be added here
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="sticky top-0 z-50">
      <Navbar fluid className="bg-white dark:bg-gray-900 border-b shadow-sm py-2">
        <div className="flex justify-between items-center w-full max-w-[1920px] mx-auto px-4">
          {/* Left Section - Logo */}
          <Navbar.Brand href="/" className="flex-shrink-0">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg mr-2">
                <BarChart3 size={15} className="text-white" />
            </div>
            <span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white">
              Engage Analytics
            </span>
          </Navbar.Brand>

          {/* Middle Section - Search Bar */}
          <div className="order-3 md:order-2 w-full md:w-[40%] lg:w-[45%] mt-3 md:mt-0 md:mx-4">
            <div className="relative">
              <input
                type="search"
                placeholder="Search..."
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-full pl-12 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ease-in-out"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                <HiSearch className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Navigation Links - Collapsible */}
          <Navbar.Collapse className="order-4 md:order-3 w-full md:w-auto">
            <Navbar.Link href="/" active className="md:px-4">
              Home
            </Navbar.Link>
            <Navbar.Link href="/about" className="md:px-4">
              About
            </Navbar.Link>
            <Navbar.Link href="/services" className="md:px-4">
              Videos
            </Navbar.Link>
          </Navbar.Collapse>

          {/* Right Section - User Profile & Actions */}
          <div className="order-2 md:order-4 flex items-center gap-3 flex-shrink-0 ml-auto md:ml-0">
            {user ? (
              <>
                {/* Notification Bell */}
                <button className="p-2.5 hover:bg-gray-100 rounded-full dark:hover:bg-gray-700 transition-colors duration-200">
                  <HiOutlineBell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>

                {/* User Profile Dropdown */}
                <Dropdown
                  arrowIcon={false}
                  inline
                  label={
                    <Avatar
                      alt="User"
                      img={user.photoURL || "https://flowbite.com/docs/images/people/profile-picture-5.jpg"}
                      rounded
                      bordered
                      size="sm"
                      className="cursor-pointer dark:ring-gray-700"
                    />
                  }
                  className="w-72"
                >
                  <Dropdown.Header>
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar
                        alt="User settings"
                        img={user.photoURL || "https://flowbite.com/docs/images/people/profile-picture-5.jpg"}
                        rounded
                        size="sm"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {user.firstName ? `${user.firstName} ${user.lastName}` : user.displayName}
                        </span>
                        <span className="text-sm font-normal truncate text-gray-500 dark:text-gray-400">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </Dropdown.Header>
                  <Dropdown.Item icon={HiOutlineUser}>
                    Your Profile
                  </Dropdown.Item>
                  <Dropdown.Item icon={HiOutlineViewGrid}>
                        <Link to="/dashboard">Dashboard</Link>
                  </Dropdown.Item>
                  <Dropdown.Item icon={HiOutlineCog}>
                    Settings
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item icon={HiOutlineLogout} onClick={handleLogout}>
                    Sign out
                  </Dropdown.Item>
                </Dropdown>
              </>
            ) : (
              <button 
                onClick={() => window.location.href = '/login'}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 ease-in-out"
              >
                Login
              </button>
            )}
            
            {/* Mobile Menu Toggle */}
            <Navbar.Toggle className="ml-2" />
          </div>
        </div>
      </Navbar>
    </div>
  );
};

export default NavigationBar;