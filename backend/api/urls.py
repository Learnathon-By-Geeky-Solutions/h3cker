from django.urls import path
from .views import TestAuthView, OnboardingAPIView, SetFirebaseTokenView, UploadVideoView, VideoFeedView, VideoDetailView 

urlpatterns = [
    path('auth-test/', TestAuthView.as_view(), name='auth-test'),
    path('onboarding/', OnboardingAPIView.as_view(), name='onboarding'),
    path('set-token/', SetFirebaseTokenView.as_view(), name='set-token'),
    path('upload-video/', UploadVideoView.as_view(), name='upload-video'),
    path('video-feed/', VideoFeedView.as_view(), name='video-feed'),
    path('video/<int:pk>/', VideoDetailView.as_view(), name='video-detail'), 
]
