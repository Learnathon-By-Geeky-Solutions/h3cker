import os
from django.test import override_settings
import pytest
from unittest.mock import patch, MagicMock
from django.contrib.auth import get_user_model
from django.utils import timezone

from api.models import (
    ViewerProfile, Video, User
)
from api.services import PointsService, AzureStorageService

User = get_user_model()

@pytest.fixture
def test_user():
    """Create a test user"""
    return User.objects.create_user(
        email='test@example.com',
        password='testpassword',
        firebase_uid='test_firebase_uid',
        role='user'
    )

@pytest.fixture
def test_video(test_user):
    """Create a test video"""
    return Video.objects.create(
        title='Test Video',
        description='Test video description',
        video_url='https://example.com/video',
        thumbnail_url='https://example.com/thumbnail',
        uploader=test_user,
        visibility='public'
    )

@pytest.mark.django_db
class TestPointsService:
    """Tests for the PointsService class"""
    
    def test_award_points_webcam_upload_new_profile(self, test_user):
        """Test awarding points for webcam upload to a user without an existing profile"""
        ViewerProfile.objects.filter(user=test_user).delete()
        profile, points_awarded = PointsService.award_points_for_webcam_upload(test_user, 15)
        assert profile.user == test_user
        assert profile.points == 15
        assert profile.points_earned == 15
        assert points_awarded == 15
        db_profile = ViewerProfile.objects.get(user=test_user)
        assert db_profile.points == 15
    
    def test_award_points_webcam_upload_existing_profile(self, test_user):
        """Test awarding points for webcam upload to a user with an existing profile"""
        profile = ViewerProfile.objects.create(user=test_user, points=10, points_earned=10)
        updated_profile, points_awarded = PointsService.award_points_for_webcam_upload(test_user, 5)
        assert updated_profile.points == 15
        assert updated_profile.points_earned == 15
        assert points_awarded == 5
        profile.refresh_from_db()
        assert profile.points == 15

    def test_award_points_webcam_upload_default_value(self, test_user):
        """Test awarding points for webcam upload with the default value"""
        profile, points_awarded = PointsService.award_points_for_webcam_upload(test_user)
        assert profile.points == 5 # Default is 5 for webcam upload
        assert points_awarded == 5
    
    def test_calculate_points_value(self, test_user):
        """Test calculating the points value"""
        profile = ViewerProfile.objects.create(
            user=test_user,
            points=20
        )
        
        # Default conversion rate is 10 BDT per point
        value = profile.calculate_points_value()
        assert value == 200  # 20 points * 10 BDT

@pytest.mark.django_db
class TestAzureStorageService:
    """Tests for the AzureStorageService class"""
    
    @override_settings(
        AZURE_STORAGE_ACCOUNT_NAME='testaccount',
        AZURE_STORAGE_ACCOUNT_KEY='testkey',
        AZURE_VIDEO_CONTAINER_NAME='videos',
        AZURE_THUMBNAIL_CONTAINER_NAME='thumbnails',
        AZURE_WEBCAM_CONTAINER_NAME='emotions' 
    )
    def test_get_storage_credentials(self):
        """Test getting storage credentials"""
        credentials = AzureStorageService.get_storage_credentials()
        
        assert credentials['account_name'] == 'testaccount'
        assert credentials['account_key'] == 'testkey'
        assert credentials['video_container'] == 'videos'
        assert credentials['thumbnail_container'] == 'thumbnails'
        assert credentials['emotion_container'] == 'emotions' 
    
    @patch('api.services.generate_blob_sas')
    @patch('api.services.timezone')
    def test_generate_sas_url(self, mock_timezone, mock_generate_blob_sas):
        """Test generating a SAS URL"""
        # Mock the necessary functions
        mock_generate_blob_sas.return_value = 'dummy_sas_token'
        mock_now = MagicMock()
        mock_timezone.now.return_value = mock_now
        
        # Call the method
        url = AzureStorageService.generate_sas_url(
            'testaccount',
            'testcontainer',
            'testblob.mp4',
            'testkey',
            'testpermission',
            1
        )
        
        # Assertions
        assert url == 'https://testaccount.blob.core.windows.net/testcontainer/testblob.mp4?dummy_sas_token'
        mock_generate_blob_sas.assert_called_once_with(
            account_name='testaccount',
            container_name='testcontainer',
            blob_name='testblob.mp4',
            account_key='testkey',
            permission='testpermission',
            expiry=mock_now + mock_timezone.timedelta(hours=1)
        )
    
    @patch.object(AzureStorageService, 'generate_sas_url')
    @patch.object(AzureStorageService, 'get_storage_credentials')
    def test_get_video_urls(self, mock_get_storage_credentials, mock_generate_sas_url):
        """Test getting video URLs"""
        # Mock the necessary methods
        mock_get_storage_credentials.return_value = {
            'account_name': 'testaccount',
            'account_key': 'testkey',
            'video_container': 'videos',
            'thumbnail_container': 'thumbnails'
        }
        mock_generate_sas_url.side_effect = [
            'https://testaccount.blob.core.windows.net/videos/testvideo.mp4?upload_token',
            'https://testaccount.blob.core.windows.net/videos/testvideo.mp4?view_token'
        ]
        
        # Call the method
        upload_url, view_url = AzureStorageService.get_video_urls('testvideo.mp4')
        
        # Assertions
        assert upload_url == 'https://testaccount.blob.core.windows.net/videos/testvideo.mp4?upload_token'
        assert view_url == 'https://testaccount.blob.core.windows.net/videos/testvideo.mp4?view_token'
        
        # Verify the correct calls were made
        assert mock_generate_sas_url.call_count == 2
        
        # First call for upload URL
        mock_generate_sas_url.assert_any_call(
            'testaccount',
            'videos',
            'testvideo.mp4',
            'testkey',
            mock_generate_sas_url.call_args_list[0][0][4],  # Permission object
            1
        )
        
        # Second call for view URL
        mock_generate_sas_url.assert_any_call(
            'testaccount',
            'videos',
            'testvideo.mp4',
            'testkey',
            mock_generate_sas_url.call_args_list[1][0][4],  # Permission object
            24 * 60
        )
    
    @patch.object(AzureStorageService, 'generate_sas_url')
    @patch.object(AzureStorageService, 'get_storage_credentials')
    def test_get_thumbnail_urls(self, mock_get_storage_credentials, mock_generate_sas_url):
        """Test getting thumbnail URLs"""
        # Mock the necessary methods
        mock_get_storage_credentials.return_value = {
            'account_name': 'testaccount',
            'account_key': 'testkey',
            'video_container': 'videos',
            'thumbnail_container': 'thumbnails'
        }
        mock_generate_sas_url.side_effect = [
            'https://testaccount.blob.core.windows.net/thumbnails/thumb_testvideo.jpg?upload_token',
            'https://testaccount.blob.core.windows.net/thumbnails/thumb_testvideo.jpg?view_token'
        ]
        
        # Call the method
        upload_url, view_url = AzureStorageService.get_thumbnail_urls('testvideo.jpg')
        
        # Assertions
        assert upload_url == 'https://testaccount.blob.core.windows.net/thumbnails/thumb_testvideo.jpg?upload_token'
        assert view_url == 'https://testaccount.blob.core.windows.net/thumbnails/thumb_testvideo.jpg?view_token'
        
        # Verify the correct calls were made
        assert mock_generate_sas_url.call_count == 2
        
        # First call for upload URL
        mock_generate_sas_url.assert_any_call(
            'testaccount',
            'thumbnails',
            'thumb_testvideo.jpg',
            'testkey',
            mock_generate_sas_url.call_args_list[0][0][4],  # Permission object
            1
        )
        
        # Second call for view URL
        mock_generate_sas_url.assert_any_call(
            'testaccount',
            'thumbnails',
            'thumb_testvideo.jpg',
            'testkey',
            mock_generate_sas_url.call_args_list[1][0][4], # Permission object
            24 * 60
        )