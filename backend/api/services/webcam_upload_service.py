import logging
from typing import Optional, Tuple
from api.models import User, Video, WebcamRecording
from api.services.azure_storage_service import AzureStorageService

logger = logging.getLogger(__name__)

class WebcamUploadService:
    """Service layer for handling webcam recording upload operations."""

    @staticmethod
    def prepare_webcam_upload(filename: str) -> tuple[str, str]:
        """
        Generates SAS URLs for webcam recording uploads and views.
        Returns: (upload_url, view_url)
        """
        try:
            upload_url, view_url = AzureStorageService.get_emotion_urls(filename)
            return upload_url, view_url
        except Exception as e:
            logger.error(
                f"Failed to generate SAS tokens for webcam recording: {str(e)}",
                exc_info=True,
            )
            return None, None

    @staticmethod
    def create_webcam_recording(
        video: Video, user: User, filename: str, view_url: str
    ) -> Optional[WebcamRecording]:
        """Creates the WebcamRecording database entry."""
        try:
            recording = WebcamRecording.objects.create(
                video=video,
                recorder=user,
                filename=filename,
                recording_url=view_url,
            )
            return recording
        except Exception as e:
            logger.error(
                f"Failed to create webcam recording entry: {str(e)}", exc_info=True
            )
            return None