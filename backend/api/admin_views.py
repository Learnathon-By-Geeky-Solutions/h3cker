from django.http import Http404
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Count
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore

from .models import User, Video, CompanyProfile, ViewerProfile, WebcamRecording
from .permissions import IsAdmin
from .serializers import UserSerializer, AdminActionSerializer, VideoSerializer, VideoFeedSerializer, WebcamRecordingSerializer

db = firestore.client()

class UserSearchView(generics.GenericAPIView):
    """API endpoint to search for users by email. Only accessible by admin users."""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = UserSerializer
    
    def get(self, request):
        email = request.query_params.get('email', '').strip().lower()
        if not email:
            return Response({"error": "Email parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email__iexact=email)
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

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

            target_user_id = serializer.validated_data.get('user_id')
            target_user = get_object_or_404(User, id=target_user_id)
            
            if target_user.role == 'admin':
                return Response({"message": "User is already an admin"}, status=status.HTTP_200_OK)
            
            # Store old role to handle profile changes
            old_role = target_user.role
            
            # Update role in database
            target_user.role = 'admin'
            target_user.save()
            
            # Update role in Firebase
            try:
                user_ref = db.collection('users').document(target_user.firebase_uid)
                user_ref.update({'role': 'admin'})
                
                if old_role == 'company':
                    CompanyProfile.objects.filter(user=target_user).delete()
                elif old_role == 'user':
                    ViewerProfile.objects.filter(user=target_user).delete()
                
                return Response({
                    "message": f"Successfully promoted {target_user.email} to admin",
                    "user": UserSerializer(target_user).data
                })
            except Exception as e:
                target_user.role = old_role
                target_user.save()
                return Response({"error": f"Failed to update Firebase: {str(e)}"}, 
                              status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

class VideoManagementView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = VideoSerializer
    queryset = Video.objects.all().order_by('-upload_date')

    def get(self, request, video_id=None):
        if video_id:
            # Handle retrieving a single video
            video = self.get_object_by_id(video_id)
            serializer = self.get_serializer(video)
            return Response(serializer.data)
        else:
            # Handle retrieving all videos
            videos = self.get_queryset()
            serializer = self.get_serializer(videos, many=True)
            return Response(serializer.data)

    def patch(self, request, video_id):
        video = self.get_object_by_id(video_id)
        serializer = self.get_serializer(video, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, video_id):
        video = self.get_object_by_id(video_id)
        video.delete()
        return Response({"message": "Video successfully deleted"}, status=status.HTTP_204_NO_CONTENT)
    
    def get_object_by_id(self, video_id):
        """Helper method to get a video by ID with proper error handling"""
        return get_object_or_404(Video, id=video_id)

class VideoStatsView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def retrieve(self, request, *args, **kwargs):
        total_videos = Video.objects.count()
        public_videos = Video.objects.filter(visibility='public').count()
        private_videos = Video.objects.filter(visibility='private').count()
        unlisted_videos = Video.objects.filter(visibility='unlisted').count()
    
        categories = Video.objects.exclude(category='').values('category').annotate(count=Count('id'))
        
        most_viewed = Video.objects.order_by('-views')[:5]
        most_viewed_serializer = VideoFeedSerializer(most_viewed, many=True)
        
        most_liked = Video.objects.order_by('-likes')[:5]
        most_liked_serializer = VideoFeedSerializer(most_liked, many=True)

        recent_videos = Video.objects.order_by('-upload_date')[:5]
        recent_serializer = VideoFeedSerializer(recent_videos, many=True)
        
        return Response({
            'total_videos': total_videos,
            'visibility': {
                'public': public_videos,
                'private': private_videos,
                'unlisted': unlisted_videos
            },
            'categories': categories,
            'most_viewed': most_viewed_serializer.data,
            'most_liked': most_liked_serializer.data,
            'recent': recent_serializer.data
        })

class WebcamRecordingsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = WebcamRecordingSerializer
    queryset = WebcamRecording.objects.all().select_related('video', 'recorder').order_by('-recording_date')
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Optional filters
        user_id = self.request.query_params.get('user_id')
        video_id = self.request.query_params.get('video_id')
        status = self.request.query_params.get('status')
        
        if user_id:
            queryset = queryset.filter(recorder_id=user_id)
        
        if video_id:
            queryset = queryset.filter(video_id=video_id)
            
        if status:
            queryset = queryset.filter(upload_status=status)
            
        return queryset