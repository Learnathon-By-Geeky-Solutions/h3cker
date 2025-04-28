from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import AuthenticationFailed
from django.db.models import F
from django.http import Http404
from django.conf import settings
import uuid
import os

# Constants
AUTH_REQUIRED_MESSAGE = "Authentication required"

from .models import (
    ViewerProfile, Video, VideoView, VideoLike, VideoShare, WebcamRecording
)
from .serializers import (
    OnboardingSerializer, VideoSerializer, 
    VideoFeedSerializer, VideoDetailSerializer, VideoShareSerializer, 
    UserPointsSerializer
)
from .services import (
    AzureStorageService, PointsService
)
from .utils import (
    increment_video_views, record_user_view, 
    should_make_private, make_video_private
)
from .permissions import IsCompanyOrAdmin


def safe_int_param(request, param_name, default_value, min_value=None, max_value=None):
    """Safely parse integer parameters from request with validation."""
    try:
        value = int(request.query_params.get(param_name, default_value))
        
        if min_value is not None:
            value = max(min_value, value)
        if max_value is not None:
            value = min(max_value, value)
            
        return value
    except (ValueError, TypeError):
        return default_value


class OnboardingAPIView(generics.UpdateAPIView):
    """API endpoint for handling user onboarding and providing recommendations."""
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
        
        # Generate video recommendations based on updated preferences
        limit = safe_int_param(request, 'limit', 10, 1, 50)
        recommendations = Video.get_recommendations_for_user(request.user, limit)
        
        # Create response with profile and recommendations
        response_data = {
            'profile': serializer.data,
            'recommendations': VideoFeedSerializer(recommendations, many=True).data
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    def get(self, request, *args, **kwargs):
        """Get user profile and recommendations."""
        profile = self.get_object()
        profile_serializer = self.get_serializer(profile)
        
        # Generate video recommendations
        limit = safe_int_param(request, 'limit', 10, 1, 50)
        recommendations = Video.get_recommendations_for_user(request.user, limit)
        
        # Create response with profile and recommendations
        response_data = {
            'profile': profile_serializer.data,
            'recommendations': VideoFeedSerializer(recommendations, many=True).data
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    def handle_exception(self, exc):
        """Convert any authentication-related exceptions to 401 status."""
        if isinstance(exc, (AuthenticationFailed, PermissionError)):
            return Response({"error": AUTH_REQUIRED_MESSAGE}, status=status.HTTP_401_UNAUTHORIZED)
        return super().handle_exception(exc)


class VideoFeedView(generics.ListAPIView):
    """List all publicly available videos for feed."""
    queryset = Video.objects.filter(visibility='public')
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
        
        share.access_count = F('access_count') + 1
        share.save(update_fields=['access_count'])
        
        return share.video
    
    def is_valid_uuid(self, identifier):
        try:
            uuid.UUID(identifier, version=4)
            return True
        except ValueError:
            return False
    
    def get_object(self):
        identifier = self.kwargs.get(self.lookup_url_kwarg)
        if not identifier:
            raise Http404("Video identifier is required")
        
        # Case 1: Numeric ID
        if identifier.isdigit():
            video = self.get_video_by_id(identifier)
            is_available = self.check_video_availability(video)
            if not is_available:
                return Response({"error": "This video is no longer available"}, status=status.HTTP_403_FORBIDDEN)
            return video
            
        # Case 2: UUID share token
        if self.is_valid_uuid(identifier):
            try:
                video = self.get_video_by_token(identifier)
                return video
            except Http404:
                raise Http404("Shared video not found or share link is inactive")
                
        # Case 3: Invalid format
        raise Http404("Invalid video identifier format")
    
    def check_video_availability(self, video):
        """Check if the video is available for viewing."""        
        # Admin users can always view videos
        if self.request.user.is_authenticated and self.request.user.role == 'admin':
            return True
            
        # Owner can view their own videos regardless of visibility
        if self.request.user.is_authenticated and video.uploader == self.request.user:
            return True
            
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
        context['frontend_url'] = settings.FRONTEND_URL
        return context
    
    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            
            # If instance is a Response (error case), return it directly
            if isinstance(instance, Response):
                return instance
                
            # Check availability after getting the object
            if isinstance(instance, Video) and not self.check_video_availability(instance):
                return Response({"error": "This video is no longer available"}, status=status.HTTP_403_FORBIDDEN)
                
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Http404 as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)


class RecordVideoViewAPI(generics.CreateAPIView):
    """Record a view for a video."""
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        video_id = kwargs.get('video_id')
        video = get_object_or_404(Video, id=video_id)
        
        # Check if the video is private
        if video.visibility == 'private' and (not request.user.is_authenticated or video.uploader != request.user):
            return Response({"error": "Video is private"}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if view would make it private
        privacy_changed = False
        if should_make_private(video):
            make_video_private(video)
            privacy_changed = True
        
        new_view_count = increment_video_views(video)
        
        if request.user.is_authenticated:
            record_user_view(video, request.user)
            
        return Response({
            "success": True,
            "message": "View recorded",
            "views": new_view_count,
            "privacy_changed": privacy_changed
        }, status=status.HTTP_200_OK)


class ToggleVideoLikeAPI(generics.CreateAPIView):
    """Toggle like status for a video."""
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        video_id = kwargs.get('video_id')
        video = get_object_or_404(Video, id=video_id)
        user = request.user
        
        like, created = VideoLike.objects.get_or_create(video=video, user=user)
        
        if created:
            video.likes = F('likes') + 1
            video.save(update_fields=['likes'])
            video.refresh_from_db()
            return Response({
                "liked": True,
                "message": "Video liked successfully.",
                "likes": video.likes
            })
        else:
            like.delete()
            video.likes = F('likes') - 1
            video.save(update_fields=['likes'])
            video.refresh_from_db()
            return Response({
                "liked": False,
                "message": "Video unliked successfully.",
                "likes": video.likes
            })
    
    def handle_exception(self, exc):
        if isinstance(exc, (AuthenticationFailed, PermissionError)):
            return Response({"error": AUTH_REQUIRED_MESSAGE}, status=status.HTTP_401_UNAUTHORIZED)
        return super().handle_exception(exc)


class CreateVideoShareAPI(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VideoShareSerializer
    
    def create(self, request, *args, **kwargs):
        video_id = kwargs.get('video_id')
        video = get_object_or_404(Video, id=video_id)
        
        # Create a new share record
        share = VideoShare.objects.create(video=video, created_by=request.user)
        
        # Serialize the share record
        serializer = self.get_serializer(share, context={
            'request': request,
            'frontend_url': settings.FRONTEND_URL
        })
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def handle_exception(self, exc):
        if isinstance(exc, (AuthenticationFailed, PermissionError)):
            return Response({"error": AUTH_REQUIRED_MESSAGE}, status=status.HTTP_401_UNAUTHORIZED)
        return super().handle_exception(exc)


class UserHistoryAPI(generics.ListAPIView):
    """List videos the user has viewed."""
    permission_classes = [IsAuthenticated]
    serializer_class = VideoDetailSerializer
    
    def get_queryset(self):
        user = self.request.user
        limit = safe_int_param(self.request, 'limit', 50, 1, 100)
        offset = safe_int_param(self.request, 'offset', 0, 0)
        
        viewed_video_ids = VideoView.objects.filter(viewer=user).order_by('-viewed_at')\
            .values_list('video_id', flat=True).distinct()
            
        if offset > 0:
            viewed_video_ids = viewed_video_ids[offset:]
            
        return Video.objects.filter(id__in=viewed_video_ids)[:limit]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['frontend_url'] = settings.FRONTEND_URL
        return context
    
    def handle_exception(self, exc):
        """Convert any authentication-related exceptions to 401 status."""
        if isinstance(exc, (AuthenticationFailed, PermissionError)):
            return Response({"error": AUTH_REQUIRED_MESSAGE}, status=status.HTTP_401_UNAUTHORIZED)
        return super().handle_exception(exc)


class UserLikedVideosAPI(generics.ListAPIView):
    """List videos the user has liked."""
    permission_classes = [IsAuthenticated]
    serializer_class = VideoDetailSerializer
    
    def get_queryset(self):
        user = self.request.user
        limit = safe_int_param(self.request, 'limit', 50, 1, 100)
        offset = safe_int_param(self.request, 'offset', 0, 0)
        
        liked_video_ids = VideoLike.objects.filter(user=user).order_by('-liked_at')\
            .values_list('video_id', flat=True)
            
        if offset > 0:
            liked_video_ids = liked_video_ids[offset:]
            
        return Video.objects.filter(id__in=liked_video_ids)[:limit]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['frontend_url'] = settings.FRONTEND_URL
        return context


class UploadVideoView(generics.CreateAPIView):
    """Create a new video and generate SAS upload URLs.
    Only admin and company users can upload videos."""
    permission_classes = [IsAuthenticated, IsCompanyOrAdmin]
    serializer_class = VideoSerializer

    def create(self, request, *args, **kwargs):
        filename = request.data.get('filename')
        if not filename: 
            return Response({"error": "Filename is required"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return self._generate_upload_tokens(serializer, filename)
    
    def _generate_upload_tokens(self, serializer, filename):
        try:
            video_upload_url, video_view_url = AzureStorageService.get_video_urls(filename)
            thumbnail_upload_url, thumbnail_view_url = AzureStorageService.get_thumbnail_urls(filename)

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


class WebcamUploadView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        video_id = kwargs.get('video_id')
        video = get_object_or_404(Video, id=video_id)
        
        if 'filename' not in request.data:
            return Response({'filename': ['This field is required.']}, status=status.HTTP_400_BAD_REQUEST)
            
        filename = request.data.get('filename')

        try:
            upload_url, view_url = AzureStorageService.get_emotion_urls(filename)

            recording = WebcamRecording.objects.create(
                video=video,
                recorder=request.user,
                filename=filename,
                recording_url=view_url
            )

            profile, points_awarded = PointsService.award_points_for_webcam_upload(request.user)

            return Response({
                'upload_url': upload_url,
                'recording_id': recording.id,
                'message': f'Successfully generated upload link. {points_awarded} points awarded.',
                'total_points': profile.points
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            if 'SAS generation error' in str(e):
                error_msg = 'Failed to generate upload URL: SAS generation error'
            else:
                error_msg = f'Failed to generate upload URL: {str(e)}'
            return Response({'error': error_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VideoSearchView(generics.ListAPIView):
    #API endpoint for searching videos by filename or other criteria
    serializer_class = VideoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        filename = self.request.query_params.get('filename')
        if filename:
            parts = filename.split('?')[0].split('/')
            base_filename = parts[-1] if parts else filename
            
            videos = Video.objects.filter(video_url__contains=base_filename)
            
            if self.request.user.role == 'admin':
                return videos
                
            return videos.filter(uploader=self.request.user)
            
        return Video.objects.none()


class UserPointsView(generics.RetrieveAPIView):
    """
    API endpoint for retrieving user points information.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserPointsSerializer
    
    def get_object(self):
        profile, _ = ViewerProfile.objects.get_or_create(user=self.request.user)
        return profile
    
    def handle_exception(self, exc):
        if isinstance(exc, (AuthenticationFailed, PermissionError)):
            return Response({"error": AUTH_REQUIRED_MESSAGE}, status=status.HTTP_401_UNAUTHORIZED)
        return super().handle_exception(exc)


# New recommendation endpoints
class VideoRecommendationsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VideoFeedSerializer
    
    def get_queryset(self):
        limit = safe_int_param(self.request, 'limit', 20, 1, 50)
        offset = safe_int_param(self.request, 'offset', 0, 0)
        
        return Video.get_recommendations_for_user(
            self.request.user, limit, offset
        )


class FeaturedCarouselVideosView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = VideoFeedSerializer
    
    def get_queryset(self):
        limit = safe_int_param(self.request, 'limit', 5, 1, 10)
        return Video.get_featured_carousel_videos(limit)


class CategoryVideosView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = VideoFeedSerializer
    
    def get_queryset(self):
        category = self.request.query_params.get('category', '')
        limit = safe_int_param(self.request, 'limit', 20, 1, 50)
        offset = safe_int_param(self.request, 'offset', 0, 0)
        
        return Video.get_category_videos(
            category, limit, offset
        )


class TrendingVideosView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = VideoFeedSerializer
    
    def get_queryset(self):
        limit = safe_int_param(self.request, 'limit', 20, 1, 50)
        offset = safe_int_param(self.request, 'offset', 0, 0)
        
        return Video.get_trending_videos(limit, offset)


class RecentVideosView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = VideoFeedSerializer
    
    def get_queryset(self):
        limit = safe_int_param(self.request, 'limit', 20, 1, 50)
        offset = safe_int_param(self.request, 'offset', 0, 0)
        
        return Video.get_recently_uploaded_videos(limit, offset)