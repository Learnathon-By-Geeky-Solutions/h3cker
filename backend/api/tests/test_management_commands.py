import pytest
from io import StringIO
from django.core.management import call_command
from django.utils import timezone
from datetime import timedelta

from api.models import User, Video

@pytest.fixture
def test_user(db):
    """Fixture to create a regular user."""
    user = User.objects.create_user(
        email="test@example.com",
        firebase_uid="testuid123",
        password="testpassword",
        role="user"
    )
    return user

@pytest.mark.django_db
class TestCheckVideoPrivacyCommand:
    """Tests for the check_video_privacy management command."""

    def test_update_expired_videos(self, test_user):
        """Test that videos past their auto_private_after date are made private."""
        now = timezone.now()
        past_time = now - timedelta(days=1)
        future_time = now + timedelta(days=1)

        # Video that should become private
        expired_public = Video.objects.create(
            title="Expired Public",
            video_url="http://example.com/expired_public",
            uploader=test_user,
            visibility='public',
            auto_private_after=past_time
        )
        expired_unlisted = Video.objects.create(
            title="Expired Unlisted",
            video_url="http://example.com/expired_unlisted",
            uploader=test_user,
            visibility='unlisted',
            auto_private_after=past_time
        )

        # Video that should remain public
        not_expired = Video.objects.create(
            title="Not Expired",
            video_url="http://example.com/not_expired",
            uploader=test_user,
            visibility='public',
            auto_private_after=future_time
        )

        # Video that is already private (should remain private)
        already_private = Video.objects.create(
            title="Already Private Expired",
            video_url="http://example.com/already_private",
            uploader=test_user,
            visibility='private',
            auto_private_after=past_time
        )

        # Video with no expiry date (should remain public)
        no_expiry = Video.objects.create(
            title="No Expiry",
            video_url="http://example.com/no_expiry",
            uploader=test_user,
            visibility='public',
            auto_private_after=None
        )

        out = StringIO()
        call_command('check_video_privacy', stdout=out)

        expired_public.refresh_from_db()
        expired_unlisted.refresh_from_db()
        not_expired.refresh_from_db()
        already_private.refresh_from_db()
        no_expiry.refresh_from_db()

        assert expired_public.visibility == 'private'
        assert expired_unlisted.visibility == 'private'
        assert not_expired.visibility == 'public'
        assert already_private.visibility == 'private'
        assert no_expiry.visibility == 'public'

        output = out.getvalue()
        assert 'Updated 2 expired videos' in output

    def test_update_view_limited_videos(self, test_user):
        """Test that videos reaching their view limit are made private."""
        # Video that should become private (limit reached)
        limit_reached_public = Video.objects.create(
            title="Limit Reached Public",
            video_url="http://example.com/limit_reached_public",
            uploader=test_user,
            visibility='public',
            view_limit=100,
            views=100
        )
        limit_reached_unlisted = Video.objects.create(
            title="Limit Reached Unlisted",
            video_url="http://example.com/limit_reached_unlisted",
            uploader=test_user,
            visibility='unlisted',
            view_limit=50,
            views=55 # Exceeded limit
        )

        # Video that should remain public (limit not reached)
        limit_not_reached = Video.objects.create(
            title="Limit Not Reached",
            video_url="http://example.com/limit_not_reached",
            uploader=test_user,
            visibility='public',
            view_limit=100,
            views=99
        )

        # Video that is already private (should remain private)
        already_private_limit = Video.objects.create(
            title="Already Private Limit Reached",
            video_url="http://example.com/already_private_limit",
            uploader=test_user,
            visibility='private',
            view_limit=100,
            views=100
        )

        # Video with no view limit (should remain public)
        no_limit = Video.objects.create(
            title="No Limit",
            video_url="http://example.com/no_limit",
            uploader=test_user,
            visibility='public',
            view_limit=None,
            views=1000
        )

        # Video with view limit 0 (should be ignored and remain public)
        zero_limit = Video.objects.create(
            title="Zero Limit",
            video_url="http://example.com/zero_limit",
            uploader=test_user,
            visibility='public',
            view_limit=0,
            views=10
        )

        out = StringIO()
        call_command('check_video_privacy', stdout=out)

        limit_reached_public.refresh_from_db()
        limit_reached_unlisted.refresh_from_db()
        limit_not_reached.refresh_from_db()
        already_private_limit.refresh_from_db()
        no_limit.refresh_from_db()
        zero_limit.refresh_from_db()

        assert limit_reached_public.visibility == 'private'
        assert limit_reached_unlisted.visibility == 'private'
        assert limit_not_reached.visibility == 'public'
        assert already_private_limit.visibility == 'private'
        assert no_limit.visibility == 'public'
        assert zero_limit.visibility == 'public'

        output = out.getvalue()
        assert 'Updated 2 videos that reached view limit' in output

    def test_no_videos_to_update(self, test_user):
        """Test the command when there are no videos needing updates."""
        now = timezone.now()
        future_time = now + timedelta(days=1)

        # Videos that don't need updating
        Video.objects.create(
            title="Normal Public",
            video_url="http://example.com/normal_public",
            uploader=test_user,
            visibility='public',
            auto_private_after=future_time,
            view_limit=100,
            views=50
        )
        Video.objects.create(
            title="Normal Private",
            video_url="http://example.com/normal_private",
            uploader=test_user,
            visibility='private',
            auto_private_after=now - timedelta(days=1), # Expired but already private
            view_limit=10,
            views=20 # Limit reached but already private
        )

        out = StringIO()
        call_command('check_video_privacy', stdout=out)

        output = out.getvalue()
        assert 'Updated 0 expired videos' in output
        assert 'Updated 0 videos that reached view limit' in output
