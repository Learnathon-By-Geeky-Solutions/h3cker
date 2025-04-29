import pytest
from django.utils import timezone
import datetime
from api.models import (
    User, CompanyProfile, ViewerProfile, Video, 
    VideoView, VideoLike, VideoShare, WebcamRecording
)
from django.db.models import F, ExpressionWrapper, FloatField, Count, Q

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
        
    def test_superuser_with_invalid_flags(self):
        # Test superuser creation with invalid is_staff flag
        with pytest.raises(ValueError, match="Superuser must have is_staff=True."):
            User.objects.create_superuser(
                email="admin2@example.com",
                firebase_uid="adminuid2",
                is_staff=False
            )
            
        # Test superuser creation with invalid is_superuser flag
        with pytest.raises(ValueError, match="Superuser must have is_superuser=True."):
            User.objects.create_superuser(
                email="admin3@example.com",
                firebase_uid="adminuid3",
                is_superuser=False
            )

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
        assert str(profile2) == "Profile for company2@example.com"

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
        assert str(profile) == "Profile for viewer1@example.com"
        
    def test_calculate_points_value(self):
        # Test the points calculation method
        user = User.objects.create_user(
            email="viewer2@example.com",
            firebase_uid="vieweruid2"
        )
        
        # Create profile with initial points
        profile = ViewerProfile.objects.create(
            user=user,
            points=50,
            points_earned=100,
            points_redeemed=50
        )
        
        # Test points calculation (10 BDT per point)
        assert profile.calculate_points_value() == 500
        
        # Update points and test again
        profile.points = 75
        profile.save()
        assert profile.calculate_points_value() == 750

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
        assert video.visibility == "private" # Default visibility
        assert video.views == 0
        assert video.likes == 0
        assert video.duration == "0:00" # Check default value
        assert video.auto_private_after is None
        assert video.view_limit is None
    
    def test_get_recommendations_for_unauthenticated_user(self, monkeypatch):
        # Test recommendations for unauthenticated user
        # Mock the get_popular_videos method to isolate this test
        def mock_get_popular_videos(cls, limit, offset):
            return ["popular_video1", "popular_video2"]
        
        monkeypatch.setattr(Video, "get_popular_videos", classmethod(mock_get_popular_videos))
        
        # Create a mock user that is not authenticated
        class MockUser:
            is_authenticated = False
        
        # Get recommendations for unauthenticated user
        result = Video.get_recommendations_for_user(MockUser(), 10, 0)
        assert result == ["popular_video1", "popular_video2"]
    
    
    def test_get_featured_carousel_videos(self):
        # Set up test data
        user = User.objects.create_user(
            email="carousel_test@example.com",
            firebase_uid="carousel_uid"
        )
        
        # Create videos with different popularity metrics
        video1 = Video.objects.create(
            title="Popular Video 1",
            video_url="https://example.com/popular1",
            uploader=user,
            visibility="public",
            views=1000,
            likes=500
        )
        
        video2 = Video.objects.create(
            title="Popular Video 2",
            video_url="https://example.com/popular2",
            uploader=user,
            visibility="public",
            views=800,
            likes=600
        )
        
        video3 = Video.objects.create(
            title="Private Video",  # This should be excluded
            video_url="https://example.com/private",
            uploader=user,
            visibility="private",
            views=5000,
            likes=3000
        )
        
        # Get featured videos
        featured = Video.get_featured_carousel_videos(limit=2)
        
        # Verify that we got the correct videos in the right order
        # Video 2 should be first (higher popularity score due to more likes)
        assert len(featured) == 2
        assert featured[0].id == video2.id  # More likes (weighted higher)
        assert featured[1].id == video1.id
        assert video3.id not in [v.id for v in featured]  # Private video excluded
        
    def test_get_preference_based_videos_empty_preferences(self, monkeypatch):
        # Test when user has empty preferences
        def mock_get_popular_videos(cls, limit, offset):
            return ["popular_video1", "popular_video2"]
        
        monkeypatch.setattr(Video, "get_popular_videos", classmethod(mock_get_popular_videos))
        
        user = User.objects.create_user(
            email="empty_prefs@example.com",
            firebase_uid="empty_prefs_uid"
        )
        
        # Test with empty preferences
        result = Video.get_preference_based_videos(user, [], 10, 0)
        assert result == ["popular_video1", "popular_video2"]
    
    def test_get_popular_videos(self):
        # Create test data
        user = User.objects.create_user(
            email="popular_test@example.com",
            firebase_uid="popular_uid"
        )
        
        # Create videos with different popularity metrics
        video1 = Video.objects.create(
            title="Most Popular",
            video_url="https://example.com/most_popular",
            uploader=user,
            visibility="public",
            views=1000,  # 60% weight
            likes=100    # 40% weight
        )
        
        video2 = Video.objects.create(
            title="Second Popular",
            video_url="https://example.com/second_popular",
            uploader=user,
            visibility="public",
            views=500,
            likes=200  # More likes but lower overall score
        )
        
        # Test with limit and offset
        popular_videos = Video.get_popular_videos(limit=1, offset=0)
        assert len(popular_videos) == 1
        assert popular_videos[0].id == video1.id
        
        # Test with offset to get second video
        popular_videos = Video.get_popular_videos(limit=1, offset=1)
        assert len(popular_videos) == 1
        assert popular_videos[0].id == video2.id
    
    def test_get_trending_videos(self, monkeypatch):
        # Mock timezone.now() to get a fixed time for testing
        current_time = timezone.now()
        
        def mock_timezone_now():
            return current_time
        
        monkeypatch.setattr(timezone, "now", mock_timezone_now)
        
        # Create test data
        user = User.objects.create_user(
            email="trending_test@example.com",
            firebase_uid="trending_uid"
        )
        
        # Create videos with different upload dates
        video1 = Video.objects.create(
            title="Recent Trending Video",
            video_url="https://example.com/recent_trending",
            uploader=user,
            visibility="public"
        )
        
        # Create video view for recent video
        VideoView.objects.create(
            video=video1,
            viewer=user,
            viewed_at=current_time - datetime.timedelta(days=1)
        )
        
        # Old video with old view (shouldn't be trending)
        old_video = Video.objects.create(
            title="Old Video",
            video_url="https://example.com/old",
            uploader=user,
            visibility="public"
        )
        old_video.upload_date = current_time - datetime.timedelta(days=30)
        old_video.save(update_fields=['upload_date'])
        
        # Test trending videos (should only include the recent one)
        trending = Video.get_trending_videos(limit=10)
        assert len(trending) == 1
        assert trending[0].id == video1.id
    
    def test_get_category_videos(self):
        # Create test data
        user = User.objects.create_user(
            email="category_test@example.com",
            firebase_uid="category_uid"
        )
        
        # Create videos in different categories
        tech_video = Video.objects.create(
            title="Tech Video",
            video_url="https://example.com/tech",
            uploader=user,
            visibility="public",
            category="Technology"
        )
        
        music_video = Video.objects.create(
            title="Music Video",
            video_url="https://example.com/music",
            uploader=user,
            visibility="public",
            category="Music"
        )
        
        # Test getting videos by category
        tech_videos = Video.get_category_videos(category="Technology", limit=10)
        assert len(tech_videos) == 1
        assert tech_videos[0].id == tech_video.id
        
        # Test with no category (should return all public videos)
        all_videos = Video.get_category_videos(category="", limit=10)
        assert len(all_videos) == 2
    
    def test_get_recently_uploaded_videos(self):
        # Create test data
        user = User.objects.create_user(
            email="recent_test@example.com",
            firebase_uid="recent_uid"
        )
        
        # Create videos with different upload dates
        video1 = Video.objects.create(
            title="Recent Video 1",
            video_url="https://example.com/recent1",
            uploader=user,
            visibility="public"
        )
        
        video2 = Video.objects.create(
            title="Recent Video 2",
            video_url="https://example.com/recent2",
            uploader=user,
            visibility="public"
        )
        
        # Set different upload dates
        # Make video2 more recent than video1
        now = timezone.now()
        video1.upload_date = now - datetime.timedelta(days=2)
        video1.save(update_fields=['upload_date'])
        
        video2.upload_date = now - datetime.timedelta(days=1)
        video2.save(update_fields=['upload_date'])
        
        # Test getting recently uploaded videos
        recent_videos = Video.get_recently_uploaded_videos(limit=2)
        assert len(recent_videos) == 2
        assert recent_videos[0].id == video2.id  # Most recent
        assert recent_videos[1].id == video1.id  # Less recent
        
        # Test with limit=1
        recent_videos = Video.get_recently_uploaded_videos(limit=1)
        assert len(recent_videos) == 1
        assert recent_videos[0].id == video2.id

@pytest.mark.django_db
class TestVideoViewModel:
    def test_video_view_creation(self):
        # Create user and video
        user = User.objects.create_user(
            email="viewer@example.com",
            firebase_uid="vieweruid123"
        )
        
        uploader = User.objects.create_user(
            email="uploader@example.com",
            firebase_uid="uploaderuid123"
        )
        
        video = Video.objects.create(
            title="Test Video",
            video_url="https://example.com/video",
            uploader=uploader
        )
        
        # Create a video view
        view = VideoView.objects.create(
            video=video,
            viewer=user
        )
        
        # Test view properties
        assert view.video == video
        assert view.viewer == user
        assert view.viewed_at is not None
    
    def test_video_view_str(self):
        # Create user and video
        user = User.objects.create_user(
            email="viewer_str@example.com",
            firebase_uid="viewer_str_uid"
        )
        
        uploader = User.objects.create_user(
            email="uploader_str@example.com",
            firebase_uid="uploader_str_uid"
        )
        
        video = Video.objects.create(
            title="String Test Video",
            video_url="https://example.com/string_test",
            uploader=uploader
        )
        
        # Create a video view
        view = VideoView.objects.create(
            video=video,
            viewer=user
        )
        
        # Test string representation
        assert str(view) == f"{user.email} viewed {video.title}"

@pytest.mark.django_db
class TestVideoLikeModel:
    def test_video_like_creation(self):
        # Create user and video
        user = User.objects.create_user(
            email="liker@example.com",
            firebase_uid="likeruid123"
        )
        
        uploader = User.objects.create_user(
            email="uploader_like@example.com",
            firebase_uid="uploader_like_uid"
        )
        
        video = Video.objects.create(
            title="Like Test Video",
            video_url="https://example.com/like_test",
            uploader=uploader
        )
        
        # Create a video like
        like = VideoLike.objects.create(
            video=video,
            user=user
        )
        
        # Test like properties
        assert like.video == video
        assert like.user == user
        assert like.liked_at is not None
    
    def test_video_like_str(self):
        # Create user and video
        user = User.objects.create_user(
            email="liker_str@example.com",
            firebase_uid="liker_str_uid"
        )
        
        uploader = User.objects.create_user(
            email="uploader_like_str@example.com",
            firebase_uid="uploader_like_str_uid"
        )
        
        video = Video.objects.create(
            title="Like String Test",
            video_url="https://example.com/like_string_test",
            uploader=uploader
        )
        
        # Create a video like
        like = VideoLike.objects.create(
            video=video,
            user=user
        )
        
        # Test string representation
        assert str(like) == f"{user.email} liked {video.title}"
    
    def test_video_like_unique_together(self):
        # Test that a user can only like a video once
        user = User.objects.create_user(
            email="unique_liker@example.com",
            firebase_uid="unique_liker_uid"
        )
        
        uploader = User.objects.create_user(
            email="uploader_unique@example.com",
            firebase_uid="uploader_unique_uid"
        )
        
        video = Video.objects.create(
            title="Unique Like Test",
            video_url="https://example.com/unique_like",
            uploader=uploader
        )
        
        # Create first like - should succeed
        VideoLike.objects.create(
            video=video,
            user=user
        )
        
        # Attempt to create a second like for the same user/video - should fail
        with pytest.raises(Exception):  # Could be IntegrityError or other DB exception
            VideoLike.objects.create(
                video=video,
                user=user
            )

@pytest.mark.django_db
class TestVideoShareModel:
    def test_video_share_creation(self):
        # Create user and video
        user = User.objects.create_user(
            email="sharer@example.com",
            firebase_uid="shareruid123"
        )
        
        uploader = User.objects.create_user(
            email="uploader_share@example.com",
            firebase_uid="uploader_share_uid"
        )
        
        video = Video.objects.create(
            title="Share Test Video",
            video_url="https://example.com/share_test",
            uploader=uploader
        )
        
        # Create a video share
        share = VideoShare.objects.create(
            video=video,
            created_by=user
        )
        
        # Test share properties
        assert share.video == video
        assert share.created_by == user
        assert share.share_token is not None
        assert share.created_at is not None
        assert share.access_count == 0
        assert share.active is True
    
    def test_video_share_str(self):
        # Create user and video
        user = User.objects.create_user(
            email="sharer_str@example.com",
            firebase_uid="sharer_str_uid"
        )
        
        uploader = User.objects.create_user(
            email="uploader_share_str@example.com",
            firebase_uid="uploader_share_str_uid"
        )
        
        video = Video.objects.create(
            title="Share String Test",
            video_url="https://example.com/share_string_test",
            uploader=uploader
        )
        
        # Create a video share
        share = VideoShare.objects.create(
            video=video,
            created_by=user
        )
        
        # Test string representation
        assert str(share) == f"Share for {video.title}"
    
    def test_share_token_uniqueness(self):
        # Create user and video
        user = User.objects.create_user(
            email="token_test@example.com",
            firebase_uid="token_test_uid"
        )
        
        uploader = User.objects.create_user(
            email="uploader_token@example.com",
            firebase_uid="uploader_token_uid"
        )
        
        video = Video.objects.create(
            title="Token Test Video",
            video_url="https://example.com/token_test",
            uploader=uploader
        )
        
        # Create a share with a specific token
        custom_token = "custom-token-12345"
        share = VideoShare.objects.create(
            video=video,
            created_by=user,
            share_token=custom_token
        )
        
        assert share.share_token == custom_token
        
        # Verify that share token is unique
        with pytest.raises(Exception):  # Could be IntegrityError or other DB exception
            VideoShare.objects.create(
                video=video,
                created_by=user,
                share_token=custom_token  # Same token, should fail
            )

@pytest.mark.django_db
class TestWebcamRecordingModel:
    def test_webcam_recording_creation(self):
        # Create users and video
        recorder = User.objects.create_user(
            email="recorder@example.com",
            firebase_uid="recorderuid123"
        )
        
        uploader = User.objects.create_user(
            email="uploader_webcam@example.com",
            firebase_uid="uploader_webcam_uid"
        )
        
        video = Video.objects.create(
            title="Webcam Test Video",
            video_url="https://example.com/webcam_test",
            uploader=uploader
        )
        
        # Create a webcam recording
        recording = WebcamRecording.objects.create(
            video=video,
            recorder=recorder,
            filename="test_recording.mp4"
        )
        
        # Test recording properties
        assert recording.video == video
        assert recording.recorder == recorder
        assert recording.filename == "test_recording.mp4"
        assert recording.recording_date is not None
        assert recording.upload_status == "pending"
        assert recording.upload_completed_at is None
        assert recording.recording_url is None
    
    def test_webcam_recording_str(self):
        # Create users and video
        recorder = User.objects.create_user(
            email="recorder_str@example.com",
            firebase_uid="recorder_str_uid"
        )
        
        uploader = User.objects.create_user(
            email="uploader_webcam_str@example.com",
            firebase_uid="uploader_webcam_str_uid"
        )
        
        video = Video.objects.create(
            title="Webcam String Test",
            video_url="https://example.com/webcam_string_test",
            uploader=uploader
        )
        
        # Create a webcam recording
        recording = WebcamRecording.objects.create(
            video=video,
            recorder=recorder,
            filename="string_test_recording.mp4"
        )
        
        # Test string representation
        assert str(recording) == f"Webcam Recording for Video {video.id} by {recorder.email}"
    
    def test_webcam_recording_status_update(self):
        # Create users and video
        recorder = User.objects.create_user(
            email="recorder_status@example.com",
            firebase_uid="recorder_status_uid"
        )
        
        uploader = User.objects.create_user(
            email="uploader_status@example.com",
            firebase_uid="uploader_status_uid"
        )
        
        video = Video.objects.create(
            title="Status Test Video",
            video_url="https://example.com/status_test",
            uploader=uploader
        )
        
        # Create a webcam recording
        recording = WebcamRecording.objects.create(
            video=video,
            recorder=recorder,
            filename="status_test.mp4"
        )
        
        # Initial status
        assert recording.upload_status == "pending"
        
        # Update to completed
        recording.upload_status = "completed"
        recording.upload_completed_at = timezone.now()
        recording.recording_url = "https://example.com/recording_url"
        recording.save()
        
        # Refresh from database
        recording.refresh_from_db()
        
        # Check updated values
        assert recording.upload_status == "completed"
        assert recording.upload_completed_at is not None
        assert recording.recording_url == "https://example.com/recording_url"
        
        # Update to failed
        recording.upload_status = "failed"
        recording.save()
        
        # Refresh from database
        recording.refresh_from_db()
        
        # Check updated status
        assert recording.upload_status == "failed"