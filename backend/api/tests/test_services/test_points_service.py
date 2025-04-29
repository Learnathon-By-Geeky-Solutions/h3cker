import pytest
from django.db import transaction

from api.models import User, ViewerProfile
from api.services.points_service import PointsService


@pytest.fixture
def test_user(db):
    """Create a test user."""
    return User.objects.create_user(
        email="viewer@example.com",
        firebase_uid="viewer_uid123",
        password="testpass123",
        role="user"
    )


@pytest.fixture
def viewer_profile(db, test_user):
    """Create a viewer profile for the test user."""
    return ViewerProfile.objects.create(
        user=test_user,
        points=0,
        points_earned=0,
        points_redeemed=0
    )


@pytest.mark.django_db
class TestPointsService:
    """Test suite for PointsService."""

    def test_award_points_for_webcam_upload_existing_profile(self, test_user, viewer_profile):
        """Test awarding points to a user with an existing profile."""
        initial_points = viewer_profile.points
        initial_earned = viewer_profile.points_earned
        
        profile, points_awarded = PointsService.award_points_for_webcam_upload(test_user)
        
        # Default points should be 5
        assert points_awarded == 5
        assert profile.points == initial_points + 5
        assert profile.points_earned == initial_earned + 5
        
        # Verify database was updated
        viewer_profile.refresh_from_db()
        assert viewer_profile.points == initial_points + 5
        assert viewer_profile.points_earned == initial_earned + 5

    def test_award_points_for_webcam_upload_new_profile(self, db, test_user):
        """Test awarding points to a user without an existing profile."""
        # Ensure no profile exists
        ViewerProfile.objects.filter(user=test_user).delete()
        
        profile, points_awarded = PointsService.award_points_for_webcam_upload(test_user)
        
        assert points_awarded == 5
        assert profile.points == 5
        assert profile.points_earned == 5
        
        # Verify profile was created in database
        assert ViewerProfile.objects.filter(user=test_user).exists()
        db_profile = ViewerProfile.objects.get(user=test_user)
        assert db_profile.points == 5
        assert db_profile.points_earned == 5

    def test_award_points_custom_amount(self, test_user, viewer_profile):
        """Test awarding a custom number of points."""
        initial_points = viewer_profile.points
        initial_earned = viewer_profile.points_earned
        custom_points = 10
        
        profile, points_awarded = PointsService.award_points_for_webcam_upload(test_user, points=custom_points)
        
        assert points_awarded == custom_points
        assert profile.points == initial_points + custom_points
        assert profile.points_earned == initial_earned + custom_points
        
        # Verify database was updated
        viewer_profile.refresh_from_db()
        assert viewer_profile.points == initial_points + custom_points
        assert viewer_profile.points_earned == initial_earned + custom_points

    def test_award_points_transaction_integrity(self, test_user, viewer_profile, monkeypatch):
        """Test transaction integrity by simulating a failure during point awarding."""
        # Mock the save method to raise an exception
        def mock_save(*args, **kwargs):
            raise Exception("Simulated database error")
            
        monkeypatch.setattr(ViewerProfile, "save", mock_save)
        
        initial_points = viewer_profile.points
        initial_earned = viewer_profile.points_earned
        
        # Attempt to award points - should fail
        with pytest.raises(Exception):
            with transaction.atomic():
                PointsService.award_points_for_webcam_upload(test_user)
        
        # Verify no points were added (transaction should have rolled back)
        viewer_profile.refresh_from_db()
        assert viewer_profile.points == initial_points
        assert viewer_profile.points_earned == initial_earned