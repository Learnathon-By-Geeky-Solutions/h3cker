import pytest
from api.models import User, CompanyProfile, ViewerProfile, Video

@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        # Test creating a user
        user = User.objects.create_user(
            email="test@example.com",
            firebase_uid="testuid123",
            password="testpassword"
        )
        assert user.email == "test@example.com"
        assert user.firebase_uid == "testuid123"
        assert user.is_active
        assert not user.is_staff
        assert not user.is_superuser
        assert user.role == "user"

    def test_create_user_no_email(self):
        # Test creating a user with no email raises error
        with pytest.raises(ValueError, match="Users must have an email address"):
            User.objects.create_user(
                email=None,
                firebase_uid="testuid123"
            )

    def test_create_user_no_firebase_uid(self):
        # Test creating a user with no firebase_uid raises error
        with pytest.raises(ValueError, match="Users must have a Firebase UID"):
            User.objects.create_user(
                email="test@example.com",
                firebase_uid=None
            )

    def test_create_superuser(self):
        # Test creating a superuser
        admin = User.objects.create_superuser(
            email="admin@example.com",
            firebase_uid="adminuid123",
            password="adminpassword"
        )
        assert admin.email == "admin@example.com"
        assert admin.firebase_uid == "adminuid123"
        assert admin.is_active
        assert admin.is_staff
        assert admin.is_superuser
        assert admin.role == "admin"

    def test_user_str(self):
        # Test the string representation of a user
        user = User.objects.create_user(
            email="test@example.com",
            firebase_uid="testuid123",
            password="testpassword"
        )
        assert str(user) == "test@example.com"

    def test_get_full_name(self):
        # Test get_full_name method
        user1 = User.objects.create_user(
            email="test1@example.com",
            firebase_uid="testuid1",
            first_name="John",
            last_name="Doe"
        )
        user2 = User.objects.create_user(
            email="test2@example.com",
            firebase_uid="testuid2"
        )

        assert user1.get_full_name() == "John Doe"
        assert user2.get_full_name() == "test2@example.com" 

@pytest.mark.django_db
class TestCompanyProfileModel:
    def test_company_profile_creation(self):
        # Create a user first
        user = User.objects.create_user(
            email="company@example.com",
            firebase_uid="companyuid123",
            role="company"
        )
        
        # Create a company profile
        profile = CompanyProfile.objects.create(
            user=user,
            company_name="Test Company",
            company_address="123 Company St",
            industry="Technology"
        )
        
        assert profile.company_name == "Test Company"
        assert profile.company_address == "123 Company St"
        assert profile.industry == "Technology"
    
    def test_company_profile_str(self):
        # Test the string representation with company name
        user = User.objects.create_user(
            email="company1@example.com",
            firebase_uid="companyuid1",
            role="company"
        )
        profile1 = CompanyProfile.objects.create(
            user=user,
            company_name="Named Company"
        )
        assert str(profile1) == "Named Company"
        
        # Test the string representation without company name
        user2 = User.objects.create_user(
            email="company2@example.com",
            firebase_uid="companyuid2",
            role="company"
        )
        profile2 = CompanyProfile.objects.create(
            user=user2
        )
        assert str(profile2) == f"Profile for company2@example.com"

@pytest.mark.django_db
class TestViewerProfileModel:
    def test_viewer_profile_creation(self):
        # Create a user first
        user = User.objects.create_user(
            email="viewer@example.com",
            firebase_uid="vieweruid123"
        )
        
        # Create a viewer profile
        profile = ViewerProfile.objects.create(
            user=user,
            gender="Male",
            country="United States",
            city="New York",
            education_level="Bachelor's",
            occupation="Engineer",
            content_preferences=["Technology", "Science"]
        )
        
        assert profile.gender == "Male"
        assert profile.country == "United States"
        assert profile.city == "New York"
        assert profile.education_level == "Bachelor's"
        assert profile.occupation == "Engineer"
        assert profile.content_preferences == ["Technology", "Science"]
        assert not profile.onboarding_completed
    
    def test_viewer_profile_str(self):
        # Test the string representation
        user = User.objects.create_user(
            email="viewer1@example.com",
            firebase_uid="vieweruid1"
        )
        profile = ViewerProfile.objects.create(user=user)
        assert str(profile) == f"Profile for viewer1@example.com"

@pytest.mark.django_db
class TestVideoModel:
    def test_video_creation(self):
        # Create user
        user = User.objects.create_user(
            email="uploader@example.com",
            firebase_uid="uploaderuid123"
        )
        
        # Create a video
        video = Video.objects.create(
            title="Test Video",
            description="Test video description",
            category="Education",
            visibility="public",
            video_url="https://example.com/video",
            thumbnail_url="https://example.com/thumbnail",
            uploader=user,
            duration="10:30"
        )
        
        assert video.title == "Test Video"
        assert video.description == "Test video description"
        assert video.category == "Education"
        assert video.visibility == "public"
        assert video.video_url == "https://example.com/video"
        assert video.thumbnail_url == "https://example.com/thumbnail"
        assert video.uploader == user
        assert video.views == 0
        assert video.likes == 0
        assert video.duration == "10:30"
    
    def test_video_str(self):
        # Test the string representation
        user = User.objects.create_user(
            email="uploader2@example.com",
            firebase_uid="uploaderuid2"
        )
        video = Video.objects.create(
            title="Another Test Video",
            video_url="https://example.com/video2",
            uploader=user
        )
        assert str(video) == "Another Test Video"
    
    def test_video_default_values(self):
        # Test default values
        user = User.objects.create_user(
            email="uploader3@example.com",
            firebase_uid="uploaderuid3"
        )
        video = Video.objects.create(
            title="Video with Defaults",
            video_url="https://example.com/video3",
            uploader=user
        )
        
        assert video.description == ""
        assert video.category == ""
        assert video.visibility == "private"
        assert video.thumbnail_url == ""
        assert video.views == 0
        assert video.likes == 0
        assert video.duration == "0:00"