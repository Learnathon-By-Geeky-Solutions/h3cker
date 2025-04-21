import pytest
from unittest.mock import patch, MagicMock
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from api.models import User, ViewerProfile, Video, VideoView, VideoLike, VideoShare
import uuid
from django.utils import timezone

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

@pytest.fixture
def test_video_private(db, test_user):
    """Fixture to create a private test video."""
    video = Video.objects.create(
        title="Private Test Video",
        description="A private video for testing.",
        category="Testing",
        visibility="private",
        video_url="https://example.com/private_video",
        thumbnail_url="https://example.com/private_thumb",
        uploader=test_user,
        duration="03:00"
    )
    return video

@pytest.fixture
def test_video_view(db, test_user, test_video):
    """Fixture to create a video view record."""
    view = VideoView.objects.create(
        video=test_video,
        viewer=test_user,
        viewed_at=timezone.now()
    )
    return view

@pytest.fixture
def test_video_like(db, test_user, test_video):
    """Fixture to create a video like record."""
    # First increment the video's likes counter
    test_video.likes = 1
    test_video.save()
    
    # Then create the like record
    like = VideoLike.objects.create(
        video=test_video,
        user=test_user,
        liked_at=timezone.now()
    )
    return like

@pytest.fixture
def test_video_share(db, test_user, test_video):
    """Fixture to create a video share record."""
    share_token = str(uuid.uuid4())
    share = VideoShare.objects.create(
        video=test_video,
        created_by=test_user,
        share_token=share_token,
        active=True
    )
    return share

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
    @patch('api.views.login')
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
        args, kwargs = mock_login.call_args
        assert args[1] == test_user

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
        data = {}
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
        response = authenticated_client.put(url, data, format='json')

        assert response.status_code == status.HTTP_200_OK
        viewer_profile = ViewerProfile.objects.get(user=test_user)
        assert viewer_profile.birthday.strftime('%Y-%m-%d') == "1995-05-15"
        assert viewer_profile.gender == "Female"
        assert viewer_profile.country == "Canada"
        assert viewer_profile.city == "Toronto"
        assert viewer_profile.education_level == "Master's"
        assert viewer_profile.occupation == "Developer"
        assert viewer_profile.content_preferences == ["Tech", "Gaming"]
        assert viewer_profile.onboarding_completed is True

    def test_onboarding_update_partial_success(self, authenticated_client, test_user):
        """Test partially updating the viewer profile."""
        ViewerProfile.objects.get_or_create(user=test_user, defaults={'country': 'Initial Country'})
        url = reverse('onboarding')
        data = {
            "city": "Vancouver",
            "occupation": "Designer"
        }
        response = authenticated_client.patch(url, data, format='json')

        assert response.status_code == status.HTTP_200_OK
        viewer_profile = ViewerProfile.objects.get(user=test_user)
        assert viewer_profile.city == "Vancouver"
        assert viewer_profile.occupation == "Designer"
        assert viewer_profile.country == "Initial Country"
        assert viewer_profile.onboarding_completed is True

    def test_onboarding_update_invalid_data(self, authenticated_client):
        """Test updating with invalid data (e.g., invalid date format)."""
        url = reverse('onboarding')
        data = {"birthday": "invalid-date-format"}
        response = authenticated_client.put(url, data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'birthday' in response.data

    def test_onboarding_unauthenticated(self, api_client):
        """Test accessing onboarding endpoint without authentication."""
        url = reverse('onboarding')
        data = {"country": "USA"}
        response = api_client.put(url, data, format='json')

        assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.django_db
class TestVideoFeedView:
    def test_video_feed_list(self, api_client, test_video):
        """Test retrieving the list of videos for the feed."""
        Video.objects.create(
            title="Another Video",
            video_url="https://example.com/another_video",
            uploader=test_video.uploader
        )
        url = reverse('video-feed')
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
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
        url = reverse('video-detail', kwargs={'video_identifier': test_video.pk})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
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
        url = reverse('video-detail', kwargs={'video_identifier': 999})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_video_detail_by_share_token(self, api_client, test_video_share):
        """Test retrieving a video using a share token."""
        url = reverse('video-detail', kwargs={'video_identifier': test_video_share.share_token})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == test_video_share.video.id
        assert response.data['title'] == test_video_share.video.title

        test_video_share.refresh_from_db()
        assert test_video_share.access_count == 1

    def test_video_detail_invalid_uuid(self, api_client):
        """Test retrieving a video with an invalid UUID format."""
        url = reverse('video-detail', kwargs={'video_identifier': 'not-a-valid-uuid'})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Invalid video identifier format" in response.data['error']

    def test_video_detail_nonexistent_share_token(self, api_client):
        """Test retrieving a video with a non-existent share token."""
        url = reverse('video-detail', kwargs={'video_identifier': str(uuid.uuid4())})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @patch('api.views.should_make_private')
    @patch('api.views.make_video_private')
    def test_video_detail_should_make_private(self, mock_make_private, mock_should_make_private, api_client, test_video):
        """Test when a video should be made private."""
        mock_should_make_private.return_value = True
        mock_make_private.return_value = True

        url = reverse('video-detail', kwargs={'video_identifier': test_video.pk})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data == {"error": "This video is no longer available"}
        mock_should_make_private.assert_called_once_with(test_video)
        mock_make_private.assert_called_once_with(test_video)

    def test_video_detail_already_private(self, api_client, test_video_private):
        """Test retrieving a video that is already private."""
        url = reverse('video-detail', kwargs={'video_identifier': test_video_private.pk})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data == {"error": "This video is no longer available"}

@pytest.mark.django_db
class TestRecordVideoViewAPI:
    @patch('api.views.record_user_view')
    @patch('api.views.increment_video_views')
    def test_record_view_success(self, mock_increment_views, mock_record_user_view, api_client, test_video):
        """Test successfully recording a video view."""
        mock_increment_views.return_value = 42

        url = reverse('record-video-view', kwargs={'video_id': test_video.pk})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['views'] == 42
        assert response.data['privacy_changed'] is False
        mock_record_user_view.assert_called_once()
        mock_increment_views.assert_called_once_with(test_video)

    def test_record_view_video_not_found(self, api_client):
        """Test recording a view for a non-existent video."""
        url = reverse('record-video-view', kwargs={'video_id': 9999})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_record_view_private_video(self, api_client, test_video_private):
        """Test recording a view for a private video."""
        url = reverse('record-video-view', kwargs={'video_id': test_video_private.pk})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data == {"error": "Video is private"}

    @patch('api.views.record_user_view')
    @patch('api.views.increment_video_views')
    @patch('api.views.should_make_private')
    @patch('api.views.make_video_private')
    def test_record_view_makes_private(self, mock_make_private, mock_should_private, 
                                      mock_increment_views, mock_record_user_view, 
                                      api_client, test_video):
        """Test recording a view that triggers making the video private."""
        mock_increment_views.return_value = 100
        mock_should_private.return_value = True
        mock_make_private.return_value = True

        url = reverse('record-video-view', kwargs={'video_id': test_video.pk})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['views'] == 100
        assert response.data['privacy_changed'] is True
        mock_should_private.assert_called_once_with(test_video)
        mock_make_private.assert_called_once_with(test_video)

@pytest.mark.django_db
class TestToggleVideoLikeAPI:
    def test_toggle_like_create(self, authenticated_client, test_user, test_video):
        """Test creating a new like for a video."""
        url = reverse('toggle-video-like', kwargs={'video_id': test_video.pk})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['liked'] is True
        assert response.data['likes'] == 1

        like_exists = VideoLike.objects.filter(video=test_video, user=test_user).exists()
        assert like_exists is True

        test_video.refresh_from_db()
        assert test_video.likes == 1

    def test_toggle_like_delete(self, authenticated_client, test_user, test_video_like):
        """Test removing an existing like from a video."""
        url = reverse('toggle-video-like', kwargs={'video_id': test_video_like.video.pk})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['liked'] is False
        assert response.data['likes'] == 0

        like_exists = VideoLike.objects.filter(video=test_video_like.video, user=test_user).exists()
        assert like_exists is False

        test_video_like.video.refresh_from_db()
        assert test_video_like.video.likes == 0

    def test_toggle_like_unauthenticated(self, api_client, test_video):
        """Test that unauthenticated users cannot like videos."""
        url = reverse('toggle-video-like', kwargs={'video_id': test_video.pk})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_toggle_like_nonexistent_video(self, authenticated_client):
        """Test liking a non-existent video."""
        url = reverse('toggle-video-like', kwargs={'video_id': 9999})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.django_db
class TestCreateVideoShareAPI:
    def test_create_share_success(self, authenticated_client, test_user, test_video):
        """Test successfully creating a share link for a video."""
        url = reverse('create-video-share', kwargs={'video_id': test_video.pk})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'share_token' in response.data
        assert 'share_url' in response.data
        assert 'created_at' in response.data

        share = VideoShare.objects.get(share_token=response.data['share_token'])
        assert share.video == test_video
        assert share.created_by == test_user

    def test_create_share_unauthenticated(self, api_client, test_video):
        """Test that unauthenticated users cannot create share links."""
        url = reverse('create-video-share', kwargs={'video_id': test_video.pk})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_share_nonexistent_video(self, authenticated_client):
        """Test creating a share link for a non-existent video."""
        url = reverse('create-video-share', kwargs={'video_id': 9999})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.django_db
class TestUserHistoryAPI:
    def test_history_empty(self, authenticated_client):
        """Test retrieving user history when there are no views."""
        url = reverse('user-history')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0

    def test_history_with_views(self, authenticated_client, test_user, test_video_view):
        """Test retrieving user history when there are views."""
        another_video = Video.objects.create(
            title="Another History Video",
            video_url="https://example.com/another_history",
            uploader=test_user
        )
        VideoView.objects.create(
            video=another_video,
            viewer=test_user,
            viewed_at=timezone.now()
        )

        url = reverse('user-history')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        video_ids = [video['id'] for video in response.data]
        assert test_video_view.video.id in video_ids
        assert another_video.id in video_ids

    def test_history_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot access history."""
        url = reverse('user-history')
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
