import logging
from django.conf import settings
from django.utils import timezone
from azure.storage.blob import generate_blob_sas, BlobSasPermissions

logger = logging.getLogger(__name__)

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

    @classmethod
    def upload_bytes_to_sas_url(cls, sas_url: str, data: bytes, content_type: str = "application/octet-stream") -> bool:
        """Upload raw bytes to a SAS URL via PUT."""
        import requests

        try:
            resp = requests.put(
                sas_url,
                data=data,
                headers={"x-ms-blob-type": "BlockBlob", "Content-Type": content_type},
                timeout=120,
            )
            resp.raise_for_status()
            return True
        except Exception as exc:
            logger.error(f"Failed to upload bytes to SAS URL: {exc}", exc_info=True)
            return False

    @classmethod
    def delete_blob_from_url(cls, blob_url: str) -> bool:
        from urllib.parse import urlparse
        from azure.storage.blob import BlobClient

        if not blob_url:
            return False

        parsed = urlparse(blob_url)
        parts = [p for p in parsed.path.lstrip("/").split("/") if p]
        if len(parts) < 2:
            return False

        container_name = parts[0]
        blob_name = "/".join(parts[1:])

        creds = cls.get_storage_credentials()
        if not creds["account_key"]:
            return False

        client = BlobClient(
            account_url=f"https://{creds['account_name']}.blob.core.windows.net",
            container_name=container_name,
            blob_name=blob_name,
            credential=creds["account_key"],
        )

        try:
            client.delete_blob()
            logger.info(f"Deleted blob {container_name}/{blob_name}")
            return True
        except Exception as exc:
            logger.warning(f"Failed to delete blob {container_name}/{blob_name}: {exc}")
            return False

    @classmethod
    def download_blob_from_url(cls, blob_url: str):
        """Download blob bytes from any container SAS URL using the account key.

        The SAS on `recording_url` may be expired, so we re-derive the blob
        client from the account key instead of reusing the SAS.
        """
        from urllib.parse import urlparse
        from azure.storage.blob import BlobClient

        if not blob_url:
            return None

        parsed = urlparse(blob_url)
        parts = [p for p in parsed.path.lstrip("/").split("/") if p]
        if len(parts) < 2:
            return None

        container_name = parts[0]
        blob_name = "/".join(parts[1:])

        creds = cls.get_storage_credentials()
        if not creds["account_key"]:
            return None

        client = BlobClient(
            account_url=f"https://{creds['account_name']}.blob.core.windows.net",
            container_name=container_name,
            blob_name=blob_name,
            credential=creds["account_key"],
        )

        properties = client.get_blob_properties()
        if properties.size == 0:
            return None

        return client.download_blob().readall()