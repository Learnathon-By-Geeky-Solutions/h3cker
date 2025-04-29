import logging
from typing import Optional, Tuple
from django.conf import settings
from django.utils import timezone
from api.models import User, Video
from api.services.azure_storage_service import AzureStorageService

logger = logging.getLogger(__name__)

class VideoUploadService:
    """Service layer for handling video upload related operations."""

    @staticmethod
    def prepare_video_upload(filename: str) -> tuple[str, str, str, str]:
        """
        Generates SAS URLs for video and thumbnail uploads and views.
        Returns: (video_upload_url, video_view_url, thumbnail_upload_url, thumbnail_view_url)
        """
        try:
            video_upload_url, video_view_url = AzureStorageService.get_video_urls(
                filename
            )
            thumbnail_upload_url, thumbnail_view_url = (
                AzureStorageService.get_thumbnail_urls(filename)
            )
            return (
                video_upload_url,
                video_view_url,
                thumbnail_upload_url,
                thumbnail_view_url,
            )
        except Exception as e:
            logger.error(
                f"Failed to generate SAS tokens for video/thumbnail: {str(e)}",
                exc_info=True,
            )
            return None, None, None, None

    @staticmethod
    def save_video_metadata(
        serializer, uploader: User, video_view_url: str, thumbnail_view_url: str
    ):
        """Saves the video metadata after generating URLs."""
        try:
            serializer.save(
                uploader=uploader,
                video_url=video_view_url,
                thumbnail_url=thumbnail_view_url,
            )
        except Exception as e:
            logger.error(f"Failed to save video metadata: {str(e)}", exc_info=True)
            return None