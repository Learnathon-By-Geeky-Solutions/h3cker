import pytest
import uuid
from django.conf import settings
from django.shortcuts import get_object_or_404
from unittest.mock import patch, MagicMock
from django.test import override_settings

from api.models import Video, VideoShare, User
from api.services.video_share_service import VideoShareService


@pytest.fixture
def test_user(db):
    """Create a test user."""
    return User.objects.create_user(
        email="viewer@example.com",
        firebase_uid="viewer_uid123",
        password="testpass123",
        role="user"
    )


@pytest.fixture
def video_uploader(db):
    """Create a test user as video uploader."""
    return User.objects.create_user(
        email="uploader@example.com",
        firebase_uid="uploader_uid123",
        password="testpass123",
        role="company"
    )


@pytest.fixture
def test_video(db, video_uploader):
    """Create a test video."""
    return Video.objects.create(
        title="Test Video",
        description="A test video for service testing",
        category="Testing",
        visibility="public",
        video_url="https://example.com/test_video.mp4",
        thumbnail_url="https://example.com/thumbnail.jpg",
        uploader=video_uploader,
        duration="00:05:30"
    )


@pytest.fixture
def test_share(db, test_video, test_user):
    """Create a test video share."""
    return VideoShare.objects.create(
        video=test_video,
        created_by=test_user,
        active=True,
        access_count=0
    )


@pytest.mark.django_db
class TestVideoShareService:
    """Test suite for VideoShareService."""

    def test_create_share_success(self, test_video, test_user):
        """Test successfully creating a share link."""
        share = VideoShareService.create_share(test_video.id, test_user)
        
        assert share is not None
        assert share.video == test_video
        assert share.created_by == test_user
        assert share.active is True
        assert share.access_count == 0
        assert len(str(share.share_token)) > 0  # UUID generated
        
        # Should be accessible from database
        assert VideoShare.objects.filter(share_token=share.share_token).exists()

    def test_create_share_unauthenticated(self, test_video):
        """Test creating a share link with unauthenticated user."""
        share = VideoShareService.create_share(test_video.id, None)
        
        assert share is None
        
        # No share should be created
        assert VideoShare.objects.filter(video=test_video).count() == 0

    def test_create_share_nonexistent_video(self, test_user):
        """Test creating a share for a non-existent video."""
        with pytest.raises(Video.DoesNotExist):
            VideoShareService.create_share(999, test_user)

    def test_get_share_url_default_frontend(self, test_share, settings):
        """Test getting share URL with default frontend URL."""
        # Ensure settings has a frontend URL
        original_frontend_url = settings.FRONTEND_URL
        settings.FRONTEND_URL = "https://default-frontend.com"
        
        url = VideoShareService.get_share_url(test_share)
        
        assert url == f"https://default-frontend.com/video/{test_share.share_token}"
        
        # Restore settings
        settings.FRONTEND_URL = original_frontend_url

    def test_get_share_url_custom_frontend(self, test_share):
        """Test getting share URL with custom frontend URL."""
        custom_url = "https://custom-frontend.com"
        
        url = VideoShareService.get_share_url(test_share, frontend_url=custom_url)
        
        assert url == f"https://custom-frontend.com/video/{test_share.share_token}"

    def test_increment_access_count(self, test_share):
        """Test incrementing access count for a share."""
        initial_count = test_share.access_count
        
        share, video = VideoShareService.increment_access_count(test_share.share_token)
        
        assert share.access_count == initial_count + 1
        assert video == test_share.video
        
        # Verify database was updated
        test_share.refresh_from_db()
        assert test_share.access_count == initial_count + 1

    def test_increment_access_count_multiple(self, test_share):
        """Test incrementing access count multiple times."""
        # First increment
        VideoShareService.increment_access_count(test_share.share_token)
        
        # Second increment
        share, video = VideoShareService.increment_access_count(test_share.share_token)
        
        assert share.access_count == 2
        
        # Verify database was updated
        test_share.refresh_from_db()
        assert test_share.access_count == 2

    def test_increment_access_count_inactive_share(self, test_share):
        """Test incrementing access count for an inactive share."""
        # Make share inactive
        test_share.active = False
        test_share.save()
        
        with pytest.raises(VideoShare.DoesNotExist):
            VideoShareService.increment_access_count(test_share.share_token)
        
        # Access count should not be incremented
        test_share.refresh_from_db()
        assert test_share.access_count == 0

    def test_increment_access_count_nonexistent_token(self):
        """Test incrementing access count with a non-existent token."""
        with pytest.raises(VideoShare.DoesNotExist):
            VideoShareService.increment_access_count(str(uuid.uuid4()))

    def test_create_share_unauthenticated_mock_user(self, test_video):
        """Test creating a share link with mock unauthenticated user."""
        # Create a mock user who is not authenticated
        mock_user = MagicMock()
        mock_user.is_authenticated = False
        
        share = VideoShareService.create_share(test_video.id, mock_user)
        
        assert share is None
        
        # No share should be created
        assert VideoShare.objects.filter(video=test_video).count() == 0

    def test_get_share_url_with_none_frontend(self, test_share):
        """Test getting share URL with None as frontend_url."""
        # Set a default FRONTEND_URL in settings for this test
        with override_settings(FRONTEND_URL="https://default-frontend.example.com"):
            url = VideoShareService.get_share_url(test_share, frontend_url=None)
            
            expected_url = f"https://default-frontend.example.com/video/{test_share.share_token}"
            assert url == expected_url

    @patch('api.services.video_share_service.get_object_or_404')
    def test_increment_access_count_exception_handling(self, mock_get_object_or_404, test_share):
        """Test exception handling in increment_access_count method."""
        # Setup mock to raise an exception
        mock_get_object_or_404.side_effect = Exception("Database error")
        
        # Should raise the exception (not caught in the method)
        with pytest.raises(Exception):
            VideoShareService.increment_access_count(test_share.share_token)
            
        # Verify get_object_or_404 was called
        mock_get_object_or_404.assert_called_once_with(
            VideoShare, share_token=test_share.share_token, active=True
        )