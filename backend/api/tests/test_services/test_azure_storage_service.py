import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from azure.storage.blob import BlobSasPermissions

from api.services.azure_storage_service import AzureStorageService


@pytest.fixture
def mock_settings(settings):
    """Setup mock Azure storage settings."""
    settings.AZURE_STORAGE_ACCOUNT_NAME = "teststorageaccount"
    settings.AZURE_STORAGE_ACCOUNT_KEY = "test-key-abc123"
    settings.AZURE_VIDEO_CONTAINER_NAME = "video-container"
    settings.AZURE_THUMBNAIL_CONTAINER_NAME = "thumbnail-container"
    settings.AZURE_WEBCAM_CONTAINER_NAME = "webcam-container"
    return settings


@pytest.mark.django_db
class TestAzureStorageService:
    """Test suite for AzureStorageService."""

    def test_get_storage_credentials(self, mock_settings):
        """Test retrieving storage credentials from settings."""
        credentials = AzureStorageService.get_storage_credentials()
        
        assert credentials["account_name"] == "teststorageaccount"
        assert credentials["account_key"] == "test-key-abc123"
        assert credentials["video_container"] == "video-container"
        assert credentials["thumbnail_container"] == "thumbnail-container"
        assert credentials["emotion_container"] == "webcam-container"

    @patch('api.services.azure_storage_service.generate_blob_sas')
    @patch('api.services.azure_storage_service.timezone')
    def test_generate_sas_url(self, mock_timezone, mock_generate_blob_sas, mock_settings):
        """Test generating a SAS URL for blob storage."""
        # Setup mocks
        mock_now = datetime(2023, 1, 1, 12, 0, 0)
        mock_expiry = datetime(2023, 1, 1, 13, 0, 0)  # 1 hour later
        mock_timezone.now.return_value = mock_now
        mock_timezone.timedelta.return_value = mock_expiry - mock_now
        
        mock_generate_blob_sas.return_value = "sas-token-xyz789"
        
        account_name = "teststorageaccount"
        container_name = "test-container"
        blob_name = "test-blob.mp4"
        account_key = "test-key-abc123"
        permission = BlobSasPermissions(read=True)
        expiry_hours = 1
        
        url = AzureStorageService.generate_sas_url(
            account_name=account_name,
            container_name=container_name,
            blob_name=blob_name,
            account_key=account_key,
            permission=permission,
            expiry_hours=expiry_hours
        )
        
        # Verify URL format
        expected_url = f"https://{account_name}.blob.core.windows.net/{container_name}/{blob_name}?sas-token-xyz789"
        assert url == expected_url
        
        # Verify generate_blob_sas was called with correct parameters
        mock_generate_blob_sas.assert_called_once_with(
            account_name=account_name,
            container_name=container_name,
            blob_name=blob_name,
            account_key=account_key,
            permission=permission,
            expiry=mock_expiry
        )

    @patch('api.services.azure_storage_service.AzureStorageService.generate_sas_url')
    def test_get_video_urls(self, mock_generate_sas_url, mock_settings):
        """Test getting video upload and view URLs."""
        # Setup mock to return different URLs for different permission types
        mock_generate_sas_url.side_effect = [
            "https://teststorageaccount.blob.core.windows.net/video-container/video.mp4?upload-sas-token",
            "https://teststorageaccount.blob.core.windows.net/video-container/video.mp4?view-sas-token"
        ]
        
        filename = "video.mp4"
        upload_url, view_url = AzureStorageService.get_video_urls(filename)
        
        # Verify returned URLs
        assert "upload-sas-token" in upload_url
        assert "view-sas-token" in view_url
        
        # Verify generate_sas_url was called twice with different permissions
        assert mock_generate_sas_url.call_count == 2
        
        # First call should be for upload permission (write=True, create=True)
        upload_call = mock_generate_sas_url.call_args_list[0]
        assert upload_call[0][0] == "teststorageaccount"  # account_name
        assert upload_call[0][1] == "video-container"    # container_name
        assert upload_call[0][2] == filename              # blob_name
        assert upload_call[0][3] == "test-key-abc123"     # account_key
        upload_permission = upload_call[0][4]
        assert upload_permission.write
        assert upload_permission.create
        assert upload_call[0][5] == 1                     # expiry_hours (1 hour for upload)
        
        # Second call should be for view permission (read=True)
        view_call = mock_generate_sas_url.call_args_list[1]
        view_permission = view_call[0][4]
        assert view_permission.read
        assert view_call[0][5] == 24 * 60                 # expiry_hours (24*60 hours for viewing)

    @patch('api.services.azure_storage_service.AzureStorageService.generate_sas_url')
    def test_get_thumbnail_urls(self, mock_generate_sas_url, mock_settings):
        """Test getting thumbnail upload and view URLs."""
        # Setup mock to return different URLs for different permission types
        mock_generate_sas_url.side_effect = [
            "https://teststorageaccount.blob.core.windows.net/thumbnail-container/thumb_image.jpg?upload-sas-token",
            "https://teststorageaccount.blob.core.windows.net/thumbnail-container/thumb_image.jpg?view-sas-token"
        ]
        
        filename = "image.jpg"
        thumbnail_name = f"thumb_{filename}"
        upload_url, view_url = AzureStorageService.get_thumbnail_urls(filename)
        
        # Verify returned URLs
        assert "upload-sas-token" in upload_url
        assert "view-sas-token" in view_url
        
        # Verify generate_sas_url was called twice with different permissions
        assert mock_generate_sas_url.call_count == 2
        
        # First call should be for upload permission
        upload_call = mock_generate_sas_url.call_args_list[0]
        assert upload_call[0][0] == "teststorageaccount"     # account_name
        assert upload_call[0][1] == "thumbnail-container"    # container_name
        assert upload_call[0][2] == thumbnail_name           # blob_name (should have thumb_ prefix)
        
        # Second call should be for view permission
        view_call = mock_generate_sas_url.call_args_list[1]
        assert view_call[0][1] == "thumbnail-container"      # container_name
        assert view_call[0][2] == thumbnail_name             # blob_name (should have thumb_ prefix)

    @patch('api.services.azure_storage_service.AzureStorageService.generate_sas_url')
    def test_get_emotion_urls(self, mock_generate_sas_url, mock_settings):
        """Test getting emotion recording upload and view URLs."""
        # Setup mock to return different URLs for different permission types
        mock_generate_sas_url.side_effect = [
            "https://teststorageaccount.blob.core.windows.net/webcam-container/emotion.webm?upload-sas-token",
            "https://teststorageaccount.blob.core.windows.net/webcam-container/emotion.webm?view-sas-token"
        ]
        
        filename = "emotion.webm"
        upload_url, view_url = AzureStorageService.get_emotion_urls(filename)
        
        # Verify returned URLs
        assert "upload-sas-token" in upload_url
        assert "view-sas-token" in view_url
        
        # Verify generate_sas_url was called twice with different permissions
        assert mock_generate_sas_url.call_count == 2
        
        # First call should be for upload permission
        upload_call = mock_generate_sas_url.call_args_list[0]
        assert upload_call[0][0] == "teststorageaccount"   # account_name
        assert upload_call[0][1] == "webcam-container"     # container_name
        assert upload_call[0][2] == filename               # blob_name
        
        # Second call should be for view permission
        view_call = mock_generate_sas_url.call_args_list[1]
        assert view_call[0][1] == "webcam-container"       # container_name

    @patch('api.services.azure_storage_service.generate_blob_sas')
    def test_integration_with_blob_sas_permissions(self, mock_generate_blob_sas, mock_settings):
        """Test integration with BlobSasPermissions class from Azure SDK."""
        # Setup mock to return a token
        mock_generate_blob_sas.return_value = "mock-sas-token"
        
        # Test that different permission combinations work correctly
        read_permission = BlobSasPermissions(read=True)
        write_permission = BlobSasPermissions(write=True, create=True, add=True)
        
        assert read_permission.read
        assert not read_permission.write
        
        assert write_permission.write
        assert write_permission.create
        assert write_permission.add
        assert not write_permission.read