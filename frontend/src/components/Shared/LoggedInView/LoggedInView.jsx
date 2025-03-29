import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import HeroBillboard from '../../Shared/HeroBillboard/HeroBillboard';
import AdRow from '../../Shared/AdRow/AdRow';
import { extractYouTubeId } from '../../Shared/VideoPlayer/youtubeUtils';

/**
 * LoggedInView component
 * Main content view for logged-in users
 */
const LoggedInView = ({ featuredContent, adCategories, generateMockAds }) => {
  // Process tracking data
  const handleTrackingData = useCallback((data) => {
    // You can send this to your backend
    console.log('Tracking data received:', data);
  }, []);
  
  // Process video URLs for ads
  const processVideoUrl = useCallback((url) => {
    if (!url) return '';
    
    // If already a well-formed YouTube URL, return as is
    if (url.includes('youtube.com/watch?v=')) {
      return url;
    }
    
    // For other formats, try to extract video ID and create proper URL
    const videoId = extractYouTubeId(url);
    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    
    // Return original if no ID found
    return url;
  }, []);
  
  // Generate enhanced ads with processed URLs and images
  const generateEnhancedAds = useCallback((count) => {
    const baseAds = generateMockAds(count);
    
    return baseAds.map(ad => {
      // Extract video ID for thumbnail if no image provided
      const videoId = extractYouTubeId(ad.videoUrl);
      const imageUrl = ad.imageUrl || (videoId 
        ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        : `/api/placeholder/400/225?text=${encodeURIComponent(ad.title)}`);
        
      return {
        ...ad,
        videoUrl: processVideoUrl(ad.videoUrl),
        imageUrl
      };
    });
  }, [generateMockAds, processVideoUrl]);
  
  // Enhanced featured content with tracking
  const enhancedFeatured = {
    ...featuredContent,
    onTrackingData: handleTrackingData,
    videoUrl: processVideoUrl(featuredContent.videoUrl)
  };

  return (
    <div className="bg-gray-900 min-h-screen">
      {/* Featured Content */}
      <HeroBillboard content={enhancedFeatured} />
      
      {/* Ad Categories */}
      <div className="pt-8">
        {adCategories.map(category => (
          <AdRow 
            key={category.id}
            title={category.title}
            icon={category.icon}
            ads={generateEnhancedAds(5)}
          />
        ))}
      </div>
    </div>
  );
};

LoggedInView.propTypes = {
  featuredContent: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    imageUrl: PropTypes.string,
    category: PropTypes.string.isRequired,
    videoUrl: PropTypes.string.isRequired
  }).isRequired,
  adCategories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      title: PropTypes.string.isRequired,
      icon: PropTypes.node
    })
  ).isRequired,
  generateMockAds: PropTypes.func.isRequired
};

export default LoggedInView;