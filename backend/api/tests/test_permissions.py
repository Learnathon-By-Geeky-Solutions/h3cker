import pytest
from django.test import RequestFactory
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView
from django.contrib.auth import get_user_model

from api.permissions import (
    IsAdmin, 
    IsAdminOrReadOnly, 
    IsOwnerOrAdmin, 
    IsCompanyOrAdmin
)
from api.models import Video

User = get_user_model()

class DummyView(APIView):
    """A dummy view for testing permissions."""
    pass

@pytest.fixture
def factory():
    """Create a request factory."""
    return APIRequestFactory()  # Use APIRequestFactory instead of RequestFactory

@pytest.fixture
def admin_user():
    """Create an admin user for testing."""
    return User.objects.create_user(
        email='admin@example.com',
        password='testpassword',
        firebase_uid='admin_firebase_uid',
        role='admin'
    )

@pytest.fixture
def company_user():
    """Create a company user for testing."""
    return User.objects.create_user(
        email='company@example.com',
        password='testpassword',
        firebase_uid='company_firebase_uid',
        role='company'
    )

@pytest.fixture
def regular_user():
    """Create a regular user for testing."""
    return User.objects.create_user(
        email='regular@example.com',
        password='testpassword',
        firebase_uid='regular_firebase_uid',
        role='user'
    )

@pytest.fixture
def user_video(regular_user):
    """Create a video owned by the regular user."""
    return Video.objects.create(
        title='User Video',
        description='A video owned by the regular user',
        video_url='https://example.com/user_video',
        thumbnail_url='https://example.com/user_thumb',
        uploader=regular_user,
        visibility='public'
    )

@pytest.mark.django_db
class TestIsAdminPermission:
    """Tests for the IsAdmin permission class."""
    
    def test_admin_user_has_permission(self, factory, admin_user):
        """Test that an admin user has permission."""
        permission = IsAdmin()
        view = DummyView()
        request = factory.get('/')
        
        # Set the user attribute manually
        request.user = admin_user
        
        assert permission.has_permission(request, view) is True
    
    def test_company_user_no_permission(self, factory, company_user):
        """Test that a company user does not have permission."""
        permission = IsAdmin()
        view = DummyView()
        request = factory.get('/')
        
        # Set the user attribute manually
        request.user = company_user
        
        assert permission.has_permission(request, view) is False
    
    def test_regular_user_no_permission(self, factory, regular_user):
        """Test that a regular user does not have permission."""
        permission = IsAdmin()
        view = DummyView()
        request = factory.get('/')
        
        # Set the user attribute manually
        request.user = regular_user
        
        assert permission.has_permission(request, view) is False
    
    def test_unauthenticated_no_permission(self, factory):
        """Test that an unauthenticated user does not have permission."""
        permission = IsAdmin()
        view = DummyView()
        request = factory.get('/')
        
        # Create an AnonymousUser
        from django.contrib.auth.models import AnonymousUser
        request.user = AnonymousUser()
        
        assert permission.has_permission(request, view) is False

@pytest.mark.django_db
class TestIsAdminOrReadOnlyPermission:
    """Tests for the IsAdminOrReadOnly permission class."""
    
    def test_admin_user_get_request(self, factory, admin_user):
        """Test that an admin user can make GET requests."""
        permission = IsAdminOrReadOnly()
        view = DummyView()
        request = factory.get('/')
        request.user = admin_user
        
        assert permission.has_permission(request, view) is True
    
    def test_admin_user_post_request(self, factory, admin_user):
        """Test that an admin user can make POST requests."""
        permission = IsAdminOrReadOnly()
        view = DummyView()
        request = factory.post('/')
        request.user = admin_user
        
        assert permission.has_permission(request, view) is True
    
    def test_regular_user_get_request(self, factory, regular_user):
        """Test that a regular user can make GET requests."""
        permission = IsAdminOrReadOnly()
        view = DummyView()
        request = factory.get('/')
        request.user = regular_user
        
        assert permission.has_permission(request, view) is True
    
    def test_regular_user_post_request(self, factory, regular_user):
        """Test that a regular user cannot make POST requests."""
        permission = IsAdminOrReadOnly()
        view = DummyView()
        request = factory.post('/')
        request.user = regular_user
        
        assert permission.has_permission(request, view) is False
    
    def test_unauthenticated_get_request(self, factory):
        """Test that an unauthenticated user cannot make GET requests."""
        permission = IsAdminOrReadOnly()
        view = DummyView()
        request = factory.get('/')
        
        # Create an AnonymousUser
        from django.contrib.auth.models import AnonymousUser
        request.user = AnonymousUser()
        
        assert permission.has_permission(request, view) is False
    
    def test_unauthenticated_post_request(self, factory):
        """Test that an unauthenticated user cannot make POST requests."""
        permission = IsAdminOrReadOnly()
        view = DummyView()
        request = factory.post('/')
        
        # Create an AnonymousUser
        from django.contrib.auth.models import AnonymousUser
        request.user = AnonymousUser()
        
        assert permission.has_permission(request, view) is False

@pytest.mark.django_db
class TestIsOwnerOrAdminPermission:
    """Tests for the IsOwnerOrAdmin permission class."""
    
    def test_admin_user_not_owner(self, factory, admin_user, user_video):
        """Test that an admin user has permission even when not the owner."""
        permission = IsOwnerOrAdmin()
        view = DummyView()
        request = factory.get('/')
        request.user = admin_user
        
        assert permission.has_object_permission(request, view, user_video) is True
    
    def test_owner_has_permission(self, factory, regular_user, user_video):
        """Test that the owner has permission."""
        permission = IsOwnerOrAdmin()
        view = DummyView()
        request = factory.get('/')
        request.user = regular_user
        
        assert permission.has_object_permission(request, view, user_video) is True
    
    def test_non_owner_no_permission(self, factory, company_user, user_video):
        """Test that a non-owner, non-admin user does not have permission."""
        permission = IsOwnerOrAdmin()
        view = DummyView()
        request = factory.get('/')
        request.user = company_user
        
        assert permission.has_object_permission(request, view, user_video) is False

@pytest.mark.django_db
class TestIsCompanyOrAdminPermission:
    """Tests for the IsCompanyOrAdmin permission class."""
    
    def test_admin_user_has_permission(self, factory, admin_user):
        """Test that an admin user has permission."""
        permission = IsCompanyOrAdmin()
        view = DummyView()
        request = factory.get('/')
        request.user = admin_user
        
        assert permission.has_permission(request, view) is True
    
    def test_company_user_has_permission(self, factory, company_user):
        """Test that a company user has permission."""
        permission = IsCompanyOrAdmin()
        view = DummyView()
        request = factory.get('/')
        request.user = company_user
        
        assert permission.has_permission(request, view) is True
    
    def test_regular_user_no_permission(self, factory, regular_user):
        """Test that a regular user does not have permission."""
        permission = IsCompanyOrAdmin()
        view = DummyView()
        request = factory.get('/')
        request.user = regular_user
        
        assert permission.has_permission(request, view) is False
    
    def test_unauthenticated_no_permission(self, factory):
        """Test that an unauthenticated user does not have permission."""
        permission = IsCompanyOrAdmin()
        view = DummyView()
        request = factory.get('/')
        
        # Create an AnonymousUser
        from django.contrib.auth.models import AnonymousUser
        request.user = AnonymousUser()
        
        assert permission.has_permission(request, view) is False