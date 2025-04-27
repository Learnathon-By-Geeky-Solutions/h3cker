from django.db import transaction
from .models import ViewerProfile, EvaluationResponse
from django.utils import timezone
from azure.storage.blob import generate_blob_sas, BlobSasPermissions
import os


class PointsService:
    #Service class to manage user points operations
    
    @staticmethod
    def award_points_for_evaluation(user, points=10):

        with transaction.atomic():
            profile, _ = ViewerProfile.objects.get_or_create(user=user)
            profile.points += points
            profile.points_earned += points
            profile.save(update_fields=['points', 'points_earned'])
            
        return profile, points


class EvaluationService:
#Service class to manage evaluation operations
    
    @staticmethod
    def validate_required_answers(form, answers):
        required_questions = form.questions.filter(required=True)
        
        for question in required_questions:
            question_id = str(question.id)
            if question_id not in answers or not answers[question_id]:
                return False, f"Question '{question.question_text}' is required"
                
        return True, None
        
    @staticmethod
    @transaction.atomic
    def create_response_and_award_points(form, user, answers, points_to_award=10):
        response = EvaluationResponse.objects.create(
            form=form,
            user=user,
            answers=answers,
            points_awarded=points_to_award
        )
        
        profile, awarded = PointsService.award_points_for_evaluation(user, points_to_award)
        
        return response, profile, awarded


class AzureStorageService:
#Service for managing Azure Blob Storage operations.
    
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
    #Generate SAS token with given parameters.
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
        
        # Define permissions
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
        """Generate SAS URLs for a thumbnail file."""
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