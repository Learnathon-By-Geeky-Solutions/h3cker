import os
from rest_framework import status
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from firebase_admin import auth
from django.contrib.auth import login
from django.utils import timezone
from .models import ViewerProfile, User, Video
from .serializers import OnboardingSerializer, FirebaseTokenSerializer, VideoSerializer
from azure.storage.blob import generate_blob_sas, BlobSasPermissions

class TestAuthView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response({
            "success": True,
            "message": "Authentication successful!",
            
        })

class OnboardingAPIView(generics.UpdateAPIView):

    permission_classes = [IsAuthenticated]
    serializer_class = OnboardingSerializer

    def get_object(self):
        """Gets or creates the user's viewer profile."""
        viewer_profile, _ = ViewerProfile.objects.get_or_create(user=self.request.user)
        return viewer_profile

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.validated_data['onboarding_completed'] = True
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SetFirebaseTokenView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = FirebaseTokenSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        token = serializer.validated_data['token']
        try:
            decoded_token = auth.verify_id_token(token)
            uid = decoded_token["uid"]
            try:
                user = User.objects.get(firebase_uid=uid)
                login(request, user)
                return Response({
                    "success": True,
                    "message": "Authenticated successfully. You can now use the API browser.",
                })
            except User.DoesNotExist:
                return Response({"error": "User not found in Django database"}, status=404)
        except Exception as e:
            return Response({"error": f"Invalid token: {str(e)}"}, status=400)

class UploadVideoView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VideoSerializer

    def create(self, request, *args, **kwargs):
        filename = request.data.get('filename')
        content_type = request.data.get('content_type')
        title = request.data.get('title')
        description = request.data.get('description')
        category = request.data.get('category')
        visibility = request.data.get('visibility')

        if not filename or not content_type:
            return Response({"error": "Filename and content_type are required"}, status=status.HTTP_400_BAD_REQUEST)

        # Azure Storage Account details from environment variables
        account_name = os.environ.get('AZURE_STORAGE_ACCOUNT_NAME')
        account_key = os.environ.get('AZURE_STORAGE_ACCOUNT_KEY')
        video_container_name = os.environ.get('AZURE_VIDEO_CONTAINER_NAME')
        thumbnail_container_name = os.environ.get('AZURE_THUMBNAIL_CONTAINER_NAME')

        # Generate SAS token for video
        video_blob_name = filename
        video_sas_token = generate_blob_sas(
            account_name=account_name,
            container_name=video_container_name,
            blob_name=video_blob_name,
            account_key=account_key,
            permission=BlobSasPermissions(write=True),
            expiry=timezone.now() + timezone.timedelta(hours=1)
        )
        video_url_with_sas = f"https://{account_name}.blob.core.windows.net/{video_container_name}/{video_blob_name}?{video_sas_token}"

        # Generate SAS token for thumbnail
        thumbnail_blob_name = filename
        thumbnail_sas_token = generate_blob_sas(
            account_name=account_name,
            container_name=thumbnail_container_name,
            blob_name=thumbnail_blob_name,
            account_key=account_key,
            permission=BlobSasPermissions(write=True),
            expiry=timezone.now() + timezone.timedelta(hours=1)
        )
        thumbnail_url_with_sas = f"https://{account_name}.blob.core.windows.net/{thumbnail_container_name}/{thumbnail_blob_name}?{thumbnail_sas_token}"
        
        # Create and save video metadata
        video = Video(
            title=title,
            description=description,
            category=category,
            visibility=visibility,
            video_url=video_url_with_sas,
            thumbnail_url=thumbnail_url_with_sas,
            uploader=request.user  # Associate with the logged-in user
        )
        video.save()

        return Response({
            "video_sas_url": video_url_with_sas,
            "thumbnail_sas_url": thumbnail_url_with_sas,
            "video_blob_name": video_blob_name,
            "thumbnail_blob_name": thumbnail_blob_name,
            "message": "SAS token generated successfully"
        }, status=status.HTTP_201_CREATED)
