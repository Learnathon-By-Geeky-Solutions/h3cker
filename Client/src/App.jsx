import React, { useContext } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import NavigationBar from './components/Shared/Navbar/Navbar';
import MainFooter from './components/Shared/Footer/Footer';
import { AuthContext } from './contexts/AuthProvider/AuthProvider';

function App() {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  
  // Check if current page is an authentication page
  const isAuthPage = location.pathname === '/login' || 
                     location.pathname === '/signup' || 
                     location.pathname === '/forgetpassword';

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Conditionally render navbar */}
      {!isAuthPage && <NavigationBar />}
      
      {/* Main content */}
      <main className={`${!isAuthPage ? 'pt-16' : ''}`}>
        <Outlet /> {/* The actual page content will be rendered here */}
      </main>
      
      {/* Conditionally render footer */}
      {!isAuthPage && <MainFooter />}
    </div>
  );
}

export default App;