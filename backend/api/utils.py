from django.utils import timezone
from django.db.models import F

def should_make_private(video):
    """Check if video should be made private based on limits."""
    # Check view limit
    if video.view_limit and video.views >= video.view_limit:
        return True
        
    # Check expiry date
    if video.auto_private_after and timezone.now() >= video.auto_private_after:
        return True
        
    return False

def make_video_private(video):
    """Make a video private if it's not already."""
    if video.visibility != 'private':
        video.visibility = 'private'
        video.save(update_fields=['visibility'])
        return True
    return False

def record_user_view(video, user):
    """Record that a user has viewed a video."""
    from .models import VideoView
    if user.is_authenticated:
        VideoView.objects.get_or_create(
            video=video,
            viewer=user,
            defaults={'viewed_at': timezone.now()}
        )

def increment_video_views(video):
    """Safely increment view count using F() expressions."""
    video.views = F('views') + 1
    video.save(update_fields=['views'])
    video.refresh_from_db()
    return video.views

def parse_video_identifier(identifier):
    """
    Parse video identifier to determine if it's a numeric ID or UUID.
    Returns tuple: (is_numeric, parsed_value)
    """
    # Check if it's a numeric ID
    if identifier.isdigit():
        return True, int(identifier)
    
    # It's likely a UUID - let the caller handle validation
    return False, identifier