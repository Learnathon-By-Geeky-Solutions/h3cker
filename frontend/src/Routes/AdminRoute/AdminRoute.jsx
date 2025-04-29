import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../contexts/AuthProvider/AuthProvider';
import { Spinner } from 'flowbite-react';
import { useLocation, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const AdminRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);

  // Only process auth state once to prevent repeated re-renders
  useEffect(() => {
    if (!loading) {
      setAuthChecked(true);
    }
  }, [loading]);

  if (loading && !authChecked) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Spinner size="xl" aria-label="Loading content" />
      </div>
    );
  }

  // Check if user is not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user is logged in but not an admin
  if (user && user.role !== 'admin') {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  // If user is logged in and is an admin, render the children
  return children;
};

AdminRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AdminRoute;