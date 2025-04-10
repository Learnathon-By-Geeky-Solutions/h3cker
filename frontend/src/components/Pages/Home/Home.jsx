import React, { useContext, Suspense, lazy } from 'react';
import { AuthContext } from "../../../contexts/AuthProvider/AuthProvider";
import { Activity, BarChart2, PieChart, Eye, Loader } from 'lucide-react';

// Lazy-loaded components for better performance
const NotLoggedInView = lazy(() => import('../../Shared/NotLoggedInView/NotLoggedInView'));
const LoggedInView = lazy(() => import('../../Shared/LoggedInView/LoggedInView'));

/**
 * Full page loader component
 */
const FullPageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-900">
    <div className="flex flex-col items-center">
      <Loader className="w-10 h-10 text-blue-400 animate-spin" />
      <p className="mt-4 text-gray-300">Loading...</p>
    </div>
  </div>
);

/**
 * Home component
 * Main application entry point
 */
const Home = () => {
  // Get auth context
  const { user } = useContext(AuthContext);
  const isLoggedIn = !!user;
  
  // Generate content data
  const getFeaturedContent = () => ({
    title: "Emotion Analytics for Ad Evaluation",
    description: "Track viewer attention and optimize your ad performance with advanced eye-tracking technology.",
    imageUrl: "/api/placeholder/1200/600",
    category: "AD EVALUATION",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  });
  
  // Generate ad categories with icons
  const getAdCategories = () => [
    { id: 1, title: "Recently Analyzed", icon: <Activity size={20} className="text-blue-400" /> },
    { id: 2, title: "Highest Engagement", icon: <BarChart2 size={20} className="text-green-400" /> },
    { id: 3, title: "Strong Emotional Response", icon: <PieChart size={20} className="text-purple-400" /> },
    { id: 4, title: "Most Viewed", icon: <Eye size={20} className="text-yellow-400" /> }
  ];
  
  // Generate mock ads
  const generateMockAds = (count) => {
    const brands = ['Acme Inc', 'TechCorp', 'GlobalBrand', 'NextGen', 'FutureTech'];
    
    // YouTube video IDs for sample videos
    const videoIds = [
      'dQw4w9WgXcQ', // Rick Astley
      'JGwWNGJdvx8',
      '9bZkp7q19f0',
      'kJQP7kiw5Fk',
      'OPf0YbXqDm0'
    ];
    
    // Create mock ad data
    return Array(count).fill().map((_, index) => ({
      id: index + 1,
      title: `${brands[index % brands.length]} Campaign ${index + 1}`,
      videoUrl: `https://www.youtube.com/watch?v=${videoIds[index % videoIds.length]}`,
      brand: brands[index % brands.length],
    }));
  };
  
  // Render appropriate view based on login status
  const renderContent = () => {
    if (!isLoggedIn) {
      return <NotLoggedInView />;
    }
    
    return (
      <LoggedInView 
        featuredContent={getFeaturedContent()} 
        adCategories={getAdCategories()} 
        generateMockAds={generateMockAds} 
      />
    );
  };

  return (
    <div className="bg-gray-900 min-h-screen">
      <Suspense fallback={<FullPageLoader />}>
        {renderContent()}
      </Suspense>
    </div>
  );
};

export default Home;