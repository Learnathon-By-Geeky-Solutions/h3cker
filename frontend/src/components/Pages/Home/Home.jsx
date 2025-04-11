import React, { useContext, Suspense, lazy } from 'react';
import { AuthContext } from "../../../contexts/AuthProvider/AuthProvider";
import { Spinner } from 'flowbite-react';

const NotLoggedInView = lazy(() => import('../../Shared/NotLoggedInView/NotLoggedInView'));
const LoggedInView = lazy(() => import('../../Shared/LoggedInView/LoggedInView'));

const FullPageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-900">
    <div className="flex flex-col items-center">
      <Spinner size="xl" color="info" />
      <p className="mt-4 text-gray-300">Loading...</p>
    </div>
  </div>
);

const Home = () => {
  const { user } = useContext(AuthContext);
  const isLoggedIn = Boolean(user);
  
  return (
    <div className="bg-gray-900 min-h-screen">
      <Suspense fallback={<FullPageLoader />}>
        {isLoggedIn ? <LoggedInView /> : <NotLoggedInView />}
      </Suspense>
    </div>
  );
};

export default Home;