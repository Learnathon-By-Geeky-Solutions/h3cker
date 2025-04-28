from django.urls import path
from .views import (
    OnboardingAPIView, UploadVideoView, VideoFeedView, VideoDetailView,
    RecordVideoViewAPI, ToggleVideoLikeAPI, 
    CreateVideoShareAPI, UserHistoryAPI, WebcamUploadView, UserLikedVideosAPI,
    VideoSearchView, UserPointsView, VideoRecommendationsView, FeaturedCarouselVideosView,
    CategoryVideosView, TrendingVideosView, RecentVideosView
)
from .admin_views import (
    UserSearchView, PromoteToAdminView, VideoManagementView, 
    VideoStatsView
)

urlpatterns = [
    path('onboarding/', OnboardingAPIView.as_view(), name='onboarding'),
    
    # Video endpoints
    path('upload-video/', UploadVideoView.as_view(), name='upload-video'),
    path('video-feed/', VideoFeedView.as_view(), name='video-feed'),
    path('video/<str:video_identifier>/', VideoDetailView.as_view(), name='video-detail'),
    path('search/videos/', VideoSearchView.as_view(), name='search-videos'),
    
    # Video interaction endpoints
    path('videos/<int:video_id>/view/', RecordVideoViewAPI.as_view(), name='record-video-view'),
    path('videos/<int:video_id>/like/', ToggleVideoLikeAPI.as_view(), name='toggle-video-like'),
    path('videos/<int:video_id>/share/', CreateVideoShareAPI.as_view(), name='create-video-share'),
    path('videos/<int:video_id>/webcam-upload/', WebcamUploadView.as_view(), name='webcam-upload'),
    
    # User endpoints
    path('user/history/', UserHistoryAPI.as_view(), name='user-history'),
    path('user/liked/', UserLikedVideosAPI.as_view(), name='user-liked-videos'),
    path('user/points/', UserPointsView.as_view(), name='user-points'),
    
    # Recommendation endpoints
    path('recommendations/', VideoRecommendationsView.as_view(), name='video-recommendations'),
    path('featured-carousel/', FeaturedCarouselVideosView.as_view(), name='featured-carousel-videos'),
    path('category-videos/', CategoryVideosView.as_view(), name='category-videos'),
    path('trending-videos/', TrendingVideosView.as_view(), name='trending-videos'),
    path('recent-videos/', RecentVideosView.as_view(), name='recent-videos'),
    
    # Admin endpoints
    path('admin/users/search/', UserSearchView.as_view(), name='admin-user-search'),
    path('admin/users/promote/', PromoteToAdminView.as_view(), name='admin-promote-user'),
    path('admin/videos/', VideoManagementView.as_view(), name='admin-videos-list'),
    path('admin/videos/<int:video_id>/', VideoManagementView.as_view(), name='admin-video-delete'),
    path('admin/video-stats/', VideoStatsView.as_view(), name='admin-video-stats'),
]