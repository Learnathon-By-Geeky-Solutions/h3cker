import pytest
from django.shortcuts import get_object_or_404
from django.db.models import F
from unittest.mock import patch, MagicMock

from api.models import Video, VideoLike, User
from api.services.video_like_service import VideoLikeService


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
        duration="00:05:30",
        likes=0
    )


@pytest.mark.django_db
class TestVideoLikeService:
    """Test suite for VideoLikeService."""

    def test_toggle_like_unauthenticated(self, test_video):
        """Test toggle like with unauthenticated user."""
        # Should not allow unauthenticated likes
        video, liked, count = VideoLikeService.toggle_like(test_video.id, None)
        
        assert video is None
        assert liked is False
        assert count == 0
        
        # Database should not be modified
        test_video.refresh_from_db()
        assert test_video.likes == 0
        assert VideoLike.objects.filter(video=test_video).count() == 0

    def test_toggle_like_add(self, test_video, test_user):
        """Test adding a like to a video."""
        initial_likes = test_video.likes
        
        # Like the video
        video, liked, count = VideoLikeService.toggle_like(test_video.id, test_user)
        
        assert video.id == test_video.id
        assert liked is True
        assert count == initial_likes + 1
        
        # Verify database was updated
        test_video.refresh_from_db()
        assert test_video.likes == initial_likes + 1
        assert VideoLike.objects.filter(video=test_video, user=test_user).exists()

    def test_toggle_like_remove(self, test_video, test_user):
        """Test removing a like from a video."""
        # First add a like
        like = VideoLike.objects.create(video=test_video, user=test_user)
        test_video.likes = 1
        test_video.save()
        
        # Now unlike
        video, liked, count = VideoLikeService.toggle_like(test_video.id, test_user)
        
        assert video.id == test_video.id
        assert liked is False
        assert count == 0
        
        # Verify database was updated
        test_video.refresh_from_db()
        assert test_video.likes == 0
        assert not VideoLike.objects.filter(video=test_video, user=test_user).exists()

    def test_add_like(self, test_video):
        """Test adding a like directly."""
        like = VideoLike(video=test_video, user=None)  # User doesn't matter for this test
        
        video, liked, count = VideoLikeService.add_like(test_video, like)
        
        assert video.id == test_video.id
        assert liked is True
        assert count == 1
        
        # Verify database was updated
        test_video.refresh_from_db()
        assert test_video.likes == 1

    def test_remove_like(self, test_video, test_user):
        """Test removing a like directly."""
        # Create a like and increment count
        like = VideoLike.objects.create(video=test_video, user=test_user)
        test_video.likes = 1
        test_video.save()
        
        video, liked, count = VideoLikeService.remove_like(test_video, like)
        
        assert video.id == test_video.id
        assert liked is False
        assert count == 0
        
        # Verify database was updated
        test_video.refresh_from_db()
        assert test_video.likes == 0
        assert not VideoLike.objects.filter(id=like.id).exists()

    def test_toggle_like_with_unauthenticated_mock_user(self, test_video):
        """Test toggle like with a mock unauthenticated user object."""
        # Create a mock user who is not authenticated
        mock_user = MagicMock()
        mock_user.is_authenticated = False
        
        # Should not allow unauthenticated likes
        video, liked, count = VideoLikeService.toggle_like(test_video.id, mock_user)
        
        assert video is None
        assert liked is False
        assert count == 0
        
        # Verify database was not modified
        test_video.refresh_from_db()
        assert test_video.likes == 0
        assert VideoLike.objects.filter(video=test_video).count() == 0