import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from api.models import User, Video

# Mark all tests in this module to use the database
pytestmark = pytest.mark.django_db

@pytest.fixture
def api_client():
    """Fixture to provide an API client instance."""
    return APIClient()

@pytest.fixture
def test_user():
    """Fixture to create a standard test user."""
    return User.objects.create_user(email='testuser@example.com', firebase_uid='testuseruid')

@pytest.fixture
def sample_video(test_user):
    """Fixture to create a sample video linked to the test user."""
    return Video.objects.create(
        title='Sample Video',
        description='A test video description.',
        category='Testing',
        visibility='public',
        video_url='http://example.com/sample.mp4',
        thumbnail_url='http://example.com/sample_thumb.jpg',
        uploader=test_user,
        duration='01:00'
    )

# --- VideoFeedView Tests ---

def test_video_feed_list_success(api_client, sample_video):
    """Test retrieving the video feed successfully."""
    # Create another video to test listing multiple items
    Video.objects.create(
        title='Another Video',
        video_url='http://example.com/another.mp4',
        uploader=sample_video.uploader,
        visibility='public'
    )
    url = reverse('video-feed')
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) >= 2 # Check if at least the two created videos are listed
    # Check if essential fields are present in the first result
    assert 'id' in response.data[0]
    assert 'title' in response.data[0]
    assert 'thumbnail_url' in response.data[0]
    assert 'uploader' in response.data[0] # Check for the nested uploader object

def test_video_feed_empty(api_client):
    """Test retrieving an empty video feed."""
    url = reverse('video-feed')
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 0

# --- VideoDetailView Tests ---

def test_video_detail_retrieve_success(api_client, sample_video):
    """Test retrieving a specific video detail successfully."""
    url = reverse('video-detail', kwargs={'pk': sample_video.pk})
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert response.data['id'] == sample_video.pk
    assert response.data['title'] == sample_video.title
    assert response.data['description'] == sample_video.description
    assert response.data['video_url'] == sample_video.video_url
    # Add more assertions based on VideoDetailSerializer fields

def test_video_detail_not_found(api_client):
    """Test retrieving a non-existent video detail returns 404."""
    url = reverse('video-detail', kwargs={'pk': 999}) # Assuming 999 doesn't exist
    response = api_client.get(url)

    assert response.status_code == status.HTTP_404_NOT_FOUND

# --- TestAuthView Tests ---

@pytest.fixture
def authenticated_api_client(api_client, test_user):
    """Fixture for an authenticated API client."""
    # Note: In a real scenario with JWT/Firebase, you'd mock the authentication
    # or use a mechanism to force authenticate. For basic DRF session auth (if enabled)
    # or token auth, you might use force_authenticate.
    # Since we use Firebase, proper testing requires mocking firebase_admin.auth
    # or setting up test tokens. For now, we'll simulate by forcing authentication.
    api_client.force_authenticate(user=test_user)
    return api_client

def test_auth_test_view_authenticated(authenticated_api_client):
    """Test accessing the protected view when authenticated."""
    url = reverse('auth-test')
    response = authenticated_api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['success'] is True

def test_auth_test_view_unauthenticated(api_client):
    """Test accessing the protected view when unauthenticated."""
    url = reverse('auth-test')
    response = api_client.get(url)
    # Expecting 401 Unauthorized or 403 Forbidden depending on DRF default settings
    assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

# --- More tests for Onboarding, UploadVideo, SetFirebaseToken would go here ---
# --- These often require mocking external services (Firebase, Azure) ---
