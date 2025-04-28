import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Clock, TrendingUp, ThumbsUp, Compass, Tag, Sparkles, Heart } from 'lucide-react';
import { Button, Spinner } from 'flowbite-react';
import VideoService from '../../../utils/VideoService';
import VideoDataService from '../../../utils/VideoDataService';
import { 
  LoadingState, 
  ErrorState, 
  EmptyState 
} from '../VideoLoadingStates/VideoLoadingStates';
import HeroBillboard from '../HeroBillboard/HeroBillboard';

// Lazy load the AdRow component to improve initial load time
const AdRow = lazy(() => import('../AdRow/AdRow'));

// Default number of videos to fetch per section
const DEFAULT_VIDEO_LIMIT = 10;

// Placeholder while AdRow component loads
const AdRowPlaceholder = ({ title }) => (
  <div className="mb-6 space-y-4">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold text-white">{title}</h2>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array(5).fill(0).map((_, i) => (
        <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
          <div className="aspect-video bg-gray-700"></div>
          <div className="p-3">
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const LoggedInView = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videos, setVideos] = useState([]);
  const [featuredVideos, setFeaturedVideos] = useState([]);
  
  // Separate loading states for different sections
  const [sectionsLoading, setSectionsLoading] = useState({
    featured: true,
    forYou: true,
    recommended: true,
    recent: true,
    popular: true,
    liked: true
  });
  
  // State for different video sections
  const [recentVideos, setRecentVideos] = useState([]);
  const [popularVideos, setPopularVideos] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [recommendedVideos, setRecommendedVideos] = useState([]);
  const [forYouVideos, setForYouVideos] = useState([]);
  
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryVideos, setCategoryVideos] = useState({});
  const [userOnboardingData, setUserOnboardingData] = useState(null);
  
  // Function to fetch onboarding data - stage 1
  const fetchOnboardingData = useCallback(async () => {
    try {
      const onboardingData = await VideoService.getUserOnboardingData().catch(err => {
        console.warn('Error fetching onboarding data:', err);
        return {};
      });
      setUserOnboardingData(onboardingData);
      return onboardingData;
    } catch (error) {
      console.warn('Error in onboarding data fetch:', error);
      return {};
    }
  }, []);
  
  // Function to fetch public videos - stage 2
  const fetchPublicVideos = useCallback(async (onboardingData) => {
    try {
      const publicVideosData = await VideoService.getVideoFeed().catch(err => {
        console.error("Failed to fetch video feed:", err);
        throw err;
      });
      
      if (!publicVideosData || publicVideosData.length === 0) {
        return { allVideos: [], featuredIds: new Set() };
      }
      
      // Normalize all videos to ensure consistent format
      const normalizedVideos = publicVideosData.map((video, index) => 
        VideoDataService.normalizeVideoData(video, index)
      );
      
      // Extract unique categories from videos
      const uniqueCategories = extractCategories(normalizedVideos);
      setCategories(uniqueCategories);
      
      // Prepare different video collections
      const sortedByDate = VideoDataService.sortVideosByDate(normalizedVideos);
      const sortedByViews = VideoDataService.sortVideosByViews(normalizedVideos);
      
      // Get top videos for the billboard carousel
      const billboardVideos = selectBillboardVideos(
        normalizedVideos, 
        sortedByViews, 
        sortedByDate, 
        onboardingData
      );
      setFeaturedVideos(billboardVideos);
      setSectionsLoading(prev => ({ ...prev, featured: false }));
      
      // Set recent videos
      const featuredIds = new Set(billboardVideos.map(v => v.id));
      const recentVids = sortedByDate
        .filter(v => !featuredIds.has(v.id))
        .slice(0, DEFAULT_VIDEO_LIMIT);
      setRecentVideos(recentVids);
      setSectionsLoading(prev => ({ ...prev, recent: false }));
      
      // Set popular videos
      const popularVids = sortedByViews
        .filter(v => !featuredIds.has(v.id))
        .slice(0, DEFAULT_VIDEO_LIMIT);
      setPopularVideos(popularVids);
      setSectionsLoading(prev => ({ ...prev, popular: false }));
      
      return {
        allVideos: normalizedVideos,
        featuredIds
      };
    } catch (error) {
      console.error('Error fetching public videos:', error);
      setError(error.message || 'Failed to load videos. Please try again later.');
      throw error;
    }
  }, []);
  
  // Function to fetch user-specific data - stage 3
  const fetchUserData = useCallback(async () => {
    try {
      // Fetch user liked videos
      const likedVideosData = await VideoService.getUserLikedVideos().catch(err => {
        console.warn('Error fetching liked videos:', err);
        return [];
      });
      
      if (likedVideosData && likedVideosData.length > 0) {
        const normalized = likedVideosData
          .map((v, i) => VideoDataService.normalizeVideoData(v, i))
          .slice(0, DEFAULT_VIDEO_LIMIT);
        setLikedVideos(normalized);
      }
      setSectionsLoading(prev => ({ ...prev, liked: false }));
      
      return {
        likedVideos: likedVideosData || []
      };
    } catch (error) {
      console.warn('Error in user data fetch:', error);
      // We're not setting the main error state here since this is optional data
      return {
        likedVideos: []
      };
    }
  }, []);
  
  // Function to generate recommendations based on user data - stage 4
  const generateRecommendations = useCallback((
    allVideos, 
    userLiked,
    excludeIds, 
    contentPreferences,
    onboardingData
  ) => {
    try {
      // If we don't have user data, return popular videos as recommendations
      if ((!userLiked || userLiked.length === 0) &&
          (!contentPreferences || contentPreferences.length === 0)) {
        return allVideos
          .filter(v => !excludeIds.has(v.id))
          .sort((a, b) => (b.views || 0) - (a.views || 0))
          .slice(0, DEFAULT_VIDEO_LIMIT);
      }
      
      // Get categories the user has liked
      const likedCategories = new Set();
      userLiked.forEach(video => {
        if (video.category) likedCategories.add(video.category);
      });
      
      // Create a Set of onboarding preferences for faster lookups
      const preferredCategories = new Set(contentPreferences);
      
      // Score each video based on several factors
      const scoredVideos = allVideos.map(video => {
        let score = 0;
        
        // Exclude featured videos
        if (excludeIds.has(video.id)) {
          score -= 50;
        }
        
        // Boost videos in categories from onboarding preferences (strongest signal)
        if (video.category && preferredCategories.has(video.category)) {
          score += 10; // Higher weight for explicitly stated preferences
        }
        
        // Boost videos in categories the user has liked (medium signal)
        if (video.category && likedCategories.has(video.category)) {
          score += 5;
        }
        
        // Boost popular videos (weak signal)
        score += Math.min((video.views || 0) / 100, 3);
        
        // Boost recent videos (weak signal)
        const uploadDate = new Date(video.upload_date);
        const now = new Date();
        const daysSinceUpload = (now - uploadDate) / (1000 * 60 * 60 * 24);
        if (daysSinceUpload < 7) {
          score += 2;
        }
        
        return { ...video, recommendationScore: score };
      });
      
      // Sort by score and return top recommendations
      const recommendations = scoredVideos
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, DEFAULT_VIDEO_LIMIT);
      
      setRecommendedVideos(recommendations);
      setSectionsLoading(prev => ({ ...prev, recommended: false }));
      
      return recommendations;
    } catch (error) {
      console.warn('Error generating recommendations:', error);
      setSectionsLoading(prev => ({ ...prev, recommended: false }));
      return [];
    }
  }, []);
  
  // Function to generate "For You" section - stage 5
  const generateForYouSection = useCallback((
    allVideos,
    excludeIds = new Set(), 
    recommendedIds = new Set(), 
    contentPreferences = []
  ) => {
    try {
      // If no preferences, return recent videos
      if (!contentPreferences || contentPreferences.length === 0) {
        const forYou = allVideos
          .filter(v => !excludeIds.has(v.id) && !recommendedIds.has(v.id))
          .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date))
          .slice(0, DEFAULT_VIDEO_LIMIT);
        
        setForYouVideos(forYou);
        setSectionsLoading(prev => ({ ...prev, forYou: false }));
        return forYou;
      }
      
      // Count categories from preferences
      const categoryInterests = {};
      
      // Add weight to categories from onboarding preferences
      contentPreferences.forEach(category => {
        categoryInterests[category] = (categoryInterests[category] || 0) + 3; // Extra weight for explicit preferences
      });
      
      // Sort categories by interest level
      const sortedCategories = Object.entries(categoryInterests)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);
      
      // Score videos based on recency and category match
      const scoredVideos = allVideos.map(video => {
        let score = 0;
        
        // Skip featured and already recommended videos
        if (excludeIds.has(video.id) || recommendedIds.has(video.id)) {
          score -= 100;
          return { ...video, forYouScore: score };
        }
        
        // Boost by category interest level
        if (video.category) {
          const categoryIndex = sortedCategories.indexOf(video.category);
          if (categoryIndex !== -1) {
            // Higher score for more interesting categories
            score += (sortedCategories.length - categoryIndex) * 3;
          }
          
          // Extra boost if category is from onboarding preferences
          if (contentPreferences.includes(video.category)) {
            score += 5;
          }
        }
        
        // Boost recent videos significantly
        const uploadDate = new Date(video.upload_date);
        const now = new Date();
        const daysSinceUpload = (now - uploadDate) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpload < 2) {
          score += 10; // Very recent (< 2 days)
        } else if (daysSinceUpload < 7) {
          score += 7; // Recent (< week)
        } else if (daysSinceUpload < 30) {
          score += 3; // Somewhat recent (< month)
        }
        
        return { ...video, forYouScore: score };
      });
      
      // Sort by score and return top "For You" recommendations
      const forYou = scoredVideos
        .sort((a, b) => b.forYouScore - a.forYouScore)
        .filter(v => v.forYouScore > -50) // Filter out excluded videos
        .slice(0, DEFAULT_VIDEO_LIMIT);
      
      setForYouVideos(forYou);
      setSectionsLoading(prev => ({ ...prev, forYou: false }));
      return forYou;
    } catch (error) {
      console.warn('Error generating "For You" section:', error);
      setSectionsLoading(prev => ({ ...prev, forYou: false }));
      return [];
    }
  }, []);
  
  // Main data loading effect - sequentially fetch data in stages to improve performance
  useEffect(() => {
    let isMounted = true;
    
    const loadAllData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Stage 1: Fetch onboarding data
        const onboardingData = await fetchOnboardingData();
        if (!isMounted) return;
        
        // Stage 2: Fetch public videos and prepare featured/recent/popular sections
        const { allVideos, featuredIds } = await fetchPublicVideos(onboardingData);
        if (!isMounted) return;
        setVideos(allVideos);
        
        // Stage 3: Fetch user-specific data in parallel
        const userDataResult = await fetchUserData();
        if (!isMounted) return;
        
        // Stage 4: Generate recommendations
        const recommendations = await generateRecommendations(
          allVideos, 
          userDataResult.likedVideos || [],
          featuredIds,
          onboardingData.content_preferences || [],
          onboardingData
        );
        if (!isMounted) return;
        
        // Stage 5: Generate "For You" section
        await generateForYouSection(
          allVideos,
          featuredIds,
          new Set(recommendations.map(v => v.id)),
          onboardingData.content_preferences || []
        );
        
      } catch (error) {
        if (isMounted) {
          console.error('Error loading data:', error);
          setError(error.message || 'Failed to load videos. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadAllData();
    
    return () => {
      isMounted = false;
    };
  }, [fetchOnboardingData, fetchPublicVideos, fetchUserData, generateRecommendations, generateForYouSection]);
  
  // Effect to load category videos when category is selected
  useEffect(() => {
    if (!selectedCategory) return;
    
    const loadCategoryVideos = () => {
      if (categoryVideos[selectedCategory]) return;
      
      const filtered = videos.filter(
        video => video.category === selectedCategory
      );
      
      setCategoryVideos(prev => ({
        ...prev,
        [selectedCategory]: filtered
      }));
    };
    
    loadCategoryVideos();
  }, [selectedCategory, videos, categoryVideos]);
  
  const handleCategorySelect = (category) => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };
  
  // Helper function to extract unique categories
  const extractCategories = (videos) => {
    const categorySet = new Set();
    
    videos.forEach(video => {
      if (video.category && video.category.trim() !== '') {
        categorySet.add(video.category.trim());
      }
    });
    
    return Array.from(categorySet);
  };
  
  // Function to select videos for the billboard
  const selectBillboardVideos = (allVideos, sortedByViews, sortedByDate, onboardingData) => {
    if (!Array.isArray(allVideos) || allVideos.length === 0) {
      return [];
    }
    
    const targetCount = 5;
    const featured = [];
    const usedIds = new Set();
    
    // 1. First, get the most viewed video
    if (sortedByViews && sortedByViews.length > 0) {
      const topVideo = sortedByViews[0];
      featured.push(topVideo);
      usedIds.add(topVideo.id);
    }
    
    // 2. Then, get the newest video (if different)
    if (sortedByDate && sortedByDate.length > 0) {
      const newestVideo = sortedByDate[0];
      if (!usedIds.has(newestVideo.id)) {
        featured.push(newestVideo);
        usedIds.add(newestVideo.id);
      }
    }
    
    // 3. Add videos from different categories, prioritize onboarding preferences
    const categoryMap = {};
    allVideos.forEach(video => {
      if (video.category && !usedIds.has(video.id)) {
        if (!categoryMap[video.category]) {
          categoryMap[video.category] = [];
        }
        categoryMap[video.category].push(video);
      }
    });
    
    // Prioritize onboarding preferences for categories if available
    const sortedCategories = [];
    
    if (onboardingData && onboardingData.content_preferences && 
        Array.isArray(onboardingData.content_preferences)) {
      // Add preferred categories first
      onboardingData.content_preferences.forEach(prefCategory => {
        if (categoryMap[prefCategory] && !sortedCategories.includes(prefCategory)) {
          sortedCategories.push(prefCategory);
        }
      });
    }
    
    // Add remaining categories
    Object.keys(categoryMap).forEach(category => {
      if (!sortedCategories.includes(category)) {
        sortedCategories.push(category);
      }
    });
    
    // Get one video from each category until we reach target count
    for (let i = 0; i < sortedCategories.length && featured.length < targetCount; i++) {
      const categoryVideos = categoryMap[sortedCategories[i]];
      if (categoryVideos && categoryVideos.length > 0) {
        const categoryVideo = categoryVideos[0];
        featured.push(categoryVideo);
        usedIds.add(categoryVideo.id);
      }
    }
    
    // 4. If we still need more videos, add more from the popular ones
    if (featured.length < targetCount && sortedByViews) {
      for (let i = 1; i < sortedByViews.length && featured.length < targetCount; i++) {
        const video = sortedByViews[i];
        if (!usedIds.has(video.id)) {
          featured.push(video);
          usedIds.add(video.id);
        }
      }
    }
    
    // 5. As a last resort, just add any videos we haven't included yet
    if (featured.length < 2) { // Minimum 2 for carousel
      allVideos.forEach(video => {
        if (!usedIds.has(video.id) && featured.length < targetCount) {
          featured.push(video);
          usedIds.add(video.id);
        }
      });
    }
    
    return featured;
  };
  
  // Full-page loading state for initial load
  if (loading && !featuredVideos.length) {
    return <LoadingState />;
  }
  
  // Full-page error state
  if (error) {
    return <ErrorState error={error} onDismiss={() => setError(null)} />;
  }
  
  // Empty state if no videos - Fixed to match the original messaging
  if (videos.length === 0) {
    return (
      <EmptyState 
        title="No Public Videos Available"
      />
    );
  }
  
  return (
    <div className="bg-gray-900 min-h-screen">
      <div className="px-4 pt-2 pb-6 md:px-8 md:pt-4 md:pb-10">
        {/* Loading state or displayed featured videos */}
        {sectionsLoading.featured ? (
          <div className="relative overflow-hidden mb-10 rounded-xl shadow-2xl bg-gray-800 animate-pulse">
            <div className="aspect-[21/9] md:aspect-[3/1] flex items-center justify-center">
              <div className="text-white text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-4">Loading featured content...</p>
              </div>
            </div>
          </div>
        ) : featuredVideos?.length > 0 && (
          <div className="mb-10">
            <HeroBillboard featuredVideos={featuredVideos} />
          </div>
        )}
        
        <div className="space-y-12">
          {/* For You Section */}
          <Suspense fallback={<AdRowPlaceholder title="For You" />}>
            {sectionsLoading.forYou ? (
              <AdRowPlaceholder title="For You" />
            ) : forYouVideos?.length > 0 && (
              <AdRow 
                title="For You" 
                icon={<Heart size={24} className="text-red-400" />}
                ads={forYouVideos}
                linkTo="/videos?type=foryou"
                isVideoSection={true}
              />
            )}
          </Suspense>
          
          {/* Recommended Section */}
          <Suspense fallback={<AdRowPlaceholder title="Recommended" />}>
            {sectionsLoading.recommended ? (
              <AdRowPlaceholder title="Recommended" />
            ) : recommendedVideos?.length > 0 && (
              <AdRow 
                title="Recommended" 
                icon={<Sparkles size={24} className="text-yellow-400" />}
                ads={recommendedVideos}
                linkTo="/videos?type=recommended"
                isVideoSection={true}
              />
            )}
          </Suspense>
          
          {/* Recently Added Section */}
          <Suspense fallback={<AdRowPlaceholder title="Recently Added" />}>
            {sectionsLoading.recent ? (
              <AdRowPlaceholder title="Recently Added" />
            ) : recentVideos?.length > 0 && (
              <AdRow 
                title="Recently Added" 
                icon={<Clock size={24} className="text-blue-400" />}
                ads={recentVideos}
                linkTo="/videos?sort=recent"
                isVideoSection={true}
              />
            )}
          </Suspense>
          
          {/* Popular Videos Section */}
          <Suspense fallback={<AdRowPlaceholder title="Popular Videos" />}>
            {sectionsLoading.popular ? (
              <AdRowPlaceholder title="Popular Videos" />
            ) : popularVideos?.length > 0 && (
              <AdRow 
                title="Popular Videos" 
                icon={<TrendingUp size={24} className="text-purple-400" />}
                ads={popularVideos}
                linkTo="/videos?sort=popular"
                isVideoSection={true}
              />
            )}
          </Suspense>
          
          {/* Liked Videos Section */}
          <Suspense fallback={<AdRowPlaceholder title="Videos You've Liked" />}>
            {sectionsLoading.liked ? (
              <AdRowPlaceholder title="Videos You've Liked" />
            ) : likedVideos?.length > 0 && (
              <AdRow 
                title="Videos You've Liked" 
                icon={<ThumbsUp size={24} className="text-pink-400" />}
                ads={likedVideos}
                linkTo="/user/liked"
                isVideoSection={true}
              />
            )}
          </Suspense>
          
          {/* Categories Section */}
          {categories.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-white flex items-center mb-4">
                <Compass size={24} className="text-indigo-400 mr-2" />
                Browse by Category
              </h2>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => handleCategorySelect(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              
              {selectedCategory && (
                <Suspense fallback={<AdRowPlaceholder title={`${selectedCategory} Videos`} />}>
                  {categoryVideos[selectedCategory]?.length > 0 ? (
                    <AdRow 
                      title={`${selectedCategory} Videos`}
                      icon={<Tag size={20} className="text-teal-400" />}
                      ads={categoryVideos[selectedCategory]}
                      linkTo={`/videos?category=${encodeURIComponent(selectedCategory)}`}
                      isVideoSection={true}
                    />
                  ) : (
                    <div className="p-6 bg-gray-800 rounded-lg text-center">
                      <Spinner size="lg" className="mb-4" />
                      <p className="text-gray-400">Loading category videos...</p>
                    </div>
                  )}
                </Suspense>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoggedInView;