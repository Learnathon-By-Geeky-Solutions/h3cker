import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import DashboardSideNavbar from '../DashboardSideNavbar/DashboardSideNavbar';
import NavigationBar from '../../Shared/Navbar/Navbar';

const DashboardLayout = () => {

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="flex h-screen bg-gray-900">
      <div className="fixed top-0 left-0 right-0 z-50">
        <NavigationBar />
      </div>
      
      <DashboardSideNavbar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        isHovering={isHovering}
        setIsHovering={setIsHovering}
      />
      

      <div 
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen || isHovering ? 'md:ml-64' : 'md:ml-16'
        }`}
        style={{marginTop: '64px'}}
      >
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto h-[calc(100vh-64px)]">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;