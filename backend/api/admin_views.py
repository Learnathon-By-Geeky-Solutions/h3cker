import logging
from django.db.models import Count
from django.http import Http404
from django.shortcuts import get_object_or_404

from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from firebase_admin import auth as firebase_auth
from firebase_admin import firestore

from api.models import User, Video, CompanyProfile, ViewerProfile, WebcamRecording
from api.serializers import (
    UserSerializer,
    UserSearchSerializer,
    AdminActionSerializer,
    VideoSerializer,
    VideoFeedSerializer,
    WebcamRecordingSerializer,
)
from api.permissions import IsAdmin
from api.services.azure_storage_service import AzureStorageService
from api.services.cache_service import CacheService
from api.services.emotion_analysis_service import EmotionAnalysisService
from api.utils import safe_int_param

logger = logging.getLogger(__name__)
db = firestore.client()


class UserSearchView(generics.GenericAPIView):
    """API endpoint to search for users by email. Only accessible by admin users."""

    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = UserSerializer

    def get(self, request):
        params_serializer = UserSearchSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        email = params_serializer.validated_data["email"].strip().lower()

        try:
            user = User.objects.get(email__iexact=email)
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )


class PromoteToAdminView(generics.CreateAPIView):
    """API endpoint to promote a user to admin role. Only accessible by admin users."""

    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = AdminActionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        current_user = request.user

        try:
            firebase_auth.get_user(current_user.firebase_uid)

            target_user_id = serializer.validated_data.get("user_id")
            target_user = get_object_or_404(User, id=target_user_id)

            if target_user.role == "admin":
                return Response(
                    {"message": "User is already an admin"}, status=status.HTTP_200_OK
                )

            # Store old role to handle profile changes
            old_role = target_user.role

            # Update role in database
            target_user.role = "admin"
            target_user.save()

            # Update role in Firebase
            try:
                user_ref = db.collection("users").document(target_user.firebase_uid)
                user_ref.update({"role": "admin"})

                if old_role == "company":
                    CompanyProfile.objects.filter(user=target_user).delete()
                elif old_role == "user":
                    ViewerProfile.objects.filter(user=target_user).delete()

                return Response(
                    {
                        "message": f"Successfully promoted {target_user.email} to admin",
                        "user": UserSerializer(target_user).data,
                    }
                )
            except Exception as e:
                logger.error(
                    f"Failed to update Firebase for user {target_user.email}: {str(e)}",
                    exc_info=True,
                )
                target_user.role = old_role
                target_user.save()
                return Response(
                    {"error": "An internal error occurred while updating Firebase."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Exception as e:
            return Response(
                {"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST
            )


class VideoManagementView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = VideoSerializer
    queryset = Video.objects.select_related("uploader").all().order_by("-upload_date")

    def get(self, request, video_id=None):
        if video_id:
            video = self.get_object_by_id(video_id)
            serializer = self.get_serializer(video)
            return Response(serializer.data)
        else:
            limit = safe_int_param(request, "limit", 50, 1, 200)
            offset = safe_int_param(request, "offset", 0, 0)
            videos = self.get_queryset()[offset:offset + limit]
            serializer = self.get_serializer(videos, many=True)
            return Response(serializer.data)

    def patch(self, request, video_id):
        video = self.get_object_by_id(video_id)
        serializer = self.get_serializer(video, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            CacheService.invalidate_feed()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, video_id):
        video = self.get_object_by_id(video_id)
        video.delete()
        CacheService.invalidate_feed()
        return Response(
            {"message": "Video successfully deleted"}, status=status.HTTP_204_NO_CONTENT
        )

    def get_object_by_id(self, video_id):
        """Helper method to get a video by ID with proper error handling"""
        return get_object_or_404(Video, id=video_id)


class VideoStatsView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def retrieve(self, request, *args, **kwargs):
        total_videos = Video.objects.count()
        public_videos = Video.objects.filter(visibility="public").count()
        private_videos = Video.objects.filter(visibility="private").count()
        unlisted_videos = Video.objects.filter(visibility="unlisted").count()

        categories = (
            Video.objects.exclude(category="")
            .values("category")
            .annotate(count=Count("id"))
        )

        most_viewed = Video.objects.select_related("uploader").order_by("-views")[:5]
        most_viewed_serializer = VideoFeedSerializer(most_viewed, many=True)

        most_liked = Video.objects.select_related("uploader").order_by("-likes")[:5]
        most_liked_serializer = VideoFeedSerializer(most_liked, many=True)

        recent_videos = Video.objects.select_related("uploader").order_by("-upload_date")[:5]
        recent_serializer = VideoFeedSerializer(recent_videos, many=True)

        return Response(
            {
                "total_videos": total_videos,
                "visibility": {
                    "public": public_videos,
                    "private": private_videos,
                    "unlisted": unlisted_videos,
                },
                "categories": categories,
                "most_viewed": most_viewed_serializer.data,
                "most_liked": most_liked_serializer.data,
                "recent": recent_serializer.data,
            }
        )


class WebcamRecordingsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = WebcamRecordingSerializer
    queryset = (
        WebcamRecording.objects.all()
        .select_related("video", "recorder", "video__uploader")
        .order_by("-recording_date")
    )

    def get_queryset(self):
        queryset = super().get_queryset()

        user_id = self.request.query_params.get("user_id")
        video_id = self.request.query_params.get("video_id")
        status = self.request.query_params.get("status")

        if user_id:
            queryset = queryset.filter(recorder_id=user_id)

        if video_id:
            queryset = queryset.filter(video_id=video_id)

        if status:
            queryset = queryset.filter(upload_status=status)

        limit = safe_int_param(self.request, "limit", 50, 1, 200)
        offset = safe_int_param(self.request, "offset", 0, 0)
        return queryset[offset:offset + limit]


class DeleteWebcamRecordingView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = WebcamRecording.objects.all()
    lookup_url_kwarg = "recording_id"

    def destroy(self, request, *args, **kwargs):
        recording = self.get_object()
        recording_id = recording.id
        video_id = recording.video_id

        AzureStorageService.delete_blob_from_url(recording.recording_url)
        if recording.thumbnail_url:
            AzureStorageService.delete_blob_from_url(recording.thumbnail_url)

        recording.delete()

        EmotionAnalysisService._aggregate_video(video_id)

        return Response(
            {"message": f"Recording {recording_id} deleted successfully"},
            status=status.HTTP_200_OK,
        )
