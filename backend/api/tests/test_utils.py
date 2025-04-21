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
    parse_video_identifier
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


class ParseVideoIdentifierTests(TestCase):
    def test_parse_numeric_identifier(self):
        """Test parsing numeric video ID."""
        is_numeric, value = parse_video_identifier("123")
        self.assertTrue(is_numeric)
        self.assertEqual(value, 123)
        
    def test_parse_uuid_identifier(self):
        """Test parsing UUID video ID."""
        is_numeric, value = parse_video_identifier("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        self.assertFalse(is_numeric)
        self.assertEqual(value, "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
