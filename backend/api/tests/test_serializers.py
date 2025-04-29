import pytest
from datetime import date
from api.models import User, ViewerProfile, Video
from api.serializers import (
    OnboardingSerializer,
    UserBasicSerializer,
    VideoSerializer,
    VideoFeedSerializer,
    VideoDetailSerializer,
)

@pytest.fixture
def test_user_data(db):
    """Fixture for user data used in serializers."""
    user = User.objects.create_user(
        email="serializer@example.com",
        firebase_uid="serializeruid123",
        first_name="Serial",
        last_name="Izer",
        role="user"
    )
    return user

@pytest.fixture
def viewer_profile_data(test_user_data):
    """Fixture for viewer profile data."""
    profile = ViewerProfile.objects.create(
        user=test_user_data,
        birthday=date(1990, 1, 1),
        gender="Other",
        country="Testland",
        city="Testville",
        education_level="PhD",
        occupation="Tester",
        content_preferences=["Testing", "Debugging"],
        onboarding_completed=False
    )
    return profile

@pytest.fixture
def video_data(test_user_data):
    """Fixture for video data."""
    video = Video.objects.create(
        title="Serializer Test Video",
        description="Testing video serialization.",
        category="Testing",
        visibility="unlisted",
        video_url="https://example.com/ser_video",
        thumbnail_url="https://example.com/ser_thumb",
        uploader=test_user_data,
        duration="02:30",
        views=100,
        likes=10
    )
    return video

# --- Test UserBasicSerializer ---
@pytest.mark.django_db
def test_user_basic_serializer(test_user_data):
    serializer = UserBasicSerializer(instance=test_user_data)
    data = serializer.data
    assert data['id'] == test_user_data.id
    assert data['email'] == test_user_data.email
    assert data['first_name'] == test_user_data.first_name
    assert data['last_name'] == test_user_data.last_name
    assert data['role'] == test_user_data.role

# --- Test OnboardingSerializer ---
@pytest.mark.django_db
class TestOnboardingSerializer:
    def test_onboarding_serialization(self, viewer_profile_data):
        """Test serializing ViewerProfile data."""
        serializer = OnboardingSerializer(instance=viewer_profile_data)
        data = serializer.data
        assert data['birthday'] == '1990-01-01'
        assert data['gender'] == viewer_profile_data.gender
        assert data['country'] == viewer_profile_data.country
        assert data['city'] == viewer_profile_data.city
        assert data['education_level'] == viewer_profile_data.education_level
        assert data['occupation'] == viewer_profile_data.occupation
        assert data['content_preferences'] == viewer_profile_data.content_preferences
        assert data['onboarding_completed'] is False # Read-only field

    def test_onboarding_deserialization_valid(self, test_user_data):
        """Test deserializing valid data to update ViewerProfile."""
        profile, _ = ViewerProfile.objects.get_or_create(user=test_user_data)
        valid_data = {
            "birthday": "1992-02-02",
            "gender": "Female",
            "country": "Newland",
            "city": "Newville",
            "education_level": "Bachelor's",
            "occupation": "Analyst",
            "content_preferences": ["Data", "Stats"]
            # onboarding_completed is not included as it's set in the view
        }
        serializer = OnboardingSerializer(instance=profile, data=valid_data, partial=True)
        assert serializer.is_valid()
        # Note: We don't call save() here, just check validation and validated_data
        validated_data = serializer.validated_data
        assert validated_data['birthday'] == date(1992, 2, 2)
        assert validated_data['gender'] == "Female"
        assert validated_data['country'] == "Newland"
        # onboarding_completed should not be in validated_data as it's read_only
        assert 'onboarding_completed' not in validated_data

    def test_onboarding_deserialization_invalid(self):
        """Test that invalid data doesn't serialize correctly."""
        invalid_data = {
            "birthday": "not-a-date",
            # content_preferences is not required in the actual serializer
        }
        serializer = OnboardingSerializer(data=invalid_data)
        
        assert not serializer.is_valid()
        assert 'birthday' in serializer.errors
        # content_preferences is not required, so we don't check for it

# --- Test VideoSerializer ---
@pytest.mark.django_db
class TestVideoSerializer:
    def test_video_serialization(self, video_data):
        """Test serializing Video data."""
        serializer = VideoSerializer(instance=video_data)
        data = serializer.data
        assert data['id'] == video_data.id
        assert data['title'] == video_data.title
        assert data['description'] == video_data.description
        assert data['category'] == video_data.category
        assert data['visibility'] == video_data.visibility
        assert data['video_url'] == video_data.video_url
        assert data['thumbnail_url'] == video_data.thumbnail_url
        assert 'upload_date' in data
        assert data['uploader']['id'] == video_data.uploader.id # Nested serializer check
        assert data['views'] == video_data.views
        assert data['likes'] == video_data.likes
        assert data['duration'] == video_data.duration

    def test_video_deserialization_valid(self):
        """Test deserializing valid data for creating a Video (ignoring read-only)."""
        valid_data = {
            "title": "New Upload",
            "description": "From serializer test.",
            "category": "Testing",
            "visibility": "private",
            # Read-only fields like video_url, uploader, etc., are ignored on input
        }
        serializer = VideoSerializer(data=valid_data)
        assert serializer.is_valid()
        assert serializer.validated_data['title'] == "New Upload"
        assert serializer.validated_data['visibility'] == "private"
        # Check that read-only fields are not in validated_data
        assert 'video_url' not in serializer.validated_data
        assert 'uploader' not in serializer.validated_data
        assert 'views' not in serializer.validated_data

    def test_video_deserialization_invalid(self):
        """Test deserializing invalid data."""
        invalid_data = {
            "title": "", # Required field cannot be blank
            "visibility": "invalid-choice"
        }
        serializer = VideoSerializer(data=invalid_data)
        assert not serializer.is_valid()
        assert 'title' in serializer.errors
        assert 'visibility' in serializer.errors

# --- Test VideoFeedSerializer ---
@pytest.mark.django_db
def test_video_feed_serializer(video_data):
    serializer = VideoFeedSerializer(instance=video_data)
    data = serializer.data
    # Check only fields present in VideoFeedSerializer
    assert data['id'] == video_data.id
    assert data['title'] == video_data.title
    assert data['thumbnail_url'] == video_data.thumbnail_url
    assert 'upload_date' in data
    assert data['uploader']['id'] == video_data.uploader.id
    assert data['views'] == video_data.views
    assert data['likes'] == video_data.likes
    assert data['duration'] == video_data.duration
    # Ensure fields not in the serializer are absent
    assert 'description' not in data
    assert 'video_url' not in data
    assert 'category' not in data
    assert 'visibility' not in data

# --- Test VideoDetailSerializer ---
@pytest.mark.django_db
def test_video_detail_serializer(video_data):
    serializer = VideoDetailSerializer(instance=video_data)
    data = serializer.data
    # Check all fields are present as expected
    assert data['id'] == video_data.id
    assert data['title'] == video_data.title
    assert data['description'] == video_data.description
    assert data['category'] == video_data.category
    assert data['visibility'] == video_data.visibility
    assert data['video_url'] == video_data.video_url
    assert data['thumbnail_url'] == video_data.thumbnail_url
    assert 'upload_date' in data
    assert data['uploader']['id'] == video_data.uploader.id # Nested serializer check
    assert data['views'] == video_data.views
    assert data['likes'] == video_data.likes
    assert data['duration'] == video_data.duration
    # Add checks for any other fields specific to VideoDetailSerializer if needed
