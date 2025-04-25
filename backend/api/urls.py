from django.urls import path
from .views import (
    TestAuthView, OnboardingAPIView, SetFirebaseTokenView, 
    UploadVideoView, VideoFeedView, VideoDetailView,
    RecordVideoViewAPI, ToggleVideoLikeAPI, 
    CreateVideoShareAPI, UserHistoryAPI, UserLikedVideosAPI
)
from .admin_views import (
    UserSearchView, PromoteToAdminView, VideoManagementView, VideoStatsView
)

urlpatterns = [
    path('auth-test/', TestAuthView.as_view(), name='auth-test'),
    path('onboarding/', OnboardingAPIView.as_view(), name='onboarding'),
    path('set-token/', SetFirebaseTokenView.as_view(), name='set-token'),
    path('upload-video/', UploadVideoView.as_view(), name='upload-video'),
    path('video-feed/', VideoFeedView.as_view(), name='video-feed'),
    
    # Single endpoint to handle both numeric IDs and UUID tokens
    path('video/<str:video_identifier>/', VideoDetailView.as_view(), name='video-detail'),
    
    # Video interaction endpoints
    path('videos/<int:video_id>/view/', RecordVideoViewAPI.as_view(), name='record-video-view'),
    path('videos/<int:video_id>/like/', ToggleVideoLikeAPI.as_view(), name='toggle-video-like'),
    path('videos/<int:video_id>/share/', CreateVideoShareAPI.as_view(), name='create-video-share'),
    
    # User history endpoints
    path('user/history/', UserHistoryAPI.as_view(), name='user-history'),
    path('user/liked/', UserLikedVideosAPI.as_view(), name='user-liked-videos'),
    
    # Admin endpoints
    path('admin/users/search/', UserSearchView.as_view(), name='admin-user-search'),
    path('admin/users/promote/', PromoteToAdminView.as_view(), name='admin-promote-user'),
    path('admin/videos/', VideoManagementView.as_view(), name='admin-videos-list'),
    path('admin/videos/<int:video_id>/', VideoManagementView.as_view(), name='admin-video-delete'),
    path('admin/video-stats/', VideoStatsView.as_view(), name='admin-video-stats'),
]