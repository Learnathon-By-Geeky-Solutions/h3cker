import os
from rest_framework import status
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from firebase_admin import auth
from django.contrib.auth import login
from django.utils import timezone
from .models import ViewerProfile, User, Video
from .serializers import OnboardingSerializer, FirebaseTokenSerializer, VideoSerializer, VideoFeedSerializer, VideoDetailSerializer 
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

class VideoFeedView(generics.ListAPIView):
    queryset = Video.objects.all()
    serializer_class = VideoFeedSerializer
    permission_classes = [AllowAny]


class VideoDetailView(generics.RetrieveAPIView): 
    queryset = Video.objects.all()
    serializer_class = VideoDetailSerializer
    permission_classes = [AllowAny]


class UploadVideoView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VideoSerializer

    def perform_create(self, serializer, video_view_url, thumbnail_view_url):
        """Save the video instance with generated URLs and uploader."""
        serializer.save(
            uploader=self.request.user,
            video_url=video_view_url,
            thumbnail_url=thumbnail_view_url
        )

    def create(self, request, *args, **kwargs):

        filename = request.data.get('filename')

        if not filename: 
            return Response({"error": "Filename is required"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        account_name = os.environ.get('AZURE_STORAGE_ACCOUNT_NAME')
        account_key = os.environ.get('AZURE_STORAGE_ACCOUNT_KEY')
        video_container_name = os.environ.get('AZURE_VIDEO_CONTAINER_NAME')
        thumbnail_container_name = os.environ.get('AZURE_THUMBNAIL_CONTAINER_NAME')

        try:
            # Generate upload (write) SAS token for video
            video_blob_name = filename
            video_upload_sas_token = generate_blob_sas(
                account_name=account_name,
                container_name=video_container_name,
                blob_name=video_blob_name,
                account_key=account_key,
                permission=BlobSasPermissions(write=True, create=True, add=True),
                expiry=timezone.now() + timezone.timedelta(hours=1)
            )
            video_upload_url = f"https://{account_name}.blob.core.windows.net/{video_container_name}/{video_blob_name}?{video_upload_sas_token}"
            
            # Generate read SAS token for video
            video_view_sas_token = generate_blob_sas(
                account_name=account_name,
                container_name=video_container_name,
                blob_name=video_blob_name,
                account_key=account_key,
                permission=BlobSasPermissions(read=True),
                expiry=timezone.now() + timezone.timedelta(days=60)  # Valid for 60 days
            )
            video_view_url = f"https://{account_name}.blob.core.windows.net/{video_container_name}/{video_blob_name}?{video_view_sas_token}"

            # Generate upload (write) SAS token for thumbnail
            thumbnail_blob_name = f"thumb_{filename}"
            thumbnail_upload_sas_token = generate_blob_sas(
                account_name=account_name,
                container_name=thumbnail_container_name,
                blob_name=thumbnail_blob_name,
                account_key=account_key,
                permission=BlobSasPermissions(write=True, create=True, add=True),
                expiry=timezone.now() + timezone.timedelta(hours=1)
            )
            thumbnail_upload_url = f"https://{account_name}.blob.core.windows.net/{thumbnail_container_name}/{thumbnail_blob_name}?{thumbnail_upload_sas_token}"
            
            # Generate read SAS token for thumbnail
            thumbnail_view_sas_token = generate_blob_sas(
                account_name=account_name,
                container_name=thumbnail_container_name,
                blob_name=thumbnail_blob_name,
                account_key=account_key,
                permission=BlobSasPermissions(read=True),
                expiry=timezone.now() + timezone.timedelta(days=60)  # Valid for 60 days
            )

            thumbnail_view_url = f"https://{account_name}.blob.core.windows.net/{thumbnail_container_name}/{thumbnail_blob_name}?{thumbnail_view_sas_token}"

            self.perform_create(serializer, video_view_url, thumbnail_view_url)

            return Response({
                "video_upload_url": video_upload_url,
                "thumbnail_upload_url": thumbnail_upload_url,
                "message": "SAS tokens generated successfully"
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": f"Failed to generate SAS tokens: {str(e)}"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
