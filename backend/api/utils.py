from django.utils import timezone
from django.db.models import F

def should_make_private(video):
    if video.view_limit and video.views >= video.view_limit:
        return True
        
    # Check expiry time
    if video.auto_private_after and timezone.now() >= video.auto_private_after:
        return True
        
    return False

def make_video_private(video):
    if video.visibility != 'private':
        video.visibility = 'private'
        video.save(update_fields=['visibility'])
        return True
    return False

def record_user_view(video, user):
    from .models import VideoView
    
    if user and user.is_authenticated:
        # Check if the user has already viewed this video
        VideoView.objects.get_or_create(
            video=video,
            viewer=user,
            defaults={'viewed_at': timezone.now()}
        )

def increment_video_views(video):
    video.views = F('views') + 1
    video.save(update_fields=['views'])
    video.refresh_from_db()
    return video.views