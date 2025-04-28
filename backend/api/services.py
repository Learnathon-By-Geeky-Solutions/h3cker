from django.db import transaction
from .models import ViewerProfile
from django.utils import timezone
from azure.storage.blob import generate_blob_sas, BlobSasPermissions
import os


class PointsService:
    
    @staticmethod
    def award_points_for_webcam_upload(user, points=5):
        """Awards points to a user for successfully uploading webcam data."""
        with transaction.atomic():
            profile, _ = ViewerProfile.objects.get_or_create(user=user)
            profile.points += points
            profile.points_earned += points
            profile.save(update_fields=['points', 'points_earned'])
            
        return profile, points


class AzureStorageService:
    
    @staticmethod
    def get_storage_credentials():
        return {
            'account_name': os.environ.get('AZURE_STORAGE_ACCOUNT_NAME'),
            'account_key': os.environ.get('AZURE_STORAGE_ACCOUNT_KEY'),
            'video_container': os.environ.get('AZURE_VIDEO_CONTAINER_NAME'),
            'thumbnail_container': os.environ.get('AZURE_THUMBNAIL_CONTAINER_NAME')
        }
    
    @staticmethod
    def generate_sas_url(account_name, container_name, blob_name, account_key, permission, expiry_hours):
        expiry = timezone.now() + timezone.timedelta(hours=expiry_hours)
        sas_token = generate_blob_sas(
            account_name=account_name,
            container_name=container_name,
            blob_name=blob_name,
            account_key=account_key,
            permission=permission,
            expiry=expiry
        )
        return f"https://{account_name}.blob.core.windows.net/{container_name}/{blob_name}?{sas_token}"
    
    @classmethod
    def get_video_urls(cls, filename):
    #Generate SAS URLs for a video file.
        creds = cls.get_storage_credentials()
        
        upload_permission = BlobSasPermissions(write=True, create=True, add=True)
        view_permission = BlobSasPermissions(read=True)
        video_upload_url = cls.generate_sas_url(
            creds['account_name'], 
            creds['video_container'], 
            filename,
            creds['account_key'], 
            upload_permission, 
            1
        )
        
        video_view_url = cls.generate_sas_url(
            creds['account_name'], 
            creds['video_container'], 
            filename,
            creds['account_key'], 
            view_permission, 
            24 * 60  # 60 days
        )
        
        return video_upload_url, video_view_url
    
    @classmethod
    def get_thumbnail_urls(cls, filename):
        creds = cls.get_storage_credentials()
        
        upload_permission = BlobSasPermissions(write=True, create=True, add=True)
        view_permission = BlobSasPermissions(read=True)
      
        thumbnail_name = f"thumb_{filename}"
        thumbnail_upload_url = cls.generate_sas_url(
            creds['account_name'], 
            creds['thumbnail_container'], 
            thumbnail_name,
            creds['account_key'], 
            upload_permission, 
            1
        )
        
        thumbnail_view_url = cls.generate_sas_url(
            creds['account_name'], 
            creds['thumbnail_container'], 
            thumbnail_name,
            creds['account_key'], 
            view_permission, 
            24 * 60
        )
        
        return thumbnail_upload_url, thumbnail_view_url