import pytest
from django.utils import timezone
# ValueError is a built-in exception, no need to import from django.core.exceptions
from api.models import User, Video, CompanyProfile, ViewerProfile

# Mark all tests in this module to use the database
pytestmark = pytest.mark.django_db

# --- User Model Tests ---

def test_create_user():
    """Test creating a regular user with the custom manager."""
    user = User.objects.create_user(
        email='test@example.com',
        firebase_uid='testuid123',
        first_name='Test',
        last_name='User'
    )
    assert user.email == 'test@example.com'
    assert user.firebase_uid == 'testuid123'
    assert user.first_name == 'Test'
    assert user.last_name == 'User'
    assert user.role == 'user'
    assert user.is_active is True
    assert user.is_staff is False
    assert user.is_superuser is False
    assert user.check_password('') is False # No password set directly

def test_create_user_no_email():
    """Test creating user without email raises ValueError."""
    with pytest.raises(ValueError, match='Users must have an email address'):
        User.objects.create_user(email='', firebase_uid='testuid123')

def test_create_user_no_firebase_uid():
    """Test creating user without firebase_uid raises ValueError."""
    with pytest.raises(ValueError, match='Users must have a Firebase UID'):
        User.objects.create_user(email='test@example.com', firebase_uid='')

def test_create_superuser():
    """Test creating a superuser."""
    admin_user = User.objects.create_superuser(
        email='super@example.com',
        firebase_uid='superuid456',
        first_name='Super',
        last_name='Admin'
    )
    assert admin_user.email == 'super@example.com'
    assert admin_user.firebase_uid == 'superuid456'
    assert admin_user.role == 'admin'
    assert admin_user.is_active is True
    assert admin_user.is_staff is True
    assert admin_user.is_superuser is True

def test_create_superuser_not_staff():
    """Test creating superuser with is_staff=False raises ValueError."""
    with pytest.raises(ValueError, match='Superuser must have is_staff=True.'):
        User.objects.create_superuser(
            email='super@example.com', firebase_uid='superuid456', is_staff=False
        )

def test_create_superuser_not_superuser():
    """Test creating superuser with is_superuser=False raises ValueError."""
    with pytest.raises(ValueError, match='Superuser must have is_superuser=True.'):
        User.objects.create_superuser(
            email='super@example.com', firebase_uid='superuid456', is_superuser=False
        )

def test_user_str_method():
    """Test the string representation of the User model."""
    user = User.objects.create_user(email='str@example.com', firebase_uid='struid789')
    assert str(user) == 'str@example.com'

def test_user_get_full_name():
    """Test the get_full_name method."""
    user_with_name = User.objects.create_user(
        email='fullname@example.com', firebase_uid='fullnameuid', first_name='Full', last_name='Name'
    )
    user_without_name = User.objects.create_user(
        email='noname@example.com', firebase_uid='nonameuid'
    )
    assert user_with_name.get_full_name() == 'Full Name'
    assert user_without_name.get_full_name() == 'noname@example.com' # Fallback

# --- Video Model Tests ---

def test_create_video():
    """Test creating a video instance."""
    user = User.objects.create_user(email='uploader@example.com', firebase_uid='uploaderuid')
    video = Video.objects.create(
        title='Test Video Title',
        description='A description for the test video.',
        category='Testing',
        visibility='public',
        video_url='http://example.com/video.mp4',
        thumbnail_url='http://example.com/thumb.jpg',
        uploader=user,
        duration='05:30'
    )
    assert video.title == 'Test Video Title'
    assert video.description == 'A description for the test video.'
    assert video.category == 'Testing'
    assert video.visibility == 'public'
    assert video.video_url == 'http://example.com/video.mp4'
    assert video.thumbnail_url == 'http://example.com/thumb.jpg'
    assert video.uploader == user
    assert video.duration == '05:30'
    assert video.views == 0 # Default value
    assert video.likes == 0 # Default value
    assert video.upload_date is not None
    assert isinstance(video.upload_date, timezone.datetime)

def test_video_default_visibility():
    """Test the default visibility of a video."""
    user = User.objects.create_user(email='uploader2@example.com', firebase_uid='uploaderuid2')
    video = Video.objects.create(
        title='Default Vis Video',
        video_url='http://example.com/video2.mp4',
        uploader=user
    )
    assert video.visibility == 'private' # Check default

def test_video_str_method():
    """Test the string representation of the Video model."""
    user = User.objects.create_user(email='uploader3@example.com', firebase_uid='uploaderuid3')
    video = Video.objects.create(
        title='Video Str Test',
        video_url='http://example.com/video3.mp4',
        uploader=user
    )
    assert str(video) == 'Video Str Test'

# --- Profile Model Tests (Basic Existence) ---

def test_company_profile_creation():
    """Test that a CompanyProfile can be created."""
    user = User.objects.create_user(email='company@example.com', firebase_uid='companyuid', role='company')
    profile = CompanyProfile.objects.create(
        user=user,
        company_name='Test Corp',
        company_address='123 Test St',
        industry='Tech'
    )
    assert profile.user == user
    assert profile.company_name == 'Test Corp'
    assert str(profile) == 'Test Corp'

def test_viewer_profile_creation():
    """Test that a ViewerProfile can be created."""
    user = User.objects.create_user(email='viewer@example.com', firebase_uid='vieweruid', role='user')
    profile = ViewerProfile.objects.create(
        user=user,
        country='Testland'
    )
    assert profile.user == user
    assert profile.country == 'Testland'
    assert str(profile) == f"Profile for {user.email}"
