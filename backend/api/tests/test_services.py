import pytest
from unittest.mock import patch, MagicMock
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import os

from api.models import (
    ViewerProfile, EvaluationForm, EvaluationQuestion, 
    EvaluationResponse, Video, User
)
from api.services import PointsService, EvaluationService, AzureStorageService

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

@pytest.fixture
def test_form(test_user, test_video):
    """Create a test evaluation form"""
    return EvaluationForm.objects.create(
        title='Test Form',
        description='Test form description',
        created_by=test_user,
        video=test_video
    )

@pytest.fixture
def test_questions(test_form):
    """Create test evaluation questions"""
    questions = []
    
    # Required rating question
    questions.append(EvaluationQuestion.objects.create(
        form=test_form,
        question_text='How would you rate this video?',
        question_type='rating',
        required=True,
        order=0
    ))
    
    # Optional text question
    questions.append(EvaluationQuestion.objects.create(
        form=test_form,
        question_text='Any comments?',
        question_type='text',
        required=False,
        order=1
    ))
    
    # Required multiple choice question
    questions.append(EvaluationQuestion.objects.create(
        form=test_form,
        question_text='What did you like most?',
        question_type='multiple_choice',
        options=['Content', 'Presentation', 'Audio', 'Nothing'],
        required=True,
        order=2
    ))
    
    return questions

@pytest.mark.django_db
class TestPointsService:
    """Tests for the PointsService class"""
    
    def test_award_points_new_profile(self, test_user):
        """Test awarding points to a user without an existing profile"""
        # Make sure no profile exists yet
        ViewerProfile.objects.filter(user=test_user).delete()
        
        # Award points
        profile, points_awarded = PointsService.award_points_for_evaluation(test_user, 15)
        
        # Check that a profile was created
        assert profile.user == test_user
        assert profile.points == 15
        assert profile.points_earned == 15
        assert points_awarded == 15
        
        # Verify the profile was saved to the database
        db_profile = ViewerProfile.objects.get(user=test_user)
        assert db_profile.points == 15
        assert db_profile.points_earned == 15
    
    def test_award_points_existing_profile(self, test_user):
        """Test awarding points to a user with an existing profile"""
        # Create profile with existing points
        profile = ViewerProfile.objects.create(
            user=test_user,
            points=10,
            points_earned=10
        )
        
        # Award additional points
        updated_profile, points_awarded = PointsService.award_points_for_evaluation(test_user, 5)
        
        # Check that points were added
        assert updated_profile.user == test_user
        assert updated_profile.points == 15
        assert updated_profile.points_earned == 15
        assert points_awarded == 5
        
        # Verify the profile was updated in the database
        profile.refresh_from_db()
        assert profile.points == 15
        assert profile.points_earned == 15
    
    def test_award_points_default_value(self, test_user):
        """Test awarding points with the default value"""
        # Award points with default value (10)
        profile, points_awarded = PointsService.award_points_for_evaluation(test_user)
        
        # Check that the default value was used
        assert profile.points == 10
        assert profile.points_earned == 10
        assert points_awarded == 10
    
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
class TestEvaluationService:
    """Tests for the EvaluationService class"""
    
    def test_validate_required_answers_valid(self, test_form, test_questions):
        """Test validation with all required questions answered"""
        # Create answers with all required questions answered
        answers = {
            str(test_questions[0].id): '5',  # Required rating question
            str(test_questions[2].id): 'Content'  # Required multiple choice question
            # Optional text question is omitted
        }
        
        # Validate answers
        valid, error_message = EvaluationService.validate_required_answers(test_form, answers)
        
        # Assertions
        assert valid is True
        assert error_message is None
    
    def test_validate_required_answers_missing(self, test_form, test_questions):
        """Test validation with missing required answers"""
        # Create answers with a missing required question
        answers = {
            # Missing required rating question
            str(test_questions[1].id): 'Great video!'  # Optional text question
            # Missing required multiple choice question
        }
        
        # Validate answers
        valid, error_message = EvaluationService.validate_required_answers(test_form, answers)
        
        # Assertions
        assert valid is False
        assert error_message is not None
        assert test_questions[0].question_text in error_message
    
    def test_validate_required_answers_empty(self, test_form, test_questions):
        """Test validation with empty required answers"""
        # Create answers with empty required question
        answers = {
            str(test_questions[0].id): '',  # Empty required rating question
            str(test_questions[2].id): 'Content'  # Required multiple choice question
        }
        
        # Validate answers
        valid, error_message = EvaluationService.validate_required_answers(test_form, answers)
        
        # Assertions
        assert valid is False
        assert error_message is not None
        assert test_questions[0].question_text in error_message
    
    def test_create_response_and_award_points(self, test_user, test_form, test_questions):
        """Test creating a response and awarding points"""
        # Create answers
        answers = {
            str(test_questions[0].id): '5',
            str(test_questions[1].id): 'Great video!',
            str(test_questions[2].id): 'Content'
        }
        
        # Create response
        response, profile, points_awarded = EvaluationService.create_response_and_award_points(
            test_form, test_user, answers, 15
        )
        
        # Check response
        assert response.form == test_form
        assert response.user == test_user
        assert response.answers == answers
        assert response.points_awarded == 15
        
        # Check profile
        assert profile.user == test_user
        assert profile.points == 15
        assert profile.points_earned == 15
        assert points_awarded == 15
        
        # Verify the response was saved to the database
        db_response = EvaluationResponse.objects.get(id=response.id)
        assert db_response.form == test_form
        assert db_response.user == test_user
        assert db_response.answers == answers
        assert db_response.points_awarded == 15
    
    def test_create_response_default_points(self, test_user, test_form, test_questions):
        """Test creating a response with default points"""
        # Create answers
        answers = {
            str(test_questions[0].id): '4',
            str(test_questions[2].id): 'Presentation'
        }
        
        # Create response with default points
        response, profile, points_awarded = EvaluationService.create_response_and_award_points(
            test_form, test_user, answers
        )
        
        # Check default points
        assert response.points_awarded == 10
        assert profile.points == 10
        assert profile.points_earned == 10
        assert points_awarded == 10

@pytest.mark.django_db
class TestAzureStorageService:
    """Tests for the AzureStorageService class"""
    
    @patch.dict(os.environ, {
        'AZURE_STORAGE_ACCOUNT_NAME': 'testaccount',
        'AZURE_STORAGE_ACCOUNT_KEY': 'testkey',
        'AZURE_VIDEO_CONTAINER_NAME': 'videos',
        'AZURE_THUMBNAIL_CONTAINER_NAME': 'thumbnails'
    })
    def test_get_storage_credentials(self):
        """Test getting storage credentials"""
        credentials = AzureStorageService.get_storage_credentials()
        
        assert credentials['account_name'] == 'testaccount'
        assert credentials['account_key'] == 'testkey'
        assert credentials['video_container'] == 'videos'
        assert credentials['thumbnail_container'] == 'thumbnails'
    
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
            mock_generate_sas_url.call_args_list[1][0][4],  # Permission object
            24 * 60
        )