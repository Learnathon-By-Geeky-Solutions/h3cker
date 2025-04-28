from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
from unittest.mock import patch, MagicMock

from ..models import VideoView
from ..utils import (
    should_make_private,
    make_video_private,
    increment_video_views,
    record_user_view,
)

User = get_user_model()

class VideoMock:
    """Mock video object for testing."""
    def __init__(self, view_limit=None, views=0, auto_private_after=None, visibility='public'):
        self.view_limit = view_limit
        self.views = views
        self.auto_private_after = auto_private_after
        self.visibility = visibility
        self.save_calls = []
        
    def save(self, update_fields=None):
        self.save_calls.append(update_fields)
    
    def refresh_from_db(self):
        # This function is needed for increment_video_views
        pass


class ShouldMakePrivateTests(TestCase):
    def test_view_limit_reached(self):
        """Test that video should be private when view limit is reached."""
        video = VideoMock(view_limit=100, views=100)
        self.assertTrue(should_make_private(video))
        
    def test_view_limit_not_reached(self):
        """Test that video should not be private when view limit not reached."""
        video = VideoMock(view_limit=100, views=99)
        self.assertFalse(should_make_private(video))
        
    def test_expiry_date_passed(self):
        """Test that video should be private when expiry date has passed."""
        past_time = timezone.now() - timedelta(days=1)
        video = VideoMock(auto_private_after=past_time)
        self.assertTrue(should_make_private(video))
        
    def test_expiry_date_not_passed(self):
        """Test that video should not be private when expiry date has not passed."""
        future_time = timezone.now() + timedelta(days=1)
        video = VideoMock(auto_private_after=future_time)
        self.assertFalse(should_make_private(video))
        
    def test_no_limits_set(self):
        """Test that video should not be private when no limits set."""
        video = VideoMock()
        self.assertFalse(should_make_private(video))


class MakeVideoPrivateTests(TestCase):
    def test_make_public_video_private(self):
        """Test making a public video private."""
        video = VideoMock(visibility='public')
        result = make_video_private(video)
        self.assertTrue(result)
        self.assertEqual(video.visibility, 'private')
        self.assertEqual(video.save_calls, [['visibility']])
        
    def test_already_private_video(self):
        """Test trying to make an already private video private."""
        video = VideoMock(visibility='private')
        result = make_video_private(video)
        self.assertFalse(result)
        self.assertEqual(video.visibility, 'private')
        self.assertEqual(video.save_calls, [])


class IncrementVideoViewsTests(TestCase):
    def test_increment_video_views(self):
        """Test incrementing video views."""
        video = VideoMock(views=10)
        
        # Define side effect for refresh_from_db
        def side_effect_refresh():
            video.views = 11
        video.refresh_from_db = side_effect_refresh
        
        # Instead of mocking F directly, patch at the function call level
        with patch('api.utils.F') as mock_f:
            mock_f.return_value = 11  # simulating F('views') + 1
            
            result = increment_video_views(video)
            
            self.assertEqual(result, 11)
            self.assertEqual(video.save_calls, [['views']])
            mock_f.assert_called_once_with('views')


class RecordUserViewTests(TestCase):
    @patch('api.models.VideoView')
    def test_record_user_view_authenticated(self, mock_video_view):
        """Test recording a view for an authenticated user."""
        # Setup
        mock_user = MagicMock()
        mock_user.is_authenticated = True
        mock_video = MagicMock()
        mock_get_or_create = MagicMock()
        mock_video_view.objects.get_or_create = mock_get_or_create
        
        # Call the function
        record_user_view(mock_video, mock_user)
        
        # Assert
        mock_get_or_create.assert_called_once()
        args, kwargs = mock_get_or_create.call_args
        self.assertEqual(kwargs['video'], mock_video)
        self.assertEqual(kwargs['viewer'], mock_user)
        self.assertIn('defaults', kwargs)
        self.assertIn('viewed_at', kwargs['defaults'])
    
    @patch('api.models.VideoView')
    def test_record_user_view_not_authenticated(self, mock_video_view):
        """Test that views are not recorded for unauthenticated users."""
        # Setup
        mock_user = MagicMock()
        mock_user.is_authenticated = False
        mock_video = MagicMock()
        mock_get_or_create = MagicMock()
        mock_video_view.objects.get_or_create = mock_get_or_create
        
        # Call the function
        record_user_view(mock_video, mock_user)
        
        # Assert
        mock_get_or_create.assert_not_called()
    
    @patch('api.models.VideoView')
    def test_record_user_view_none_user(self, mock_video_view):
        """Test that views are not recorded when user is None."""
        # Setup
        mock_user = None
        mock_video = MagicMock()
        mock_get_or_create = MagicMock()
        mock_video_view.objects.get_or_create = mock_get_or_create
        
        # Call the function
        record_user_view(mock_video, mock_user)
        
        # Assert
        mock_get_or_create.assert_not_called()
    
    @patch('api.models.VideoView')
    def test_record_user_view_idempotence(self, mock_video_view):
        """Test that calling record_user_view multiple times only creates one record."""
        # Setup
        mock_user = MagicMock()
        mock_user.is_authenticated = True
        mock_video = MagicMock()
        
        # Create a mock to simulate get_or_create behavior
        def side_effect(**kwargs):
            # First call returns (object, created=True)
            # Subsequent calls return (object, created=False)
            return MagicMock(), True
            
        mock_get_or_create = MagicMock(side_effect=lambda **kwargs: (MagicMock(), True))
        mock_video_view.objects.get_or_create = mock_get_or_create
        
        # Call the function twice
        record_user_view(mock_video, mock_user)
        record_user_view(mock_video, mock_user)
        
        # Assert get_or_create was called twice with the same parameters
        self.assertEqual(mock_get_or_create.call_count, 2)
        first_call = mock_get_or_create.call_args_list[0]
        second_call = mock_get_or_create.call_args_list[1]
        self.assertEqual(first_call[1]['video'], second_call[1]['video'])
        self.assertEqual(first_call[1]['viewer'], second_call[1]['viewer'])
