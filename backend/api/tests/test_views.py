import pytest
from unittest.mock import patch, MagicMock
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from api.models import User, ViewerProfile, Video  # Added Video import

@pytest.fixture
def api_client():
    """Fixture to provide an API client instance."""
    return APIClient()

@pytest.fixture
def test_user(db):
    """Fixture to create a regular user."""
    user = User.objects.create_user(
        email="test@example.com",
        firebase_uid="testuid123",
        password="testpassword",
        role="user"
    )
    return user

@pytest.fixture
def authenticated_client(api_client, test_user):
    """Fixture to provide an authenticated API client."""
    api_client.force_authenticate(user=test_user)
    return api_client

@pytest.mark.django_db
class TestTestAuthView:
    def test_auth_test_authenticated(self, authenticated_client):
        """Test that authenticated users can access the auth-test endpoint."""
        url = reverse('auth-test')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data == {
            "success": True,
            "message": "Authentication successful!",
        }

    def test_auth_test_unauthenticated(self, api_client):
        """Test that unauthenticated users receive a 403 Forbidden."""
        url = reverse('auth-test')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.django_db
class TestSetFirebaseTokenView:
    @patch('firebase_admin.auth.verify_id_token')
    @patch('api.views.login')  # Fixed login mock path
    def test_set_token_valid_existing_user(self, mock_login, mock_verify_id_token, api_client, test_user):
        """Test setting a valid token for an existing user."""
        mock_verify_id_token.return_value = {'uid': test_user.firebase_uid}
        url = reverse('set-token')
        data = {'token': 'valid_firebase_token'}
        response = api_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {
            "success": True,
            "message": "Authenticated successfully. You can now use the API browser.",
        }
        mock_verify_id_token.assert_called_once_with('valid_firebase_token')
        mock_login.assert_called_once()
        # Check that the correct user was passed to login
        args, kwargs = mock_login.call_args
        assert args[1] == test_user # args[0] is the request object

    @patch('firebase_admin.auth.verify_id_token')
    @patch('django.contrib.auth.login')
    def test_set_token_valid_user_not_in_db(self, mock_login, mock_verify_id_token, api_client):
        """Test setting a valid token for a user not yet in the Django DB."""
        mock_verify_id_token.return_value = {'uid': 'nonexistentuid'}
        url = reverse('set-token')
        data = {'token': 'valid_firebase_token_new_user'}
        response = api_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data == {"error": "User not found in Django database"}
        mock_verify_id_token.assert_called_once_with('valid_firebase_token_new_user')
        mock_login.assert_not_called()

    @patch('firebase_admin.auth.verify_id_token')
    @patch('django.contrib.auth.login')
    def test_set_token_invalid_token(self, mock_login, mock_verify_id_token, api_client):
        """Test setting an invalid Firebase token."""
        mock_verify_id_token.side_effect = Exception("Invalid token error")
        url = reverse('set-token')
        data = {'token': 'invalid_firebase_token'}
        response = api_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid token:" in response.data['error']
        mock_verify_id_token.assert_called_once_with('invalid_firebase_token')
        mock_login.assert_not_called()

    def test_set_token_missing_token(self, api_client):
        """Test request without providing a token."""
        url = reverse('set-token')
        data = {} # Missing 'token' field
        response = api_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'token' in response.data
        assert response.data['token'][0] == 'This field is required.'

@pytest.mark.django_db
class TestOnboardingAPIView:
    def test_onboarding_update_success(self, authenticated_client, test_user):
        """Test successfully updating the viewer profile via onboarding."""
        url = reverse('onboarding')
        data = {
            "birthday": "1995-05-15",
            "gender": "Female",
            "country": "Canada",
            "city": "Toronto",
            "education_level": "Master's",
            "occupation": "Developer",
            "content_preferences": ["Tech", "Gaming"]
        }
        response = authenticated_client.put(url, data, format='json') # Use PUT or PATCH as appropriate for UpdateAPIView

        assert response.status_code == status.HTTP_200_OK
        # Refresh the profile from DB to check changes
        viewer_profile = ViewerProfile.objects.get(user=test_user)
        assert viewer_profile.birthday.strftime('%Y-%m-%d') == "1995-05-15"
        assert viewer_profile.gender == "Female"
        assert viewer_profile.country == "Canada"
        assert viewer_profile.city == "Toronto"
        assert viewer_profile.education_level == "Master's"
        assert viewer_profile.occupation == "Developer"
        assert viewer_profile.content_preferences == ["Tech", "Gaming"]
        assert viewer_profile.onboarding_completed is True # Check if flag is set

    def test_onboarding_update_partial_success(self, authenticated_client, test_user):
        """Test partially updating the viewer profile."""
        # Ensure profile exists
        ViewerProfile.objects.get_or_create(user=test_user, defaults={'country': 'Initial Country'})
        url = reverse('onboarding')
        data = {
            "city": "Vancouver",
            "occupation": "Designer"
        }
        response = authenticated_client.patch(url, data, format='json') # Use PATCH for partial updates

        assert response.status_code == status.HTTP_200_OK
        viewer_profile = ViewerProfile.objects.get(user=test_user)
        assert viewer_profile.city == "Vancouver"
        assert viewer_profile.occupation == "Designer"
        assert viewer_profile.country == "Initial Country" # Check that other fields are unchanged
        assert viewer_profile.onboarding_completed is True # Flag should still be set

    def test_onboarding_update_invalid_data(self, authenticated_client):
        """Test updating with invalid data (e.g., invalid date format)."""
        url = reverse('onboarding')
        data = {"birthday": "invalid-date-format"}
        response = authenticated_client.put(url, data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'birthday' in response.data # Check for error message on the field

    def test_onboarding_unauthenticated(self, api_client):
        """Test accessing onboarding endpoint without authentication."""
        url = reverse('onboarding')
        data = {"country": "USA"}
        response = api_client.put(url, data, format='json')

        assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.fixture
def test_video(db, test_user):
    """Fixture to create a test video."""
    video = Video.objects.create(
        title="Test Video Feed",
        description="A video for testing the feed.",
        category="Testing",
        visibility="public",
        video_url="https://example.com/feed_video",
        thumbnail_url="https://example.com/feed_thumb",
        uploader=test_user,
        duration="05:00"
    )
    return video

@pytest.mark.django_db
class TestVideoFeedView:
    def test_video_feed_list(self, api_client, test_video):
        """Test retrieving the list of videos for the feed."""
        # Create another video to ensure list handling works
        Video.objects.create(
            title="Another Video",
            video_url="https://example.com/another_video",
            uploader=test_video.uploader
        )
        url = reverse('video-feed')
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2 # Check if both videos are returned
        # Check structure of one item (using VideoFeedSerializer fields)
        first_video_data = response.data[0] if response.data[0]['id'] == test_video.id else response.data[1]
        assert first_video_data['id'] == test_video.id
        assert first_video_data['title'] == test_video.title
        assert first_video_data['thumbnail_url'] == test_video.thumbnail_url
        assert 'upload_date' in first_video_data
        assert 'uploader' in first_video_data
        assert first_video_data['uploader']['id'] == test_video.uploader.id
        assert first_video_data['views'] == test_video.views
        assert first_video_data['likes'] == test_video.likes
        assert first_video_data['duration'] == test_video.duration

    def test_video_feed_empty(self, api_client):
        """Test retrieving the feed when there are no videos."""
        url = reverse('video-feed')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0

@pytest.mark.django_db
class TestVideoDetailView:
    def test_video_detail_retrieve(self, api_client, test_video):
        """Test retrieving the details of a specific video."""
        url = reverse('video-detail', kwargs={'pk': test_video.pk})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Check structure (using VideoDetailSerializer fields)
        assert response.data['id'] == test_video.id
        assert response.data['title'] == test_video.title
        assert response.data['description'] == test_video.description
        assert response.data['category'] == test_video.category
        assert response.data['visibility'] == test_video.visibility
        assert response.data['video_url'] == test_video.video_url
        assert response.data['thumbnail_url'] == test_video.thumbnail_url
        assert 'upload_date' in response.data
        assert 'uploader' in response.data
        assert response.data['uploader']['id'] == test_video.uploader.id
        assert response.data['views'] == test_video.views
        assert response.data['likes'] == test_video.likes
        assert response.data['duration'] == test_video.duration

    def test_video_detail_not_found(self, api_client):
        """Test retrieving a video that does not exist."""
        url = reverse('video-detail', kwargs={'pk': 999}) # Non-existent ID
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.django_db
@patch.dict('os.environ', {
    'AZURE_STORAGE_ACCOUNT_NAME': 'testaccount',
    'AZURE_STORAGE_ACCOUNT_KEY': 'testkey',
    'AZURE_VIDEO_CONTAINER_NAME': 'videos',
    'AZURE_THUMBNAIL_CONTAINER_NAME': 'thumbnails',
})
@patch('api.views.generate_blob_sas')
class TestUploadVideoView:

    def test_upload_video_success(self, mock_generate_sas, authenticated_client, test_user):
        """Test successful video upload metadata creation and SAS URL generation."""
        # Mock generate_blob_sas to return predictable SAS tokens
        mock_generate_sas.side_effect = [
            'videosastoken_write',   # Video upload SAS
            'videosastoken_read',    # Video view SAS
            'thumbsastoken_write', # Thumbnail upload SAS
            'thumbsastoken_read',  # Thumbnail view SAS
        ]

        url = reverse('upload-video')
        data = {
            "filename": "my_cool_video.mp4",
            "title": "My Cool Video",
            "description": "A description of coolness.",
            "category": "Coolness",
            "visibility": "public",
            # Other fields are read-only or set by the view
        }
        response = authenticated_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert "video_upload_url" in response.data
        assert "thumbnail_upload_url" in response.data
        assert "message" in response.data

        # Check the generated URLs in the response
        assert response.data['video_upload_url'] == "https://testaccount.blob.core.windows.net/videos/my_cool_video.mp4?videosastoken_write"
        assert response.data['thumbnail_upload_url'] == "https://testaccount.blob.core.windows.net/thumbnails/thumb_my_cool_video.mp4?thumbsastoken_write"

        # Verify a Video object was created in the database
        video = Video.objects.first()
        assert video is not None
        assert video.title == "My Cool Video"
        assert video.uploader == test_user
        assert video.video_url == "https://testaccount.blob.core.windows.net/videos/my_cool_video.mp4?videosastoken_read"
        assert video.thumbnail_url == "https://testaccount.blob.core.windows.net/thumbnails/thumb_my_cool_video.mp4?thumbsastoken_read"

        # Verify generate_blob_sas was called correctly (simplified check)
        assert mock_generate_sas.call_count == 4

    def test_upload_video_missing_filename(self, mock_generate_sas, authenticated_client):
        """Test upload request without the required filename."""
        url = reverse('upload-video')
        data = {
            "title": "Video Without Filename",
            # Missing "filename"
        }
        response = authenticated_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data == {"error": "Filename is required"}
        mock_generate_sas.assert_not_called() # SAS generation shouldn't happen

    def test_upload_video_invalid_serializer_data(self, mock_generate_sas, authenticated_client):
        """Test upload request with invalid data for the serializer."""
        url = reverse('upload-video')
        data = {
            "filename": "invalid_data.mp4",
            "title": "Valid Title",
            "visibility": "invalid_choice" # Invalid visibility choice
        }
        response = authenticated_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'visibility' in response.data # Check for serializer error
        mock_generate_sas.assert_not_called()

    def test_upload_video_unauthenticated(self, mock_generate_sas, api_client):
        """Test accessing upload endpoint without authentication."""
        url = reverse('upload-video')
        data = {"filename": "unauth_video.mp4", "title": "Unauth Title"}
        response = api_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_generate_sas.assert_not_called()

    def test_upload_video_sas_generation_failure(self, mock_generate_sas, authenticated_client):
        """Test scenario where SAS token generation fails."""
        mock_generate_sas.side_effect = Exception("Azure Error") # Simulate failure

        url = reverse('upload-video')
        data = {
            "filename": "fail_video.mp4",
            "title": "Video That Fails",
        }
        response = authenticated_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to generate SAS tokens" in response.data['error']
        assert Video.objects.count() == 0 # Ensure no video object was created
