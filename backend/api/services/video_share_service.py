from django.conf import settings
from django.shortcuts import get_object_or_404

from api.models import Video, VideoShare

class VideoShareService:
    """Service for handling video share operations"""
    
    @classmethod
    def create_share(cls, video_id, user):
        """
        Create a new share link for a video
        
        Args:
            video_id: The ID of the video
            user: The user creating the share
            
        Returns:
            VideoShare: The created share object
        """
        if not user or not user.is_authenticated:
            return None
            
        video = get_object_or_404(Video, id=video_id)
        share = VideoShare.objects.create(video=video, created_by=user)
        return share
    
    @classmethod
    def get_share_url(cls, share, frontend_url=None):
        """
        Get the full share URL for a video share
        
        Args:
            share: The VideoShare object
            frontend_url: Optional frontend URL override
            
        Returns:
            str: The full share URL
        """
        base_url = frontend_url or settings.FRONTEND_URL
        return f"{base_url}/video/{share.share_token}"
    
    @classmethod
    def increment_access_count(cls, share_token):
        """
        Increment the access count for a share link
        
        Args:
            share_token: The share token
            
        Returns:
            tuple: (share, video)
        """
        share = get_object_or_404(VideoShare, share_token=share_token, active=True)
        share.access_count += 1
        share.save(update_fields=["access_count"])
        return share, share.video