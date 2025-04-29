import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import NavigationBar from './components/Shared/Navbar/Navbar';
import MainFooter from './components/Shared/Footer/Footer';


const AUTH_ROUTES = ['/login', '/signup', '/forgetpassword'];

function App() {
  const location = useLocation();
  
  // Check if current page is an authentication page using the predefined list
  const isAuthPage = AUTH_ROUTES.includes(location.pathname);
  
  // Dashboard routes have their own layout and don't need the main navbar/footer
  // The dashboard has moved outside the App component's Outlet in the router
  
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