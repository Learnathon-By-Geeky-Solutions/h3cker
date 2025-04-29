from django.test import TestCase, RequestFactory
from django.contrib.admin.sites import AdminSite
from django.contrib.messages.storage.fallback import FallbackStorage
from django.urls import reverse
from django.utils import timezone
import datetime
import csv
from io import StringIO
from unittest.mock import patch, MagicMock
import pytest

from api.admin import VideoViewAdmin, VideoLikeAdmin, VideoShareAdmin, VideoAdmin, UserAdmin, ViewerProfileAdmin
from api.models import User, Video, VideoView, VideoLike, VideoShare


class MockSuperUser:
    def has_perm(self, perm):
        return True


class AdminTestCase(TestCase):
    def setUp(self):
        # Create a superuser for admin tests
        self.superuser = User.objects.create_superuser(
            email='admin@example.com',
            firebase_uid='admin123',
            password='adminpassword',
            first_name='Admin',
            last_name='User'
        )
        
        # Create a company user for uploading videos
        self.company_user = User.objects.create_user(
            email='company@example.com',
            firebase_uid='company123',
            password='companypassword',
            role='company'
        )
        
        # Create a regular user for viewing videos
        self.regular_user = User.objects.create_user(
            email='user@example.com',
            firebase_uid='user123',
            password='userpassword',
            role='user'
        )
        
        # Create a test video
        self.video = Video.objects.create(
            title='Test Video',
            description='This is a test video',
            category='Testing',
            visibility='public',
            video_url='https://example.com/video.mp4',
            thumbnail_url='https://example.com/thumbnail.jpg',
            uploader=self.company_user
        )
        
        # Create video view, like, and share records
        self.video_view = VideoView.objects.create(
            video=self.video,
            viewer=self.regular_user
        )
        
        self.video_like = VideoLike.objects.create(
            video=self.video,
            user=self.regular_user
        )
        
        self.video_share = VideoShare.objects.create(
            video=self.video,
            created_by=self.company_user,
            active=True
        )
        
        # Setup mock admin site
        self.site = AdminSite()
        self.factory = RequestFactory()
        
        # Set up admin classes
        self.video_admin = VideoAdmin(Video, self.site)
        self.video_view_admin = VideoViewAdmin(VideoView, self.site)
        self.video_like_admin = VideoLikeAdmin(VideoLike, self.site)
        self.video_share_admin = VideoShareAdmin(VideoShare, self.site)


class VideoViewAdminTest(AdminTestCase):
    def test_list_display(self):
        self.assertEqual(
            self.video_view_admin.list_display, 
            ('video', 'viewer', 'viewed_at')
        )
    
    def test_search_fields(self):
        self.assertEqual(
            self.video_view_admin.search_fields, 
            ('video__title', 'viewer__email')
        )
    
    def test_readonly_fields(self):
        self.assertEqual(
            self.video_view_admin.readonly_fields,
            ('viewed_at',)
        )


class VideoLikeAdminTest(AdminTestCase):
    def test_list_display(self):
        self.assertEqual(
            self.video_like_admin.list_display, 
            ('video', 'user', 'liked_at')
        )
    
    def test_search_fields(self):
        self.assertEqual(
            self.video_like_admin.search_fields, 
            ('video__title', 'user__email')
        )
    
    def test_readonly_fields(self):
        self.assertEqual(
            self.video_like_admin.readonly_fields,
            ('liked_at',)
        )


class VideoShareAdminTest(AdminTestCase):
    def test_list_display(self):
        self.assertEqual(
            self.video_share_admin.list_display, 
            ('video', 'created_by', 'share_token', 'access_count', 'active')
        )
    
    def test_search_fields(self):
        self.assertEqual(
            self.video_share_admin.search_fields, 
            ('video__title', 'created_by__email', 'share_token')
        )
    
    def test_readonly_fields(self):
        self.assertEqual(
            self.video_share_admin.readonly_fields,
            ('created_at', 'share_token')
        )
    
    def test_activate_shares_action(self):
        # Create a deactivated share
        inactive_share = VideoShare.objects.create(
            video=self.video,
            created_by=self.company_user,
            active=False
        )
        
        # Set up the admin action request
        request = self.factory.post('/admin/')
        request.user = self.superuser
        
        # Add support for messaging framework
        setattr(request, 'session', 'session')
        messages = FallbackStorage(request)
        setattr(request, '_messages', messages)
        
        # Execute the action
        queryset = VideoShare.objects.filter(id=inactive_share.id)
        self.video_share_admin.activate_shares(request, queryset)
        
        # Verify the share was activated
        inactive_share.refresh_from_db()
        self.assertTrue(inactive_share.active)
    
    def test_deactivate_shares_action(self):
        # Set up the admin action request
        request = self.factory.post('/admin/')
        request.user = self.superuser
        
        # Add support for messaging framework
        setattr(request, 'session', 'session')
        messages = FallbackStorage(request)
        setattr(request, '_messages', messages)
        
        # Execute the action
        queryset = VideoShare.objects.filter(id=self.video_share.id)
        self.video_share_admin.deactivate_shares(request, queryset)
        
        # Verify the share was deactivated
        self.video_share.refresh_from_db()
        self.assertFalse(self.video_share.active)
    
    def test_reset_access_count_action(self):
        # Update the share to have some access count
        self.video_share.access_count = 10
        self.video_share.save()
        
        # Set up the admin action request
        request = self.factory.post('/admin/')
        request.user = self.superuser
        
        # Add support for messaging framework
        setattr(request, 'session', 'session')
        messages = FallbackStorage(request)
        setattr(request, '_messages', messages)
        
        # Execute the action
        queryset = VideoShare.objects.filter(id=self.video_share.id)
        self.video_share_admin.reset_access_count(request, queryset)
        
        # Verify the access count was reset
        self.video_share.refresh_from_db()
        self.assertEqual(self.video_share.access_count, 0)


class VideoAdminTest(AdminTestCase):
    def create_request_with_messages(self):
        request = self.factory.post('/')
        request.user = self.superuser
        setattr(request, 'session', 'session')
        messages = FallbackStorage(request)
        setattr(request, '_messages', messages)
        return request
        
    def test_list_display(self):
        self.assertEqual(
            self.video_admin.list_display, 
            ('title', 'uploader', 'visibility', 'views', 'likes', 'upload_date')
        )
    
    def test_search_fields(self):
        self.assertEqual(
            self.video_admin.search_fields, 
            ('title', 'description', 'uploader__email')
        )
    
    def test_readonly_fields(self):
        self.assertEqual(
            self.video_admin.readonly_fields,
            ('views', 'likes')
        )
    
    def test_make_videos_private(self):
        # Create a public video
        public_video = Video.objects.create(
            title='Public Video',
            description='This is a public video',
            visibility='public',
            video_url='https://example.com/public.mp4',
            uploader=self.company_user
        )
        
        # Set up the admin action request
        request = self.create_request_with_messages()
        
        # Execute the action
        queryset = Video.objects.filter(id=public_video.id)
        self.video_admin.make_videos_private(request, queryset)
        
        # Verify the video was made private
        public_video.refresh_from_db()
        self.assertEqual(public_video.visibility, 'private')
    
    def test_make_videos_public(self):
        # Create a private video
        private_video = Video.objects.create(
            title='Private Video',
            description='This is a private video',
            visibility='private',
            video_url='https://example.com/private.mp4',
            uploader=self.company_user
        )
        
        # Set up the admin action request
        request = self.create_request_with_messages()
        
        # Execute the action
        queryset = Video.objects.filter(id=private_video.id)
        self.video_admin.make_videos_public(request, queryset)
        
        # Verify the video was made public
        private_video.refresh_from_db()
        self.assertEqual(private_video.visibility, 'public')
    
    def test_reset_video_statistics(self):
        # Create a video with some statistics
        video_with_stats = Video.objects.create(
            title='Video With Stats',
            description='This video has views and likes',
            visibility='public',
            video_url='https://example.com/stats.mp4',
            uploader=self.company_user,
            views=100,
            likes=50
        )
        
        # Create some views and likes for this video
        VideoView.objects.create(
            video=video_with_stats,
            viewer=self.regular_user
        )
        
        VideoLike.objects.create(
            video=video_with_stats,
            user=self.regular_user
        )
        
        # Set up the admin action request
        request = self.create_request_with_messages()
        
        # Execute the action
        queryset = Video.objects.filter(id=video_with_stats.id)
        self.video_admin.reset_video_statistics(request, queryset)
        
        # Verify the statistics were reset
        video_with_stats.refresh_from_db()
        self.assertEqual(video_with_stats.views, 0)
        self.assertEqual(video_with_stats.likes, 0)
        
        # Verify related records were deleted
        self.assertEqual(VideoView.objects.filter(video=video_with_stats).count(), 0)
        self.assertEqual(VideoLike.objects.filter(video=video_with_stats).count(), 0)
    
    def test_create_new_share_links(self):
        # Set up the admin action request
        request = self.create_request_with_messages()
        request.user = self.superuser
        
        # Get initial count of share links
        initial_count = VideoShare.objects.filter(video=self.video).count()
        
        # Execute the action
        queryset = Video.objects.filter(id=self.video.id)
        self.video_admin.create_new_share_links(request, queryset)
        
        # Verify a new share link was created
        new_count = VideoShare.objects.filter(video=self.video).count()
        self.assertEqual(new_count, initial_count + 1)
    
    @patch('api.admin.should_make_private')
    @patch('api.admin.make_video_private')
    def test_check_privacy_limits(self, mock_make_private, mock_should_make_private):
        # Setup mocks
        mock_should_make_private.return_value = True
        mock_make_private.return_value = True
        
        # Set up the admin action request
        request = self.create_request_with_messages()
        
        # Execute the action
        queryset = Video.objects.filter(id=self.video.id)
        self.video_admin.check_privacy_limits(request, queryset)
        
        # Verify mocks were called correctly
        mock_should_make_private.assert_called_once_with(self.video)
        mock_make_private.assert_called_once_with(self.video)
    
    def test_export_video_data(self):
        # Set up the admin action request
        request = self.create_request_with_messages()
        
        # Execute the action
        queryset = Video.objects.filter(id=self.video.id)
        response = self.video_admin.export_video_data(request, queryset)
        
        # Verify the response
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertEqual(response['Content-Disposition'], 'attachment; filename="videos.csv"')
        
        # Parse the CSV content to verify data
        content = response.content.decode('utf-8')
        csv_reader = csv.reader(StringIO(content))
        rows = list(csv_reader)
        
        # Verify header row
        self.assertEqual(
            rows[0], 
            ['ID', 'Title', 'Uploader', 'Category', 'Visibility', 'Views', 'Likes', 'Upload Date', 'Duration', 'View Limit']
        )
        
        # Verify data row
        self.assertEqual(rows[1][0], str(self.video.id))
        self.assertEqual(rows[1][1], self.video.title)
        self.assertEqual(rows[1][2], self.video.uploader.email)
        self.assertEqual(rows[1][3], self.video.category)
        self.assertEqual(rows[1][4], self.video.visibility)
        self.assertEqual(rows[1][5], str(self.video.views))
        self.assertEqual(rows[1][6], str(self.video.likes))
        # Add assertions for other columns like Upload Date, Duration, View Limit if needed
        # Example for upload date (requires formatting):
        # self.assertEqual(rows[1][7], self.video.upload_date.strftime('%Y-%m-%d %H:%M:%S')) # Adjust format as needed


@pytest.mark.django_db
class TestUserAdmin:
    """Test suite for UserAdmin."""

    def test_user_admin_queryset_filtering(self, admin_site, test_user, company_user, admin_user, request_factory):
        """Test queryset filtering in UserAdmin."""
        user_admin = UserAdmin(User, admin_site)
        request = request_factory.get('/')
        request.user = admin_user # Simulate an admin user making the request

        # No filter
        changelist = user_admin.get_changelist_instance(request)
        queryset = changelist.get_queryset(request)
        assert queryset.count() == 3

        # Filter by role=user
        request_user = request_factory.get('/', {'role': 'user'})
        request_user.user = admin_user
        changelist_user = user_admin.get_changelist_instance(request_user)
        queryset_user = changelist_user.get_queryset(request_user)
        assert queryset_user.count() == 1
        assert queryset_user.first() == test_user

        # Filter by is_staff=True (should be empty unless an admin is staff)
        admin_user.is_staff = True
        admin_user.save()
        request_staff = request_factory.get('/', {'is_staff': 'True'})
        request_staff.user = admin_user
        changelist_staff = user_admin.get_changelist_instance(request_staff)
        queryset_staff = changelist_staff.get_queryset(request_staff)
        assert queryset_staff.count() == 1
        assert queryset_staff.first() == admin_user


@pytest.mark.django_db
class TestViewerProfileAdmin:
    """Test suite for ViewerProfileAdmin."""

    def test_viewer_profile_admin_search(self, admin_site, viewer_user, request_factory, admin_user):
        """Test searching in ViewerProfileAdmin."""
        profile_admin = ViewerProfileAdmin(ViewerProfile, admin_site)
        request = request_factory.get('/', {'q': viewer_user.email})
        request.user = admin_user # Simulate admin

        changelist = profile_admin.get_changelist_instance(request)
        queryset = changelist.get_queryset(request)

        assert queryset.count() == 1
        assert queryset.first().user == viewer_user

        request_no_match = request_factory.get('/', {'q': 'nomatch@example.com'})
        request_no_match.user = admin_user
        changelist_no_match = profile_admin.get_changelist_instance(request_no_match)
        queryset_no_match = changelist_no_match.get_queryset(request_no_match)
        assert queryset_no_match.count() == 0