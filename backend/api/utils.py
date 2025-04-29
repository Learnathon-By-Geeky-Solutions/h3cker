from django.db.models import F
from django.utils import timezone


def should_make_private(video):
    if video.view_limit and video.views >= video.view_limit:
        return True

    # Check expiry time
    if video.auto_private_after and timezone.now() >= video.auto_private_after:
        return True

    return False


def make_video_private(video):
    if video.visibility != "private":
        video.visibility = "private"
        video.save(update_fields=["visibility"])
        return True
    return False


def record_user_view(video, user):
    from .models import VideoView

    if user and user.is_authenticated:
        # Check if the user has already viewed this video
        VideoView.objects.get_or_create(
            video=video, viewer=user, defaults={"viewed_at": timezone.now()}
        )


def increment_video_views(video):
    video.views = F("views") + 1
    video.save(update_fields=["views"])
    video.refresh_from_db()
    return video.views


def safe_int_param(request, param_name, default_value, min_value=None, max_value=None):
    """Safely parse integer parameters from request with validation."""
    try:
        value = int(request.query_params.get(param_name, default_value))

        if min_value is not None:
            value = max(min_value, value)
        if max_value is not None:
            value = min(max_value, value)

        return value
    except (ValueError, TypeError):
        return default_value
