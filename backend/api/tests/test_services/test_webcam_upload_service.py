import pytest
from unittest.mock import patch, MagicMock

from api.models import User, Video, WebcamRecording
from api.services.webcam_upload_service import WebcamUploadService


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


@pytest.mark.django_db
class TestWebcamUploadService:
    """Test suite for WebcamUploadService."""

    @patch('api.services.azure_storage_service.AzureStorageService.get_emotion_urls')
    def test_prepare_webcam_upload_success(self, mock_get_urls):
        """Test successful preparation of webcam upload."""
        # Mock AzureStorageService.get_emotion_urls to return predefined URLs
        mock_upload_url = "https://example.com/upload_url?token=123"
        mock_view_url = "https://example.com/view_url?token=456"
        mock_get_urls.return_value = (mock_upload_url, mock_view_url)
        
        filename = "test_webcam_recording.webm"
        upload_url, view_url = WebcamUploadService.prepare_webcam_upload(filename)
        
        # Verify the service returned the correct URLs
        assert upload_url == mock_upload_url
        assert view_url == mock_view_url
        
        # Verify AzureStorageService was called with the correct filename
        mock_get_urls.assert_called_once_with(filename)

    @patch('api.services.azure_storage_service.AzureStorageService.get_emotion_urls')
    def test_prepare_webcam_upload_handles_exception(self, mock_get_urls):
        """Test handling of exceptions during preparation of webcam upload."""
        # Mock AzureStorageService.get_emotion_urls to raise an exception
        mock_get_urls.side_effect = Exception("Storage service error")
        
        filename = "test_webcam_recording.webm"
        upload_url, view_url = WebcamUploadService.prepare_webcam_upload(filename)
        
        # Service should handle the exception and return None for both URLs
        assert upload_url is None
        assert view_url is None
        
        # Verify AzureStorageService was called with the correct filename
        mock_get_urls.assert_called_once_with(filename)

    def test_create_webcam_recording_success(self, test_video, test_user):
        """Test successful creation of webcam recording entry."""
        filename = "test_webcam_recording.webm"
        view_url = "https://example.com/view_url?token=456"
        
        recording = WebcamUploadService.create_webcam_recording(
            test_video, test_user, filename, view_url
        )
        
        # Verify the recording was created with correct attributes
        assert recording is not None
        assert recording.video == test_video
        assert recording.recorder == test_user
        assert recording.filename == filename
        assert recording.recording_url == view_url
        assert recording.upload_status == "pending"  # Default status
        
        # Verify recording exists in the database
        assert WebcamRecording.objects.filter(id=recording.id).exists()

    @patch('api.models.WebcamRecording.objects.create')
    def test_create_webcam_recording_handles_exception(self, mock_create, test_video, test_user):
        """Test handling of exceptions during webcam recording creation."""
        # Mock WebcamRecording.objects.create to raise an exception
        mock_create.side_effect = Exception("Database error")
        
        filename = "test_webcam_recording.webm"
        view_url = "https://example.com/view_url?token=456"
        
        recording = WebcamUploadService.create_webcam_recording(
            test_video, test_user, filename, view_url
        )
        
        # Service should handle the exception and return None
        assert recording is None
        
        # Verify WebcamRecording.objects.create was called with the correct parameters
        mock_create.assert_called_once_with(
            video=test_video,
            recorder=test_user,
            filename=filename,
            recording_url=view_url
        )

    def test_end_to_end_recording_creation(self, test_video, test_user):
        """Test the complete flow of creating a webcam recording."""
        # Create a real recording in the database
        filename = "test_webcam_recording.webm"
        view_url = "https://example.com/view_url?token=456"
        
        recording = WebcamRecording.objects.create(
            video=test_video,
            recorder=test_user,
            filename=filename,
            recording_url=view_url
        )
        
        # Verify the recording attributes
        assert recording.video == test_video
        assert recording.recorder == test_user
        assert recording.filename == filename
        assert recording.recording_url == view_url
        
        # Verify recording can be retrieved from the database
        db_recording = WebcamRecording.objects.get(id=recording.id)
        assert db_recording.id == recording.id
        assert db_recording.filename == filename

    @patch('api.models.WebcamRecording.objects.create')
    def test_create_webcam_recording_with_specific_exception(self, mock_create, test_video, test_user):
        """Test specific exception handling in create_webcam_recording."""
        # Mock create to raise a specific exception
        mock_create.side_effect = ValueError("Invalid data format")
        
        filename = "test_webcam_recording.webm"
        view_url = "https://example.com/view_url?token=456"
        
        recording = WebcamUploadService.create_webcam_recording(
            test_video, test_user, filename, view_url
        )
        
        # Service should handle the exception and return None
        assert recording is None
        
        # Verify create was called with the correct parameters
        mock_create.assert_called_once_with(
            video=test_video,
            recorder=test_user,
            filename=filename,
            recording_url=view_url
        )