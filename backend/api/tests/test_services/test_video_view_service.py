import pytest
from unittest.mock import patch, MagicMock
from django.utils import timezone
from datetime import timedelta

from api.models import Video, VideoView, User
from api.services.video_view_service import VideoViewService


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
def private_video(db, video_uploader):
    """Create a private test video."""
    return Video.objects.create(
        title="Private Test Video",
        description="A private test video",
        category="Testing",
        visibility="private",
        video_url="https://example.com/private_video.mp4",
        thumbnail_url="https://example.com/private_thumbnail.jpg",
        uploader=video_uploader,
        duration="00:03:45"
    )


@pytest.fixture
def limited_video(db, video_uploader):
    """Create a video with view limit."""
    return Video.objects.create(
        title="Limited Video",
        description="A video with view limit",
        category="Testing",
        visibility="public",
        video_url="https://example.com/limited_video.mp4",
        thumbnail_url="https://example.com/limited_thumbnail.jpg",
        uploader=video_uploader,
        duration="00:02:15",
        view_limit=5,
        views=4  # Just below the limit
    )


@pytest.fixture
def expiring_video(db, video_uploader):
    """Create a video with expiry time."""
    return Video.objects.create(
        title="Expiring Video",
        description="A video with expiry time",
        category="Testing",
        visibility="public",
        video_url="https://example.com/expiring_video.mp4",
        thumbnail_url="https://example.com/expiring_thumbnail.jpg",
        uploader=video_uploader,
        duration="00:04:20",
        auto_private_after=timezone.now() - timedelta(hours=1)  # Already expired
    )


@pytest.mark.django_db
class TestVideoViewService:
    """Test suite for VideoViewService."""

    def test_record_view_success(self, test_video, test_user):
        """Test successfully recording a view."""
        initial_views = test_video.views
        
        video, view_count, privacy_changed = VideoViewService.record_view(test_video.id, test_user)
        
        assert view_count == initial_views + 1
        assert privacy_changed is False
        
        # Verify a view record was created
        assert VideoView.objects.filter(video=test_video, viewer=test_user).exists()

    def test_record_view_anonymous(self, test_video):
        """Test recording a view without a user."""
        initial_views = test_video.views
        
        video, view_count, privacy_changed = VideoViewService.record_view(test_video.id)
        
        assert view_count == initial_views + 1
        assert privacy_changed is False
        
        # No view record should be created for anonymous users
        assert VideoView.objects.filter(video=test_video).count() == 0

    def test_record_view_private_video(self, private_video, test_user):
        """Test attempting to view a private video as non-owner."""
        video, view_count, privacy_changed = VideoViewService.record_view(private_video.id, test_user)
        
        assert view_count is None  # Should not increment for private videos
        assert privacy_changed is False
        
        # No view record should be created
        assert not VideoView.objects.filter(video=private_video, viewer=test_user).exists()

    def test_record_view_private_video_as_owner(self, private_video, video_uploader):
        """Test viewing a private video as the owner."""
        initial_views = private_video.views
        
        video, view_count, privacy_changed = VideoViewService.record_view(private_video.id, video_uploader)
        
        assert view_count == initial_views + 1
        assert privacy_changed is False
        
        # View record should be created for the owner
        assert VideoView.objects.filter(video=private_video, viewer=video_uploader).exists()

    def test_record_view_reaching_limit(self, limited_video, test_user):
        """Test a video reaching its view limit and becoming private."""
        video, view_count, privacy_changed = VideoViewService.record_view(limited_video.id, test_user)
        
        assert view_count == limited_video.view_limit  # Should reach limit
        assert privacy_changed is True
        
        # Video should be private now
        limited_video.refresh_from_db()
        assert limited_video.visibility == "private"

    def test_record_view_expired_video(self, expiring_video, test_user):
        """Test a video that has reached its expiry time."""
        video, view_count, privacy_changed = VideoViewService.record_view(expiring_video.id, test_user)
        
        assert privacy_changed is True
        
        # Video should be private now
        expiring_video.refresh_from_db()
        assert expiring_video.visibility == "private"

    def test_increment_video_views(self, test_video):
        """Test incrementing video views."""
        initial_views = test_video.views
        
        new_count = VideoViewService.increment_video_views(test_video)
        
        assert new_count == initial_views + 1
        
        # Verify database was updated
        test_video.refresh_from_db()
        assert test_video.views == initial_views + 1

    def test_record_user_view_authenticated(self, test_video, test_user):
        """Test recording a user view for authenticated user."""
        VideoViewService.record_user_view(test_video, test_user)
        
        # View should be recorded
        assert VideoView.objects.filter(video=test_video, viewer=test_user).exists()
        
        # Recording again shouldn't create duplicate
        VideoViewService.record_user_view(test_video, test_user)
        assert VideoView.objects.filter(video=test_video, viewer=test_user).count() == 1

    def test_record_user_view_unauthenticated(self, test_video):
        """Test recording a user view for unauthenticated user."""
        VideoViewService.record_user_view(test_video, None)
        
        # No view should be recorded
        assert VideoView.objects.filter(video=test_video).count() == 0

    def test_should_make_private_view_limit(self, limited_video):
        """Test should_make_private for a video reaching view limit."""
        # First it shouldn't be private
        assert not VideoViewService.should_make_private(limited_video)
        
        # Increase views to reach limit
        limited_video.views = limited_video.view_limit
        limited_video.save()
        
        # Now it should be private
        assert VideoViewService.should_make_private(limited_video)

    def test_should_make_private_expiry(self, expiring_video):
        """Test should_make_private for a video past expiry time."""
        # Should be private because it's already expired
        assert VideoViewService.should_make_private(expiring_video)
        
        # Set expiry to future
        expiring_video.auto_private_after = timezone.now() + timedelta(days=1)
        expiring_video.save()
        
        # Now it shouldn't be private
        assert not VideoViewService.should_make_private(expiring_video)

    def test_make_video_private(self, test_video):
        """Test making a video private."""
        # Initially public
        assert test_video.visibility == "public"
        
        result = VideoViewService.make_video_private(test_video)
        
        # Should return True when privacy changed
        assert result is True
        
        # Verify video is now private
        test_video.refresh_from_db()
        assert test_video.visibility == "private"
        
        # Calling again should return False (no change)
        result = VideoViewService.make_video_private(test_video)
        assert result is False

    @patch('api.services.video_view_service.get_object_or_404')
    def test_record_view_nonexistent_video(self, mock_get_object_or_404, test_user):
        """Test recording a view for a non-existent video."""
        # Mock get_object_or_404 to raise a DoesNotExist exception
        mock_get_object_or_404.side_effect = Video.DoesNotExist("Video not found")
        
        # Should re-raise the exception
        with pytest.raises(Video.DoesNotExist):
            VideoViewService.record_view(999, test_user)
        
        # Verify get_object_or_404 was called with correct arguments
        mock_get_object_or_404.assert_called_once_with(Video, id=999)

    @patch('api.services.video_view_service.VideoViewService.increment_video_views')
    def test_record_view_with_db_error(self, mock_increment_views, test_video, test_user):
        """Test handling database error during view recording."""
        # Mock increment_video_views to raise an exception
        mock_increment_views.side_effect = Exception("Database error")
        
        # Should not raise exception outside the method
        with pytest.raises(Exception):
            VideoViewService.record_view(test_video.id, test_user)
        
        # Verify increment_video_views was called
        mock_increment_views.assert_called_once_with(test_video)

    def test_record_view_with_unauthenticated_user(self, test_video):
        """Test recording a view with an unauthenticated user."""
        # Create a user who is not authenticated
        unauthenticated_user = MagicMock()
        unauthenticated_user.is_authenticated = False
        
        # Record view should still work but not create a VideoView entry
        video, new_count, privacy_changed = VideoViewService.record_view(test_video.id, unauthenticated_user)
        
        assert video == test_video
        assert new_count > 0
        assert privacy_changed is False
        
        # No VideoView should be created
        assert VideoView.objects.filter(video=test_video).count() == 0

    def test_record_user_view_existing(self, test_video, test_user):
        """Test recording a view when one already exists."""
        # First create a view
        initial_view = VideoView.objects.create(
            video=test_video,
            viewer=test_user,
            viewed_at=timezone.now() - timedelta(days=1)  # Viewed yesterday
        )
        
        # Record another view
        VideoViewService.record_user_view(test_video, test_user)
        
        # Should not create a new record, but update the existing one
        assert VideoView.objects.filter(video=test_video, viewer=test_user).count() == 1
        
        # Check viewed_at was updated
        updated_view = VideoView.objects.get(id=initial_view.id)
        assert updated_view.viewed_at > initial_view.viewed_at

    @patch('api.services.video_view_service.VideoViewService.should_make_private')
    @patch('api.services.video_view_service.VideoViewService.make_video_private')
    def test_record_view_privacy_check_error(self, mock_make_private, mock_should_private, test_video, test_user):
        """Test handling errors during privacy checking in record_view."""
        # Mock should_make_private to raise an exception
        mock_should_private.side_effect = Exception("Privacy check error")
        
        # Should raise the exception
        with pytest.raises(Exception):
            VideoViewService.record_view(test_video.id, test_user)
            
        # Verify should_make_private was called
        mock_should_private.assert_called_once_with(test_video)
        
        # make_video_private should not be called due to exception
        mock_make_private.assert_not_called()

    def test_record_view_with_both_limits(self, db, video_uploader):
        """Test recording a view for a video with both view limit and expiry time."""
        # Create video with both limits
        video = Video.objects.create(
            title="Dual Limited Video",
            description="A video with both limit types",
            category="Testing",
            visibility="public",
            video_url="https://example.com/dual_limited.mp4",
            thumbnail_url="https://example.com/dual_thumbnail.jpg",
            uploader=video_uploader,
            duration="00:01:30",
            view_limit=10,
            views=9,  # One view away from limit
            auto_private_after=timezone.now() - timedelta(minutes=5)  # Already expired
        )
        
        # Record view should make it private due to one of the limits
        _, _, privacy_changed = VideoViewService.record_view(video.id, None)
        
        assert privacy_changed is True
        
        # Verify video is now private
        video.refresh_from_db()
        assert video.visibility == "private"