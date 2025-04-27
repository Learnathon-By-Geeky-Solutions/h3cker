from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TestAuthView, OnboardingAPIView, SetFirebaseTokenView, 
    UploadVideoView, VideoFeedView, VideoDetailView,
    RecordVideoViewAPI, ToggleVideoLikeAPI, 
    CreateVideoShareAPI, UserHistoryAPI, WebcamUploadView, UserLikedVideosAPI,
    VideoSearchView, EvaluationFormViewSet, EvaluationQuestionViewSet,
    SubmitEvaluationResponseView, UserPointsView
)
from .admin_views import (
    UserSearchView, PromoteToAdminView, VideoManagementView, 
    VideoStatsView, EvaluationStatsView
)

# Create router for viewsets
router = DefaultRouter()
router.register(r'evaluation-forms', EvaluationFormViewSet, basename='evaluation-forms')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Authentication endpoints
    path('auth-test/', TestAuthView.as_view(), name='auth-test'),
    path('onboarding/', OnboardingAPIView.as_view(), name='onboarding'),
    path('set-token/', SetFirebaseTokenView.as_view(), name='set-token'),
    
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
    
    # Evaluation form endpoints
    path('evaluation-forms/<int:form_id>/questions/', 
         EvaluationQuestionViewSet.as_view({'get': 'list', 'post': 'create'}), 
         name='evaluation-questions'),
    path('evaluation-forms/<int:form_id>/questions/<int:pk>/', 
         EvaluationQuestionViewSet.as_view({
             'get': 'retrieve', 
             'put': 'update', 
             'patch': 'partial_update', 
             'delete': 'destroy'
         }), 
         name='evaluation-question-detail'),
    path('evaluation-forms/<int:form_id>/submit/', 
         SubmitEvaluationResponseView.as_view(), 
         name='submit-evaluation'),
    
    # Admin endpoints
    path('admin/users/search/', UserSearchView.as_view(), name='admin-user-search'),
    path('admin/users/promote/', PromoteToAdminView.as_view(), name='admin-promote-user'),
    path('admin/videos/', VideoManagementView.as_view(), name='admin-videos-list'),
    path('admin/videos/<int:video_id>/', VideoManagementView.as_view(), name='admin-video-delete'),
    path('admin/video-stats/', VideoStatsView.as_view(), name='admin-video-stats'),
    path('admin/evaluation-stats/', EvaluationStatsView.as_view(), name='admin-evaluation-stats'),
]