import logging
from typing import Optional
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from api.models import ViewerProfile, Video, WebcamRecording, User
from azure.storage.blob import generate_blob_sas, BlobSasPermissions

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


class AzureStorageService:
    """Handles low-level interaction with Azure Blob Storage, like generating SAS URLs."""

    @staticmethod
    def get_storage_credentials():
        return {
            "account_name": settings.AZURE_STORAGE_ACCOUNT_NAME,
            "account_key": settings.AZURE_STORAGE_ACCOUNT_KEY,
            "video_container": settings.AZURE_VIDEO_CONTAINER_NAME,
            "thumbnail_container": settings.AZURE_THUMBNAIL_CONTAINER_NAME,
            "emotion_container": settings.AZURE_WEBCAM_CONTAINER_NAME,
        }

    @staticmethod
    def generate_sas_url(
        account_name, container_name, blob_name, account_key, permission, expiry_hours
    ):
        expiry = timezone.now() + timezone.timedelta(hours=expiry_hours)
        sas_token = generate_blob_sas(
            account_name=account_name,
            container_name=container_name,
            blob_name=blob_name,
            account_key=account_key,
            permission=permission,
            expiry=expiry,
        )
        return f"https://{account_name}.blob.core.windows.net/{container_name}/{blob_name}?{sas_token}"

    @classmethod
    def get_video_urls(cls, filename):
        creds = cls.get_storage_credentials()
        upload_permission = BlobSasPermissions(write=True, create=True, add=True)
        view_permission = BlobSasPermissions(read=True)

        video_upload_url = cls.generate_sas_url(
            creds["account_name"],
            creds["video_container"],
            filename,
            creds["account_key"],
            upload_permission,
            1,
        )
        video_view_url = cls.generate_sas_url(
            creds["account_name"],
            creds["video_container"],
            filename,
            creds["account_key"],
            view_permission,
            24 * 60,
        )
        return video_upload_url, video_view_url

    @classmethod
    def get_thumbnail_urls(cls, filename):
        creds = cls.get_storage_credentials()
        upload_permission = BlobSasPermissions(write=True, create=True, add=True)
        view_permission = BlobSasPermissions(read=True)
        thumbnail_name = f"thumb_{filename}"

        thumbnail_upload_url = cls.generate_sas_url(
            creds["account_name"],
            creds["thumbnail_container"],
            thumbnail_name,
            creds["account_key"],
            upload_permission,
            1,
        )
        thumbnail_view_url = cls.generate_sas_url(
            creds["account_name"],
            creds["thumbnail_container"],
            thumbnail_name,
            creds["account_key"],
            view_permission,
            24 * 60,
        )
        return thumbnail_upload_url, thumbnail_view_url

    @classmethod
    def get_emotion_urls(cls, filename):
        creds = cls.get_storage_credentials()
        upload_permission = BlobSasPermissions(write=True, create=True, add=True)
        view_permission = BlobSasPermissions(read=True)

        emotion_upload_url = cls.generate_sas_url(
            creds["account_name"],
            creds["emotion_container"],
            filename,
            creds["account_key"],
            upload_permission,
            1,
        )
        emotion_view_url = cls.generate_sas_url(
            creds["account_name"],
            creds["emotion_container"],
            filename,
            creds["account_key"],
            view_permission,
            24 * 60,
        )
        return emotion_upload_url, emotion_view_url


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


class WebcamUploadService:
    """Service layer for handling webcam recording upload operations."""

    @staticmethod
    def prepare_webcam_upload(filename: str) -> tuple[str, str]:

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
