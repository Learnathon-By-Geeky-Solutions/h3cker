import logging
from django.db import transaction
from api.models import ViewerProfile

logger = logging.getLogger(__name__)


class PointsService:
    @staticmethod
    def award_points_for_webcam_upload(user, points=5):
        """Awards points to a user for successfully uploading webcam data."""
        with transaction.atomic():
            profile, _ = ViewerProfile.objects.get_or_create(user=user)
            profile.points += points
            profile.points_earned += points
            profile.save(update_fields=["points", "points_earned"])
        return profile, points