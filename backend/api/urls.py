from django.urls import path
from api.views import (
    OnboardingAPIView,
    UploadVideoView,
    VideoFeedView,
    VideoDetailView,
    RecordVideoViewAPI,
    ToggleVideoLikeAPI,
    CreateVideoShareAPI,
    UserHistoryAPI,
    WebcamUploadView,
    UserLikedVideosAPI,
    VideoSearchView,
    UserPointsView,
    VideoRecommendationsView,
    FeaturedCarouselVideosView,
    CategoryVideosView,
    TrendingVideosView,
    RecentVideosView,
    WebcamUploadCompleteView,
    RunEmotionAnalysisView,
    EmotionAnalysisStatusView,
    VideoEmotionSummaryView,
    VideoEmotionRecordingsView,
    MyEmotionView,
    UserWebcamRecordingsView,
    HealthCheckView,
)
from api.admin_views import (
    UserSearchView,
    PromoteToAdminView,
    VideoManagementView,
    VideoStatsView,
    WebcamRecordingsView,
    DeleteWebcamRecordingView,
)

urlpatterns = [
    path("onboarding/", OnboardingAPIView.as_view(), name="onboarding"),
    # Video endpoints
    path("upload-video/", UploadVideoView.as_view(), name="upload-video"),
    path("video-feed/", VideoFeedView.as_view(), name="video-feed"),
    path(
        "video/<str:video_identifier>/", VideoDetailView.as_view(), name="video-detail"
    ),
    path("search/videos/", VideoSearchView.as_view(), name="search-videos"),
    # Video interaction endpoints
    path(
        "videos/<int:video_id>/view/",
        RecordVideoViewAPI.as_view(),
        name="record-video-view",
    ),
    path(
        "videos/<int:video_id>/like/",
        ToggleVideoLikeAPI.as_view(),
        name="toggle-video-like",
    ),
    path(
        "videos/<int:video_id>/share/",
        CreateVideoShareAPI.as_view(),
        name="create-video-share",
    ),
    path(
        "videos/<int:video_id>/webcam-upload/",
        WebcamUploadView.as_view(),
        name="webcam-upload",
    ),
    path(
        "videos/<int:video_id>/webcam-upload/<int:recording_id>/complete/",
        WebcamUploadCompleteView.as_view(),
        name="webcam-upload-complete",
    ),
    # User endpoints
    path("user/history/", UserHistoryAPI.as_view(), name="user-history"),
    path("user/liked/", UserLikedVideosAPI.as_view(), name="user-liked-videos"),
    path("user/points/", UserPointsView.as_view(), name="user-points"),
    # Recommendation endpoints
    path(
        "recommendations/",
        VideoRecommendationsView.as_view(),
        name="video-recommendations",
    ),
    path(
        "featured-carousel/",
        FeaturedCarouselVideosView.as_view(),
        name="featured-carousel-videos",
    ),
    path("category-videos/", CategoryVideosView.as_view(), name="category-videos"),
    path("trending-videos/", TrendingVideosView.as_view(), name="trending-videos"),
    path("recent-videos/", RecentVideosView.as_view(), name="recent-videos"),
    # User-facing webcam recordings
    path(
        "webcam-recordings/",
        UserWebcamRecordingsView.as_view(),
        name="user-webcam-recordings",
    ),
    # Admin endpoints
    path("admin/users/search/", UserSearchView.as_view(), name="admin-user-search"),
    path(
        "admin/users/promote/", PromoteToAdminView.as_view(), name="admin-promote-user"
    ),
    path("admin/videos/", VideoManagementView.as_view(), name="admin-videos-list"),
    path(
        "admin/videos/<int:video_id>/",
        VideoManagementView.as_view(),
        name="admin-video",
    ),
    path("admin/video-stats/", VideoStatsView.as_view(), name="admin-video-stats"),
    path(
        "admin/webcam-recordings/",
        WebcamRecordingsView.as_view(),
        name="admin-webcam-recordings",
    ),
    path(
        "admin/webcam-recordings/<int:recording_id>/",
        DeleteWebcamRecordingView.as_view(),
        name="admin-delete-webcam-recording",
    ),
    # Emotion analysis admin endpoints
    path(
        "admin/run-emotion-analysis/",
        RunEmotionAnalysisView.as_view(),
        name="admin-run-emotion-analysis",
    ),
    path(
        "admin/emotion-analysis-status/",
        EmotionAnalysisStatusView.as_view(),
        name="admin-emotion-analysis-status",
    ),
    # Per-video emotion analytics
    path(
        "video/<int:video_id>/emotion-summary/",
        VideoEmotionSummaryView.as_view(),
        name="video-emotion-summary",
    ),
    path(
        "video/<int:video_id>/emotion/recordings/",
        VideoEmotionRecordingsView.as_view(),
        name="video-emotion-recordings",
    ),
    path(
        "video/<int:video_id>/my-emotion/",
        MyEmotionView.as_view(),
        name="video-my-emotion",
    ),
    # Health check
    path("health/", HealthCheckView.as_view(), name="health-check"),
]
