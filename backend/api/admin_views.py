from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore
from django.db.models import Count

from .models import User, Video, CompanyProfile, ViewerProfile
from .permissions import IsAdmin
from .serializers import UserSerializer, AdminActionSerializer, VideoSerializer, VideoFeedSerializer

db = firestore.client()

class UserSearchView(APIView):
    """
    API endpoint to search for users by email.
    Only accessible by admin users.
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get(self, request):
        email = request.query_params.get('email', '').strip().lower()
        if not email:
            return Response({"error": "Email parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email__iexact=email)
            serializer = UserSerializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

class PromoteToAdminView(APIView):

    permission_classes = [IsAuthenticated, IsAdmin]
    
    def post(self, request):
        serializer = AdminActionSerializer(data=request.data)
        
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

class VideoManagementView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        videos = Video.objects.all().order_by('-upload_date')
        serializer = VideoSerializer(videos, many=True, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, video_id):
        video = get_object_or_404(Video, id=video_id)
        serializer = VideoSerializer(video, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, video_id):
        # Admin-only delete video function
        video = get_object_or_404(Video, id=video_id)
        video.delete()
        return Response({"message": "Video successfully deleted"}, status=status.HTTP_204_NO_CONTENT)

class VideoStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get(self, request):
        # Count videos by visibility
        total_videos = Video.objects.count()
        public_videos = Video.objects.filter(visibility='public').count()
        private_videos = Video.objects.filter(visibility='private').count()
        unlisted_videos = Video.objects.filter(visibility='unlisted').count()
        
        # Count videos by category
        categories = Video.objects.exclude(category='').values('category').annotate(count=Count('id'))
        
        # Get most viewed videos
        most_viewed = Video.objects.order_by('-views')[:5]
        most_viewed_serializer = VideoFeedSerializer(most_viewed, many=True)
        
        # Get most liked videos
        most_liked = Video.objects.order_by('-likes')[:5]
        most_liked_serializer = VideoFeedSerializer(most_liked, many=True)
        
        # Get recent videos
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