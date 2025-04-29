from django.db.models import F
from django.shortcuts import get_object_or_404

from api.models import Video, VideoLike

class VideoLikeService:
    """Service for handling video like operations"""

    @classmethod
    def toggle_like(cls, video_id, user):
        """
        Toggle like status for a video.
        
        Args:
            video_id: The ID of the video
            user: The user performing the like/unlike
            
        Returns:
            tuple: (video, liked, like_count)
        """
        if not user or not user.is_authenticated:
            return None, False, 0
            
        video = get_object_or_404(Video, id=video_id)
        like, created = VideoLike.objects.get_or_create(video=video, user=user)
        
        if created:
            # User liked the video
            return cls.add_like(video, like)
        else:
            # User unliked the video
            return cls.remove_like(video, like)
    
    @staticmethod
    def add_like(video, like):
        """Add a like to a video"""
        video.likes = F("likes") + 1
        video.save(update_fields=["likes"])
        video.refresh_from_db()
        return video, True, video.likes
    
    @staticmethod
    def remove_like(video, like):
        """Remove a like from a video"""
        like.delete()
        video.likes = F("likes") - 1
        video.save(update_fields=["likes"])
        video.refresh_from_db()
        return video, False, video.likes