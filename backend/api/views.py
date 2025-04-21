import os
from rest_framework import status
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from firebase_admin import auth
from django.contrib.auth import login
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import F
from django.conf import settings
from django.http import Http404

from .models import ViewerProfile, User, Video, VideoView, VideoLike, VideoShare
from .serializers import (OnboardingSerializer, FirebaseTokenSerializer, 
                         VideoSerializer, VideoFeedSerializer, VideoDetailSerializer,
                         VideoViewSerializer, VideoLikeSerializer, VideoShareSerializer)
from .utils import should_make_private, make_video_private, record_user_view, increment_video_views
from azure.storage.blob import generate_blob_sas, BlobSasPermissions
import uuid


class TestAuthView(generics.RetrieveAPIView):
    """Simple endpoint to test if authentication is working."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({
            "success": True,
            "message": "Authentication successful!",
        })


class OnboardingAPIView(generics.UpdateAPIView):
    """API endpoint for handling user onboarding."""
    permission_classes = [IsAuthenticated]
    serializer_class = OnboardingSerializer

    def get_object(self):
        viewer_profile, _ = ViewerProfile.objects.get_or_create(user=self.request.user)
        return viewer_profile

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        serializer.validated_data['onboarding_completed'] = True
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class SetFirebaseTokenView(generics.CreateAPIView):
    """Set Firebase token for DRF browsable API authentication."""
    permission_classes = [AllowAny]
    serializer_class = FirebaseTokenSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        token = serializer.validated_data['token']
        return self._process_token(token)
    
    def _process_token(self, token):
        """Process the Firebase token and authenticate the user."""
        try:
            decoded_token = auth.verify_id_token(token)
            uid = decoded_token["uid"]
            
            try:
                user = User.objects.get(firebase_uid=uid)
                login(self.request, user)
                return Response({
                    "success": True,
                    "message": "Authenticated successfully. You can now use the API browser.",
                })
            except User.DoesNotExist:
                return Response({"error": "User not found in Django database"}, status=404)
        except Exception as e:
            return Response({"error": f"Invalid token: {str(e)}"}, status=400)


class VideoFeedView(generics.ListAPIView):
    """List all publicly available videos for feed."""
    queryset = Video.objects.all()
    serializer_class = VideoFeedSerializer
    permission_classes = [AllowAny]


class VideoDetailView(generics.RetrieveAPIView):
    """Retrieve detailed information about a specific video."""
    queryset = Video.objects.all()
    serializer_class = VideoDetailSerializer
    permission_classes = [AllowAny]
    lookup_url_kwarg = 'video_identifier'
    
    def get_video_by_id(self, video_id):
        """Get video by numeric ID."""
        return get_object_or_404(Video, id=int(video_id))
    
    def get_video_by_token(self, token):
        """Get video by share token and update access count."""
        share = get_object_or_404(VideoShare, share_token=token, active=True)
        
        # Update access count
        share.access_count = F('access_count') + 1
        share.save(update_fields=['access_count'])
        
        return share.video
    
    def get_object(self):
        """Get video by ID or share token."""
        identifier = self.kwargs.get(self.lookup_url_kwarg)
        if not identifier:
            raise Http404("Video identifier is required")
            
        try:
            # Check if it's a numeric ID
            if identifier.isdigit():
                return self.get_video_by_id(identifier)
                
            # Check if it's a valid UUID (share token)
            try:
                uuid.UUID(identifier, version=4)
                return self.get_video_by_token(identifier)
            except ValueError:

                raise Http404("Invalid video identifier format")
                
        except VideoShare.DoesNotExist:
            raise Http404("Shared video not found or share link is inactive")
        except Video.DoesNotExist:
            raise Http404("Video not found")
    
    def check_video_availability(self, video):
        """Check if the video is available for viewing."""
        # Checking if video is private
        if video.visibility == 'private':
            return False
        
        # Checking if it should be made private due to limits
        if should_make_private(video):
            make_video_private(video)
            return False
            
        return True
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        context['frontend_url'] = settings.FRONTEND_URL
        return context
    
    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            
            if not self.check_video_availability(instance):
                return Response(
                    {"error": "This video is no longer available"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
            
        except Http404 as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_404_NOT_FOUND
            )


class RecordVideoViewAPI(APIView):
    """Record a view for a video."""
    permission_classes = [AllowAny]
    
    def post(self, request, video_id):
        video = get_object_or_404(Video, id=video_id)
        
        # Skip if video already private
        if video.visibility == 'private':
            return Response({"error": "Video is private"}, status=status.HTTP_403_FORBIDDEN)
        
        # Record view for authenticated users
        record_user_view(video, request.user)
        current_views = increment_video_views(video)
        privacy_changed = False
        if should_make_private(video):
            privacy_changed = make_video_private(video)
        
        return Response({
            "success": True,
            "views": current_views,
            "privacy_changed": privacy_changed
        })


class ToggleVideoLikeAPI(APIView):
    """Toggle like status for a video."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, video_id):
        video = get_object_or_404(Video, id=video_id)
        
        like, created = VideoLike.objects.get_or_create(
            video=video, 
            user=request.user,
            defaults={'liked_at': timezone.now()}
        )
        
        if not created:
            like.delete()
            return self._update_like_count(video, False)
        
        return self._update_like_count(video, True)
    
    def _update_like_count(self, video, liked):
        """Update the like count for a video."""
        video.likes = F('likes') + (1 if liked else -1)
        video.save(update_fields=['likes'])
        video.refresh_from_db()
        return Response({"liked": liked, "likes": video.likes})


class CreateVideoShareAPI(APIView):
    """Create a shareable link for a video."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, video_id):
        video = get_object_or_404(Video, id=video_id)
        
        # Create a new share link
        share = VideoShare.objects.create(
            video=video,
            created_by=request.user
        )
        
        context = {
            'request': request,
            'frontend_url': settings.FRONTEND_URL
        }
        
        serializer = VideoShareSerializer(share, context=context)
        return Response(serializer.data)


class UserHistoryAPI(generics.ListAPIView):
    """List videos the user has viewed."""
    permission_classes = [IsAuthenticated]
    serializer_class = VideoDetailSerializer
    
    def get_queryset(self):
        viewed_video_ids = VideoView.objects.filter(
            viewer=self.request.user
        ).values_list('video_id', flat=True)
        
        return Video.objects.filter(id__in=viewed_video_ids).order_by('-upload_date')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['frontend_url'] = settings.FRONTEND_URL
        return context


class UploadVideoView(generics.CreateAPIView):
    """Create a new video and generate SAS upload URLs."""
    permission_classes = [IsAuthenticated]
    serializer_class = VideoSerializer

    def create(self, request, *args, **kwargs):
        filename = request.data.get('filename')
        if not filename: 
            return Response({"error": "Filename is required"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return self._generate_upload_tokens(serializer, filename)
    
    def _generate_sas_url(self, account_name, container_name, blob_name, account_key, permission, expiry_hours):
        """Generate SAS token with given parameters."""
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
    
    def _generate_upload_tokens(self, serializer, filename):
        """Generate SAS tokens for video and thumbnail uploads."""
        try:
            # Get Azure storage credentials
            account_name = os.environ.get('AZURE_STORAGE_ACCOUNT_NAME')
            account_key = os.environ.get('AZURE_STORAGE_ACCOUNT_KEY')
            video_container = os.environ.get('AZURE_VIDEO_CONTAINER_NAME')
            thumbnail_container = os.environ.get('AZURE_THUMBNAIL_CONTAINER_NAME')
            
            # Define permissions
            upload_permission = BlobSasPermissions(write=True, create=True, add=True)
            view_permission = BlobSasPermissions(read=True)
            
            # Generate video SAS URLs
            video_upload_url = self._generate_sas_url(
                account_name, video_container, filename,
                account_key, upload_permission, 1
            )
            
            video_view_url = self._generate_sas_url(
                account_name, video_container, filename,
                account_key, view_permission, 24 * 60  # 60 days
            )
            
            # Generate thumbnail SAS URLs
            thumbnail_name = f"thumb_{filename}"
            thumbnail_upload_url = self._generate_sas_url(
                account_name, thumbnail_container, thumbnail_name,
                account_key, upload_permission, 1
            )
            
            thumbnail_view_url = self._generate_sas_url(
                account_name, thumbnail_container, thumbnail_name,
                account_key, view_permission, 24 * 60 
            )


            serializer.save(
                uploader=self.request.user,
                video_url=video_view_url,
                thumbnail_url=thumbnail_view_url
            )

            return Response({
                "video_upload_url": video_upload_url,
                "thumbnail_upload_url": thumbnail_upload_url,
                "message": "SAS tokens generated successfully"
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to generate SAS tokens: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )