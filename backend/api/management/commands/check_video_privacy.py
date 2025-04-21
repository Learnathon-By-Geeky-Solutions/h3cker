from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Video
from api.utils import should_make_private, make_video_private

class Command(BaseCommand):
    help = 'Check and update video privacy based on limits and expiry dates'
    
    def handle(self, *args, **kwargs):
        self._update_expired_videos()
        self._update_view_limited_videos()
    
    def _update_expired_videos(self):
        """Update videos that have passed their expiration date."""
        now = timezone.now()
        expired_videos = Video.objects.filter(
            auto_private_after__lte=now,
            visibility__in=['public', 'unlisted']
        )
        expired_count = expired_videos.update(visibility='private')
        self.stdout.write(f'Updated {expired_count} expired videos')
    
    def _update_view_limited_videos(self):
        """Update videos that have reached their view limit."""
        limit_videos = Video.objects.filter(
            view_limit__isnull=False,
            visibility__in=['public', 'unlisted']
        ).exclude(view_limit=0)
        
        limit_count = 0
        for video in limit_videos:
            if video.views >= video.view_limit:
                video.visibility = 'private'
                video.save(update_fields=['visibility'])
                limit_count += 1
        
        self.stdout.write(f'Updated {limit_count} videos that reached view limit')