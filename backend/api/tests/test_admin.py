from django.test import TestCase, RequestFactory
from django.contrib.admin.sites import AdminSite
from django.contrib.messages.storage.fallback import FallbackStorage
from django.urls import reverse
from django.utils import timezone
import datetime

from api.admin import VideoViewAdmin, VideoLikeAdmin, VideoShareAdmin
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
        request = self.factory.post('/')
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
        request = self.factory.post('/')
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
        request = self.factory.post('/')
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