import pytest
from unittest.mock import patch, MagicMock
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from api.models import (
    User, ViewerProfile, Video, VideoView, VideoLike, VideoShare,
    EvaluationForm, EvaluationQuestion, EvaluationResponse
)
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

@pytest.fixture
def company_user(db):
    """Fixture to create a company user."""
    user = User.objects.create_user(
        email="company@example.com",
        firebase_uid="companyuid123",
        password="companypassword",
        role="company"
    )
    return user

@pytest.fixture
def admin_user(db):
    """Fixture to create an admin user."""
    user = User.objects.create_user(
        email="admin@example.com",
        firebase_uid="adminuid123",
        password="adminpassword",
        role="admin"
    )
    return user

@pytest.fixture
def company_authenticated_client(api_client, company_user):
    """Fixture to provide an authenticated API client for company user."""
    api_client.force_authenticate(user=company_user)
    return api_client

@pytest.fixture
def admin_authenticated_client(api_client, admin_user):
    """Fixture to provide an authenticated API client for admin user."""
    api_client.force_authenticate(user=admin_user)
    return api_client

@pytest.fixture
def company_video(db, company_user):
    """Fixture to create a test video owned by a company user."""
    video = Video.objects.create(
        title="Company Video",
        description="A video for testing evaluation forms.",
        category="Testing",
        visibility="public",
        video_url="https://example.com/company_video",
        thumbnail_url="https://example.com/company_thumb",
        uploader=company_user,
        duration="04:30"
    )
    return video

@pytest.fixture
def test_evaluation_form(db, company_user, company_video):
    """Fixture to create a test evaluation form."""
    form = EvaluationForm.objects.create(
        video=company_video,
        title="Test Evaluation Form",
        description="A form for testing",
        created_by=company_user
    )
    return form

@pytest.fixture
def test_evaluation_questions(db, test_evaluation_form):
    """Fixture to create test evaluation questions."""
    questions = []
    questions.append(EvaluationQuestion.objects.create(
        form=test_evaluation_form,
        question_text="How would you rate this video?",
        question_type="rating",
        required=True,
        order=0
    ))
    questions.append(EvaluationQuestion.objects.create(
        form=test_evaluation_form,
        question_text="What did you like about it?",
        question_type="text",
        required=True,
        order=1
    ))
    questions.append(EvaluationQuestion.objects.create(
        form=test_evaluation_form,
        question_type="multiple_choice",
        question_text="Which element was most appealing?",
        options=["Visual", "Audio", "Content", "Other"],
        required=True,
        order=2
    ))
    return questions

@pytest.fixture
def viewer_profile(db, test_user):
    """Fixture to create a viewer profile for testing evaluation responses."""
    profile, _ = ViewerProfile.objects.get_or_create(
        user=test_user,
        defaults={
            'points': 0,
            'points_earned': 0,
            'points_redeemed': 0,
            'onboarding_completed': True
        }
    )
    return profile

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
            "user_role": "user"
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
        args, _ = mock_login.call_args
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
            uploader=test_video.uploader,
            visibility="public"  # Set visibility to public
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

@pytest.mark.django_db
class TestEvaluationFormViewSet:
    def test_get_form_by_video_invalid_id(self, authenticated_client):
        """Test retrieving a form with an invalid video ID."""
        url = reverse('evaluation-forms-detail', kwargs={'pk': 9999, 'format': 'video'})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_form_success(self, company_authenticated_client, test_evaluation_form):
        """Test successfully updating an evaluation form."""
        url = reverse('evaluation-forms-detail', kwargs={'pk': test_evaluation_form.id})
        update_data = {
            'title': 'Updated Form Title',
            'description': 'Updated form description'
        }
        response = company_authenticated_client.patch(url, update_data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == 'Updated Form Title'
        assert response.data['description'] == 'Updated form description'

        # Verify form was updated in the database
        test_evaluation_form.refresh_from_db()
        assert test_evaluation_form.title == 'Updated Form Title'
        assert test_evaluation_form.description == 'Updated form description'

    def test_update_form_not_found(self, company_authenticated_client, company_video):
        """Test updating a non-existent evaluation form."""
        # No form created for this video yet
        url = reverse('evaluation-forms-detail', kwargs={'pk': 9999})
        update_data = {
            'title': 'Update Non-existent Form',
            'description': 'This should fail'
        }
        response = company_authenticated_client.patch(url, update_data, format='json')

        assert response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.django_db
class TestEvaluationQuestionViewSet:
    def test_list_questions(self, authenticated_client, test_evaluation_form, test_evaluation_questions):
        """Test successfully listing questions for a form."""
        url = reverse('evaluation-questions', kwargs={'form_id': test_evaluation_form.id})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3
        
        # Check questions are in correct order
        assert response.data[0]['order'] == 0
        assert response.data[1]['order'] == 1
        assert response.data[2]['order'] == 2
        
        # Check question types
        assert response.data[0]['question_type'] == 'rating'
        assert response.data[1]['question_type'] == 'text'
        assert response.data[2]['question_type'] == 'multiple_choice'
        
        # Check options for multiple choice question
        assert 'options' in response.data[2]
        assert len(response.data[2]['options']) == 4

    def test_create_multiple_choice_question(self, company_authenticated_client, test_evaluation_form):
        """Test creating a multiple choice question with options."""
        url = reverse('evaluation-questions', kwargs={'form_id': test_evaluation_form.id})
        question_data = {
            'question_text': 'Favorite Color?',
            'question_type': 'multiple_choice',
            'options': ['Red', 'Blue', 'Green', 'Yellow'],
            'required': True
        }
        response = company_authenticated_client.post(url, question_data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['question_text'] == 'Favorite Color?'
        assert response.data['question_type'] == 'multiple_choice'
        assert 'options' in response.data
        assert len(response.data['options']) == 4
        assert 'Red' in response.data['options']

    def test_update_question(self, company_authenticated_client, test_evaluation_form, test_evaluation_questions):
        """Test successfully updating a question."""
        question_id = test_evaluation_questions[0].id
        url = reverse('evaluation-question-detail', kwargs={'form_id': test_evaluation_form.id, 'pk': question_id})
        update_data = {
            'question_text': 'Updated Question Text',
            'required': False
        }
        response = company_authenticated_client.patch(url, update_data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['question_text'] == 'Updated Question Text'
        assert response.data['required'] is False
        
        # Verify question was updated in database
        test_evaluation_questions[0].refresh_from_db()
        assert test_evaluation_questions[0].question_text == 'Updated Question Text'
        assert test_evaluation_questions[0].required is False

    def test_delete_question(self, company_authenticated_client, test_evaluation_form, test_evaluation_questions):
        """Test successfully deleting a question."""
        question_id = test_evaluation_questions[0].id
        url = reverse('evaluation-question-detail', kwargs={'form_id': test_evaluation_form.id, 'pk': question_id})
        response = company_authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify question was deleted from database
        assert not EvaluationQuestion.objects.filter(id=question_id).exists()
        
        # Check that remaining questions were reordered
        remaining_questions = EvaluationQuestion.objects.filter(form=test_evaluation_form).order_by('order')
        assert remaining_questions.count() == 2
        assert remaining_questions[0].order == 0
        assert remaining_questions[1].order == 1

    def test_non_owner_cannot_modify_questions(self, authenticated_client, test_evaluation_form, test_evaluation_questions):
        """Test that non-owners cannot modify questions."""
        # Try to create a new question
        url = reverse('evaluation-questions', kwargs={'form_id': test_evaluation_form.id})
        question_data = {
            'question_text': 'Unauthorized Question',
            'question_type': 'text',
            'required': True
        }
        response = authenticated_client.post(url, question_data, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Try to update a question
        question_id = test_evaluation_questions[0].id
        url = reverse('evaluation-question-detail', kwargs={'form_id': test_evaluation_form.id, 'pk': question_id})
        update_data = {'question_text': 'Unauthorized Update'}
        response = authenticated_client.patch(url, update_data, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Try to delete a question
        response = authenticated_client.delete(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_modify_any_questions(self, admin_authenticated_client, test_evaluation_form, test_evaluation_questions):
        """Test that admins can modify questions they don't own."""
        # Admin can create a new question
        url = reverse('evaluation-questions', kwargs={'form_id': test_evaluation_form.id})
        question_data = {
            'question_text': 'Admin Question',
            'question_type': 'text',
            'required': True
        }
        response = admin_authenticated_client.post(url, question_data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        
        # Admin can update a question
        question_id = test_evaluation_questions[0].id
        url = reverse('evaluation-question-detail', kwargs={'form_id': test_evaluation_form.id, 'pk': question_id})
        update_data = {'question_text': 'Admin Updated Question'}
        response = admin_authenticated_client.patch(url, update_data, format='json')
        assert response.status_code == status.HTTP_200_OK
        
        # Admin can delete a question
        question_id = test_evaluation_questions[1].id
        url = reverse('evaluation-question-detail', kwargs={'form_id': test_evaluation_form.id, 'pk': question_id})
        response = admin_authenticated_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

@pytest.mark.django_db
class TestSubmitEvaluationResponseView:
    @patch('api.services.EvaluationService.validate_required_answers')
    @patch('api.services.EvaluationService.create_response_and_award_points')
    def test_submit_evaluation_response_success(self, mock_create_response, mock_validate_answers,
                                              authenticated_client, test_user, test_evaluation_form, viewer_profile):
        """Test successfully submitting an evaluation response."""
        # Mock the validation to return success
        mock_validate_answers.return_value = (True, None)
        
        # Mock the response creation and points award
        response_mock = MagicMock()
        mock_create_response.return_value = (response_mock, viewer_profile, 10)
        
        # Updated viewer profile with points
        viewer_profile.points = 10
        
        url = reverse('submit-evaluation', kwargs={'form_id': test_evaluation_form.id})
        submission_data = {
            'answers': {
                '1': 5,  # Rating question
                '2': 'It was very engaging',  # Text question
                '3': 'Visual'  # Multiple choice question
            }
        }
        
        response = authenticated_client.post(url, submission_data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['message'] == 'Evaluation submitted successfully'
        assert response.data['points_awarded'] == 10
        assert response.data['total_points'] == 10
        
        mock_validate_answers.assert_called_once_with(test_evaluation_form, submission_data['answers'])
        mock_create_response.assert_called_once_with(
            form=test_evaluation_form,
            user=test_user,
            answers=submission_data['answers']
        )

    @patch('api.views.EvaluationService.validate_required_answers')
    def test_submit_evaluation_missing_required_answers(self, mock_validate_answers,
                                                      authenticated_client, test_evaluation_form):
        """Test submitting an incomplete evaluation form."""
        # Mock validation to fail
        mock_validate_answers.return_value = (False, "Question 1 is required")
        
        url = reverse('submit-evaluation', kwargs={'form_id': test_evaluation_form.id})
        submission_data = {
            'answers': {
                # Missing required answers
                '2': 'Incomplete submission'
            }
        }
        
        response = authenticated_client.post(url, submission_data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error'] == "Question 1 is required"
        
        mock_validate_answers.assert_called_once_with(test_evaluation_form, submission_data['answers'])

    def test_submit_evaluation_form_not_found(self, authenticated_client):
        """Test submitting to a non-existent evaluation form."""
        url = reverse('submit-evaluation', kwargs={'form_id': 9999})
        submission_data = {
            'answers': {
                '1': 5
            }
        }
        
        response = authenticated_client.post(url, submission_data, format='json')
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_submit_evaluation_already_submitted(self, authenticated_client, test_user, test_evaluation_form):
        """Test submitting an evaluation form that was already submitted by the user."""
        # Create an existing response
        EvaluationResponse.objects.create(
            form=test_evaluation_form,
            user=test_user,
            answers={'1': 4},
            points_awarded=10
        )
        
        url = reverse('submit-evaluation', kwargs={'form_id': test_evaluation_form.id})
        submission_data = {
            'answers': {
                '1': 5
            }
        }
        
        response = authenticated_client.post(url, submission_data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error'] == "You have already submitted an evaluation for this video"

    def test_submit_evaluation_unauthenticated(self, api_client, test_evaluation_form):
        """Test that unauthenticated users cannot submit evaluations."""
        url = reverse('submit-evaluation', kwargs={'form_id': test_evaluation_form.id})
        submission_data = {
            'answers': {
                '1': 5
            }
        }
        
        response = api_client.post(url, submission_data, format='json')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN