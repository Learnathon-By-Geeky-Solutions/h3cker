import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import NavigationBar from './components/Shared/Navbar/Navbar';
import MainFooter from './components/Shared/Footer/Footer';


const AUTH_ROUTES = ['/login', '/signup', '/forgetpassword'];

function App() {
  const location = useLocation();

  const isAuthPage = AUTH_ROUTES.includes(location.pathname);
  
  return (
    <div className="min-h-screen bg-gray-900">
      {/* navbar */}
      {!isAuthPage && <NavigationBar />}
      
      {/* Main content */}
      <main className={`${!isAuthPage ? 'pt-16' : ''}`}>
        <Outlet /> 
      </main>
      
      {/* footer */}
      {!isAuthPage && <MainFooter />}
    </div>
  );
}

export default App;