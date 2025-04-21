from django.urls import path
from .views import (
    TestAuthView, OnboardingAPIView, SetFirebaseTokenView, 
    UploadVideoView, VideoFeedView, VideoDetailView,
    RecordVideoViewAPI, ToggleVideoLikeAPI, 
    CreateVideoShareAPI, UserHistoryAPI
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
    
    # User history endpoint
    path('user/history/', UserHistoryAPI.as_view(), name='user-history'),
]