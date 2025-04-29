import pytest
from unittest.mock import patch, MagicMock
from django.forms import ValidationError

from api.models import User, Video
from api.services.video_upload_service import VideoUploadService


@pytest.fixture
def test_user(db):
    """Create a test user."""
    return User.objects.create_user(
        email="uploader@example.com",
        firebase_uid="uploader_uid123",
        password="testpass123",
        role="company"
    )


@pytest.mark.django_db
class TestVideoUploadService:
    """Test suite for VideoUploadService."""

    @patch('api.services.azure_storage_service.AzureStorageService.get_video_urls')
    @patch('api.services.azure_storage_service.AzureStorageService.get_thumbnail_urls')
    def test_prepare_video_upload_success(self, mock_get_thumbnail_urls, mock_get_video_urls):
        """Test successfully preparing a video upload with SAS URLs."""
        # Mock the Azure storage service responses
        mock_get_video_urls.return_value = (
            "https://example.com/video-upload?sas=token1",
            "https://example.com/video-view?sas=token2"
        )
        mock_get_thumbnail_urls.return_value = (
            "https://example.com/thumbnail-upload?sas=token3",
            "https://example.com/thumbnail-view?sas=token4"
        )
        
        filename = "test_video.mp4"
        
        # Call the service method
        video_upload_url, video_view_url, thumbnail_upload_url, thumbnail_view_url = (
            VideoUploadService.prepare_video_upload(filename)
        )
        
        # Verify the returned URLs
        assert video_upload_url == "https://example.com/video-upload?sas=token1"
        assert video_view_url == "https://example.com/video-view?sas=token2"
        assert thumbnail_upload_url == "https://example.com/thumbnail-upload?sas=token3"
        assert thumbnail_view_url == "https://example.com/thumbnail-view?sas=token4"
        
        # Verify the Azure service methods were called correctly
        mock_get_video_urls.assert_called_once_with(filename)
        mock_get_thumbnail_urls.assert_called_once_with(filename)

    @patch('api.services.azure_storage_service.AzureStorageService.get_video_urls')
    @patch('api.services.azure_storage_service.AzureStorageService.get_thumbnail_urls')
    def test_prepare_video_upload_handles_video_url_exception(self, mock_get_thumbnail_urls, mock_get_video_urls):
        """Test handling exceptions when generating video URLs."""
        # Mock the get_video_urls method to raise an exception
        mock_get_video_urls.side_effect = Exception("Azure storage error")
        
        filename = "test_video.mp4"
        
        # Call the service method
        result = VideoUploadService.prepare_video_upload(filename)
        
        # Verify all URLs are None due to exception
        assert result == (None, None, None, None)
        
        # Verify the Azure service method was called
        mock_get_video_urls.assert_called_once_with(filename)
        # Thumbnail URLs should not be called due to exception in video URLs
        mock_get_thumbnail_urls.assert_not_called()

    @patch('api.services.azure_storage_service.AzureStorageService.get_video_urls')
    @patch('api.services.azure_storage_service.AzureStorageService.get_thumbnail_urls')
    def test_prepare_video_upload_handles_thumbnail_url_exception(self, mock_get_thumbnail_urls, mock_get_video_urls):
        """Test handling exceptions when generating thumbnail URLs."""
        # Mock the get_video_urls method to succeed
        mock_get_video_urls.return_value = (
            "https://example.com/video-upload?sas=token1",
            "https://example.com/video-view?sas=token2"
        )
        # Mock the get_thumbnail_urls method to raise an exception
        mock_get_thumbnail_urls.side_effect = Exception("Azure storage error")
        
        filename = "test_video.mp4"
        
        # Call the service method
        result = VideoUploadService.prepare_video_upload(filename)
        
        # Verify all URLs are None due to exception
        assert result == (None, None, None, None)
        
        # Verify the Azure service methods were called
        mock_get_video_urls.assert_called_once_with(filename)
        mock_get_thumbnail_urls.assert_called_once_with(filename)

    def test_save_video_metadata_success(self, test_user):
        """Test successfully saving video metadata."""
        # Create a mock serializer
        mock_serializer = MagicMock()
        video_view_url = "https://example.com/video-view?sas=token"
        thumbnail_view_url = "https://example.com/thumbnail-view?sas=token"
        
        # Call the service method
        VideoUploadService.save_video_metadata(
            mock_serializer, test_user, video_view_url, thumbnail_view_url
        )
        
        # Verify serializer.save was called with the correct arguments
        mock_serializer.save.assert_called_once_with(
            uploader=test_user,
            video_url=video_view_url,
            thumbnail_url=thumbnail_view_url
        )

    def test_save_video_metadata_handles_exception(self, test_user):
        """Test handling exceptions when saving video metadata."""
        # Create a mock serializer that raises an exception on save
        mock_serializer = MagicMock()
        mock_serializer.save.side_effect = ValidationError("Invalid data")
        
        video_view_url = "https://example.com/video-view?sas=token"
        thumbnail_view_url = "https://example.com/thumbnail-view?sas=token"
        
        # Call the service method
        result = VideoUploadService.save_video_metadata(
            mock_serializer, test_user, video_view_url, thumbnail_view_url
        )
        
        # Verify the result is None due to exception
        assert result is None
        
        # Verify serializer.save was called
        mock_serializer.save.assert_called_once()

    @patch('api.services.azure_storage_service.AzureStorageService.get_video_urls')
    @patch('api.services.azure_storage_service.AzureStorageService.get_thumbnail_urls')
    def test_integration_prepare_and_save(self, mock_get_thumbnail_urls, mock_get_video_urls, test_user):
        """Test the integration of preparing URLs and saving metadata."""
        # Mock the Azure storage service responses
        mock_get_video_urls.return_value = (
            "https://example.com/video-upload?sas=token1",
            "https://example.com/video-view?sas=token2"
        )
        mock_get_thumbnail_urls.return_value = (
            "https://example.com/thumbnail-upload?sas=token3",
            "https://example.com/thumbnail-view?sas=token4"
        )
        
        filename = "test_video.mp4"
        
        # Get the URLs
        video_upload_url, video_view_url, thumbnail_upload_url, thumbnail_view_url = (
            VideoUploadService.prepare_video_upload(filename)
        )
        
        # Create a mock serializer
        mock_serializer = MagicMock()
        
        # Save the metadata
        VideoUploadService.save_video_metadata(
            mock_serializer, test_user, video_view_url, thumbnail_view_url
        )
        
        # Verify the flow worked correctly
        mock_get_video_urls.assert_called_once()
        mock_get_thumbnail_urls.assert_called_once()
        mock_serializer.save.assert_called_once_with(
            uploader=test_user,
            video_url=video_view_url,
            thumbnail_url=thumbnail_view_url
        )